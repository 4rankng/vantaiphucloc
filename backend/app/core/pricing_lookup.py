"""Batch route-pricing lookup for P&L calculations.

Given a set of trips, looks up the price from either the client route pricing
table (revenue) or the vendor route pricing table (cost for xe ngoài).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from app.utils.dates import utcnow

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
    return folded


def _fuzzy_match_lane(
    target_partner_id: int,
    target_pickup_id: int,
    target_dropoff_id: int,
    target_work_type: str,
    lane_map: dict[tuple, object],
    partner_map: dict[int, str],
    loc_map: dict[int, str],
) -> object | None:
    import difflib

    target_partner_name = partner_map.get(target_partner_id, "")
    target_pickup_name = loc_map.get(target_pickup_id, "")
    target_dropoff_name = loc_map.get(target_dropoff_id, "")
    target_wt = target_work_type or ""

    best_score = 0.0
    best_pricing = None

    def _ratio(a: str, b: str) -> float:
        if not a or not b:
            return 0.0
        return difflib.SequenceMatcher(None, a.lower(), b.lower()).ratio()

    for (p_id, p_pickup_id, p_dropoff_id, wt), pricing in lane_map.items():
        p_name = partner_map.get(p_id, "")
        pickup_name = loc_map.get(p_pickup_id, "")
        dropoff_name = loc_map.get(p_dropoff_id, "")

        score_p = _ratio(target_partner_name, p_name) if target_partner_name and p_name else 1.0 if p_id == target_partner_id else 0.0
        score_pu = _ratio(target_pickup_name, pickup_name) if target_pickup_name and pickup_name else 1.0 if p_pickup_id == target_pickup_id else 0.0
        score_do = _ratio(target_dropoff_name, dropoff_name) if target_dropoff_name and dropoff_name else 1.0 if p_dropoff_id == target_dropoff_id else 0.0
        score_wt = _ratio(target_wt, wt or "")

        # If it's an exact match on IDs but only work_type is fuzzy, it will have a very high score
        if p_id == target_partner_id and p_pickup_id == target_pickup_id and p_dropoff_id == target_dropoff_id:
            total_score = 0.8 + (score_wt * 0.2)
        else:
            total_score = (score_p + score_pu + score_do + score_wt) / 4.0

        if total_score > best_score and total_score >= 0.8:
            best_score = total_score
            best_pricing = pricing

    return best_pricing


async def _load_maps_for_fuzzy(session: AsyncSession) -> tuple[dict[int, str], dict[int, str], dict[int, str]]:
    from app.models.domain import Location as LocationORM
    from app.models.domain import Client as ClientORM
    from app.models.domain import Vendor as VendorORM

    loc_rows = (await session.execute(select(LocationORM.id, LocationORM.name))).all()
    loc_map = {r.id: r.name for r in loc_rows}

    client_rows = (await session.execute(select(ClientORM.id, ClientORM.name))).all()
    client_map = {r.id: r.name for r in client_rows}

    vendor_rows = (await session.execute(select(VendorORM.id, VendorORM.name))).all()
    vendor_map = {r.id: r.name for r in vendor_rows}

    return loc_map, client_map, vendor_map


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

    loc_map, client_map, _ = await _load_maps_for_fuzzy(session)
    result: dict[int, int] = {}
    for t in trips:
        norm_wt = _normalize_work_type(t.work_type)
        key = (t.partner_id, t.pickup_location_id, t.dropoff_location_id, norm_wt)
        pricing = lane_map.get(key)
        
        if not pricing:
            pricing = _fuzzy_match_lane(
                t.partner_id, t.pickup_location_id, t.dropoff_location_id, norm_wt,
                lane_map, client_map, loc_map
            )

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

    loc_map, _, vendor_map = await _load_maps_for_fuzzy(session)
    result: dict[int, int] = {}
    for t in trips:
        norm_wt = _normalize_work_type(t.work_type)
        key = (t.partner_id, t.pickup_location_id, t.dropoff_location_id, norm_wt)
        pricing = lane_map.get(key)
        
        if not pricing:
            pricing = _fuzzy_match_lane(
                t.partner_id, t.pickup_location_id, t.dropoff_location_id, norm_wt,
                lane_map, vendor_map, loc_map
            )

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

    loc_map, client_map, _ = await _load_maps_for_fuzzy(session)
    result: dict[int, int] = {}
    for t in trips:
        norm_wt = _normalize_work_type(t.work_type)
        key = (t.partner_id, t.pickup_location_id, t.dropoff_location_id, norm_wt)
        pricing = lane_map.get(key)
        
        if not pricing:
            pricing = _fuzzy_match_lane(
                t.partner_id, t.pickup_location_id, t.dropoff_location_id, norm_wt,
                lane_map, client_map, loc_map
            )

        result[t.id] = _salary_for_cont_type(pricing, t.cont_type) if pricing else 0

    return result


async def sync_unmatched_trip_pricing(
    session: AsyncSession,
    client_id: int,
    pickup_location_id: int,
    dropoff_location_id: int,
    work_type: str,
) -> int:
    """Re-estimate revenue and driver salary for unmatched trips when RoutePricing changes.

    Finds all unmatched DeliveredTrips matching the pricing key and updates
    their driver_salary and revenue from the RoutePricing columns.

    Returns the number of trips updated.
    """
    norm_wt = _normalize_work_type(work_type)
    pricing = (await session.execute(
        select(ClientRoutePricingORM).where(
            ClientRoutePricingORM.client_id == client_id,
            ClientRoutePricingORM.pickup_location_id == pickup_location_id,
            ClientRoutePricingORM.dropoff_location_id == dropoff_location_id,
            ClientRoutePricingORM.work_type == norm_wt,
            ClientRoutePricingORM.is_active.is_(True),
        ).limit(1)
    )).scalar_one_or_none()

    if not pricing:
        return 0

    trips = (await session.execute(
        select(DeliveredTripORM).where(
            DeliveredTripORM.booked_trip_id.is_(None),
            DeliveredTripORM.client_id == client_id,
            DeliveredTripORM.pickup_location_id == pickup_location_id,
            DeliveredTripORM.dropoff_location_id == dropoff_location_id,
        )
    )).scalars().all()
    # We filter trips manually since work_type might not match exactly before normalization
    trips = [t for t in trips if _normalize_work_type(t.work_type) == norm_wt]

    updated = 0
    for trip in trips:
        changed = False
        salary = _salary_for_cont_type(pricing, trip.cont_type)
        if salary != trip.driver_salary:
            trip.driver_salary = salary
            changed = True
            
        rev = _price_for_cont_type(pricing, trip.cont_type)
        if rev != trip.revenue:
            trip.revenue = rev
            changed = True
            
        if changed:
            updated += 1

    if updated:
        await session.flush()

    return updated


async def sync_all_trip_pricing(session: AsyncSession) -> int:
    """Universal sync: update ALL delivered trips with latest pricing.

    - Matched and unmatched trips: update both revenue and driver_salary
    """
    stmt = select(DeliveredTripORM)
    all_trips = (await session.execute(stmt)).scalars().all()
    if not all_trips:
        return 0

    updated = 0

    client_infos = [
        TripPriceInfo(
            id=t.id, partner_id=t.client_id,
            pickup_location_id=t.pickup_location_id,
            dropoff_location_id=t.dropoff_location_id,
            work_type=t.work_type, cont_type=t.cont_type,
        )
        for t in all_trips
    ]
    client_prices = await lookup_client_prices(session, client_infos) if client_infos else {}

    driver_infos = [
        TripPriceInfo(
            id=t.id, partner_id=t.client_id,
            pickup_location_id=t.pickup_location_id,
            dropoff_location_id=t.dropoff_location_id,
            work_type=t.work_type, cont_type=t.cont_type,
        )
        for t in all_trips if not t.vendor_id
    ]
    driver_salaries = await lookup_driver_salaries(session, driver_infos) if driver_infos else {}

    vendor_infos = [
        TripPriceInfo(
            id=t.id, partner_id=t.vendor_id,
            pickup_location_id=t.pickup_location_id,
            dropoff_location_id=t.dropoff_location_id,
            work_type=t.work_type, cont_type=t.cont_type,
        )
        for t in all_trips if t.vendor_id
    ]
    vendor_prices = await lookup_vendor_prices(session, vendor_infos) if vendor_infos else {}

    for t in all_trips:
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
            t.updated_at = utcnow()
            updated += 1

    if updated > 0:
        await session.flush()

    return updated
