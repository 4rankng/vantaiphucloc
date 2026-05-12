"""Suggestion algorithm for matching WorkOrders ↔ TripOrders.

Five matching criteria, each weighted 1/5:

  1. Container number (normalized to ISO 6346)
  2. Date (trip_date vs WO created_at date)
  3. Pickup location (FK)
  4. Dropoff location (FK)
  5. Customer (client_id)

Confidence buckets:
  - score ≥ 0.8    → "full"     (≥ 4/5 fields, auto-confirm candidate)
  - score ≥ 0.6    → "partial"  (≥ 3/5 fields)
  - else           → "none"     (still surfaced if any single field matched)

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
    TripOrder,
    TripOrderContainer,
    WorkOrder,
    WorkOrderContainer,
)
from app.schemas.domain import (
    ContainerOut,
    CriterionBreakdown,
    MatchSuggestion,
    TripContainerOut,
    TripOrderOut,
    WOSuggestion,
    WorkOrderOut,
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


def _get_wo_date(wo: WorkOrder):
    """Return trip_date if set, otherwise created_at.date(). Mirrors the
    COALESCE(trip_date, DATE(created_at)) pattern used in salary queries."""
    if getattr(wo, "trip_date", None):
        return wo.trip_date
    return wo.created_at.date() if wo.created_at else None


WEIGHTS = {
    "container_number": 1.0 / 5,
    "date": 1.0 / 5,
    "pickup_location": 1.0 / 5,
    "dropoff_location": 1.0 / 5,
    "client": 1.0 / 5,
}
FULL_MATCH_THRESHOLD = 4.0 / 5.0
POTENTIAL_MATCH_THRESHOLD = 3.0 / 5.0
MIN_MATCH_THRESHOLD = 2.0 / 5.0


# ---------------------------------------------------------------------------
# Alias-aware location matching
# ---------------------------------------------------------------------------


async def _load_alias_groups(db: AsyncSession) -> dict[int, set[int]]:
    """Build equivalence sets from CONFIRMED aliases.

    Returns: {location_id: {itself + equivalent location_ids}}
    Two locations are equivalent if they share a confirmed alias.
    """
    rows = (await db.execute(
        select(LocationAlias.location_id, LocationAlias.alias_normalized)
        .where(LocationAlias.status == "CONFIRMED")
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
    ("date", "Ngày đi"),
    ("client", "Khách hàng"),
    ("pickup_location", "Điểm lấy"),
    ("dropoff_location", "Điểm trả"),
    ("container_number", "Container"),
]


def _build_criteria(
    *,
    matched_fields: list[str],
    wo_date_str: str | None,
    to_date_str: str | None,
    wo_client: str | None,
    to_client: str | None,
    wo_pickup: str | None,
    to_pickup: str | None,
    wo_dropoff: str | None,
    to_dropoff: str | None,
    wo_containers: str | None,
    to_containers: str | None,
) -> list[CriterionBreakdown]:
    """Build the canonical 5-criteria breakdown for UI rendering.

    `matched_fields` is the existing list returned by `_score_*_against_*`. We
    treat `container_number` and `container_number_partial` as the same row
    (a partial container match still counts as a green check for the row but
    surfaces as `match=True` since the user has at least some signal).
    """
    matched = set(matched_fields)
    container_match = (
        "container_number" in matched
        or "container_number_partial" in matched
    )

    values: dict[str, tuple[str | None, str | None]] = {
        "date": (wo_date_str, to_date_str),
        "client": (wo_client, to_client),
        "pickup_location": (wo_pickup, to_pickup),
        "dropoff_location": (wo_dropoff, to_dropoff),
        "container_number": (wo_containers, to_containers),
    }
    out: list[CriterionBreakdown] = []
    for name, label in CRITERIA_ORDER:
        wo_v, to_v = values[name]
        if name == "container_number":
            is_match = container_match
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
    db: AsyncSession, work_order: WorkOrder
) -> list[MatchSuggestion]:
    """Find candidate TripOrders for *work_order*.

    TO-centric: a TO with N containers can match N WOs. We find TOs that:
    1. Share container numbers with this WO (or share partner)
    2. Have remaining capacity (matched WO count < TO container count)
    3. Are PENDING or MATCHED (not COMPLETED/CANCELLED)

    Per-container expansion: a TO with K available containers (after
    excluding those already linked to other WOs) emits K independent
    ``MatchSuggestion`` entries — each carrying exactly one container in
    ``trip_order.containers``. The ``container_number`` criterion and
    match score are recomputed per (work_order, trip_order, container)
    tuple, so the UI can render one row per container and the user can
    pick which specific container of the TO this trip is fulfilling.
    """
    wo_containers = (await db.execute(
        select(WorkOrderContainer.container_number)
        .where(WorkOrderContainer.work_order_id == work_order.id)
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
            Reconciliation.work_order_id == work_order.id,
            Reconciliation.is_active == True,  # noqa: E712
        )
    )).scalar_one_or_none()
    if already_linked is not None:
        return []

    wo_date = _get_wo_date(work_order)

    # Find TOs that share container numbers with this WO
    container_subquery = (
        select(TripOrderContainer.trip_order_id)
        .where(TripOrderContainer.container_number.in_(wo_container_numbers))
    )
    # TOs that are PENDING or MATCHED (have capacity for more WOs)
    query = select(TripOrder).where(
        TripOrder.status.in_(["PENDING", "MATCHED"]),
        or_(
            TripOrder.partner_id == work_order.partner_id,
            TripOrder.id.in_(container_subquery),
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
                Reconciliation.trip_order_id,
                func.count(),
            ).where(
                Reconciliation.trip_order_id.in_(to_ids),
                Reconciliation.is_active == True,  # noqa: E712
            ).group_by(Reconciliation.trip_order_id)
        )).all()
        link_counts = {r[0]: r[1] for r in link_rows}

    cont_result = await db.execute(
        select(TripOrderContainer)
        .where(TripOrderContainer.trip_order_id.in_(to_ids))
    )
    to_containers: dict[int, list[TripOrderContainer]] = defaultdict(list)
    for c in cont_result.scalars().all():
        to_containers[c.trip_order_id].append(c)

    # Filter out TOs at full capacity
    candidates = [
        to for to in candidates
        if link_counts.get(to.id, 0) < len(to_containers.get(to.id, []))
    ]

    partner_ids = {to.partner_id for to in candidates} | {work_order.partner_id}
    location_ids = (
        {to.pickup_location_id for to in candidates}
        | {to.dropoff_location_id for to in candidates}
        | {work_order.pickup_location_id, work_order.dropoff_location_id}
    )
    partners = await load_partner_summaries(db, partner_ids)
    locations = await load_location_summaries(db, location_ids)
    alias_groups = await _load_alias_groups(db)

    wo_client_name = get_partner_summary(partners, work_order.partner_id).name
    wo_pickup_name = get_location_summary(
        locations, work_order.pickup_location_id,
    ).name
    wo_dropoff_name = get_location_summary(
        locations, work_order.dropoff_location_id,
    ).name
    # WorkOrder containers come back from the join above as raw rows of
    # `container_number` only — re-load with full ORM objects for the
    # criteria breakdown so we can show work_type alongside the number.
    wo_full_containers = (await db.execute(
        select(WorkOrderContainer)
        .where(WorkOrderContainer.work_order_id == work_order.id)
    )).scalars().all()
    wo_containers_str = _format_containers(wo_full_containers)
    wo_date_str = wo_date.isoformat() if wo_date else None

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
        to_partner_name = get_partner_summary(partners, to.partner_id).name
        to_date_iso = to.trip_date.isoformat() if to.trip_date else None
        # Emit one MatchSuggestion entry per available container so the
        # UI renders independent rows for each container.
        for container in available_containers:
            matched_fields, score = _score_to_container_against_wo(
                to, container, wo_container_numbers, wo_date, work_order,
                alias_groups,
            )
            to_out = TripOrderOut(
                id=to.id, code=to.code, trip_date=to.trip_date,
                partner=get_partner_summary(partners, to.partner_id),
                pickup_location=get_location_summary(
                    locations, to.pickup_location_id,
                ),
                dropoff_location=get_location_summary(
                    locations, to.dropoff_location_id,
                ),
                containers=[TripContainerOut.model_validate(container)],
                pricing_id=to.pricing_id,
                unit_price=to.unit_price,
                driver_salary=to.driver_salary,
                allowance=to.allowance,
                status=to.status,
                matched_work_order_ids=[],
                created_at=to.created_at,
                updated_at=to.updated_at,
            )
            criteria = _build_criteria(
                matched_fields=matched_fields,
                wo_date_str=wo_date_str,
                to_date_str=to_date_iso,
                wo_client=wo_client_name,
                to_client=to_partner_name,
                wo_pickup=wo_pickup_name,
                to_pickup=to_pickup_name,
                wo_dropoff=wo_dropoff_name,
                to_dropoff=to_dropoff_name,
                wo_containers=wo_containers_str,
                to_containers=_format_containers([container]),
            )
            match_score = sum(1 for c in criteria if c.match)
            suggestions.append(MatchSuggestion(
                trip_order=to_out,
                container_id=container.id,
                confidence=_confidence(score),
                matched_fields=matched_fields,
                score=score,
                criteria=criteria,
                match_score=match_score,
                max_score=len(criteria),
            ))

    suggestions.sort(key=lambda s: s.score, reverse=True)
    return [s for s in suggestions if s.score >= MIN_MATCH_THRESHOLD][:50]


async def suggest_wo_matches(
    db: AsyncSession, trip_order: TripOrder
) -> list[WOSuggestion]:
    """Find candidate WorkOrders for *trip_order*."""
    to_containers = (await db.execute(
        select(TripOrderContainer.container_number)
        .where(TripOrderContainer.trip_order_id == trip_order.id)
    )).all()
    to_container_numbers = {
        normalize_container_number(row[0])
        for row in to_containers if row[0]
    }
    if not to_container_numbers:
        return []

    # Find WOs that share container numbers with this TO
    container_subquery = (
        select(WorkOrderContainer.work_order_id)
        .where(WorkOrderContainer.container_number.in_(to_container_numbers))
    )
    # Exclude WOs that are already matched (have active reconciliation)
    already_matched_wos = select(Reconciliation.work_order_id).where(
        Reconciliation.is_active == True,  # noqa: E712
    )
    query = select(WorkOrder).where(
        WorkOrder.status == "PENDING",
        ~WorkOrder.id.in_(already_matched_wos),
        or_(
            WorkOrder.partner_id == trip_order.partner_id,
            WorkOrder.id.in_(container_subquery),
        ),
    )
    candidates = list((await db.execute(query)).scalars().all())
    if not candidates:
        return []

    wo_ids = [wo.id for wo in candidates]
    cont_result = await db.execute(
        select(WorkOrderContainer)
        .where(WorkOrderContainer.work_order_id.in_(wo_ids))
    )
    wo_containers: dict[int, list[WorkOrderContainer]] = defaultdict(list)
    for c in cont_result.scalars().all():
        wo_containers[c.work_order_id].append(c)

    partner_ids = {wo.partner_id for wo in candidates} | {trip_order.partner_id}
    drivers = await load_driver_summaries(db, {wo.driver_id for wo in candidates})
    location_ids = (
        {wo.pickup_location_id for wo in candidates}
        | {wo.dropoff_location_id for wo in candidates}
        | {trip_order.pickup_location_id, trip_order.dropoff_location_id}
    )
    partners = await load_partner_summaries(db, partner_ids)
    locations = await load_location_summaries(db, location_ids)
    alias_groups = await _load_alias_groups(db)

    to_client_name = get_partner_summary(partners, trip_order.partner_id).name
    to_pickup_name = get_location_summary(
        locations, trip_order.pickup_location_id,
    ).name
    to_dropoff_name = get_location_summary(
        locations, trip_order.dropoff_location_id,
    ).name
    to_full_containers = (await db.execute(
        select(TripOrderContainer)
        .where(TripOrderContainer.trip_order_id == trip_order.id)
    )).scalars().all()
    to_containers_str = _format_containers(to_full_containers)
    to_date_str = trip_order.trip_date.isoformat() if trip_order.trip_date else None

    suggestions: list[WOSuggestion] = []
    for wo in candidates:
        matched_fields, score = _score_wo_against_to(
            wo, wo_containers.get(wo.id, []),
            to_container_numbers, trip_order,
            alias_groups,
        )
        wo_out = WorkOrderOut(
            id=wo.id,
            code=wo.code,
            partner=get_partner_summary(partners, wo.partner_id),
            pickup_location=get_location_summary(locations, wo.pickup_location_id),
            dropoff_location=get_location_summary(locations, wo.dropoff_location_id),
            driver=get_driver_summary(drivers, wo.driver_id),
            gps_lat=wo.gps_lat,
            gps_lng=wo.gps_lng,
            gps_address=wo.gps_address,
            unit_price=wo.unit_price,
            driver_salary=wo.driver_salary,
            allowance=wo.allowance,
            pricing_id=wo.pricing_id,
            status=wo.status,
            containers=[
                ContainerOut.model_validate(c)
                for c in wo_containers.get(wo.id, [])
            ],
            created_at=wo.created_at,
            updated_at=wo.updated_at,
        )
        wo_date_raw = _get_wo_date(wo)
        wo_date_str = wo_date_raw.isoformat() if wo_date_raw else None
        criteria = _build_criteria(
            matched_fields=matched_fields,
            wo_date_str=wo_date_str,
            to_date_str=to_date_str,
            wo_client=get_partner_summary(partners, wo.partner_id).name,
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
        )
        match_score = sum(1 for c in criteria if c.match)
        suggestions.append(WOSuggestion(
            work_order=wo_out,
            confidence=_confidence(score),
            matched_fields=matched_fields,
            score=score,
            criteria=criteria,
            match_score=match_score,
            max_score=len(criteria),
        ))

    suggestions.sort(key=lambda s: s.score, reverse=True)
    return [s for s in suggestions if s.score >= MIN_MATCH_THRESHOLD][:30]


def _score_to_container_against_wo(
    to: TripOrder,
    container: TripOrderContainer,
    wo_container_numbers: set[str],
    wo_date,
    work_order: WorkOrder,
    alias_groups: dict[int, set[int]] | None = None,
) -> tuple[list[str], float]:
    """Score a single TO container against a work order."""
    matched_fields: list[str] = []
    score = 0.0

    cn = normalize_container_number(container.container_number) if container.container_number else None
    if cn and cn in wo_container_numbers:
        matched_fields.append("container_number")
        score += WEIGHTS["container_number"]
    else:
        wo_digits = {re.sub(r'[^0-9]', '', c) for c in wo_container_numbers if c}
        to_digits = {re.sub(r'[^0-9]', '', cn)} if cn else set()
        if wo_digits & to_digits:
            matched_fields.append("container_number_partial")
            score += WEIGHTS["container_number"] * 0.5

    if wo_date and to.trip_date == wo_date:
        matched_fields.append("date")
        score += WEIGHTS["date"]
    ag = alias_groups or {}
    if _locations_match(work_order.pickup_location_id, to.pickup_location_id, ag):
        matched_fields.append("pickup_location")
        score += WEIGHTS["pickup_location"]
    if _locations_match(work_order.dropoff_location_id, to.dropoff_location_id, ag):
        matched_fields.append("dropoff_location")
        score += WEIGHTS["dropoff_location"]
    if to.partner_id == work_order.partner_id:
        matched_fields.append("client")
        score += WEIGHTS["client"]

    return matched_fields, score


async def _used_container_ids_for_tos(
    db: AsyncSession,
    to_ids: list[int],
    to_containers: dict[int, list[TripOrderContainer]],
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
            Reconciliation.trip_order_id,
            Reconciliation.work_order_id,
        ).where(
            Reconciliation.trip_order_id.in_(to_ids),
            Reconciliation.is_active == True,  # noqa: E712
        )
    )).all()

    if not recon_rows:
        return {tid: set() for tid in to_ids}

    # Load WO containers for the linked WOs
    wo_ids = list({r.work_order_id for r in recon_rows})
    wo_cont_rows = (await db.execute(
        select(WorkOrderContainer)
        .where(WorkOrderContainer.work_order_id.in_(wo_ids))
    )).scalars().all()
    wo_containers_by_wo: dict[int, list[WorkOrderContainer]] = defaultdict(list)
    for c in wo_cont_rows:
        wo_containers_by_wo[c.work_order_id].append(c)

    result: dict[int, set[int]] = {}
    for to_id in to_ids:
        recons_for_to = [r for r in recon_rows if r.trip_order_id == to_id]
        used: set[int] = set()
        to_conts = to_containers.get(to_id, [])

        for recon in recons_for_to:
            wo_conts = wo_containers_by_wo.get(recon.work_order_id, [])
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


def _score_to_against_wo(
    to: TripOrder,
    to_containers: Sequence[TripOrderContainer],
    wo_container_numbers: set[str],
    wo_date,
    work_order: WorkOrder,
    alias_groups: dict[int, set[int]] | None = None,
) -> tuple[list[str], float]:
    matched_fields: list[str] = []
    score = 0.0

    to_cn_set = {
        normalize_container_number(c.container_number)
        for c in to_containers if c.container_number
    }
    if wo_container_numbers & to_cn_set:
        matched_fields.append("container_number")
        score += WEIGHTS["container_number"]
    else:
        wo_digits = {re.sub(r'[^0-9]', '', cn) for cn in wo_container_numbers if cn}
        to_digits = {re.sub(r'[^0-9]', '', cn) for cn in to_cn_set if cn}
        if wo_digits & to_digits:
            matched_fields.append("container_number_partial")
            score += WEIGHTS["container_number"] * 0.5

    if wo_date and to.trip_date == wo_date:
        matched_fields.append("date")
        score += WEIGHTS["date"]
    ag = alias_groups or {}
    if _locations_match(work_order.pickup_location_id, to.pickup_location_id, ag):
        matched_fields.append("pickup_location")
        score += WEIGHTS["pickup_location"]
    if _locations_match(work_order.dropoff_location_id, to.dropoff_location_id, ag):
        matched_fields.append("dropoff_location")
        score += WEIGHTS["dropoff_location"]
    if to.partner_id == work_order.partner_id:
        matched_fields.append("client")
        score += WEIGHTS["client"]

    return matched_fields, score


def _score_wo_against_to(
    wo: WorkOrder,
    wo_containers: Sequence[WorkOrderContainer],
    to_container_numbers: set[str],
    trip_order: TripOrder,
    alias_groups: dict[int, set[int]] | None = None,
) -> tuple[list[str], float]:
    matched_fields: list[str] = []
    score = 0.0

    wo_cn_set = {
        normalize_container_number(c.container_number)
        for c in wo_containers if c.container_number
    }
    if to_container_numbers & wo_cn_set:
        matched_fields.append("container_number")
        score += WEIGHTS["container_number"]
    else:
        to_digits = {re.sub(r'[^0-9]', '', cn) for cn in to_container_numbers if cn}
        wo_digits = {re.sub(r'[^0-9]', '', cn) for cn in wo_cn_set if cn}
        if to_digits & wo_digits:
            matched_fields.append("container_number_partial")
            score += WEIGHTS["container_number"] * 0.5

    wo_date = _get_wo_date(wo)
    if wo_date and trip_order.trip_date == wo_date:
        matched_fields.append("date")
        score += WEIGHTS["date"]
    ag = alias_groups or {}
    if _locations_match(wo.pickup_location_id, trip_order.pickup_location_id, ag):
        matched_fields.append("pickup_location")
        score += WEIGHTS["pickup_location"]
    if _locations_match(wo.dropoff_location_id, trip_order.dropoff_location_id, ag):
        matched_fields.append("dropoff_location")
        score += WEIGHTS["dropoff_location"]
    if wo.partner_id == trip_order.partner_id:
        matched_fields.append("client")
        score += WEIGHTS["client"]

    return matched_fields, score
