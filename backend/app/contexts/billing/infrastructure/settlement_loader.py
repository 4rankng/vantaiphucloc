"""SQL implementation of `SettlementDataLoader`.

Cross-context read: queries operations and customer_pricing ORM tables to
build a `SettlementStatement`. This is reporting — no domain mutations
happen here, so direct ORM access across context boundaries is OK.
"""

from __future__ import annotations

from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.billing.domain.entities import SettlementStatement
from app.contexts.billing.domain.exceptions import SettlementClientNotFound
from app.contexts.billing.domain.repositories import SettlementDataLoader
from app.contexts.billing.domain.value_objects import (
    RouteSummary,
    SettlementClientRef,
    SettlementPeriod,
    TripLine,
)
from app.models.domain import (
    Location,
    Client,
    Reconciliation,
    BookedTrip,
    BookedTripContainer,
    Vehicle,
    DeliveredTrip,
)


def _split_unit_price_per_container(
    trip_unit_price: int,
    containers: list[BookedTripContainer],
) -> dict[int, int]:
    n = len(containers)
    if n == 0:
        return {}
    if n == 1:
        return {containers[0].id: trip_unit_price}
    base = trip_unit_price // n
    remainder = trip_unit_price - base * n
    out: dict[int, int] = {}
    for i, c in enumerate(containers):
        out[c.id] = base + (remainder if i == n - 1 else 0)
    return out


def _aggregate_routes(lines: Iterable[TripLine]) -> list[RouteSummary]:
    bucket: dict[tuple[str, str], RouteSummary] = {}
    for line in lines:
        key = (line.pickup_location, line.dropoff_location)
        s = bucket.get(key)
        if s is None:
            s = RouteSummary(
                pickup_location=line.pickup_location,
                dropoff_location=line.dropoff_location,
            )
            bucket[key] = s
        if line.cont_type == "F20":
            s.f20_count += 1
        elif line.cont_type == "F40":
            s.f40_count += 1
        elif line.cont_type in ("E20", "E40"):
            s.empty_count += 1
        s.total_amount += line.unit_price
    return sorted(
        bucket.values(),
        key=lambda r: (r.pickup_location.lower(), r.dropoff_location.lower()),
    )


class SqlSettlementDataLoader(SettlementDataLoader):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def load(
        self, *, client_id: int, period: SettlementPeriod
    ) -> SettlementStatement:
        partner_res = await self.session.execute(
            select(Client).where(Client.id == client_id)
        )
        partner = partner_res.scalar_one_or_none()
        if partner is None:
            raise SettlementClientNotFound(
                f"Khách hàng id={client_id} không tồn tại"
            )

        client_ref = SettlementClientRef(
            id=partner.id,
            name=partner.name,
            code=partner.code,
            address=partner.address,
            tax_code=partner.tax_code,
        )

        trip_query = (
            select(BookedTrip)
            .where(BookedTrip.client_id == client_id)
            .where(BookedTrip.trip_date >= period.start)
            .where(BookedTrip.trip_date <= period.end)
            .where(BookedTrip.status != "CANCELLED")
            .order_by(BookedTrip.trip_date.asc(), BookedTrip.id.asc())
        )
        trips: list[BookedTrip] = (
            await self.session.execute(trip_query)
        ).scalars().all()

        if not trips:
            return SettlementStatement(client=client_ref, period=period)

        trip_ids = [t.id for t in trips]
        loc_ids = {t.pickup_location_id for t in trips} | {
            t.dropoff_location_id for t in trips
        }
        loc_ids.discard(None)
        name_by_loc_id: dict[int, str] = {}
        if loc_ids:
            loc_res = await self.session.execute(
                select(Location).where(Location.id.in_(loc_ids))
            )
            for loc in loc_res.scalars().all():
                name_by_loc_id[loc.id] = loc.name

        cont_res = await self.session.execute(
            select(BookedTripContainer).where(
                BookedTripContainer.booked_trip_id.in_(trip_ids)
            )
        )
        containers_by_trip: dict[int, list[BookedTripContainer]] = {}
        for c in cont_res.scalars().all():
            containers_by_trip.setdefault(c.booked_trip_id, []).append(c)

        # Active reconciliations for these trips
        join_res = await self.session.execute(
            select(Reconciliation).where(
                Reconciliation.booked_trip_id.in_(trip_ids),
                Reconciliation.is_active == True,  # noqa: E712
            )
        )
        join_rows = list(join_res.scalars().all())
        wo_ids = list({r.delivered_trip_id for r in join_rows})

        # Get plates via Vehicle table
        plate_by_wo: dict[int, str] = {}
        if wo_ids:
            wo_res = await self.session.execute(
                select(DeliveredTrip).where(DeliveredTrip.id.in_(wo_ids))
            )
            delivered_trips = {wo.id: wo for wo in wo_res.scalars().all()}
            vehicle_ids = list({wo.vehicle_id for wo in delivered_trips.values() if wo.vehicle_id})
            vehicle_plate_map: dict[int, str] = {}
            if vehicle_ids:
                v_res = await self.session.execute(
                    select(Vehicle).where(Vehicle.id.in_(vehicle_ids))
                )
                for v in v_res.scalars().all():
                    vehicle_plate_map[v.id] = v.plate
            for wo_id, wo in delivered_trips.items():
                plate = vehicle_plate_map.get(wo.vehicle_id, "") if wo.vehicle_id else ""
                plate_by_wo[wo_id] = plate

        # Build vessel map from DeliveredTrips
        vessel_by_wo: dict[int, str] = {wo_id: (wo.vessel or "") for wo_id, wo in delivered_trips.items()} if wo_ids else {}

        plates_by_trip: dict[int, list[str]] = {}
        vessels_by_trip: dict[int, list[str]] = {}
        for r in join_rows:
            plate = plate_by_wo.get(r.delivered_trip_id, "")
            if plate:
                plates_by_trip.setdefault(r.booked_trip_id, []).append(plate)
            vessel = vessel_by_wo.get(r.delivered_trip_id, "")
            if vessel:
                vessels_by_trip.setdefault(r.booked_trip_id, []).append(vessel)

        client_code = (partner.code or "").strip() or partner.name

        trip_lines: list[TripLine] = []
        for trip in trips:
            conts = containers_by_trip.get(trip.id, [])
            if not conts:
                continue
            prices = _split_unit_price_per_container(trip.revenue, conts)
            plates = plates_by_trip.get(trip.id, [])
            plate_str = ", ".join(sorted(set(plates))) if plates else ""
            vessels = vessels_by_trip.get(trip.id, [])
            vessel_str = ", ".join(sorted(set(vessels))) if vessels else ""
            for c in conts:
                trip_lines.append(
                    TripLine(
                        trip_date=trip.trip_date,
                        client_code=client_code,
                        container_number=c.container_number,
                        cont_type=(c.cont_type or "").upper(),
                        work_type=(trip.work_type or "").upper(),
                        tractor_plate=plate_str,
                        vessel=vessel_str,
                        pickup_location=name_by_loc_id.get(
                            trip.pickup_location_id, ""
                        ),
                        dropoff_location=name_by_loc_id.get(
                            trip.dropoff_location_id, ""
                        ),
                        unit_price=int(prices.get(c.id, 0)),
                    )
                )

        return SettlementStatement(
            client=client_ref,
            period=period,
            trip_lines=trip_lines,
            route_summary=_aggregate_routes(trip_lines),
        )
