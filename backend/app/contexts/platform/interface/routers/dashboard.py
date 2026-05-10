"""
Dashboard API — aggregated summary using SQL, not client-side computation.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import TripOrder, WorkOrder, Client
from app.models.base import User
from app.core.deps import get_current_user
from app.core.worker import get_arq_pool
from app.database import get_db
from app.schemas.domain import DashboardSummaryOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryOut)
async def get_dashboard_summary(
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="YYYY-MM-DD"),
):
    parsed_from = None
    parsed_to = None
    if date_from:
        try:
            parsed_from = datetime.strptime(date_from, "%Y-%m-%d").date()
        except ValueError:
            pass
    if date_to:
        try:
            parsed_to = datetime.strptime(date_to, "%Y-%m-%d").date()
        except ValueError:
            pass

    revenue_query = select(func.coalesce(func.sum(TripOrder.revenue), 0))
    if parsed_from:
        revenue_query = revenue_query.where(TripOrder.created_at >= parsed_from)
    if parsed_to:
        revenue_query = revenue_query.where(TripOrder.created_at < parsed_to + timedelta(days=1))
    revenue_q = await db.execute(revenue_query)
    total_revenue = revenue_q.scalar() or 0

    expense_query = select(func.coalesce(func.sum(WorkOrder.earning), 0))
    if parsed_from:
        expense_query = expense_query.where(WorkOrder.created_at >= parsed_from)
    if parsed_to:
        expense_query = expense_query.where(WorkOrder.created_at < parsed_to + timedelta(days=1))
    expense_q = await db.execute(expense_query)
    total_expense = expense_q.scalar() or 0

    trip_count_query = select(func.count(TripOrder.id))
    if parsed_from:
        trip_count_query = trip_count_query.where(TripOrder.created_at >= parsed_from)
    if parsed_to:
        trip_count_query = trip_count_query.where(TripOrder.created_at < parsed_to + timedelta(days=1))
    trip_count_q = await db.execute(trip_count_query)
    trip_count = trip_count_q.scalar() or 0

    active_query = select(func.count(TripOrder.id)).where(
        TripOrder.status.in_(["DRAFT", "PENDING"])
    )
    if parsed_from:
        active_query = active_query.where(TripOrder.created_at >= parsed_from)
    if parsed_to:
        active_query = active_query.where(TripOrder.created_at < parsed_to + timedelta(days=1))
    active_q = await db.execute(active_query)
    active_trips = active_q.scalar() or 0

    debt_q = await db.execute(
        select(func.coalesce(func.sum(Client.outstanding_debt), 0))
    )
    outstanding_debt = debt_q.scalar() or 0

    driver_salary_q = await db.execute(
        select(
            User.id.label("driver_id"),
            User.username.label("driver_name"),
            User.tractor_plate.label("tractor_plate"),
            func.count(WorkOrder.id).label("total_jobs"),
            func.coalesce(func.sum(WorkOrder.earning), 0).label("total_salary"),
        )
        .join(WorkOrder, WorkOrder.driver_id == User.id)
        .where(WorkOrder.status.in_(["MATCHED", "COMPLETED"]))
        .group_by(User.id, User.username, User.tractor_plate)
    )
    driver_salary_summary = [
        {
            "driver_id": row.driver_id,
            "driver_name": row.driver_name,
            "tractor_plate": row.tractor_plate,
            "total_jobs": row.total_jobs,
            "total_salary": row.total_salary,
        }
        for row in driver_salary_q.all()
    ]

    from app.models.domain import TripOrderWorkOrder

    unmatched_q = await db.execute(
        select(func.count(WorkOrder.id)).where(
            ~WorkOrder.id.in_(
                select(TripOrderWorkOrder.work_order_id)
            )
        )
    )
    unmatched_work_order_count = unmatched_q.scalar() or 0

    pending_q = await db.execute(
        select(func.count(TripOrder.id)).where(TripOrder.status == "DRAFT")
    )
    pending_trip_count = pending_q.scalar() or 0

    return DashboardSummaryOut(
        total_revenue=total_revenue,
        total_expense=total_expense,
        trip_count=trip_count,
        active_trips=active_trips,
        outstanding_debt=outstanding_debt,
        driver_salary_summary=driver_salary_summary,
        unmatched_work_order_count=unmatched_work_order_count,
        pending_trip_count=pending_trip_count,
    )


@router.get("/notifications")
async def get_notifications(
    current_user: User = Depends(get_current_user),
):
    try:
        redis = get_arq_pool()
        key = f"notifications:user:{current_user.id}"
        raw_items = await redis.zrevrange(key, 0, 49)
        notifications = []
        for i, raw in enumerate(raw_items):
            try:
                data = json.loads(raw)
                notifications.append({
                    "id": str(i),
                    "type": data.get("channel", "general"),
                    "title": data.get("title", ""),
                    "message": data.get("message", ""),
                    "time": data.get("created_at", ""),
                    "read": data.get("read", False),
                })
            except (json.JSONDecodeError, KeyError):
                logger.warning("Malformed notification entry for user %s", current_user.id)
                continue
        return notifications
    except RuntimeError:
        logger.warning("arq pool unavailable, returning empty notifications")
        return []
