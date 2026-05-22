from __future__ import annotations

import re
from collections import defaultdict
from typing import Sequence

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    Reconciliation,
    BookedTrip,
    BookedTripContainer,
    DeliveredTrip,
    DeliveredTripContainer,
)
from app.schemas.domain import (
    ContainerOut,
    WOSuggestion,
    DeliveredTripOut,
)
from app.core.summaries import (
    get_client_summary,
    get_driver_summary,
    get_location_summary,
    load_client_summaries,
    load_driver_summaries,
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


def _score_wo_against_to(
    wo: DeliveredTrip,
    wo_containers: Sequence[DeliveredTripContainer],
    to_container_numbers: set[str],
    booked_trip: BookedTrip,
    alias_groups: dict[int, set[int]] | None = None,
) -> tuple[list[str], float]:
    matched_fields: list[str] = []
    score = 0.0

    vessel_missing = not (booked_trip.vessel or wo.vessel)
    vehicle_missing = not (
        getattr(booked_trip, "vehicle_plate", None) or getattr(wo, "vehicle_id", None)
    )
    work_type_missing = not (booked_trip.work_type or wo.work_type)
    operation_type_missing = not (booked_trip.operation_type or wo.operation_type)

    w = _effective_weights(
        vessel_missing=vessel_missing,
        vehicle_missing=vehicle_missing,
        work_type_missing=work_type_missing,
        operation_type_missing=operation_type_missing,
    )

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

    ag = alias_groups or {}
    if _locations_match(wo.pickup_location_id, booked_trip.pickup_location_id, ag):
        matched_fields.append("pickup_location")
        score += w.get("pickup_location", 0)

    if _locations_match(wo.dropoff_location_id, booked_trip.dropoff_location_id, ag):
        matched_fields.append("dropoff_location")
        score += w.get("dropoff_location", 0)

    if not work_type_missing:
        if booked_trip.work_type and wo.work_type and booked_trip.work_type == wo.work_type:
            matched_fields.append("work_type")
            score += w.get("work_type", 0)

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

    if not vehicle_missing:
        pass

    if not operation_type_missing:
        if booked_trip.operation_type and wo.operation_type and booked_trip.operation_type == wo.operation_type:
            matched_fields.append("operation_type")
            score += w.get("operation_type", 0)

    if wo.client_id == booked_trip.client_id:
        matched_fields.append("client")
        score += w.get("client", 0)

    return matched_fields, score


async def suggest_wo_matches(
    db: AsyncSession, booked_trip: BookedTrip
) -> list[WOSuggestion]:
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

    container_subquery = (
        select(DeliveredTripContainer.delivered_trip_id)
        .where(DeliveredTripContainer.container_number.in_(to_container_numbers))
    )
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
    partners = await load_client_summaries(db, client_ids)
    locations = await load_location_summaries(db, location_ids)
    alias_groups = await _load_alias_groups(db)

    to_client_name = get_client_summary(partners, booked_trip.client_id).name
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
            client=get_client_summary(partners, wo.client_id),
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
            wo_client=get_client_summary(partners, wo.client_id).name,
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
            to_vehicle_plate=booked_trip.vehicle_plate,
            wo_operation_type=wo.operation_type,
            to_operation_type=booked_trip.operation_type,
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
