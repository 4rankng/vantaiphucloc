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
    BookedTrip,
)


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
            .where(True)
            .order_by(BookedTrip.trip_date.asc(), BookedTrip.id.asc())
        )
        trips: list[BookedTrip] = (
            await self.session.execute(trip_query)
        ).scalars().all()

        if not trips:
            return SettlementStatement(client=client_ref, period=period)

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

        client_code = (partner.code or "").strip() or partner.name

        # One TripLine per trip — cont_number and cont_type are now flat
        # columns on BookedTrip.
        trip_lines: list[TripLine] = []
        for trip in trips:
            trip_lines.append(
                TripLine(
                    trip_date=trip.trip_date,
                    client_code=client_code,
                    container_number=trip.cont_number or "",
                    cont_type=(trip.cont_type or "").upper(),
                    work_type=(trip.work_type or "").upper(),
                    tractor_plate=trip.vehicle_plate or "",
                    vessel=trip.vessel or "",
                    pickup_location=name_by_loc_id.get(
                        trip.pickup_location_id, ""
                    ),
                    dropoff_location=name_by_loc_id.get(
                        trip.dropoff_location_id, ""
                    ),
                    unit_price=int(trip.revenue or 0),
                )
            )

        return SettlementStatement(
            client=client_ref,
            period=period,
            trip_lines=trip_lines,
            route_summary=_aggregate_routes(trip_lines),
        )
