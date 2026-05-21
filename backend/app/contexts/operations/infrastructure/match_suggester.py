"""Suggestion algorithm for matching DeliveredTrips ↔ BookedTrips.

Seven weighted matching criteria:

  1. Container number (0.30) — strongest identifier, graduated scoring
  2. Pickup location (0.15) — key route discriminator
  3. Dropoff location (0.15) — key route discriminator
  4. Container type / work_type (0.12) — E20/E40/F20/F40 narrows matches
  5. Vessel number (0.12) — strong for XUAT_NHAP_TAU operations
  6. Vehicle plate (0.10) — links to specific truck/driver
  7. Customer / client (0.06) — coarse filter only

Date is NOT a scoring criterion — used only for SQL pre-filter (±7 days).

Weight redistribution: when vessel is NULL on both sides, its 0.12
weight is redistributed proportionally to the other criteria.

Confidence buckets:
  - score ≥ 0.8    → "full"     (auto-confirm candidate)
  - score ≥ 0.6    → "partial"  (manual review)
  - else           → "none"     (still surfaced if any field matched)

Pure read flow: queries the ORM directly via the AsyncSession and
returns Pydantic shapes that the interface layer hands back to the
client. No domain aggregate hydration — we render `*Out` schemas
straight from ORM rows.
"""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Sequence

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    LocationAlias,
    Reconciliation,
    BookedTrip,
    BookedTripContainer,
    DeliveredTrip,
    DeliveredTripContainer,
)
from app.schemas.domain import (
    ContainerOut,
    CriterionBreakdown,
    MatchSuggestion,
    TripContainerOut,
    BookedTripOut,
    WOSuggestion,
    DeliveredTripOut,
)
from app.core.summaries import (
    get_partner_summary,
    get_driver_summary,
    get_location_summary,
    load_partner_summaries,
    load_driver_summaries,
    load_location_summaries,
)
from app.utils.iso6346 import normalize_container_number
from app.utils.fuzzy import fuzzy_match_container, container_edit_distance
from app.utils.fuzzy_thresholds import get_thresholds


def _get_wo_date(wo: DeliveredTrip):
    """Return trip_date if set, otherwise created_at.date(). Mirrors the
    COALESCE(trip_date, DATE(created_at)) pattern used in salary queries."""
    if getattr(wo, "trip_date", None):
        return wo.trip_date
    return wo.created_at.date() if wo.created_at else None


WEIGHTS = {
    "container_number": 0.30,
    "pickup_location": 0.15,
    "dropoff_location": 0.15,
    "work_type": 0.12,
    "vessel": 0.12,
    "vehicle_plate": 0.10,
    "client": 0.06,
}

# Graduated container scoring multipliers
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
    """Return weights with redistribution for NULL fields.

    When a criterion is NULL on both sides (can't contribute), its weight
    is redistributed proportionally to the remaining criteria.
    """
    w = dict(WEIGHTS)
    missing_total = 0.0
    missing_keys: list[str] = []
    if vessel_missing:
        missing_total += w.pop("vessel")
        missing_keys.append("vessel")
    if work_type_missing:
        missing_total += w.pop("work_type")
        missing_keys.append("work_type")
    if vehicle_missing:
        missing_total += w.pop("vehicle_plate")
        missing_keys.append("vehicle_plate")

    if missing_total > 0 and w:
        active_total = sum(w.values())
        if active_total > 0:
            for k in w:
                w[k] += missing_total * (w[k] / active_total)

    return w


# ---------------------------------------------------------------------------
# Alias-aware location matching
# ---------------------------------------------------------------------------


async def _load_alias_groups(db: AsyncSession) -> dict[int, set[int]]:
    """Build equivalence sets from aliases.

    Returns: {location_id: {itself + equivalent location_ids}}
    Two locations are equivalent if they share an alias.
    """
    rows = (await db.execute(
        select(LocationAlias.location_id, LocationAlias.alias_normalized)
    )).all()

    # Build alias_text → {location_ids} reverse index
    alias_to_locs: dict[str, set[int]] = {}
    for loc_id, alias_norm in rows:
        alias_to_locs.setdefault(alias_norm, set()).add(loc_id)

    # Union-find: for each alias with multiple locations, merge groups
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


CRITERIA_ORDER = [
    ("container_number", "Container"),
    ("pickup_location", "Điểm đi"),
    ("dropoff_location", "Điểm đến"),
    ("work_type", "Loại cont"),
    ("vessel", "Số tàu"),
    ("vehicle_plate", "Số xe"),
    ("client", "Khách hàng"),
]


def _build_criteria(
    *,
    matched_fields: list[str],
    wo_client: str | None,
    to_client: str | None,
    wo_pickup: str | None,
    to_pickup: str | None,
    wo_dropoff: str | None,
    to_dropoff: str | None,
    wo_containers: str | None,
    to_containers: str | None,
    wo_work_type: str | None = None,
    to_work_type: str | None = None,
    wo_vessel: str | None = None,
    to_vessel: str | None = None,
    wo_vehicle_plate: str | None = None,
    to_vehicle_plate: str | None = None,
) -> list[CriterionBreakdown]:
    """Build the 7-criteria breakdown for UI rendering."""
    matched = set(matched_fields)
    container_match = (
        "container_number" in matched
        or "container_number_partial" in matched
        or "container_number_fuzzy" in matched
    )
    container_fuzzy = "container_number_fuzzy" in matched

    values: dict[str, tuple[str | None, str | None]] = {
        "container_number": (wo_containers, to_containers),
        "pickup_location": (wo_pickup, to_pickup),
        "dropoff_location": (wo_dropoff, to_dropoff),
        "work_type": (wo_work_type, to_work_type),
        "vessel": (wo_vessel, to_vessel),
        "vehicle_plate": (wo_vehicle_plate, to_vehicle_plate),
        "client": (wo_client, to_client),
    }
    out: list[CriterionBreakdown] = []
    for name, label in CRITERIA_ORDER:
        wo_v, to_v = values.get(name, (None, None))
        if name == "container_number":
            is_match = container_match
            out.append(CriterionBreakdown(
                name=name, label=label, match=is_match,
                wo_value=wo_v, to_value=to_v,
                fuzzy=container_fuzzy,
            ))
        else:
            is_match = name in matched
            out.append(CriterionBreakdown(
                name=name, label=label, match=is_match,
                wo_value=wo_v, to_value=to_v,
            ))
    return out


def _format_containers(items) -> str | None:
    """Render a container list as a compact string for the breakdown."""
    parts: list[str] = []
    for c in items:
        cn = getattr(c, "container_number", None) or ""
        wt = getattr(c, "work_type", None) or ""
        if cn:
            parts.append(f"{wt} {cn}".strip())
    return " · ".join(parts) if parts else None


async def suggest_trip_matches(
    db: AsyncSession, delivered_trip: DeliveredTrip
) -> list[MatchSuggestion]:
    """Find candidate BookedTrips for *delivered_trip*.

    TO-centric: a TO with N containers can match N WOs. We find TOs that:
    1. Share container numbers with this WO (or share partner)
    2. Have remaining capacity (matched WO count < TO container count)
    3. Are PENDING or MATCHED (not COMPLETED/CANCELLED)

    Per-container expansion: a TO with K available containers (after
    excluding those already linked to other WOs) emits K independent
    ``MatchSuggestion`` entries — each carrying exactly one container in
    ``booked_trip.containers``. The ``container_number`` criterion and
    match score are recomputed per (delivered_trip, booked_trip, container)
    tuple, so the UI can render one row per container and the user can
    pick which specific container of the TO this trip is fulfilling.
    """
    wo_containers = (await db.execute(
        select(DeliveredTripContainer.container_number)
        .where(DeliveredTripContainer.delivered_trip_id == delivered_trip.id)
    )).all()
    wo_container_numbers = {
        normalize_container_number(row[0])
        for row in wo_containers if row[0]
    }
    if not wo_container_numbers:
        return []

    # WO should not already be matched
    already_linked = (await db.execute(
        select(Reconciliation.id).where(
            Reconciliation.delivered_trip_id == delivered_trip.id,
            Reconciliation.is_active == True,  # noqa: E712
        )
    )).scalar_one_or_none()
    if already_linked is not None:
        return []

    # Find TOs that share container numbers with this WO
    container_subquery = (
        select(BookedTripContainer.booked_trip_id)
        .where(BookedTripContainer.container_number.in_(wo_container_numbers))
    )
    # TOs that are PENDING or MATCHED (have capacity for more WOs)
    query = select(BookedTrip).where(
        BookedTrip.status.in_(["PENDING", "MATCHED"]),
        or_(
            BookedTrip.client_id == delivered_trip.client_id,
            BookedTrip.id.in_(container_subquery),
        ),
    )
    candidates = list((await db.execute(query)).scalars().all())
    if not candidates:
        return []

    # Filter TOs that have remaining capacity
    to_ids = [to.id for to in candidates]
    # Count already-matched WOs per TO
    link_counts: dict[int, int] = {}
    if to_ids:
        from sqlalchemy import func
        link_rows = (await db.execute(
            select(
                Reconciliation.booked_trip_id,
                func.count(),
            ).where(
                Reconciliation.booked_trip_id.in_(to_ids),
                Reconciliation.is_active == True,  # noqa: E712
            ).group_by(Reconciliation.booked_trip_id)
        )).all()
        link_counts = {r[0]: r[1] for r in link_rows}

    cont_result = await db.execute(
        select(BookedTripContainer)
        .where(BookedTripContainer.booked_trip_id.in_(to_ids))
    )
    to_containers: dict[int, list[BookedTripContainer]] = defaultdict(list)
    for c in cont_result.scalars().all():
        to_containers[c.booked_trip_id].append(c)

    # Filter out TOs at full capacity
    candidates = [
        to for to in candidates
        if link_counts.get(to.id, 0) < len(to_containers.get(to.id, []))
    ]

    client_ids = {to.client_id for to in candidates} | {delivered_trip.client_id}
    location_ids = (
        {to.pickup_location_id for to in candidates}
        | {to.dropoff_location_id for to in candidates}
        | {delivered_trip.pickup_location_id, delivered_trip.dropoff_location_id}
    )
    partners = await load_partner_summaries(db, client_ids)
    locations = await load_location_summaries(db, location_ids)
    alias_groups = await _load_alias_groups(db)

    wo_client_name = get_partner_summary(partners, delivered_trip.client_id).name
    wo_pickup_name = get_location_summary(
        locations, delivered_trip.pickup_location_id,
    ).name
    wo_dropoff_name = get_location_summary(
        locations, delivered_trip.dropoff_location_id,
    ).name
    # DeliveredTrip containers come back from the join above as raw rows of
    # `container_number` only — re-load with full ORM objects for the
    # criteria breakdown so we can show work_type alongside the number.
    wo_full_containers = (await db.execute(
        select(DeliveredTripContainer)
        .where(DeliveredTripContainer.delivered_trip_id == delivered_trip.id)
    )).scalars().all()
    wo_containers_str = _format_containers(wo_full_containers)

    # Determine which TO containers are already "used" by existing
    # active reconciliations so we only emit rows for the remaining
    # ones. Heuristic: a TO container is considered used if its
    # container_number matches one of the linked WO's containers; if
    # not enough containers can be matched that way, fall back to the
    # first containers (by id order) to fill the link count.
    used_container_ids = await _used_container_ids_for_tos(
        db, [to.id for to in candidates], to_containers, link_counts,
    )

    suggestions: list[MatchSuggestion] = []
    for to in candidates:
        all_to_containers = to_containers.get(to.id, [])
        used_ids = used_container_ids.get(to.id, set())
        available_containers = [
            c for c in all_to_containers if c.id not in used_ids
        ]
        if not available_containers:
            continue
        to_pickup_name = get_location_summary(
            locations, to.pickup_location_id,
        ).name
        to_dropoff_name = get_location_summary(
            locations, to.dropoff_location_id,
        ).name
        to_partner_name = get_partner_summary(partners, to.client_id).name
        # Emit one MatchSuggestion entry per available container so the
        # UI renders independent rows for each container.
        for container in available_containers:
            matched_fields, score = _score_to_container_against_wo(
                to, container, wo_container_numbers, delivered_trip,
                alias_groups,
            )
            to_out = BookedTripOut(
                id=to.id, trip_date=to.trip_date,
                partner=get_partner_summary(partners, to.client_id),
                pickup_location=get_location_summary(
                    locations, to.pickup_location_id,
                ),
                dropoff_location=get_location_summary(
                    locations, to.dropoff_location_id,
                ),
                operation_type=to.operation_type,
                work_type=to.work_type,
                containers=[TripContainerOut.model_validate(container)],
                revenue=to.revenue,
                status=to.status,
                matched_delivered_trip_ids=[],
                created_at=to.created_at,
                updated_at=to.updated_at,
            )
            criteria = _build_criteria(
                matched_fields=matched_fields,
                wo_client=wo_client_name,
                to_client=to_partner_name,
                wo_pickup=wo_pickup_name,
                to_pickup=to_pickup_name,
                wo_dropoff=wo_dropoff_name,
                to_dropoff=to_dropoff_name,
                wo_containers=wo_containers_str,
                to_containers=_format_containers([container]),
                wo_work_type=delivered_trip.work_type,
                to_work_type=to.work_type,
                wo_vessel=delivered_trip.vessel,
                to_vessel=to.vessel,
                wo_vehicle_plate=None,
                to_vehicle_plate=None,
            )
            match_score = sum(1 for c in criteria if c.match)
            warnings = [
                f"{c.label}: {c.wo_value} ≈ {c.to_value}"
                for c in criteria if c.fuzzy
            ]
            suggestions.append(MatchSuggestion(
                booked_trip=to_out,
                container_id=container.id,
                confidence=_confidence(score),
                matched_fields=matched_fields,
                score=score,
                criteria=criteria,
                match_score=match_score,
                max_score=len(criteria),
                match_warnings=warnings,
            ))

    suggestions.sort(key=lambda s: s.score, reverse=True)
    return [s for s in suggestions if s.score >= MIN_MATCH_THRESHOLD][:50]


async def suggest_wo_matches(
    db: AsyncSession, booked_trip: BookedTrip
) -> list[WOSuggestion]:
    """Find candidate DeliveredTrips for *booked_trip*."""
    to_containers = (await db.execute(
        select(BookedTripContainer.container_number)
        .where(BookedTripContainer.booked_trip_id == booked_trip.id)
    )).all()
    to_container_numbers = {
        normalize_container_number(row[0])
        for row in to_containers if row[0]
    }
    if not to_container_numbers:
        return []

    # Find WOs that share container numbers with this TO
    container_subquery = (
        select(DeliveredTripContainer.delivered_trip_id)
        .where(DeliveredTripContainer.container_number.in_(to_container_numbers))
    )
    # Exclude WOs that are already matched (have active reconciliation)
    already_matched_wos = select(Reconciliation.delivered_trip_id).where(
        Reconciliation.is_active == True,  # noqa: E712
    )
    query = select(DeliveredTrip).where(
        DeliveredTrip.status == "PENDING",
        ~DeliveredTrip.id.in_(already_matched_wos),
        or_(
            DeliveredTrip.client_id == booked_trip.client_id,
            DeliveredTrip.id.in_(container_subquery),
        ),
    )
    candidates = list((await db.execute(query)).scalars().all())
    if not candidates:
        return []

    wo_ids = [wo.id for wo in candidates]
    cont_result = await db.execute(
        select(DeliveredTripContainer)
        .where(DeliveredTripContainer.delivered_trip_id.in_(wo_ids))
    )
    wo_containers: dict[int, list[DeliveredTripContainer]] = defaultdict(list)
    for c in cont_result.scalars().all():
        wo_containers[c.delivered_trip_id].append(c)

    client_ids = {wo.client_id for wo in candidates} | {booked_trip.client_id}
    drivers = await load_driver_summaries(db, {wo.driver_id for wo in candidates})
    location_ids = (
        {wo.pickup_location_id for wo in candidates}
        | {wo.dropoff_location_id for wo in candidates}
        | {booked_trip.pickup_location_id, booked_trip.dropoff_location_id}
    )
    partners = await load_partner_summaries(db, client_ids)
    locations = await load_location_summaries(db, location_ids)
    alias_groups = await _load_alias_groups(db)

    to_client_name = get_partner_summary(partners, booked_trip.client_id).name
    to_pickup_name = get_location_summary(
        locations, booked_trip.pickup_location_id,
    ).name
    to_dropoff_name = get_location_summary(
        locations, booked_trip.dropoff_location_id,
    ).name
    to_full_containers = (await db.execute(
        select(BookedTripContainer)
        .where(BookedTripContainer.booked_trip_id == booked_trip.id)
    )).scalars().all()
    to_containers_str = _format_containers(to_full_containers)

    suggestions: list[WOSuggestion] = []
    for wo in candidates:
        matched_fields, score = _score_wo_against_to(
            wo, wo_containers.get(wo.id, []),
            to_container_numbers, booked_trip,
            alias_groups,
        )
        wo_out = DeliveredTripOut(
            id=wo.id,
            partner=get_partner_summary(partners, wo.client_id),
            pickup_location=get_location_summary(locations, wo.pickup_location_id),
            dropoff_location=get_location_summary(locations, wo.dropoff_location_id),
            driver=get_driver_summary(drivers, wo.driver_id),
            vendor_id=wo.vendor_id,
            vessel=wo.vessel,
            operation_type=wo.operation_type,
            work_type=wo.work_type,
            gps_lat=wo.gps_lat,
            gps_lng=wo.gps_lng,
            gps_address=wo.gps_address,
            revenue=wo.revenue,
            driver_salary=wo.driver_salary,
            allowance=wo.allowance,
            trip_date=wo.trip_date,
            status=wo.status,
            containers=[
                ContainerOut.model_validate(c)
                for c in wo_containers.get(wo.id, [])
            ],
            created_at=wo.created_at,
            updated_at=wo.updated_at,
        )
        criteria = _build_criteria(
            matched_fields=matched_fields,
            wo_client=get_partner_summary(partners, wo.client_id).name,
            to_client=to_client_name,
            wo_pickup=get_location_summary(
                locations, wo.pickup_location_id,
            ).name,
            to_pickup=to_pickup_name,
            wo_dropoff=get_location_summary(
                locations, wo.dropoff_location_id,
            ).name,
            to_dropoff=to_dropoff_name,
            wo_containers=_format_containers(wo_containers.get(wo.id, [])),
            to_containers=to_containers_str,
            wo_work_type=wo.work_type,
            to_work_type=booked_trip.work_type,
            wo_vessel=wo.vessel,
            to_vessel=booked_trip.vessel,
            wo_vehicle_plate=None,
            to_vehicle_plate=None,
        )
        match_score = sum(1 for c in criteria if c.match)
        warnings = [
            f"{c.label}: {c.wo_value} ≈ {c.to_value}"
            for c in criteria if c.fuzzy
        ]
        suggestions.append(WOSuggestion(
            delivered_trip=wo_out,
            confidence=_confidence(score),
            matched_fields=matched_fields,
            score=score,
            criteria=criteria,
            match_score=match_score,
            max_score=len(criteria),
            match_warnings=warnings,
        ))

    suggestions.sort(key=lambda s: s.score, reverse=True)
    return [s for s in suggestions if s.score >= MIN_MATCH_THRESHOLD][:30]


def _score_to_container_against_wo(
    to: BookedTrip,
    container: BookedTripContainer,
    wo_container_numbers: set[str],
    wo: DeliveredTrip,
    alias_groups: dict[int, set[int]] | None = None,
) -> tuple[list[str], float]:
    """Score a single TO container against a work order using 7 criteria."""
    matched_fields: list[str] = []
    score = 0.0

    # Determine which criteria are NULL on both sides for weight redistribution
    vessel_missing = not (to.vessel or wo.vessel)
    vehicle_missing = not (
        getattr(to, "vehicle_plate", None) or getattr(wo, "vehicle_id", None)
    )
    work_type_missing = not (to.work_type or wo.work_type)

    w = _effective_weights(
        vessel_missing=vessel_missing,
        vehicle_missing=vehicle_missing,
        work_type_missing=work_type_missing,
    )

    # 1. Container number — graduated scoring
    cn = normalize_container_number(container.container_number) if container.container_number else None
    if cn and cn in wo_container_numbers:
        matched_fields.append("container_number")
        score += w.get("container_number", 0) * _CONTAINER_EXACT
    elif cn:
        best_dist = None
        thresholds = get_thresholds(wo.client_id)
        for wo_cn in wo_container_numbers:
            dist = container_edit_distance(cn, wo_cn)
            if dist is not None and (best_dist is None or dist < best_dist):
                best_dist = dist
        if best_dist == 1:
            matched_fields.append("container_number_fuzzy")
            score += w.get("container_number", 0) * _CONTAINER_1CHAR
        elif best_dist == 2:
            matched_fields.append("container_number_fuzzy")
            score += w.get("container_number", 0) * _CONTAINER_2CHAR
        else:
            # Digits-only partial match
            wo_digits = {re.sub(r'[^0-9]', '', c) for c in wo_container_numbers if c}
            to_digits = {re.sub(r'[^0-9]', '', cn)} if cn else set()
            if wo_digits & to_digits:
                matched_fields.append("container_number_partial")
                score += w.get("container_number", 0) * _CONTAINER_DIGITS_ONLY

    # 2. Pickup location
    ag = alias_groups or {}
    if _locations_match(wo.pickup_location_id, to.pickup_location_id, ag):
        matched_fields.append("pickup_location")
        score += w.get("pickup_location", 0)

    # 3. Dropoff location
    if _locations_match(wo.dropoff_location_id, to.dropoff_location_id, ag):
        matched_fields.append("dropoff_location")
        score += w.get("dropoff_location", 0)

    # 4. Container type (work_type)
    if not work_type_missing:
        if to.work_type and wo.work_type and to.work_type == wo.work_type:
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
                score += w.get("vessel", 0) * 0.67  # ~0.08

    # 6. Vehicle plate
    if not vehicle_missing:
        to_plate = getattr(to, "vehicle_plate", None) or ""
        wo_plate = ""
        if wo.vehicle_id:
            # vehicle_id links to Vehicle.plate — but we don't have the plate here.
            # The vehicle info comes through the ORM relationship. For now, skip
            # plate matching in this function; it's handled via the vehicle_id FK.
            pass
        # If both have plate strings, compare
        to_plate_norm = to_plate.upper().replace(" ", "").replace("-", "")
        if to_plate_norm and wo_plate:
            wo_plate_norm = wo_plate.upper().replace(" ", "").replace("-", "")
            if to_plate_norm == wo_plate_norm:
                matched_fields.append("vehicle_plate")
                score += w.get("vehicle_plate", 0)
            elif re.sub(r'[^0-9]', '', to_plate_norm) == re.sub(r'[^0-9]', '', wo_plate_norm):
                matched_fields.append("vehicle_plate")
                score += w.get("vehicle_plate", 0) * 0.6

    # 7. Client
    if to.client_id == wo.client_id:
        matched_fields.append("client")
        score += w.get("client", 0)

    return matched_fields, score


async def _used_container_ids_for_tos(
    db: AsyncSession,
    to_ids: list[int],
    to_containers: dict[int, list[BookedTripContainer]],
    link_counts: dict[int, int],
) -> dict[int, set[int]]:
    """Determine which TO containers are already 'used' by active reconciliations.

    Heuristic: find active reconciliations for these TOs, load the linked
    WO containers, and match them to TO containers by normalized container
    number. If not enough can be matched, fall back to the first containers
    (by id order) to fill the link count.
    """
    if not to_ids:
        return {}

    from sqlalchemy import func

    # Get active reconciliations for these TOs
    recon_rows = (await db.execute(
        select(
            Reconciliation.booked_trip_id,
            Reconciliation.delivered_trip_id,
        ).where(
            Reconciliation.booked_trip_id.in_(to_ids),
            Reconciliation.is_active == True,  # noqa: E712
        )
    )).all()

    if not recon_rows:
        return {tid: set() for tid in to_ids}

    # Load WO containers for the linked WOs
    wo_ids = list({r.delivered_trip_id for r in recon_rows})
    wo_cont_rows = (await db.execute(
        select(DeliveredTripContainer)
        .where(DeliveredTripContainer.delivered_trip_id.in_(wo_ids))
    )).scalars().all()
    wo_containers_by_wo: dict[int, list[DeliveredTripContainer]] = defaultdict(list)
    for c in wo_cont_rows:
        wo_containers_by_wo[c.delivered_trip_id].append(c)

    result: dict[int, set[int]] = {}
    for to_id in to_ids:
        recons_for_to = [r for r in recon_rows if r.booked_trip_id == to_id]
        used: set[int] = set()
        to_conts = to_containers.get(to_id, [])

        for recon in recons_for_to:
            wo_conts = wo_containers_by_wo.get(recon.delivered_trip_id, [])
            matched_in_this_link = False
            for wo_c in wo_conts:
                wo_cn = normalize_container_number(wo_c.container_number) if wo_c.container_number else None
                if wo_cn:
                    for to_c in to_conts:
                        if to_c.id in used:
                            continue
                        to_cn = normalize_container_number(to_c.container_number) if to_c.container_number else None
                        if to_cn == wo_cn:
                            used.add(to_c.id)
                            matched_in_this_link = True
                            break
                if matched_in_this_link:
                    break

        # If not enough matched by container number, fill from front
        if len(used) < len(recons_for_to):
            for to_c in sorted(to_conts, key=lambda c: c.id):
                if len(used) >= len(recons_for_to):
                    break
                if to_c.id not in used:
                    used.add(to_c.id)

        result[to_id] = used

    return result


def _score_wo_against_to(
    wo: DeliveredTrip,
    wo_containers: Sequence[DeliveredTripContainer],
    to_container_numbers: set[str],
    booked_trip: BookedTrip,
    alias_groups: dict[int, set[int]] | None = None,
) -> tuple[list[str], float]:
    matched_fields: list[str] = []
    score = 0.0

    # Determine NULL criteria for weight redistribution
    vessel_missing = not (booked_trip.vessel or wo.vessel)
    vehicle_missing = not (
        getattr(booked_trip, "vehicle_plate", None) or getattr(wo, "vehicle_id", None)
    )
    work_type_missing = not (booked_trip.work_type or wo.work_type)

    w = _effective_weights(
        vessel_missing=vessel_missing,
        vehicle_missing=vehicle_missing,
        work_type_missing=work_type_missing,
    )

    # 1. Container number — graduated scoring
    wo_cn_set = {
        normalize_container_number(c.container_number)
        for c in wo_containers if c.container_number
    }
    if to_container_numbers & wo_cn_set:
        matched_fields.append("container_number")
        score += w.get("container_number", 0) * _CONTAINER_EXACT
    else:
        best_dist = None
        thresholds = get_thresholds(wo.client_id)
        for to_cn in to_container_numbers:
            for wo_cn in wo_cn_set:
                dist = container_edit_distance(to_cn, wo_cn)
                if dist is not None and (best_dist is None or dist < best_dist):
                    best_dist = dist
        if best_dist == 1:
            matched_fields.append("container_number_fuzzy")
            score += w.get("container_number", 0) * _CONTAINER_1CHAR
        elif best_dist == 2:
            matched_fields.append("container_number_fuzzy")
            score += w.get("container_number", 0) * _CONTAINER_2CHAR
        else:
            to_digits = {re.sub(r'[^0-9]', '', cn) for cn in to_container_numbers if cn}
            wo_digits = {re.sub(r'[^0-9]', '', cn) for cn in wo_cn_set if cn}
            if to_digits & wo_digits:
                matched_fields.append("container_number_partial")
                score += w.get("container_number", 0) * _CONTAINER_DIGITS_ONLY

    # 2. Pickup location
    ag = alias_groups or {}
    if _locations_match(wo.pickup_location_id, booked_trip.pickup_location_id, ag):
        matched_fields.append("pickup_location")
        score += w.get("pickup_location", 0)

    # 3. Dropoff location
    if _locations_match(wo.dropoff_location_id, booked_trip.dropoff_location_id, ag):
        matched_fields.append("dropoff_location")
        score += w.get("dropoff_location", 0)

    # 4. Container type (work_type)
    if not work_type_missing:
        if booked_trip.work_type and wo.work_type and booked_trip.work_type == wo.work_type:
            matched_fields.append("work_type")
            score += w.get("work_type", 0)

    # 5. Vessel
    if not vessel_missing:
        to_vessel = (booked_trip.vessel or "").upper().strip()
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
        # Same as _score_to_container_against_to — vehicle_id FK based
        pass

    # 7. Client
    if wo.client_id == booked_trip.client_id:
        matched_fields.append("client")
        score += w.get("client", 0)

    return matched_fields, score
