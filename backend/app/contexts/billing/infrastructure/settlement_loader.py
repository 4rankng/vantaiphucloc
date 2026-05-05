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
    Client,
    Location,
    TripOrder,
    TripOrderContainer,
    TripOrderWorkOrder,
    WorkOrder,
)


def _split_unit_price_per_container(
    trip_unit_price: int,
    containers: list[TripOrderContainer],
) -> dict[int, int]:
    """Allocate a trip's `unit_price` across its containers.

    Strategy (preserve trip-level total):
    - 1 container → full price.
    - N same-type → equal split, last absorbs the rounding remainder.
    - N mixed-type → equal split (no per-line pricing on TripOrder).
    """
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
        if line.work_type == "F20":
            s.f20_count += 1
        elif line.work_type == "F40":
            s.f40_count += 1
        elif line.work_type in ("E20", "E40"):
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
        client_res = await self.session.execute(
            select(Client).where(Client.id == client_id)
        )
        client = client_res.scalar_one_or_none()
        if client is None:
            raise SettlementClientNotFound(
                f"Khách hàng id={client_id} không tồn tại"
            )

        client_ref = SettlementClientRef(
            id=client.id,
            name=client.name,
            code=client.code,
            address=client.address,
            tax_code=client.tax_code,
        )

        trip_query = (
            select(TripOrder)
            .where(TripOrder.client_id == client_id)
            .where(TripOrder.trip_date >= period.start)
            .where(TripOrder.trip_date <= period.end)
            .where(TripOrder.status != "CANCELLED")
            .order_by(TripOrder.trip_date.asc(), TripOrder.id.asc())
        )
        trips: list[TripOrder] = (
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
            select(TripOrderContainer).where(
                TripOrderContainer.trip_order_id.in_(trip_ids)
            )
        )
        containers_by_trip: dict[int, list[TripOrderContainer]] = {}
        for c in cont_res.scalars().all():
            containers_by_trip.setdefault(c.trip_order_id, []).append(c)

        join_res = await self.session.execute(
            select(TripOrderWorkOrder).where(
                TripOrderWorkOrder.trip_order_id.in_(trip_ids)
            )
        )
        join_rows = list(join_res.scalars().all())
        wo_ids = list({r.work_order_id for r in join_rows})
        plate_by_wo: dict[int, str] = {}
        if wo_ids:
            wo_res = await self.session.execute(
                select(WorkOrder).where(WorkOrder.id.in_(wo_ids))
            )
            for wo in wo_res.scalars().all():
                plate_by_wo[wo.id] = wo.tractor_plate or ""
        plates_by_trip: dict[int, list[str]] = {}
        for r in join_rows:
            plate = plate_by_wo.get(r.work_order_id, "")
            if plate:
                plates_by_trip.setdefault(r.trip_order_id, []).append(plate)

        client_code = (client.code or "").strip() or client.name

        trip_lines: list[TripLine] = []
        for trip in trips:
            conts = containers_by_trip.get(trip.id, [])
            if not conts:
                continue
            prices = _split_unit_price_per_container(trip.unit_price, conts)
            plates = plates_by_trip.get(trip.id, [])
            plate_str = ", ".join(sorted(set(plates))) if plates else ""
            for c in conts:
                trip_lines.append(
                    TripLine(
                        trip_date=trip.trip_date,
                        client_code=client_code,
                        container_number=c.container_number,
                        work_type=(c.work_type or "").upper(),
                        tractor_plate=plate_str,
                        pickup_location=name_by_loc_id.get(
                            trip.pickup_location_id, ""
                        ),
                        dropoff_location=name_by_loc_id.get(
                            trip.dropoff_location_id, ""
                        ),
                        unit_price=int(prices.get(c.id, 0)),
                        is_confirmed=bool(trip.is_confirmed),
                    )
                )

        return SettlementStatement(
            client=client_ref,
            period=period,
            trip_lines=trip_lines,
            route_summary=_aggregate_routes(trip_lines),
        )
