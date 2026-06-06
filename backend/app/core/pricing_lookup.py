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
    if not wt:
        return "CHUYỂN BÃI"
    import unicodedata
    norm = wt.strip().upper()
    folded = unicodedata.normalize("NFD", norm)
    folded = "".join(c for c in folded if not unicodedata.combining(c))
    folded = folded.replace("Đ", "D").replace("đ", "d")
    if "CHUYEN BAI" in folded or "CHUYỂN BÃI" in norm:
        return "CHUYỂN BÃI"
    if "XUAT" in folded or "NHAP" in folded or "TAU" in folded:
        return "XUẤT/NHẬP TÀU"
    if "LAY VO" in folded or "HA HANG" in folded:
        return "LẤY VỎ HẠ HÀNG"
    if "DONG KHO" in folded or "ĐÓNG KHO" in norm:
        return "ĐÓNG KHO"
    if "SA LAN" in folded or "SÀ LAN" in norm:
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
