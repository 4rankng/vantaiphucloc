"""Suggestion algorithm for matching WorkOrders ↔ TripOrders.

Six matching criteria, each weighted 1/6:

  1. Container number (normalized to ISO 6346)
  2. Date (trip_date vs WO created_at date)
  3. Pickup location (FK)
  4. Dropoff location (FK)
  5. Customer (client_id)
  6. Route (route string)

Confidence buckets:
  - score == 1.0   → "full"     (auto-confirm candidate)
  - score ≥ 0.5    → "partial"  (≥ 3/6 fields)
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
    TripOrder,
    TripOrderContainer,
    TripOrderWorkOrder,
    WorkOrder,
    WorkOrderContainer,
)
from app.schemas.domain import (
    ContainerOut,
    MatchSuggestion,
    TripContainerOut,
    TripOrderOut,
    WOSuggestion,
    WorkOrderOut,
)
from app.services.summary_loader import (
    get_client_summary,
    get_driver_summary,
    get_location_summary,
    load_client_summaries,
    load_driver_summaries,
    load_location_summaries,
)
from app.utils.iso6346 import normalize_container_number


WEIGHTS = {
    "container_number": 1.0 / 6,
    "date": 1.0 / 6,
    "pickup_location": 1.0 / 6,
    "dropoff_location": 1.0 / 6,
    "client": 1.0 / 6,
    "route": 1.0 / 6,
}
FULL_MATCH_THRESHOLD = 1.0
POTENTIAL_MATCH_THRESHOLD = 3.0 / 6.0
MIN_MATCH_THRESHOLD = 1.0 / 6.0


def _confidence(score: float) -> str:
    if score >= FULL_MATCH_THRESHOLD:
        return "full"
    if score >= POTENTIAL_MATCH_THRESHOLD:
        return "partial"
    return "none"


async def suggest_trip_matches(
    db: AsyncSession, work_order: WorkOrder
) -> list[MatchSuggestion]:
    """Find candidate TripOrders for *work_order*."""
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

    wo_date = work_order.created_at.date() if work_order.created_at else None

    container_subquery = (
        select(TripOrderContainer.trip_order_id)
        .where(TripOrderContainer.container_number.in_(wo_container_numbers))
    )
    matched_to_subquery = select(TripOrderWorkOrder.trip_order_id)
    query = select(TripOrder).where(
        TripOrder.status == "PENDING",
        ~TripOrder.id.in_(matched_to_subquery),
        or_(
            TripOrder.client_id == work_order.client_id,
            TripOrder.route == work_order.route,
            TripOrder.id.in_(container_subquery),
        ),
    )
    candidates = list((await db.execute(query)).scalars().all())
    if not candidates:
        return []

    to_ids = [to.id for to in candidates]
    cont_result = await db.execute(
        select(TripOrderContainer)
        .where(TripOrderContainer.trip_order_id.in_(to_ids))
    )
    to_containers: dict[int, list[TripOrderContainer]] = defaultdict(list)
    for c in cont_result.scalars().all():
        to_containers[c.trip_order_id].append(c)

    clients = await load_client_summaries(db, {to.client_id for to in candidates})
    locations = await load_location_summaries(
        db,
        {to.pickup_location_id for to in candidates}
        | {to.dropoff_location_id for to in candidates},
    )

    suggestions: list[MatchSuggestion] = []
    for to in candidates:
        matched_fields, score = _score_to_against_wo(
            to, to_containers.get(to.id, []),
            wo_container_numbers, wo_date, work_order,
        )
        to_out = TripOrderOut(
            id=to.id, code=to.code, trip_date=to.trip_date,
            client=get_client_summary(clients, to.client_id),
            route=to.route,
            pickup_location=get_location_summary(locations, to.pickup_location_id),
            dropoff_location=get_location_summary(locations, to.dropoff_location_id),
            containers=[
                TripContainerOut.model_validate(c)
                for c in to_containers.get(to.id, [])
            ],
            pricing_id=to.pricing_id,
            unit_price=to.unit_price,
            driver_salary=to.driver_salary,
            allowance=to.allowance,
            revenue=to.revenue,
            status=to.status,
            is_confirmed=to.is_confirmed,
            confirmed_by=to.confirmed_by,
            confirmed_at=to.confirmed_at,
            is_locked=to.is_locked,
            matched_work_order_ids=[],
            created_at=to.created_at,
            updated_at=to.updated_at,
        )
        suggestions.append(MatchSuggestion(
            trip_order=to_out,
            confidence=_confidence(score),
            matched_fields=matched_fields,
            score=score,
        ))

    suggestions.sort(key=lambda s: s.score, reverse=True)
    return [s for s in suggestions if s.score >= MIN_MATCH_THRESHOLD][:30]


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

    container_subquery = (
        select(WorkOrderContainer.work_order_id)
        .where(WorkOrderContainer.container_number.in_(to_container_numbers))
    )
    matched_wo_subquery = select(TripOrderWorkOrder.work_order_id)
    query = select(WorkOrder).where(
        WorkOrder.status == "PENDING",
        ~WorkOrder.id.in_(matched_wo_subquery),
        or_(
            WorkOrder.client_id == trip_order.client_id,
            WorkOrder.route == trip_order.route,
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

    clients = await load_client_summaries(db, {wo.client_id for wo in candidates})
    drivers = await load_driver_summaries(db, {wo.driver_id for wo in candidates})
    locations = await load_location_summaries(
        db,
        {wo.pickup_location_id for wo in candidates}
        | {wo.dropoff_location_id for wo in candidates},
    )

    suggestions: list[WOSuggestion] = []
    for wo in candidates:
        matched_fields, score = _score_wo_against_to(
            wo, wo_containers.get(wo.id, []),
            to_container_numbers, trip_order,
        )
        wo_out = WorkOrderOut(
            id=wo.id,
            code=wo.code,
            client=get_client_summary(clients, wo.client_id),
            route=wo.route,
            pickup_location=get_location_summary(locations, wo.pickup_location_id),
            dropoff_location=get_location_summary(locations, wo.dropoff_location_id),
            driver=get_driver_summary(drivers, wo.driver_id),
            tractor_plate=wo.tractor_plate,
            gps_lat=wo.gps_lat,
            gps_lng=wo.gps_lng,
            gps_address=wo.gps_address,
            unit_price=wo.unit_price,
            driver_salary=wo.driver_salary,
            allowance=wo.allowance,
            earning=wo.earning,
            pricing_id=wo.pricing_id,
            status=wo.status,
            is_locked=wo.is_locked,
            containers=[
                ContainerOut.model_validate(c)
                for c in wo_containers.get(wo.id, [])
            ],
            created_at=wo.created_at,
            updated_at=wo.updated_at,
        )
        suggestions.append(WOSuggestion(
            work_order=wo_out,
            confidence=_confidence(score),
            matched_fields=matched_fields,
            score=score,
        ))

    suggestions.sort(key=lambda s: s.score, reverse=True)
    return [s for s in suggestions if s.score >= MIN_MATCH_THRESHOLD][:30]


def _score_to_against_wo(
    to: TripOrder,
    to_containers: Sequence[TripOrderContainer],
    wo_container_numbers: set[str],
    wo_date,
    work_order: WorkOrder,
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
    if work_order.pickup_location_id == to.pickup_location_id:
        matched_fields.append("pickup_location")
        score += WEIGHTS["pickup_location"]
    if work_order.dropoff_location_id == to.dropoff_location_id:
        matched_fields.append("dropoff_location")
        score += WEIGHTS["dropoff_location"]
    if to.client_id == work_order.client_id:
        matched_fields.append("client")
        score += WEIGHTS["client"]
    if to.route == work_order.route:
        matched_fields.append("route")
        score += WEIGHTS["route"]

    return matched_fields, score


def _score_wo_against_to(
    wo: WorkOrder,
    wo_containers: Sequence[WorkOrderContainer],
    to_container_numbers: set[str],
    trip_order: TripOrder,
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

    wo_date = wo.created_at.date() if wo.created_at else None
    if wo_date and trip_order.trip_date == wo_date:
        matched_fields.append("date")
        score += WEIGHTS["date"]
    if wo.pickup_location_id == trip_order.pickup_location_id:
        matched_fields.append("pickup_location")
        score += WEIGHTS["pickup_location"]
    if wo.dropoff_location_id == trip_order.dropoff_location_id:
        matched_fields.append("dropoff_location")
        score += WEIGHTS["dropoff_location"]
    if wo.client_id == trip_order.client_id:
        matched_fields.append("client")
        score += WEIGHTS["client"]
    if wo.route == trip_order.route:
        matched_fields.append("route")
        score += WEIGHTS["route"]

    return matched_fields, score
