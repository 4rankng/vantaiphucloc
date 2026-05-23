"""Batch route-pricing lookup for P&L calculations.

Given a set of trips, looks up the price from either the client route pricing
table (revenue) or the vendor route pricing table (cost for xe ngoài).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import RoutePricing as ClientRoutePricingORM
from app.models.domain import VendorRoutePricing as VendorRoutePricingORM


@dataclass
class TripPriceInfo:
    id: int
    partner_id: int
    pickup_location_id: int
    dropoff_location_id: int
    work_type: str
    cont_type: str | None


_CONT_TYPE_MAP = {
    "F20": "f20_price",
    "F40": "f40_price",
    "E20": "e20_price",
    "E40": "e40_price",
}


def _price_for_cont_type(row, cont_type: str | None) -> int:
    col = _CONT_TYPE_MAP.get(cont_type or "", "f20_price")
    return int(getattr(row, col) or 0)


async def lookup_client_prices(
    session: AsyncSession,
    trips: Sequence[TripPriceInfo],
) -> dict[int, int]:
    """Batch-lookup client route pricing for a set of trips.

    Returns {trip_id: price}. Trips with no matching pricing get 0.
    """
    if not trips:
        return {}

    lanes = {
        (t.partner_id, t.pickup_location_id, t.dropoff_location_id, t.work_type)
        for t in trips
    }
    rows = (await session.execute(
        select(ClientRoutePricingORM).where(
            ClientRoutePricingORM.is_active.is_(True),
        )
    )).scalars().all()

    lane_map: dict[tuple, object] = {}
    for r in rows:
        key = (r.client_id, r.pickup_location_id, r.dropoff_location_id, r.work_type)
        lane_map[key] = r

    result: dict[int, int] = {}
    for t in trips:
        key = (t.partner_id, t.pickup_location_id, t.dropoff_location_id, t.work_type)
        pricing = lane_map.get(key)
        result[t.id] = _price_for_cont_type(pricing, t.cont_type) if pricing else 0

    return result


async def lookup_vendor_prices(
    session: AsyncSession,
    trips: Sequence[TripPriceInfo],
) -> dict[int, int]:
    """Batch-lookup vendor route pricing for a set of trips.

    Returns {trip_id: price}. Trips with no matching pricing or no vendor get 0.
    """
    if not trips:
        return {}

    rows = (await session.execute(
        select(VendorRoutePricingORM).where(
            VendorRoutePricingORM.is_active.is_(True),
        )
    )).scalars().all()

    lane_map: dict[tuple, object] = {}
    for r in rows:
        key = (r.vendor_id, r.pickup_location_id, r.dropoff_location_id, r.work_type)
        lane_map[key] = r

    result: dict[int, int] = {}
    for t in trips:
        key = (t.partner_id, t.pickup_location_id, t.dropoff_location_id, t.work_type)
        pricing = lane_map.get(key)
        result[t.id] = _price_for_cont_type(pricing, t.cont_type) if pricing else 0

    return result
