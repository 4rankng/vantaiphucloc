"""Suggestion algorithm for matching WorkOrders to TripOrders."""

from collections import defaultdict

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    WorkOrder,
    WorkOrderContainer,
    TripOrder,
    TripOrderContainer,
)
from app.schemas.domain import (
    MatchSuggestion,
    WOSuggestion,
    TripOrderOut,
    WorkOrderOut,
    TripContainerOut,
    ContainerOut,
)


WEIGHTS = {
    "driver": 0.3,
    "client": 0.3,
    "route": 0.2,
    "containers": 0.2,
}


async def suggest_trip_matches(
    db: AsyncSession, work_order: WorkOrder
) -> list[MatchSuggestion]:
    """Find candidate TripOrders for a given WorkOrder."""
    wo_containers_result = await db.execute(
        select(WorkOrderContainer.container_number).where(
            WorkOrderContainer.work_order_id == work_order.id
        )
    )
    wo_container_numbers = {row[0] for row in wo_containers_result.all()}

    if not wo_container_numbers:
        return []

    # Narrow candidates: at least one of driver, client, or container overlap
    container_subquery = (
        select(TripOrderContainer.trip_order_id)
        .where(TripOrderContainer.container_number.in_(wo_container_numbers))
    )

    query = select(TripOrder).where(
        TripOrder.status == "DRAFT",
        or_(
            TripOrder.driver_id == work_order.driver_id,
            TripOrder.client_id == work_order.client_id,
            TripOrder.id.in_(container_subquery),
        ),
    )

    result = await db.execute(query)
    candidates = result.scalars().all()

    if not candidates:
        return []

    # Batch-load containers for all candidates
    to_ids = [to.id for to in candidates]
    cont_result = await db.execute(
        select(TripOrderContainer).where(TripOrderContainer.trip_order_id.in_(to_ids))
    )
    to_containers: dict[int, list[TripOrderContainer]] = defaultdict(list)
    for c in cont_result.scalars().all():
        to_containers[c.trip_order_id].append(c)

    suggestions: list[MatchSuggestion] = []
    for to in candidates:
        matched_fields: list[str] = []

        if to.driver_id == work_order.driver_id:
            matched_fields.append("driver")
        if to.client_id == work_order.client_id:
            matched_fields.append("client")
        if to.route == work_order.route:
            matched_fields.append("route")

        to_cn_set = {c.container_number for c in to_containers.get(to.id, [])}
        if wo_container_numbers & to_cn_set:
            matched_fields.append("containers")

        score = sum(WEIGHTS[f] for f in matched_fields)

        if score == 1.0:
            confidence = "full"
        elif score >= 0.3:
            confidence = "partial"
        else:
            confidence = "none"

        # Build TripOrderOut
        containers_out = [
            TripContainerOut.model_validate(c)
            for c in to_containers.get(to.id, [])
        ]
        to_out = TripOrderOut(
            id=to.id,
            trip_date=to.trip_date,
            client_id=to.client_id,
            client_name=to.client_name,
            work_type=to.work_type,
            route=to.route,
            tractor_plate=to.tractor_plate,
            driver_id=to.driver_id,
            driver_name=to.driver_name,
            container_number=to.container_number,
            containers=containers_out,
            pricing_id=to.pricing_id,
            unit_price=to.unit_price,
            driver_salary=to.driver_salary,
            allowance=to.allowance,
            revenue=to.revenue,
            status=to.status,
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

    suggestions.sort(key=lambda s: s.score, reverse=True)
    return suggestions[:10]


async def suggest_wo_matches(
    db: AsyncSession, trip_order: TripOrder
) -> list[WOSuggestion]:
    """Find candidate WorkOrders for a given TripOrder."""
    to_containers_result = await db.execute(
        select(TripOrderContainer.container_number).where(
            TripOrderContainer.trip_order_id == trip_order.id
        )
    )
    to_container_numbers = {row[0] for row in to_containers_result.all()}

    if not to_container_numbers:
        return []

    container_subquery = (
        select(WorkOrderContainer.work_order_id)
        .where(WorkOrderContainer.container_number.in_(to_container_numbers))
    )

    query = select(WorkOrder).where(
        WorkOrder.status.in_(["PENDING", "PRICED"]),
        or_(
            WorkOrder.driver_id == trip_order.driver_id,
            WorkOrder.client_id == trip_order.client_id,
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

    suggestions: list[WOSuggestion] = []
    for wo in candidates:
        matched_fields: list[str] = []

        if wo.driver_id == trip_order.driver_id:
            matched_fields.append("driver")
        if wo.client_id == trip_order.client_id:
            matched_fields.append("client")
        if wo.route == trip_order.route:
            matched_fields.append("route")

        wo_cn_set = {c.container_number for c in wo_containers.get(wo.id, [])}
        if to_container_numbers & wo_cn_set:
            matched_fields.append("containers")

        score = sum(WEIGHTS[f] for f in matched_fields)

        if score == 1.0:
            confidence = "full"
        elif score >= 0.3:
            confidence = "partial"
        else:
            confidence = "none"

        containers_out = [
            ContainerOut.model_validate(c)
            for c in wo_containers.get(wo.id, [])
        ]
        wo_out = WorkOrderOut(
            id=wo.id,
            client_id=wo.client_id,
            client_name=wo.client_name,
            route=wo.route,
            driver_id=wo.driver_id,
            driver_name=wo.driver_name,
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

    suggestions.sort(key=lambda s: s.score, reverse=True)
    return suggestions[:10]
