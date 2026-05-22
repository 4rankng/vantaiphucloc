from __future__ import annotations

import re
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    Reconciliation,
    BookedTrip,
    BookedTripContainer,
    DeliveredTrip,
    DeliveredTripContainer,
)
from app.schemas.domain import (
    MatchSuggestion,
    TripContainerOut,
    BookedTripOut,
)
from app.core.summaries import (
    get_client_summary,
    get_location_summary,
    load_client_summaries,
    load_location_summaries,
)
from app.utils.iso6346 import normalize_container_number
from app.utils.fuzzy import container_edit_distance
from app.utils.fuzzy_thresholds import get_thresholds

from ._match_helpers import (
    _effective_weights,
    _load_alias_groups,
    _locations_match,
    _confidence,
    _build_criteria,
    _format_containers,
    MIN_MATCH_THRESHOLD,
    _CONTAINER_EXACT,
    _CONTAINER_1CHAR,
    _CONTAINER_2CHAR,
    _CONTAINER_DIGITS_ONLY,
)


def _get_wo_date(wo: DeliveredTrip):
    if getattr(wo, "trip_date", None):
        return wo.trip_date
    return wo.created_at.date() if wo.created_at else None


def _score_to_container_against_wo(
    to: BookedTrip,
    container: BookedTripContainer,
    wo_container_numbers: set[str],
    wo: DeliveredTrip,
    alias_groups: dict[int, set[int]] | None = None,
) -> tuple[list[str], float]:
    matched_fields: list[str] = []
    score = 0.0

    vessel_missing = not (to.vessel or wo.vessel)
    vehicle_missing = not (
        getattr(to, "vehicle_plate", None) or getattr(wo, "vehicle_id", None)
    )
    work_type_missing = not (to.work_type or wo.work_type)
    operation_type_missing = not (to.operation_type or wo.operation_type)

    w = _effective_weights(
        vessel_missing=vessel_missing,
        vehicle_missing=vehicle_missing,
        work_type_missing=work_type_missing,
        operation_type_missing=operation_type_missing,
    )

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
            wo_digits = {re.sub(r'[^0-9]', '', c) for c in wo_container_numbers if c}
            to_digits = {re.sub(r'[^0-9]', '', cn)} if cn else set()
            if wo_digits & to_digits:
                matched_fields.append("container_number_partial")
                score += w.get("container_number", 0) * _CONTAINER_DIGITS_ONLY

    ag = alias_groups or {}
    if _locations_match(wo.pickup_location_id, to.pickup_location_id, ag):
        matched_fields.append("pickup_location")
        score += w.get("pickup_location", 0)

    if _locations_match(wo.dropoff_location_id, to.dropoff_location_id, ag):
        matched_fields.append("dropoff_location")
        score += w.get("dropoff_location", 0)

    if not work_type_missing:
        if to.work_type and wo.work_type and to.work_type == wo.work_type:
            matched_fields.append("work_type")
            score += w.get("work_type", 0)

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

    if not vehicle_missing:
        to_plate = getattr(to, "vehicle_plate", None) or ""
        wo_plate = ""
        if wo.vehicle_id:
            pass
        to_plate_norm = to_plate.upper().replace(" ", "").replace("-", "")
        if to_plate_norm and wo_plate:
            wo_plate_norm = wo_plate.upper().replace(" ", "").replace("-", "")
            if to_plate_norm == wo_plate_norm:
                matched_fields.append("vehicle_plate")
                score += w.get("vehicle_plate", 0)
            elif re.sub(r'[^0-9]', '', to_plate_norm) == re.sub(r'[^0-9]', '', wo_plate_norm):
                matched_fields.append("vehicle_plate")
                score += w.get("vehicle_plate", 0) * 0.6

    if not operation_type_missing:
        if to.operation_type and wo.operation_type and to.operation_type == wo.operation_type:
            matched_fields.append("operation_type")
            score += w.get("operation_type", 0)

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
    if not to_ids:
        return {}

    from sqlalchemy import func

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

        if len(used) < len(recons_for_to):
            for to_c in sorted(to_conts, key=lambda c: c.id):
                if len(used) >= len(recons_for_to):
                    break
                if to_c.id not in used:
                    used.add(to_c.id)

        result[to_id] = used

    return result


async def suggest_trip_matches(
    db: AsyncSession, delivered_trip: DeliveredTrip
) -> list[MatchSuggestion]:
    from datetime import timedelta

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

    already_linked = (await db.execute(
        select(Reconciliation.id).where(
            Reconciliation.delivered_trip_id == delivered_trip.id,
            Reconciliation.is_active == True,  # noqa: E712
        )
    )).scalar_one_or_none()
    if already_linked is not None:
        return []

    wo_digits = {re.sub(r'[^0-9]', '', cn) for cn in wo_container_numbers if cn}

    exact_subquery = (
        select(BookedTripContainer.booked_trip_id)
        .where(BookedTripContainer.container_number.in_(wo_container_numbers))
    )
    query = select(BookedTrip).where(
        BookedTrip.status.in_(["PENDING", "MATCHED"]),
        BookedTrip.id.in_(exact_subquery),
    )

    wo_date = _get_wo_date(delivered_trip)
    if wo_date is not None:
        query = query.where(
            BookedTrip.trip_date >= wo_date - timedelta(days=30),
            BookedTrip.trip_date <= wo_date + timedelta(days=30),
        )

    candidates = list((await db.execute(query)).scalars().all())

    if wo_digits:
        exact_ids = {c.id for c in candidates}

        digit_keys: set[str] = set()
        for d in wo_digits:
            if len(d) >= 4:
                digit_keys.add(d)
            if len(d) >= 6:
                digit_keys.add(d[:6])

        if digit_keys:
            digit_filters = [
                BookedTripContainer.container_number.contains(dk)
                for dk in digit_keys
            ]
            from sqlalchemy import or_ as _or
            digit_subquery = (
                select(BookedTripContainer.booked_trip_id)
                .where(_or(*digit_filters))
            )
            fuzzy_query = select(BookedTrip).where(
                BookedTrip.status.in_(["PENDING", "MATCHED"]),
                BookedTrip.id.in_(digit_subquery),
                ~BookedTrip.id.in_(list(exact_ids)) if exact_ids else True,  # type: ignore[arg-type]
            )
            if wo_date is not None:
                fuzzy_query = fuzzy_query.where(
                    BookedTrip.trip_date >= wo_date - timedelta(days=30),
                    BookedTrip.trip_date <= wo_date + timedelta(days=30),
                )
            fuzzy_cands = list((await db.execute(fuzzy_query)).scalars().all())
            if fuzzy_cands:
                fc_ids = [c.id for c in fuzzy_cands]
                fc_containers = (await db.execute(
                    select(BookedTripContainer)
                    .where(BookedTripContainer.booked_trip_id.in_(fc_ids))
                )).scalars().all()
                fc_conts_by_trip: dict[int, list[BookedTripContainer]] = defaultdict(list)
                for c in fc_containers:
                    fc_conts_by_trip[c.booked_trip_id].append(c)
                for to in fuzzy_cands:
                    for tc in fc_conts_by_trip.get(to.id, []):
                        tc_norm = normalize_container_number(tc.container_number) if tc.container_number else None
                        if not tc_norm:
                            continue
                        for wc in wo_container_numbers:
                            dist = container_edit_distance(tc_norm, wc)
                            if dist is not None and dist <= 2:
                                candidates.append(to)
                                break
                        else:
                            continue
                        break
    if not candidates:
        return []

    to_ids = [to.id for to in candidates]
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
    partners = await load_client_summaries(db, client_ids)
    locations = await load_location_summaries(db, location_ids)
    alias_groups = await _load_alias_groups(db)

    wo_client_name = get_client_summary(partners, delivered_trip.client_id).name
    wo_pickup_name = get_location_summary(
        locations, delivered_trip.pickup_location_id,
    ).name
    wo_dropoff_name = get_location_summary(
        locations, delivered_trip.dropoff_location_id,
    ).name
    wo_full_containers = (await db.execute(
        select(DeliveredTripContainer)
        .where(DeliveredTripContainer.delivered_trip_id == delivered_trip.id)
    )).scalars().all()
    wo_containers_str = _format_containers(wo_full_containers)

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
        to_client_name = get_client_summary(partners, to.client_id).name
        for container in available_containers:
            matched_fields, score = _score_to_container_against_wo(
                to, container, wo_container_numbers, delivered_trip,
                alias_groups,
            )
            to_out = BookedTripOut(
                id=to.id, trip_date=to.trip_date,
                client=get_client_summary(partners, to.client_id),
                pickup_location=get_location_summary(
                    locations, to.pickup_location_id,
                ),
                dropoff_location=get_location_summary(
                    locations, to.dropoff_location_id,
                ),
                vessel=to.vessel,
                vehicle_plate=to.vehicle_plate,
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
                to_client=to_client_name,
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
                to_vehicle_plate=to.vehicle_plate,
                wo_operation_type=delivered_trip.operation_type,
                to_operation_type=to.operation_type,
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
