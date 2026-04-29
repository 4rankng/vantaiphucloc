"""
Dashboard API — aggregated summary using SQL, not client-side computation.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from app.database import get_db
from app.models.domain import TripOrder, WorkOrder, Client
from app.models.base import User
from app.core.deps import get_current_user
from app.schemas.domain import DashboardSummaryOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryOut)
async def get_dashboard_summary(
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compute dashboard summary via SQL aggregation."""

    # Total revenue from trip orders
    revenue_q = await db.execute(
        select(func.coalesce(func.sum(TripOrder.revenue), 0))
    )
    total_revenue = revenue_q.scalar() or 0

    # Total expense (work order earnings)
    expense_q = await db.execute(
        select(func.coalesce(func.sum(WorkOrder.earning), 0))
    )
    total_expense = expense_q.scalar() or 0

    # Trip count
    trip_count_q = await db.execute(
        select(func.count(TripOrder.id))
    )
    trip_count = trip_count_q.scalar() or 0

    # Active trips (DRAFT + CONFIRMED)
    active_q = await db.execute(
        select(func.count(TripOrder.id)).where(
            TripOrder.status.in_(["DRAFT", "CONFIRMED"])
        )
    )
    active_trips = active_q.scalar() or 0

    # Outstanding debt
    debt_q = await db.execute(
        select(func.coalesce(func.sum(Client.outstanding_debt), 0))
    )
    outstanding_debt = debt_q.scalar() or 0

    # Driver salary summary — matched work orders grouped by driver
    driver_salary_q = await db.execute(
        select(
            User.id.label("driver_id"),
            User.username.label("driver_name"),
            User.tractor_plate.label("tractor_plate"),
            func.count(WorkOrder.id).label("total_jobs"),
            func.coalesce(func.sum(WorkOrder.earning), 0).label("total_salary"),
        )
        .join(WorkOrder, WorkOrder.driver_id == User.id)
        .where(WorkOrder.status == "MATCHED")
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

    # Unmatched work order count using NOT EXISTS (avoids full-table scan)
    from app.models.domain import TripOrderWorkOrder

    unmatched_q = await db.execute(
        select(func.count(WorkOrder.id)).where(
            ~WorkOrder.id.in_(
                select(TripOrderWorkOrder.work_order_id)
            )
        )
    )
    unmatched_work_order_count = unmatched_q.scalar() or 0

    # Pending trip count
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
