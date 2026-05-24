"""Auto-match algorithm for matching DeliveredTrips <-> BookedTrips.

Adapted from the legacy match_suggester to work with the flat schema
(single cont_number per trip instead of junction tables).

Seven weighted matching criteria:

  1. Container number (0.30) — strongest identifier, graduated scoring
  2. Pickup location (0.15) — key route discriminator
  3. Dropoff location (0.15) — key route discriminator
  4. Container type / work_type (0.12) — E20/E40/F20/F40 narrows matches
  5. Vessel number (0.12) — strong for XUẤT/NHẬP TÀU operations
  6. Vehicle plate (0.10) — links to specific truck/driver
  7. Customer / client (0.06) — coarse filter only

Date is NOT a scoring criterion — used only for SQL pre-filter (±30 days).

Weight redistribution: when vessel is NULL on both sides, its 0.12
weight is redistributed proportionally to the other criteria.

Confidence buckets:
  - score >= 0.8  -> "full"     (auto-confirm candidate)
  - score >= 0.6  -> "partial"  (manual review)
  - else          -> "none"     (still surfaced if any field matched)
"""

from __future__ import annotations

import re
from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    DeliveredTrip as DeliveredTripORM,
    BookedTrip as BookedTripORM,
    LocationAlias,
)
from app.utils.iso6346 import normalize_container_number
from app.utils.fuzzy import container_edit_distance
from app.utils.fuzzy_thresholds import get_thresholds


WEIGHTS = {
    "container_number": 0.30,
    "pickup_location": 0.15,
    "dropoff_location": 0.15,
    "work_type": 0.12,
    "vessel": 0.12,
    "vehicle_plate": 0.10,
    "client": 0.06,
}

_WORK_TYPE_ALIASES = {
    "CHUYỂN BÃI": "CHUYEN_BAI",
    "CHUYỂN BÃI ".strip(): "CHUYEN_BAI",
}


def _normalize_work_type(wt: str | None) -> str | None:
    if not wt:
        return wt
    return _WORK_TYPE_ALIASES.get(wt, wt)


_CONTAINER_EXACT = 1.0
_CONTAINER_1CHAR = 0.8
_CONTAINER_2CHAR = 0.55
_CONTAINER_DIGITS_ONLY = 0.3

FULL_MATCH_THRESHOLD = 0.8
POTENTIAL_MATCH_THRESHOLD = 0.6
MIN_MATCH_THRESHOLD = 0.3


def _effective_weights(
    *,
    vessel_missing: bool = False,
    work_type_missing: bool = False,
    vehicle_missing: bool = False,
) -> dict[str, float]:
    w = dict(WEIGHTS)
    missing_total = 0.0
    if vessel_missing:
        missing_total += w.pop("vessel")
    if work_type_missing:
        missing_total += w.pop("work_type")
    if vehicle_missing:
        missing_total += w.pop("vehicle_plate")
    if missing_total > 0 and w:
        active_total = sum(w.values())
        if active_total > 0:
            for k in w:
                w[k] += missing_total * (w[k] / active_total)
    return w


async def _load_alias_groups(db: AsyncSession) -> dict[int, set[int]]:
    rows = (await db.execute(
        select(LocationAlias.location_id, LocationAlias.alias_normalized)
    )).all()
    alias_to_locs: dict[str, set[int]] = {}
    for loc_id, alias_norm in rows:
        alias_to_locs.setdefault(alias_norm, set()).add(loc_id)
    groups: dict[int, set[int]] = {}
    for loc_ids in alias_to_locs.values():
        if len(loc_ids) < 2:
            continue
        merged = set(loc_ids)
        for lid in loc_ids:
            if lid in groups:
                merged |= groups[lid]
        for lid in merged:
            groups[lid] = merged
    return groups


def _locations_match(
    id_a: int | None,
    id_b: int | None,
    alias_groups: dict[int, set[int]],
) -> bool:
    if id_a is None or id_b is None:
        return False
    if id_a == id_b:
        return True
    group = alias_groups.get(id_a)
    return group is not None and id_b in group


def _confidence(score: float) -> str:
    if score >= FULL_MATCH_THRESHOLD:
        return "full"
    if score >= POTENTIAL_MATCH_THRESHOLD:
        return "partial"
    return "none"


def _score_pair(
    wo: DeliveredTripORM,
    to: BookedTripORM,
    alias_groups: dict[int, set[int]],
) -> tuple[list[str], float]:
    matched_fields: list[str] = []
    score = 0.0

    vessel_missing = not (to.vessel or wo.vessel)
    vehicle_missing = not (to.vehicle_plate or wo.vehicle_plate)
    work_type_missing = not (_normalize_work_type(to.work_type) or _normalize_work_type(wo.work_type))

    w = _effective_weights(
        vessel_missing=vessel_missing,
        vehicle_missing=vehicle_missing,
        work_type_missing=work_type_missing,
    )

    # 1. Container number — graduated scoring
    wo_cn = normalize_container_number(wo.cont_number) if wo.cont_number else None
    to_cn = normalize_container_number(to.cont_number) if to.cont_number else None

    if wo_cn and to_cn:
        if wo_cn == to_cn:
            matched_fields.append("container_number")
            score += w.get("container_number", 0) * _CONTAINER_EXACT
        else:
            dist = container_edit_distance(wo_cn, to_cn)
            if dist is not None:
                if dist == 1:
                    matched_fields.append("container_number_fuzzy")
                    score += w.get("container_number", 0) * _CONTAINER_1CHAR
                elif dist == 2:
                    matched_fields.append("container_number_fuzzy")
                    score += w.get("container_number", 0) * _CONTAINER_2CHAR
                else:
                    wo_digits = re.sub(r'[^0-9]', '', wo_cn)
                    to_digits = re.sub(r'[^0-9]', '', to_cn)
                    if wo_digits and to_digits and wo_digits == to_digits:
                        matched_fields.append("container_number_partial")
                        score += w.get("container_number", 0) * _CONTAINER_DIGITS_ONLY

    # 2. Pickup location
    if _locations_match(wo.pickup_location_id, to.pickup_location_id, alias_groups):
        matched_fields.append("pickup_location")
        score += w.get("pickup_location", 0)

    # 3. Dropoff location
    if _locations_match(wo.dropoff_location_id, to.dropoff_location_id, alias_groups):
        matched_fields.append("dropoff_location")
        score += w.get("dropoff_location", 0)

    # 4. Container type (work_type) — normalized comparison
    if not work_type_missing:
        to_wt = _normalize_work_type(to.work_type)
        wo_wt = _normalize_work_type(wo.work_type)
        if to_wt and wo_wt and to_wt == wo_wt:
            matched_fields.append("work_type")
            score += w.get("work_type", 0)

    # 5. Vessel
    if not vessel_missing:
        to_vessel = (to.vessel or "").upper().strip()
        wo_vessel = (wo.vessel or "").upper().strip()
        if to_vessel and wo_vessel:
            if to_vessel == wo_vessel:
                matched_fields.append("vessel")
                score += w.get("vessel", 0)
            elif to_vessel in wo_vessel or wo_vessel in to_vessel:
                matched_fields.append("vessel")
                score += w.get("vessel", 0) * 0.67

    # 6. Vehicle plate
    if not vehicle_missing:
        to_plate = (to.vehicle_plate or "").upper().replace(" ", "").replace("-", "")
        wo_plate = (wo.vehicle_plate or "").upper().replace(" ", "").replace("-", "")
        if to_plate and wo_plate:
            if to_plate == wo_plate:
                matched_fields.append("vehicle_plate")
                score += w.get("vehicle_plate", 0)
            elif re.sub(r'[^0-9]', '', to_plate) == re.sub(r'[^0-9]', '', wo_plate):
                matched_fields.append("vehicle_plate")
                score += w.get("vehicle_plate", 0) * 0.6

    # 7. Client
    if to.client_id == wo.client_id:
        matched_fields.append("client")
        score += w.get("client", 0)

    return matched_fields, score


# ── Public API ──


async def auto_match_preview(
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict:
    """Find match candidates between unmatched DeliveredTrips and BookedTrips.

    Returns a dict with candidates, unmatched count, and stats.
    Does NOT commit any changes.
    """
    # Load unmatched delivered trips
    wo_query = select(DeliveredTripORM).where(DeliveredTripORM.booked_trip_id.is_(None))
    if date_from:
        wo_query = wo_query.where(
            or_(
                DeliveredTripORM.trip_date >= date_from,
                (DeliveredTripORM.trip_date == None) & (DeliveredTripORM.created_at >= date_from),  # noqa: E711
            )
        )
    if date_to:
        wo_query = wo_query.where(
            or_(
                DeliveredTripORM.trip_date <= date_to,
                (DeliveredTripORM.trip_date == None) & (DeliveredTripORM.created_at <= date_to),  # noqa: E711
            )
        )
    delivered_trips = list((await db.execute(wo_query)).scalars().all())

    if not delivered_trips:
        return {"candidates": [], "unmatched_count": 0, "scanned_count": 0}

    # Load booked trips in date range
    to_query = select(BookedTripORM)
    if date_from:
        to_query = to_query.where(BookedTripORM.trip_date >= date_from - timedelta(days=30))
    if date_to:
        to_query = to_query.where(BookedTripORM.trip_date <= date_to + timedelta(days=30))
    booked_trips = list((await db.execute(to_query)).scalars().all())

    alias_groups = await _load_alias_groups(db)

    # Pre-filter by container number gate
    wo_by_container: dict[str, list[DeliveredTripORM]] = defaultdict(list)
    wo_by_digits: dict[str, list[DeliveredTripORM]] = defaultdict(list)
    for wo in delivered_trips:
        if wo.cont_number:
            cn = normalize_container_number(wo.cont_number)
            if cn:
                wo_by_container[cn].append(wo)
                digits = re.sub(r'[^0-9]', '', cn)
                if digits:
                    wo_by_digits[digits].append(wo)

    candidates = []
    matched_to_ids: set[int] = set()
    matched_wo_ids: set[int] = set()

    for to in booked_trips:
        if not to.cont_number:
            continue
        to_cn = normalize_container_number(to.cont_number)
        if not to_cn:
            continue

        # Find candidate WOs by container gate
        candidate_wos: list[DeliveredTripORM] = []
        if to_cn in wo_by_container:
            candidate_wos.extend(wo_by_container[to_cn])
        else:
            to_digits = re.sub(r'[^0-9]', '', to_cn)
            if to_digits and to_digits in wo_by_digits:
                candidate_wos.extend(wo_by_digits[to_digits])

        for wo in candidate_wos:
            if wo.id in matched_wo_ids:
                continue
            matched_fields, score = _score_pair(wo, to, alias_groups)
            if score < MIN_MATCH_THRESHOLD:
                continue

            candidates.append({
                "delivered_trip_id": wo.id,
                "booked_trip_id": to.id,
                "score": round(score, 4),
                "confidence": _confidence(score),
                "matched_fields": matched_fields,
                "delivered": {
                    "trip_date": wo.trip_date.isoformat() if wo.trip_date else None,
                    "cont_number": wo.cont_number,
                    "client_id": wo.client_id,
                    "pickup_location_id": wo.pickup_location_id,
                    "dropoff_location_id": wo.dropoff_location_id,
                    "work_type": wo.work_type,
                    "vessel": wo.vessel,
                    "vehicle_plate": wo.vehicle_plate,
                },
                "booked": {
                    "trip_date": to.trip_date.isoformat() if to.trip_date else None,
                    "cont_number": to.cont_number,
                    "client_id": to.client_id,
                    "pickup_location_id": to.pickup_location_id,
                    "dropoff_location_id": to.dropoff_location_id,
                    "work_type": to.work_type,
                    "vessel": to.vessel,
                    "vehicle_plate": to.vehicle_plate,
                },
            })

            if score >= FULL_MATCH_THRESHOLD:
                matched_wo_ids.add(wo.id)
                matched_to_ids.add(to.id)

    # Sort by score descending
    candidates.sort(key=lambda c: c["score"], reverse=True)

    return {
        "candidates": candidates,
        "unmatched_count": len(delivered_trips),
        "scanned_count": len(delivered_trips),
    }


SYNCABLE_FIELDS = ["vessel", "vehicle_plate", "work_type"]


async def confirm_matches(
    db: AsyncSession,
    pairs: list[tuple[int, int, str | None]],
) -> dict:
    """Commit matched pairs: set matched=True, sync fields, and apply pricing.

    Each pair is (wo_id, to_id, sync_source).
    sync_source: "delivered" | "booked" | None.

    After matching, auto-populates:
      - DeliveredTrip.revenue from RoutePricing (client, lane, work_type, cont_type)
      - DeliveredTrip.driver_salary from VendorRoutePricing (if vendor_id is set)
      - DeliveredTrip.driver_salary from RoutePricing salary columns (own-driver trips)

    Returns {matched_count, errors}.
    """
    from app.models.domain import DeliveredTrip as WO, BookedTrip as TO
    from app.core.pricing_lookup import (
        TripPriceInfo,
        lookup_client_prices,
        lookup_driver_salaries,
        lookup_vendor_prices,
    )

    matched_count = 0
    errors: list[str] = []
    matched_pairs: list[tuple] = []

    for wo_id, to_id, sync_source in pairs:
        wo = (await db.execute(
            select(WO).where(WO.id == wo_id)
        )).scalar_one_or_none()
        to = (await db.execute(
            select(TO).where(TO.id == to_id)
        )).scalar_one_or_none()

        if not wo:
            errors.append(f"DeliveredTrip#{wo_id} not found")
            continue
        if not to:
            errors.append(f"BookedTrip#{to_id} not found")
            continue
        if wo.booked_trip_id is not None:
            errors.append(f"DeliveredTrip#{wo_id} already matched")
            continue

        if sync_source == "delivered":
            for field in SYNCABLE_FIELDS:
                setattr(to, field, getattr(wo, field))
        elif sync_source == "booked":
            for field in SYNCABLE_FIELDS:
                setattr(wo, field, getattr(to, field))
        else:
            for field in SYNCABLE_FIELDS:
                wo_val = getattr(wo, field)
                to_val = getattr(to, field)
                if wo_val and not to_val:
                    setattr(to, field, wo_val)
                elif to_val and not wo_val:
                    setattr(wo, field, to_val)

        wo.booked_trip_id = to.id
        matched_count += 1
        matched_pairs.append((wo, to))

    # Auto-populate pricing for matched DeliveredTrips
    if matched_pairs:
        client_infos = [
            TripPriceInfo(
                id=wo.id,
                partner_id=wo.client_id,
                pickup_location_id=wo.pickup_location_id,
                dropoff_location_id=wo.dropoff_location_id,
                work_type=wo.work_type,
                cont_type=wo.cont_type,
            )
            for wo, _ in matched_pairs
            if wo.revenue == 0
        ]
        if client_infos:
            client_prices = await lookup_client_prices(db, client_infos)
            for wo, _ in matched_pairs:
                price = client_prices.get(wo.id, 0)
                if price and wo.revenue == 0:
                    wo.revenue = price

        vendor_infos = [
            TripPriceInfo(
                id=wo.id,
                partner_id=wo.vendor_id,
                pickup_location_id=wo.pickup_location_id,
                dropoff_location_id=wo.dropoff_location_id,
                work_type=wo.work_type,
                cont_type=wo.cont_type,
            )
            for wo, _ in matched_pairs
            if wo.vendor_id and wo.driver_salary == 0
        ]
        if vendor_infos:
            vendor_prices = await lookup_vendor_prices(db, vendor_infos)
            for wo, _ in matched_pairs:
                vprice = vendor_prices.get(wo.id, 0)
                if vprice and wo.driver_salary == 0:
                    wo.driver_salary = vprice

        # Own-driver salary from RoutePricing driver salary columns
        driver_infos = [
            TripPriceInfo(
                id=wo.id,
                partner_id=wo.client_id,
                pickup_location_id=wo.pickup_location_id,
                dropoff_location_id=wo.dropoff_location_id,
                work_type=wo.work_type,
                cont_type=wo.cont_type,
            )
            for wo, _ in matched_pairs
            if not wo.vendor_id and wo.driver_salary == 0
        ]
        if driver_infos:
            driver_salaries = await lookup_driver_salaries(db, driver_infos)
            for wo, _ in matched_pairs:
                sal = driver_salaries.get(wo.id, 0)
                if sal and wo.driver_salary == 0:
                    wo.driver_salary = sal

    await db.flush()

    return {"matched_count": matched_count, "errors": errors}
