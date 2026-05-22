"""Scoring functions for trip matching.

Contains the weighted 8-criteria scoring logic, weight redistribution,
and location matching helpers used by match_suggester.
"""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    Reconciliation,
    BookedTrip,
    BookedTripContainer,
    DeliveredTrip,
    DeliveredTripContainer,
)
from app.utils.iso6346 import normalize_container_number
from app.utils.fuzzy import container_edit_distance
from app.utils.fuzzy_thresholds import get_thresholds


WEIGHTS = {
    "container_number": 0.28,
    "pickup_location": 0.14,
    "dropoff_location": 0.14,
    "work_type": 0.11,
    "vessel": 0.10,
    "vehicle_plate": 0.09,
    "operation_type": 0.08,
    "client": 0.06,
}

_CONTAINER_EXACT = 1.0
_CONTAINER_1CHAR = 0.8
_CONTAINER_2CHAR = 0.55
_CONTAINER_DIGITS_ONLY = 0.3


def _effective_weights(
    *,
    vessel_missing: bool = False,
    work_type_missing: bool = False,
    vehicle_missing: bool = False,
    operation_type_missing: bool = False,
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
    if operation_type_missing:
        missing_total += w.pop("operation_type")
        missing_keys.append("operation_type")

    if missing_total > 0 and w:
        active_total = sum(w.values())
        if active_total > 0:
            for k in w:
                w[k] += missing_total * (w[k] / active_total)

    return w


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


def _score_to_container_against_wo(
    to: BookedTrip,
    container: BookedTripContainer,
    wo_container_numbers: set[str],
    wo: DeliveredTrip,
    alias_groups: dict[int, set[int]] | None = None,
) -> tuple[list[str], float]:
    """Score a single TO container against a work order using 8 criteria."""
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

    # 7. Operation type
    if not operation_type_missing:
        if to.operation_type and wo.operation_type and to.operation_type == wo.operation_type:
            matched_fields.append("operation_type")
            score += w.get("operation_type", 0)

    # 8. Client
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
        pass

    # 7. Operation type
    if not operation_type_missing:
        if booked_trip.operation_type and wo.operation_type and booked_trip.operation_type == wo.operation_type:
            matched_fields.append("operation_type")
            score += w.get("operation_type", 0)

    # 8. Client
    if wo.client_id == booked_trip.client_id:
        matched_fields.append("client")
        score += w.get("client", 0)

    return matched_fields, score
