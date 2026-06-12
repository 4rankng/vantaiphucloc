"""Auto-match algorithm for matching DeliveredTrips <-> BookedTrips.

Adapted from the legacy match_suggester to work with the flat schema
(single cont_number per trip instead of junction tables).

Eight weighted matching criteria:

  1. Container number (0.28) — strongest identifier, graduated scoring
  2. Pickup location (0.14) — key route discriminator
  3. Dropoff location (0.14) — key route discriminator
  4. Trip date (0.12) — same date is a strong signal
  5. Container type / work_type (0.10) — E20/E40/F20/F40 narrows matches
  6. Vessel number (0.10) — strong for XUẤT/NHẬP TÀU operations
  7. Vehicle plate (0.07) — links to specific truck/driver
  8. Customer / client (0.05) — coarse filter only

Date is also used for SQL pre-filter (±30 days) to narrow the candidate
pool. Drivers often forget to update trip_date, so the buffer is
intentionally wide to avoid missing valid matches.

Weight redistribution: when vessel/plate is NULL on both sides, its
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
from app.models.operation_type import OperationType, OperationTypeAlias
from app.utils.iso6346 import normalize_container_number
from app.utils.fuzzy import container_edit_distance, levenshtein_distance
from app.contexts.operations.infrastructure.operation_type_resolver import normalize_operation_type


WEIGHTS = {
    "container_number": 0.28,
    "pickup_location": 0.14,
    "dropoff_location": 0.14,
    "trip_date": 0.12,
    "work_type": 0.10,
    "vessel": 0.10,
    "vehicle_plate": 0.07,
    "client": 0.05,
}


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


async def _load_operation_type_aliases(db: AsyncSession) -> dict[str, str]:
    """Map any normalized work_type (alias or canonical) → normalized canonical name."""
    from app.contexts.operations.infrastructure.operation_type_resolver import normalize_operation_type
    types = (await db.execute(select(OperationType))).scalars().all()
    alias_rows = (await db.execute(
        select(OperationTypeAlias.alias_normalized, OperationTypeAlias.operation_type_id)
    )).all()

    # type_id → normalized canonical name
    type_names = {t.id: normalize_operation_type(t.name) for t in types}

    # everything → normalized canonical name
    alias_map: dict[str, str] = {}
    for t in types:
        norm = normalize_operation_type(t.name)
        if norm:
            alias_map[norm] = norm  # canonical maps to itself
    for alias_norm, type_id in alias_rows:
        canonical_norm = type_names.get(type_id)
        if canonical_norm:
            alias_map[alias_norm] = canonical_norm
    return alias_map


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
    wt_alias_map: dict[str, str],
) -> tuple[list[str], float]:
    # Work type: no hard gate — just affects scoring weight.
    # Different work_type lowers the score but doesn't reject the match.

    matched_fields: list[str] = []
    score = 0.0

    vessel_missing = not (to.vessel or wo.vessel)
    vehicle_missing = not (to.vehicle_plate or wo.vehicle_plate)
    work_type_missing = not (normalize_operation_type(to.work_type) or normalize_operation_type(wo.work_type))

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

    # 4. Trip date — same date is a strong signal
    if wo.trip_date and to.trip_date:
        delta = abs((wo.trip_date - to.trip_date).days)
        if delta == 0:
            matched_fields.append("trip_date")
            score += w.get("trip_date", 0)
        elif delta <= 1:
            matched_fields.append("trip_date_offby1")
            score += w.get("trip_date", 0) * 0.5

    # 5. Container type (work_type) — normalized comparison with alias resolution
    if not work_type_missing:
        to_wt = normalize_operation_type(to.work_type)
        wo_wt = normalize_operation_type(wo.work_type)
        if to_wt and wo_wt:
            if to_wt == wo_wt:
                matched_fields.append("work_type")
                score += w.get("work_type", 0)
            else:
                # Check alias resolution — partial credit if same canonical type
                to_canonical = wt_alias_map.get(to_wt)
                wo_canonical = wt_alias_map.get(wo_wt)
                if to_canonical and wo_canonical and to_canonical == wo_canonical:
                    matched_fields.append("work_type_alias")
                    score += w.get("work_type", 0) * 0.7

    # 6. Vessel
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
            else:
                dist = levenshtein_distance(to_vessel, wo_vessel)
                max_dist = max(2, int(min(len(to_vessel), len(wo_vessel)) * 0.1))
                if 0 < dist <= max_dist:
                    matched_fields.append("vessel_fuzzy")
                    score += w.get("vessel", 0) * 0.5

    # 7. Vehicle plate
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
            else:
                dist = levenshtein_distance(to_plate, wo_plate)
                if dist == 1:
                    matched_fields.append("vehicle_plate_fuzzy")
                    score += w.get("vehicle_plate", 0) * 0.7

    # 8. Client
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

    # Load booked trips in date range — exclude those already matched to a
    # DeliveredTrip, otherwise the preview shows candidates that confirm_matches
    # will always reject ("BookedTrip#X already claimed").
    matched_bt_subq = (
        select(DeliveredTripORM.booked_trip_id)
        .where(DeliveredTripORM.booked_trip_id.isnot(None))
        .distinct()
    )
    to_query = select(BookedTripORM).where(BookedTripORM.id.notin_(matched_bt_subq))
    if date_from:
        to_query = to_query.where(BookedTripORM.trip_date >= date_from - timedelta(days=30))
    if date_to:
        to_query = to_query.where(BookedTripORM.trip_date <= date_to + timedelta(days=30))
    booked_trips = list((await db.execute(to_query)).scalars().all())

    alias_groups = await _load_alias_groups(db)
    wt_alias_map = await _load_operation_type_aliases(db)

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
            matched_fields, score = _score_pair(wo, to, alias_groups, wt_alias_map)
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


SYNCABLE_FIELDS = [
    "vessel",
    "vehicle_plate",
    "work_type",
    "cont_number",
    "client_id",
    "pickup_location_id",
    "dropoff_location_id",
    "trip_date",
]


async def confirm_matches(
    db: AsyncSession,
    pairs: list[tuple[int, int, str | None, dict[str, str] | None, float | None]],
) -> dict:
    """Commit matched pairs: set matched=True, sync fields, and apply pricing.

    Each pair is (wo_id, to_id, sync_source, field_choices, score).
    sync_source: "delivered" | "booked" | None.
    score: optional matching score from preview; used to resolve conflicts
        when several DeliveredTrips target the same BookedTrip — the pair
        with the highest score wins, the rest are skipped.

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

    # Resolve BookedTrips that are already matched in DB so we never double-match.
    # (DeliveredTrips already matched are checked per-row below.)
    requested_to_ids = {to_id for _, to_id, _, _, _ in pairs if to_id is not None}
    db_matched_to_ids: set[int] = set()
    if requested_to_ids:
        matched_to_rows = (await db.execute(
            select(WO.booked_trip_id).where(
                WO.booked_trip_id.in_(requested_to_ids),
                WO.booked_trip_id.isnot(None),
            ).distinct()
        )).scalars().all()
        db_matched_to_ids = {tid for tid in matched_to_rows if tid is not None}

    # Sort by score desc so the highest-scoring claim for each BookedTrip
    # is processed first. Pairs without a score get 0.0 (lose all ties).
    sorted_pairs = sorted(
        pairs,
        key=lambda p: (p[4] if p[4] is not None else 0.0),
        reverse=True,
    )

    matched_count = 0
    errors: list[str] = []
    matched_pairs: list[tuple] = []
    claimed_to_ids: set[int] = set()

    for wo_id, to_id, sync_source, field_choices, _score in sorted_pairs:
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
        if to_id in claimed_to_ids or to_id in db_matched_to_ids:
            # Skip — this BookedTrip has already been claimed in this batch
            # (by a higher-scoring pair) or is already matched in DB.
            errors.append(
                f"BookedTrip#{to_id} already claimed by a higher-scoring match"
            )
            continue

        for field in SYNCABLE_FIELDS:
            if field == "vehicle_plate":
                fe_field = "vehiclePlate"
            elif field == "work_type":
                fe_field = "workType"
            elif field == "cont_number":
                fe_field = "contNumber"
            elif field == "client_id":
                fe_field = "clientName"
            elif field == "pickup_location_id":
                fe_field = "pickupName"
            elif field == "dropoff_location_id":
                fe_field = "dropoffName"
            elif field == "trip_date":
                fe_field = "tripDate"
            else:
                fe_field = field

            choice = field_choices.get(fe_field) if field_choices else None
            if not choice:
                choice = sync_source

            if choice == "delivered":
                setattr(to, field, getattr(wo, field))
            elif choice == "booked":
                setattr(wo, field, getattr(to, field))
            else:
                wo_val = getattr(wo, field)
                to_val = getattr(to, field)
                if wo_val and not to_val:
                    setattr(to, field, wo_val)
                elif to_val and not wo_val:
                    setattr(wo, field, to_val)

        wo.booked_trip_id = to.id
        matched_count += 1
        matched_pairs.append((wo, to))
        claimed_to_ids.add(to_id)

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
            if wo.vendor_id
        ]
        if vendor_infos:
            vendor_prices = await lookup_vendor_prices(db, vendor_infos)
            for wo, _ in matched_pairs:
                vprice = vendor_prices.get(wo.id, 0)
                if vprice:
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
            if not wo.vendor_id
        ]
        if driver_infos:
            driver_salaries = await lookup_driver_salaries(db, driver_infos)
            for wo, _ in matched_pairs:
                sal = driver_salaries.get(wo.id, 0)
                if sal:
                    wo.driver_salary = sal

    await db.flush()

    return {"matched_count": matched_count, "errors": errors}


async def backfill_vendor_driver_salary(
    db: AsyncSession,
    date_from: date | str | None = None,
    date_to: date | str | None = None,
) -> int:
    """Backfill driver_salary for matched vendor trips that have it = 0.

    These trips were either matched before ``lookup_vendor_prices`` was wired
    into ``confirm_matches``, or imported via the vendor reconciliation Excel
    with freight_charge missing/empty. Re-runs the VendorRoutePricing lookup
    and sets driver_salary when a price is found.

    Returns the number of rows updated.
    """
    from app.models.domain import DeliveredTrip as WO
    from app.core.pricing_lookup import (
        TripPriceInfo,
        lookup_vendor_prices,
    )

    if isinstance(date_from, str):
        date_from = date.fromisoformat(date_from)
    if isinstance(date_to, str):
        date_to = date.fromisoformat(date_to)

    stmt = select(WO).where(
        WO.booked_trip_id.isnot(None),
        WO.vendor_id.is_not(None),
        WO.driver_salary == 0,
    )
    if date_from is not None:
        stmt = stmt.where(WO.trip_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(WO.trip_date <= date_to)

    wos = (await db.execute(stmt)).scalars().all()
    if not wos:
        return 0

    infos = [
        TripPriceInfo(
            id=wo.id,
            partner_id=wo.vendor_id,
            pickup_location_id=wo.pickup_location_id,
            dropoff_location_id=wo.dropoff_location_id,
            work_type=wo.work_type,
            cont_type=wo.cont_type,
        )
        for wo in wos
    ]
    prices = await lookup_vendor_prices(db, infos)

    updated = 0
    for wo in wos:
        new_sal = prices.get(wo.id, 0)
        if new_sal > 0 and wo.driver_salary != new_sal:
            wo.driver_salary = new_sal
            updated += 1

    if updated > 0:
        await db.commit()
    return updated


async def sync_matched_trips_pricing(
    db: AsyncSession,
    date_from: date | str,
    date_to: date | str,
) -> int:
    """Update pricing (revenue and driver salary) for already matched DeliveredTrips
    occurring within the specified date range based on the active RoutePricing
    and VendorRoutePricing records.
    """
    from datetime import date, datetime, timezone
    from sqlalchemy import select, and_
    from app.models.domain import DeliveredTrip as WO
    from app.core.pricing_lookup import (
        TripPriceInfo,
        lookup_client_prices,
        lookup_driver_salaries,
        lookup_vendor_prices,
    )

    if isinstance(date_from, str):
        date_from = date.fromisoformat(date_from)
    if isinstance(date_to, str):
        date_to = date.fromisoformat(date_to)

    stmt = (
        select(WO)
        .where(
            and_(
                WO.booked_trip_id.isnot(None),
                WO.trip_date >= date_from,
                WO.trip_date <= date_to,
            )
        )
    )
    wos = (await db.execute(stmt)).scalars().all()
    if not wos:
        return 0

    client_infos = [
        TripPriceInfo(
            id=wo.id,
            partner_id=wo.client_id,
            pickup_location_id=wo.pickup_location_id,
            dropoff_location_id=wo.dropoff_location_id,
            work_type=wo.work_type,
            cont_type=wo.cont_type,
        )
        for wo in wos
    ]
    client_prices = await lookup_client_prices(db, client_infos)

    vendor_infos = [
        TripPriceInfo(
            id=wo.id,
            partner_id=wo.vendor_id,
            pickup_location_id=wo.pickup_location_id,
            dropoff_location_id=wo.dropoff_location_id,
            work_type=wo.work_type,
            cont_type=wo.cont_type,
        )
        for wo in wos
        if wo.vendor_id
    ]
    vendor_prices = await lookup_vendor_prices(db, vendor_infos) if vendor_infos else {}

    driver_infos = [
        TripPriceInfo(
            id=wo.id,
            partner_id=wo.client_id,
            pickup_location_id=wo.pickup_location_id,
            dropoff_location_id=wo.dropoff_location_id,
            work_type=wo.work_type,
            cont_type=wo.cont_type,
        )
        for wo in wos
        if not wo.vendor_id
    ]
    driver_salaries = await lookup_driver_salaries(db, driver_infos) if driver_infos else {}

    updated_count = 0
    for wo in wos:
        changed = False

        # 1. Update revenue
        new_rev = client_prices.get(wo.id, 0)
        if new_rev > 0 and wo.revenue != new_rev:
            wo.revenue = new_rev
            changed = True

        # 2. Update driver salary (cost)
        if wo.vendor_id:
            new_sal = vendor_prices.get(wo.id, 0)
        else:
            new_sal = driver_salaries.get(wo.id, 0)

        if new_sal > 0 and wo.driver_salary != new_sal:
            wo.driver_salary = new_sal
            changed = True

        if changed:
            wo.updated_at = datetime.now(timezone.utc)
            updated_count += 1

    if updated_count > 0:
        await db.commit()

    return updated_count

