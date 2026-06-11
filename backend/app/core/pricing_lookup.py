"""Batch route-pricing lookup for P&L calculations.

Given a set of trips, looks up the price from either the client route pricing
table (revenue) or the vendor route pricing table (cost for xe ngoài).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import DeliveredTrip as DeliveredTripORM
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


_CONT_TYPE_SALARY_MAP = {
    "F20": "f20_driver_salary",
    "F40": "f40_driver_salary",
    "E20": "e20_driver_salary",
    "E40": "e40_driver_salary",
}


def _salary_for_cont_type(row, cont_type: str | None) -> int:
    col = _CONT_TYPE_SALARY_MAP.get(cont_type or "", "f20_driver_salary")
    return int(getattr(row, col) or 0)


def _normalize_work_type(wt: str | None) -> str:
    """Normalize work_type for pricing lookup — uses centralized normalization."""
    from app.contexts.operations.infrastructure.operation_type_resolver import normalize_operation_type
    folded = normalize_operation_type(wt, default="CHUYEN BAI")
    # Keyword-based canonical mapping for pricing lookup
    if "CHUYEN BAI" in folded:
        return "CHUYỂN BÃI"
    if "XUAT" in folded or "NHAP" in folded or "TAU" in folded:
        return "XUẤT/NHẬP TÀU"
    if "LAY VO" in folded or "HA HANG" in folded:
        return "LẤY VỎ HẠ HÀNG"
    if "DONG KHO" in folded:
        return "ĐÓNG KHO"
    if "SA LAN" in folded:
        return "CHẠY SÀ LAN"
    return wt


async def lookup_client_prices(
    session: AsyncSession,
    trips: Sequence[TripPriceInfo],
) -> dict[int, int]:
    """Batch-lookup client route pricing for a set of trips.

    Returns {trip_id: price}. Trips with no matching pricing get 0.
    """
    if not trips:
        return {}

    rows = (await session.execute(
        select(ClientRoutePricingORM).where(
            ClientRoutePricingORM.is_active.is_(True),
        )
    )).scalars().all()

    lane_map: dict[tuple, object] = {}
    for r in rows:
        key = (r.client_id, r.pickup_location_id, r.dropoff_location_id, _normalize_work_type(r.work_type))
        lane_map[key] = r

    result: dict[int, int] = {}
    for t in trips:
        key = (t.partner_id, t.pickup_location_id, t.dropoff_location_id, _normalize_work_type(t.work_type))
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
        key = (r.vendor_id, r.pickup_location_id, r.dropoff_location_id, _normalize_work_type(r.work_type))
        lane_map[key] = r

    result: dict[int, int] = {}
    for t in trips:
        key = (t.partner_id, t.pickup_location_id, t.dropoff_location_id, _normalize_work_type(t.work_type))
        pricing = lane_map.get(key)
        result[t.id] = _price_for_cont_type(pricing, t.cont_type) if pricing else 0

    return result


async def lookup_driver_salaries(
    session: AsyncSession,
    trips: Sequence[TripPriceInfo],
) -> dict[int, int]:
    """Batch-lookup driver salary from RoutePricing for own-driver trips.

    Returns {trip_id: salary}. Trips with no matching pricing get 0.
    """
    if not trips:
        return {}

    rows = (await session.execute(
        select(ClientRoutePricingORM).where(
            ClientRoutePricingORM.is_active.is_(True),
        )
    )).scalars().all()

    lane_map: dict[tuple, object] = {}
    for r in rows:
        key = (r.client_id, r.pickup_location_id, r.dropoff_location_id, _normalize_work_type(r.work_type))
        lane_map[key] = r

    result: dict[int, int] = {}
    for t in trips:
        key = (t.partner_id, t.pickup_location_id, t.dropoff_location_id, _normalize_work_type(t.work_type))
        pricing = lane_map.get(key)
        result[t.id] = _salary_for_cont_type(pricing, t.cont_type) if pricing else 0

    return result


async def sync_unmatched_trip_salaries(
    session: AsyncSession,
    client_id: int,
    pickup_location_id: int,
    dropoff_location_id: int,
    work_type: str,
) -> int:
    """Re-estimate driver salary for unmatched trips when RoutePricing changes.

    Finds all unmatched DeliveredTrips matching the pricing key and updates
    their driver_salary from the RoutePricing salary columns.

    Returns the number of trips updated.
    """
    wt = _normalize_work_type(work_type)

    pricing = (await session.execute(
        select(ClientRoutePricingORM).where(
            ClientRoutePricingORM.client_id == client_id,
            ClientRoutePricingORM.pickup_location_id == pickup_location_id,
            ClientRoutePricingORM.dropoff_location_id == dropoff_location_id,
            ClientRoutePricingORM.work_type == wt,
            ClientRoutePricingORM.is_active.is_(True),
        )
    )).scalar_one_or_none()

    if not pricing:
        return 0

    trips = (await session.execute(
        select(DeliveredTripORM).where(
            DeliveredTripORM.booked_trip_id.is_(None),
            DeliveredTripORM.client_id == client_id,
            DeliveredTripORM.pickup_location_id == pickup_location_id,
            DeliveredTripORM.dropoff_location_id == dropoff_location_id,
            DeliveredTripORM.work_type == wt,
        )
    )).scalars().all()

    updated = 0
    for trip in trips:
        salary = _salary_for_cont_type(pricing, trip.cont_type)
        if salary != trip.driver_salary:
            trip.driver_salary = salary
            updated += 1

    if updated:
        await session.flush()

    return updated


async def sync_all_trip_pricing(session: AsyncSession) -> int:
    """Universal sync: update ALL delivered trips with latest pricing.

    - Matched trips (booked_trip_id IS NOT NULL): update revenue + driver_salary
    - Unmatched trips (booked_trip_id IS NULL): update driver_salary only

    Returns total count of updated trips.
    """
    from datetime import datetime, timezone

    stmt = select(DeliveredTripORM)
    all_trips = (await session.execute(stmt)).scalars().all()
    if not all_trips:
        return 0

    matched = [t for t in all_trips if t.booked_trip_id is not None]
    unmatched = [t for t in all_trips if t.booked_trip_id is None]

    updated = 0

    if matched:
        client_infos = [
            TripPriceInfo(
                id=t.id, partner_id=t.client_id,
                pickup_location_id=t.pickup_location_id,
                dropoff_location_id=t.dropoff_location_id,
                work_type=t.work_type, cont_type=t.cont_type,
            )
            for t in matched
        ]
        client_prices = await lookup_client_prices(session, client_infos)

        driver_infos = [
            TripPriceInfo(
                id=t.id, partner_id=t.client_id,
                pickup_location_id=t.pickup_location_id,
                dropoff_location_id=t.dropoff_location_id,
                work_type=t.work_type, cont_type=t.cont_type,
            )
            for t in matched if not t.vendor_id
        ]
        driver_salaries = await lookup_driver_salaries(session, driver_infos) if driver_infos else {}

        vendor_infos = [
            TripPriceInfo(
                id=t.id, partner_id=t.vendor_id,
                pickup_location_id=t.pickup_location_id,
                dropoff_location_id=t.dropoff_location_id,
                work_type=t.work_type, cont_type=t.cont_type,
            )
            for t in matched if t.vendor_id
        ]
        vendor_prices = await lookup_vendor_prices(session, vendor_infos) if vendor_infos else {}

        for t in matched:
            changed = False
            new_rev = client_prices.get(t.id, 0)
            if new_rev > 0 and t.revenue != new_rev:
                t.revenue = new_rev
                changed = True
            if t.vendor_id:
                new_sal = vendor_prices.get(t.id, 0)
            else:
                new_sal = driver_salaries.get(t.id, 0)
            if new_sal > 0 and t.driver_salary != new_sal:
                t.driver_salary = new_sal
                changed = True
            if changed:
                t.updated_at = datetime.now(timezone.utc)
                updated += 1

    if unmatched:
        driver_infos = [
            TripPriceInfo(
                id=t.id, partner_id=t.client_id,
                pickup_location_id=t.pickup_location_id,
                dropoff_location_id=t.dropoff_location_id,
                work_type=t.work_type, cont_type=t.cont_type,
            )
            for t in unmatched
        ]
        driver_salaries = await lookup_driver_salaries(session, driver_infos)

        for t in unmatched:
            new_sal = driver_salaries.get(t.id, 0)
            if new_sal > 0 and t.driver_salary != new_sal:
                t.driver_salary = new_sal
                t.updated_at = datetime.now(timezone.utc)
                updated += 1

    if updated > 0:
        await session.flush()

    return updated
