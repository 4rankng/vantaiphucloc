"""Dashboard summary endpoint."""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    Vehicle,
    VehicleDriver,
    DeliveredTrip,
)
from app.models.base import User
from app.core.deps import get_current_user
from app.database import get_db
from app.schemas.domain import DashboardSummaryOut

router = APIRouter()


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

    # Revenue: sum of revenue from matched DeliveredTrips
    revenue_query = select(func.coalesce(func.sum(DeliveredTrip.revenue), 0)).where(
        DeliveredTrip.booked_trip_id.isnot(None)
    )
    if parsed_from:
        revenue_query = revenue_query.where(
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at))
            >= parsed_from
        )
    if parsed_to:
        revenue_query = revenue_query.where(
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at))
            < parsed_to + timedelta(days=1)
        )
    revenue_q = await db.execute(revenue_query)
    total_revenue = revenue_q.scalar() or 0

    # Expense: sum of driver_salary per work order
    expense_query = select(func.coalesce(func.sum(DeliveredTrip.driver_salary), 0))
    if parsed_from:
        expense_query = expense_query.where(DeliveredTrip.created_at >= parsed_from)
    if parsed_to:
        expense_query = expense_query.where(
            DeliveredTrip.created_at < parsed_to + timedelta(days=1)
        )
    expense_q = await db.execute(expense_query)
    total_expense = expense_q.scalar() or 0

    _wo_day = func.coalesce(
        DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
    )

    trip_count_query = select(func.count(DeliveredTrip.id))
    if parsed_from:
        trip_count_query = trip_count_query.where(_wo_day >= parsed_from)
    if parsed_to:
        trip_count_query = trip_count_query.where(
            _wo_day < parsed_to + timedelta(days=1)
        )
    trip_count_q = await db.execute(trip_count_query)
    trip_count = trip_count_q.scalar() or 0

    active_query = select(func.count(DeliveredTrip.id)).where(
        DeliveredTrip.booked_trip_id.isnot(None)
    )
    if parsed_from:
        active_query = active_query.where(_wo_day >= parsed_from)
    if parsed_to:
        active_query = active_query.where(_wo_day < parsed_to + timedelta(days=1))
    active_q = await db.execute(active_query)
    active_trips = active_q.scalar() or 0

    # outstanding_debt: confirmed receivables (matched DeliveredTrips)
    debt_query = select(func.coalesce(func.sum(DeliveredTrip.revenue), 0)).where(
        DeliveredTrip.booked_trip_id.isnot(None)
    )
    if parsed_from:
        debt_query = debt_query.where(
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at))
            >= parsed_from
        )
    if parsed_to:
        debt_query = debt_query.where(
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at))
            < parsed_to + timedelta(days=1)
        )
    outstanding_debt = (await db.execute(debt_query)).scalar() or 0

    # Use vehicle_drivers join for plate lookup so multi-driver vehicles
    # show the correct plate per driver. Falls back to NULL plate gracefully
    # when no vehicle_drivers row exists for the driver.
    driver_salary_q = await db.execute(
        select(
            User.id.label("driver_id"),
            User.username.label("driver_name"),
            Vehicle.plate.label("vehicle_plate"),
            func.count(DeliveredTrip.id).label("total_jobs"),
            func.coalesce(func.sum(DeliveredTrip.driver_salary), 0).label(
                "total_salary"
            ),
        )
        .join(
            VehicleDriver,
            (VehicleDriver.driver_id == User.id) & (VehicleDriver.is_active == True),  # noqa: E712
            isouter=True,
        )
        .join(Vehicle, Vehicle.id == VehicleDriver.vehicle_id, isouter=True)
        .join(DeliveredTrip, DeliveredTrip.driver_id == User.id)
        .where(DeliveredTrip.booked_trip_id.isnot(None))
        .group_by(User.id, User.username, Vehicle.plate)
    )
    driver_salary_summary = [
        {
            "driver_id": row.driver_id,
            "driver_name": row.driver_name,
            "vehicle_plate": row.vehicle_plate,
            "total_jobs": row.total_jobs,
            "total_salary": row.total_salary,
        }
        for row in driver_salary_q.all()
    ]

    unmatched_q = await db.execute(
        select(func.count(DeliveredTrip.id)).where(
            DeliveredTrip.booked_trip_id.is_(None)
        )
    )
    unmatched_delivered_trip_count = unmatched_q.scalar() or 0

    pending_q = await db.execute(
        select(func.count(DeliveredTrip.id)).where(
            DeliveredTrip.booked_trip_id.is_(None)
        )
    )
    pending_trip_count = pending_q.scalar() or 0

    return DashboardSummaryOut(
        total_revenue=total_revenue,
        total_expense=total_expense,
        trip_count=trip_count,
        active_trips=active_trips,
        outstanding_debt=outstanding_debt,
        driver_salary_summary=driver_salary_summary,
        unmatched_delivered_trip_count=unmatched_delivered_trip_count,
        pending_trip_count=pending_trip_count,
    )
