"""Suggestion algorithm for matching WorkOrders to TripOrders.

Matching Criteria (6 total):
1. Container number (normalized to ISO 6346 format: ABCD1234567)
2. Date (trip_date vs work_order.created_at)
3. Pickup location (route.pickup_location vs wo driver entry)
4. Dropoff location (route.dropoff_location vs wo driver entry)
5. Customer (client_id)
6. Route (route id/string)

Confidence Levels:
- 6/6 (100%) = auto-confirm
- 5/6 (83.3%) = potential match (>80%)
- ≤4/6 (<80%) = no match
"""

import logging
import re
from collections import defaultdict
from datetime import date

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    WorkOrder,
    WorkOrderContainer,
    TripOrder,
    TripOrderContainer,
    TripOrderWorkOrder,
)
from app.schemas.domain import (
    MatchSuggestion,
    WOSuggestion,
    TripOrderOut,
    WorkOrderOut,
    TripContainerOut,
    ContainerOut,
)
from app.services.summary_loader import (
    load_client_summaries,
    load_driver_summaries,
    load_location_summaries,
    get_client_summary,
    get_driver_summary,
    get_location_summary,
)
from app.utils.iso6346 import normalize_container_number

_logger = logging.getLogger(__name__)

# Weights for 6 matching criteria (each gets 1/6 = ~16.67%)
# All criteria have equal weight for the 80% threshold
WEIGHTS = {
    "container_number": 1.0 / 6,
    "date": 1.0 / 6,
    "pickup_location": 1.0 / 6,
    "dropoff_location": 1.0 / 6,
    "client": 1.0 / 6,
    "route": 1.0 / 6,
}

# Threshold for full match: 100% = all 6 criteria
FULL_MATCH_THRESHOLD = 1.0

# Threshold for partial match: ≥3/6 = 50% (at least 3 criteria match)
POTENTIAL_MATCH_THRESHOLD = 3.0 / 6.0  # 50%

# Minimum threshold to appear in suggestions at all: any 1 field matches
MIN_MATCH_THRESHOLD = 1.0 / 6.0  # ~16.7%


async def suggest_trip_matches(
    db: AsyncSession, work_order: WorkOrder
) -> list[MatchSuggestion]:
    """Find candidate TripOrders for a given WorkOrder.

    Uses 6-criteria matching:
    1. Container number (normalized)
    2. Date
    3. Pickup location
    4. Dropoff location
    5. Customer
    6. Route

    Returns suggestions with confidence:
    - full (6/6 = 100%)
    - partial (5/6 = 83.3%+)
    - none (<80% = ≤4/6)
    """
    # Load WO containers and normalize container numbers
    wo_containers_result = await db.execute(
        select(WorkOrderContainer.container_number, WorkOrderContainer.work_type).where(
            WorkOrderContainer.work_order_id == work_order.id
        )
    )
    wo_containers = wo_containers_result.all()
    wo_container_numbers = {normalize_container_number(row[0]) for row in wo_containers if row[0]}
    wo_work_types = {row[1] for row in wo_containers if row[1]}

    if not wo_container_numbers:
        return []

    # Get WO date for matching
    wo_date = work_order.created_at.date() if work_order.created_at else None

    # Narrow candidates: at least one of container, client, or route matches
    container_subquery = (
        select(TripOrderContainer.trip_order_id)
        .where(TripOrderContainer.container_number.in_(wo_container_numbers))
    )

    # Exclude TOs that already have a match (1-to-1 enforcement)
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

    result = await db.execute(query)
    candidates = result.scalars().all()

    if not candidates:
        return []

    to_ids = [to.id for to in candidates]
    cont_result = await db.execute(
        select(TripOrderContainer).where(TripOrderContainer.trip_order_id.in_(to_ids))
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
        matched_fields: list[str] = []
        score = 0.0

        # 1. Container number match (normalized)
        to_cn_set = {normalize_container_number(c.container_number) for c in to_containers.get(to.id, []) if c.container_number}
        if wo_container_numbers & to_cn_set:
            matched_fields.append("container_number")
            score += WEIGHTS["container_number"]
        else:
            wo_digits = {re.sub(r'[^0-9]', '', cn) for cn in wo_container_numbers if cn}
            to_digits = {re.sub(r'[^0-9]', '', cn) for cn in to_cn_set if cn}
            if wo_digits & to_digits:
                matched_fields.append("container_number_partial")
                score += WEIGHTS["container_number"] * 0.5

        # 2. Date match (trip_date vs WO created_at date)
        if wo_date and to.trip_date == wo_date:
            matched_fields.append("date")
            score += WEIGHTS["date"]

        # 3. Pickup location match (FK)
        if work_order.pickup_location_id == to.pickup_location_id:
            matched_fields.append("pickup_location")
            score += WEIGHTS["pickup_location"]

        # 4. Dropoff location match (FK)
        if work_order.dropoff_location_id == to.dropoff_location_id:
            matched_fields.append("dropoff_location")
            score += WEIGHTS["dropoff_location"]

        # 5. Client match
        if to.client_id == work_order.client_id:
            matched_fields.append("client")
            score += WEIGHTS["client"]

        # 6. Route match
        if to.route == work_order.route:
            matched_fields.append("route")
            score += WEIGHTS["route"]

        # Calculate confidence based on thresholds
        if score >= FULL_MATCH_THRESHOLD:
            confidence = "full"
        elif score >= POTENTIAL_MATCH_THRESHOLD:
            confidence = "partial"
        elif score >= MIN_MATCH_THRESHOLD:
            confidence = "none"
        else:
            confidence = "none"

        # Build TripOrderOut
        containers_out = [
            TripContainerOut.model_validate(c)
            for c in to_containers.get(to.id, [])
        ]
        to_out = TripOrderOut(
            id=to.id,
            code=to.code,
            trip_date=to.trip_date,
            client=get_client_summary(clients, to.client_id),
            route=to.route,
            pickup_location=get_location_summary(locations, to.pickup_location_id),
            dropoff_location=get_location_summary(locations, to.dropoff_location_id),
            containers=containers_out,
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
            confidence=confidence,
            matched_fields=matched_fields,
            score=score,
        ))

    # Sort by score (highest first), return all with at least 1 matching field (top 30)
    suggestions.sort(key=lambda s: s.score, reverse=True)
    return [s for s in suggestions if s.score >= MIN_MATCH_THRESHOLD][:30]


async def suggest_wo_matches(
    db: AsyncSession, trip_order: TripOrder
) -> list[WOSuggestion]:
    """Find candidate WorkOrders for a given TripOrder.

    Uses 6-criteria matching:
    1. Container number (normalized)
    2. Date
    3. Pickup location
    4. Dropoff location
    5. Customer
    6. Route

    Returns suggestions with confidence:
    - full (6/6 = 100%)
    - partial (5/6 = 83.3%+)
    - none (<80% = ≤4/6)
    """
    # Load TO containers and normalize container numbers
    to_containers_result = await db.execute(
        select(TripOrderContainer.container_number, TripOrderContainer.work_type).where(
            TripOrderContainer.trip_order_id == trip_order.id
        )
    )
    to_containers = to_containers_result.all()
    to_container_numbers = {normalize_container_number(row[0]) for row in to_containers if row[0]}
    to_work_types = {row[1] for row in to_containers if row[1]}

    if not to_container_numbers:
        return []

    # Narrow candidates: at least one of container, client, or route matches
    container_subquery = (
        select(WorkOrderContainer.work_order_id)
        .where(WorkOrderContainer.container_number.in_(to_container_numbers))
    )

    # Exclude WOs that already have a match (1-to-1 enforcement)
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

    result = await db.execute(query)
    candidates = result.scalars().all()

    if not candidates:
        return []

    wo_ids = [wo.id for wo in candidates]
    cont_result = await db.execute(
        select(WorkOrderContainer).where(WorkOrderContainer.work_order_id.in_(wo_ids))
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
        matched_fields: list[str] = []
        score = 0.0

        # 1. Container number match (normalized)
        wo_cn_set = {normalize_container_number(c.container_number) for c in wo_containers.get(wo.id, []) if c.container_number}
        if to_container_numbers & wo_cn_set:
            matched_fields.append("container_number")
            score += WEIGHTS["container_number"]
        else:
            to_digits = {re.sub(r'[^0-9]', '', cn) for cn in to_container_numbers if cn}
            wo_digits = {re.sub(r'[^0-9]', '', cn) for cn in wo_cn_set if cn}
            if to_digits & wo_digits:
                matched_fields.append("container_number_partial")
                score += WEIGHTS["container_number"] * 0.5

        # 2. Date match (trip_date vs WO created_at date)
        wo_date = wo.created_at.date() if wo.created_at else None
        if wo_date and trip_order.trip_date == wo_date:
            matched_fields.append("date")
            score += WEIGHTS["date"]

        # 3. Pickup location match (FK)
        if wo.pickup_location_id == trip_order.pickup_location_id:
            matched_fields.append("pickup_location")
            score += WEIGHTS["pickup_location"]

        # 4. Dropoff location match (FK)
        if wo.dropoff_location_id == trip_order.dropoff_location_id:
            matched_fields.append("dropoff_location")
            score += WEIGHTS["dropoff_location"]

        # 5. Client match
        if wo.client_id == trip_order.client_id:
            matched_fields.append("client")
            score += WEIGHTS["client"]

        # 6. Route match
        if wo.route == trip_order.route:
            matched_fields.append("route")
            score += WEIGHTS["route"]

        # Calculate confidence based on thresholds
        if score >= FULL_MATCH_THRESHOLD:
            confidence = "full"
        elif score >= POTENTIAL_MATCH_THRESHOLD:
            confidence = "partial"
        elif score >= MIN_MATCH_THRESHOLD:
            confidence = "none"
        else:
            confidence = "none"

        containers_out = [
            ContainerOut.model_validate(c)
            for c in wo_containers.get(wo.id, [])
        ]
        wo_out = WorkOrderOut(
            id=wo.id,
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
            containers=containers_out,
            created_at=wo.created_at,
            updated_at=wo.updated_at,
        )

        suggestions.append(WOSuggestion(
            work_order=wo_out,
            confidence=confidence,
            matched_fields=matched_fields,
            score=score,
        ))

    # Sort by score (highest first), return all with at least 1 matching field (top 30)
    suggestions.sort(key=lambda s: s.score, reverse=True)
    return [s for s in suggestions if s.score >= MIN_MATCH_THRESHOLD][:30]
