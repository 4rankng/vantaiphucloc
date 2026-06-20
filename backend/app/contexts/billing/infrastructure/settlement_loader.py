"""SQL implementation of `SettlementDataLoader`.

Cross-context read: queries operations ORM tables to build a
`SettlementStatement`. This is reporting — no domain mutations happen here,
so direct ORM access across context boundaries is OK.

Source of truth: matched `DeliveredTrip` rows (`booked_trip_id IS NOT NULL`).
Revenue is read from `DeliveredTrip.revenue`, which is populated at match
time from `RoutePricing`. Unmatched booked trips are excluded — accounting
follow-up runs on confirmed deliveries only.
"""

from __future__ import annotations

import logging
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
    DeliveredTrip,
)

_logger = logging.getLogger(__name__)


def _aggregate_routes(lines: Iterable[TripLine]) -> list[RouteSummary]:
    """Group TripLines by (pickup, dropoff, work_type) into RouteSummary.

    work_type is part of the group key because the same pickup/dropoff pair
    can carry different prices for different work types (e.g. CHUYỂN BÃI vs
    XUẤT/NHẬP TÀU). Mixing them in a single bucket would lose pricing detail.
    """
    bucket: dict[tuple[str, str, str], RouteSummary] = {}
    for line in lines:
        key = (line.pickup_location, line.dropoff_location, line.work_type)
        s = bucket.get(key)
        if s is None:
            s = RouteSummary(
                pickup_location=line.pickup_location,
                dropoff_location=line.dropoff_location,
                work_type=line.work_type,
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
        key=lambda r: (
            r.pickup_location.lower(),
            r.dropoff_location.lower(),
            r.work_type.lower(),
        ),
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
            raise SettlementClientNotFound(f"Khách hàng id={client_id} không tồn tại")

        client_ref = SettlementClientRef(
            id=partner.id,
            name=partner.name,
            code=partner.code,
            address=partner.address,
            tax_code=partner.tax_code,
        )

        # Source of truth: MATCHED DeliveredTrips only. A booked trip that
        # has not been confirmed by a driver/delivery is not yet billable.
        trip_query = (
            select(DeliveredTrip)
            .where(DeliveredTrip.client_id == client_id)
            .where(DeliveredTrip.booked_trip_id.is_not(None))
            .where(DeliveredTrip.trip_date >= period.start)
            .where(DeliveredTrip.trip_date <= period.end)
            .order_by(DeliveredTrip.trip_date.asc(), DeliveredTrip.id.asc())
        )
        trips: list[DeliveredTrip] = (
            (await self.session.execute(trip_query)).scalars().all()
        )

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

        zero_price_count = 0
        trip_lines: list[TripLine] = []
        for trip in trips:
            unit_price = int(trip.revenue or 0)
            if unit_price == 0:
                zero_price_count += 1
            trip_lines.append(
                TripLine(
                    trip_date=trip.trip_date,
                    client_code=client_code,
                    container_number=trip.cont_number or "",
                    cont_type=(trip.cont_type or "").upper(),
                    work_type=(trip.work_type or "").upper(),
                    vehicle_plate=trip.vehicle_plate or "",
                    vessel=trip.vessel or "",
                    pickup_location=name_by_loc_id.get(trip.pickup_location_id, ""),
                    dropoff_location=name_by_loc_id.get(trip.dropoff_location_id, ""),
                    unit_price=unit_price,
                )
            )

        if zero_price_count:
            _logger.warning(
                "Settlement for client=%s period=%s..%s: %d/%d trips have revenue=0 "
                "(likely missing RoutePricing or sync issue)",
                client_id,
                period.start,
                period.end,
                zero_price_count,
                len(trips),
            )

        return SettlementStatement(
            client=client_ref,
            period=period,
            trip_lines=trip_lines,
            route_summary=_aggregate_routes(trip_lines),
        )
