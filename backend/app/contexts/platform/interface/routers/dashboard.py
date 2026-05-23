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

from app.models.domain import Client, BookedTrip, Vehicle, VehicleDriver, VehicleExpense, DeliveredTrip
from app.models.base import User
from app.core.deps import get_current_user, require_permission
from app.core.worker import get_arq_pool
from app.database import get_db
from app.schemas.domain import (
    DashboardSummaryOut,
    KpiTrendDeltas,
    KpiTrendsOut,
    TripDailyStatsOut,
    VehicleExpenseSummary,
    VehiclePnLResponse,
    VehiclePnLRow,
)

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

    # Revenue: sum of revenue per trip (no stored revenue column)
    revenue_query = select(func.coalesce(func.sum(BookedTrip.revenue), 0))
    if parsed_from:
        revenue_query = revenue_query.where(BookedTrip.created_at >= parsed_from)
    if parsed_to:
        revenue_query = revenue_query.where(BookedTrip.created_at < parsed_to + timedelta(days=1))
    revenue_q = await db.execute(revenue_query)
    total_revenue = revenue_q.scalar() or 0

    # Expense: sum of (driver_salary + allowance) per work order
    expense_query = select(func.coalesce(func.sum(DeliveredTrip.driver_salary + DeliveredTrip.allowance), 0))
    if parsed_from:
        expense_query = expense_query.where(DeliveredTrip.created_at >= parsed_from)
    if parsed_to:
        expense_query = expense_query.where(DeliveredTrip.created_at < parsed_to + timedelta(days=1))
    expense_q = await db.execute(expense_query)
    total_expense = expense_q.scalar() or 0

    trip_count_query = select(func.count(BookedTrip.id))
    if parsed_from:
        trip_count_query = trip_count_query.where(BookedTrip.created_at >= parsed_from)
    if parsed_to:
        trip_count_query = trip_count_query.where(BookedTrip.created_at < parsed_to + timedelta(days=1))
    trip_count_q = await db.execute(trip_count_query)
    trip_count = trip_count_q.scalar() or 0

    active_query = select(func.count(BookedTrip.id)).where(
        BookedTrip.matched == False
    )
    if parsed_from:
        active_query = active_query.where(BookedTrip.created_at >= parsed_from)
    if parsed_to:
        active_query = active_query.where(BookedTrip.created_at < parsed_to + timedelta(days=1))
    active_q = await db.execute(active_query)
    active_trips = active_q.scalar() or 0

    # outstanding_debt: confirmed receivables (matched/confirmed/completed booked trips)
    debt_query = select(func.coalesce(func.sum(BookedTrip.revenue), 0)).where(
        BookedTrip.matched == True
    )
    if parsed_from:
        debt_query = debt_query.where(BookedTrip.created_at >= parsed_from)
    if parsed_to:
        debt_query = debt_query.where(BookedTrip.created_at < parsed_to + timedelta(days=1))
    outstanding_debt = (await db.execute(debt_query)).scalar() or 0

    # Use vehicle_drivers join for plate lookup so multi-driver vehicles
    # show the correct plate per driver. Falls back to NULL plate gracefully
    # when no vehicle_drivers row exists for the driver.
    driver_salary_q = await db.execute(
        select(
            User.id.label("driver_id"),
            User.username.label("driver_name"),
            Vehicle.plate.label("tractor_plate"),
            func.count(DeliveredTrip.id).label("total_jobs"),
            func.coalesce(func.sum(DeliveredTrip.driver_salary + DeliveredTrip.allowance), 0).label("total_salary"),
        )
        .join(
            VehicleDriver,
            (VehicleDriver.driver_id == User.id) & (VehicleDriver.is_active == True),  # noqa: E712
            isouter=True,
        )
        .join(Vehicle, Vehicle.id == VehicleDriver.vehicle_id, isouter=True)
        .join(DeliveredTrip, DeliveredTrip.driver_id == User.id)
        .where(DeliveredTrip.matched == True)
        .group_by(User.id, User.username, Vehicle.plate)
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

    unmatched_q = await db.execute(
        select(func.count(DeliveredTrip.id)).where(
            DeliveredTrip.matched == False
        )
    )
    unmatched_delivered_trip_count = unmatched_q.scalar() or 0

    pending_q = await db.execute(
        select(func.count(BookedTrip.id)).where(BookedTrip.matched == False)
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


@router.get("/kpi-trends", response_model=KpiTrendsOut)
async def get_kpi_trends(
    days: int = Query(12, ge=2, le=90, description="Number of trailing days, including end_date"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD; defaults to today (UTC)"),
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Daily activity time-series powering accountant KPI sparklines.

    Returns parallel arrays (length == ``days``) for unmatched work orders,
    pending trips, driver salary expense, and revenue. Also returns a
    second-half-vs-first-half percent delta per series for the trend pill.
    """
    from datetime import date as _date, timezone as _tz
    from fastapi import HTTPException

    # ── 1. Resolve window ────────────────────────────────────────────────────
    if end_date:
        try:
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid end_date. Use YYYY-MM-DD.")
    else:
        parsed_end = datetime.now(_tz.utc).date()

    start_date = parsed_end - timedelta(days=days - 1)
    labels: list[_date] = [start_date + timedelta(days=i) for i in range(days)]

    def _normalize(d):
        """Coerce SQL date/datetime/string to Python date."""
        if d is None:
            return None
        if isinstance(d, str):
            try:
                return datetime.strptime(d[:10], "%Y-%m-%d").date()
            except ValueError:
                return None
        if isinstance(d, datetime):
            return d.date()
        return d  # already date

    # ── 2. DeliveredTrip per-day expression ──────────────────────────────────────
    # Use explicit trip_date when set, else fall back to created_at's date.
    wo_day = func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at))

    # ── 3. Unmatched work orders (PENDING, dated in window) ──────────────────
    wo_pending_rows = (await db.execute(
        select(wo_day.label("d"), func.count(DeliveredTrip.id))
        .where(
            wo_day >= start_date,
            wo_day <= parsed_end,
            DeliveredTrip.matched == False,
        )
        .group_by(wo_day)
    )).all()
    wo_pending_map: dict = {_normalize(r[0]): int(r[1]) for r in wo_pending_rows}

    # ── 4. Pending trips (PENDING, trip_date in window) ──────────────────────
    trip_pending_rows = (await db.execute(
        select(BookedTrip.trip_date.label("d"), func.count(BookedTrip.id))
        .where(
            BookedTrip.trip_date >= start_date,
            BookedTrip.trip_date <= parsed_end,
            BookedTrip.matched == False,
        )
        .group_by(BookedTrip.trip_date)
    )).all()
    trip_pending_map: dict = {_normalize(r[0]): int(r[1]) for r in trip_pending_rows}

    # ── 5. Driver salary per day (MATCHED WOs) ───────────────────────────────
    salary_rows = (await db.execute(
        select(
            wo_day.label("d"),
            func.coalesce(func.sum(DeliveredTrip.driver_salary + DeliveredTrip.allowance), 0),
        )
        .where(
            wo_day >= start_date,
            wo_day <= parsed_end,
            DeliveredTrip.matched == True,
        )
        .group_by(wo_day)
    )).all()
    salary_map: dict = {_normalize(r[0]): int(r[1] or 0) for r in salary_rows}

    # ── 6. Revenue per day (all trips dated in window) ───────────────────────
    revenue_rows = (await db.execute(
        select(
            BookedTrip.trip_date.label("d"),
            func.coalesce(func.sum(BookedTrip.revenue), 0),
        )
        .where(
            BookedTrip.trip_date >= start_date,
            BookedTrip.trip_date <= parsed_end,
        )
        .group_by(BookedTrip.trip_date)
    )).all()
    revenue_map: dict = {_normalize(r[0]): int(r[1] or 0) for r in revenue_rows}

    def _fill(m: dict) -> list[int]:
        return [m.get(d, 0) for d in labels]

    unmatched_series = _fill(wo_pending_map)
    pending_series = _fill(trip_pending_map)
    salary_series = _fill(salary_map)
    revenue_series = _fill(revenue_map)

    def _delta_pct(series: list[int]) -> float:
        """Trend % = (mean of 2nd half − mean of 1st half) / mean of 1st half × 100."""
        if len(series) < 2:
            return 0.0
        mid = len(series) // 2
        first_half = series[:mid]
        last_half = series[mid:]
        first_mean = sum(first_half) / max(len(first_half), 1)
        last_mean = sum(last_half) / max(len(last_half), 1)
        if first_mean == 0:
            return 0.0 if last_mean == 0 else 100.0
        return round(((last_mean - first_mean) / first_mean) * 100, 1)

    return KpiTrendsOut(
        end_date=parsed_end,
        days=days,
        labels=[d.isoformat() for d in labels],
        unmatched_delivered_trips=unmatched_series,
        pending_trips=pending_series,
        driver_salary=salary_series,
        revenue=revenue_series,
        deltas=KpiTrendDeltas(
            unmatched_delivered_trips=_delta_pct(unmatched_series),
            pending_trips=_delta_pct(pending_series),
            driver_salary=_delta_pct(salary_series),
            revenue=_delta_pct(revenue_series),
        ),
    )


@router.get("/vehicle-pnl", response_model=VehiclePnLResponse)
async def get_vehicle_pnl(
    date_from: str = Query(..., description="YYYY-MM-DD"),
    date_to: str = Query(..., description="YYYY-MM-DD"),
    vehicle_id: Optional[int] = Query(None, description="Filter to a single vehicle"),
    _current_user: User = Depends(require_permission("read", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    """Per-vehicle P&L: Doanh thu − Chi phí = Lợi nhuận.

    For each vehicle returns:
      - Doanh thu: 0 (reconciliation table dropped; revenue-to-vehicle
        mapping not yet available).
      - CP Xe: vehicle_expenses subtotals (XANG_DAU, SUA_CHUA, TIEN_LUAT, KHAC).
      - CP Lương sản lượng: SUM(DeliveredTrip.driver_salary + allowance) for WOs
        on this vehicle.
      - CP Lương cơ bản: effective base salary × period for drivers attached to
        this vehicle via vehicle_drivers.
    """
    from datetime import datetime as _dt
    from app.contexts.payroll.infrastructure.repositories import SqlDriverSalaryConfigRepository
    from app.contexts.payroll.domain.base_salary import effective_base_salary

    try:
        df = _dt.strptime(date_from, "%Y-%m-%d").date()
        dt = _dt.strptime(date_to, "%Y-%m-%d").date()
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Invalid date format. Use YYYY-MM-DD.")

    # ── 1. Build vehicle set ─────────────────────────────────────────────────
    veh_q = select(Vehicle.id, Vehicle.plate).where(Vehicle.is_active == True)  # noqa: E712
    if vehicle_id is not None:
        veh_q = veh_q.where(Vehicle.id == vehicle_id)
    veh_rows = (await db.execute(veh_q)).all()
    vehicles: dict[int, str] = {r[0]: r[1] for r in veh_rows}

    # ── 2. Revenue per vehicle ────────────────────────────────────────────
    # Reconciliation table has been dropped; revenue cannot be mapped to
    # vehicles through a reconciliation link.  Set revenue to 0 for now.
    revenue_by_vehicle: dict[int, int] = {}

    # ── 3. CP Lương sản lượng per vehicle ───────────────────────────────────
    # vehicle_id FK removed; join via vehicle_plate
    plate_to_vid = {plate: vid for vid, plate in vehicles.items()}
    wo_salary_rows = (await db.execute(
        select(
            Vehicle.id,
            func.coalesce(func.sum(DeliveredTrip.driver_salary), 0),
            func.coalesce(func.sum(DeliveredTrip.allowance), 0),
        )
        .join(Vehicle, Vehicle.plate == DeliveredTrip.vehicle_plate)
        .where(
            DeliveredTrip.matched == True,
            Vehicle.id.in_(list(vehicles.keys())),
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)) >= df,
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)) <= dt,
        )
        .group_by(Vehicle.id)
    )).all()

    salary_by_vehicle: dict[int, int] = {}
    for vid, sal, allow in wo_salary_rows:
        if vid:
            salary_by_vehicle[vid] = int(sal or 0) + int(allow or 0)

    # ── 3b. Trip count per vehicle for CP Chung allocation ─────────
    wo_count_rows = (await db.execute(
        select(
            Vehicle.id,
            func.count(DeliveredTrip.id),
        )
        .join(Vehicle, Vehicle.plate == DeliveredTrip.vehicle_plate)
        .where(
            DeliveredTrip.matched == True,
            Vehicle.id.in_(list(vehicles.keys())),
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)) >= df,
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)) <= dt,
        )
        .group_by(Vehicle.id)
    )).all()

    trip_count_by_vehicle: dict[int, int] = {}
    total_trips = 0
    for vid, cnt in wo_count_rows:
        if vid:
            trip_count_by_vehicle[vid] = int(cnt)
            total_trips += int(cnt)

    # ── 4. CP Xe (vehicle expenses) per vehicle ──────────────────────────────
    expense_rows = (await db.execute(
        select(
            VehicleExpense.vehicle_id,
            VehicleExpense.category,
            func.coalesce(func.sum(VehicleExpense.amount), 0),
        )
        .where(
            VehicleExpense.expense_date >= df,
            VehicleExpense.expense_date <= dt,
            VehicleExpense.category.in_(["XANG_DAU", "SUA_CHUA", "TIEN_LUAT", "KHAC"]),
        )
        .group_by(VehicleExpense.vehicle_id, VehicleExpense.category)
    )).all()

    cp_xe_by_vehicle: dict[int, dict[str, int]] = {}
    for vid, cat, total_amt in expense_rows:
        amt = int(total_amt or 0)
        if vid and vid in vehicles:
            slot = cp_xe_by_vehicle.setdefault(vid, {"XANG_DAU": 0, "SUA_CHUA": 0, "TIEN_LUAT": 0, "KHAC": 0})
            slot[cat] = slot.get(cat, 0) + amt

    # ── 5. CP Lương cơ bản: drivers attached to each vehicle via vehicle_drivers
    vd_rows = (await db.execute(
        select(VehicleDriver.vehicle_id, VehicleDriver.driver_id)
        .where(
            VehicleDriver.vehicle_id.in_(list(vehicles.keys())),
            VehicleDriver.is_active == True,  # noqa: E712
            VehicleDriver.effective_from <= dt,
        )
    )).all()

    vehicle_driver_map: dict[int, list[int]] = {}
    for vid, did in vd_rows:
        vehicle_driver_map.setdefault(vid, []).append(did)

    all_driver_ids = list({d for drivers in vehicle_driver_map.values() for d in drivers})
    base_salary_repo = SqlDriverSalaryConfigRepository(db)
    history_by_driver = await base_salary_repo.list_history_for_drivers(all_driver_ids) if all_driver_ids else {}

    base_salary_by_vehicle: dict[int, int] = {}
    for vid, driver_ids in vehicle_driver_map.items():
        total_base = sum(
            effective_base_salary(history_by_driver.get(did, []), dt)
            for did in driver_ids
        )
        base_salary_by_vehicle[vid] = total_base

    # ── 6. Assemble rows ─────────────────────────────────────────────────────
    rows: list[VehiclePnLRow] = []
    total_revenue = 0
    sum_row_profits = 0

    for vid, plate in sorted(vehicles.items(), key=lambda x: x[1]):
        rev = revenue_by_vehicle.get(vid, 0)
        sal = salary_by_vehicle.get(vid, 0)
        base = base_salary_by_vehicle.get(vid, 0)
        xe_cats = cp_xe_by_vehicle.get(vid, {})
        xe_summary = VehicleExpenseSummary(
            xang_dau=xe_cats.get("XANG_DAU", 0),
            sua_chua=xe_cats.get("SUA_CHUA", 0),
            tien_luat=xe_cats.get("TIEN_LUAT", 0),
            khac=xe_cats.get("KHAC", 0),
            total=sum(xe_cats.values()),
        )
        loi_nhuan = rev - (xe_summary.total + sal + base)
        rows.append(VehiclePnLRow(
            vehicle_id=vid,
            plate=plate,
            revenue=rev,
            cp_xe=xe_summary,
            cp_luong_san_luong=sal,
            cp_luong_co_ban=base,
            loi_nhuan=loi_nhuan,
        ))
        total_revenue += rev
        sum_row_profits += loi_nhuan

    total_profit = sum_row_profits

    return VehiclePnLResponse(
        date_from=df,
        date_to=dt,
        rows=rows,
        total_revenue=total_revenue,
        total_profit=total_profit,
    )


@router.get("/trip-daily-stats", response_model=TripDailyStatsOut)
async def get_trip_daily_stats(
    date_from: str = Query(..., description="YYYY-MM-DD"),
    date_to: str = Query(..., description="YYYY-MM-DD"),
    client_id: int | None = None,
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lightweight daily trip aggregation for the dashboard bar chart.

    Returns matched/pending counts per day of month without fetching
    full booked-trip objects.  ~10x faster than fetching all trips.
    """
    import calendar as _cal

    try:
        df = datetime.strptime(date_from, "%Y-%m-%d").date()
        dt = datetime.strptime(date_to, "%Y-%m-%d").date()
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Invalid date format. Use YYYY-MM-DD.")

    stmt = select(
        DeliveredTrip.trip_date,
        DeliveredTrip.matched,
        func.count(DeliveredTrip.id),
        func.coalesce(func.sum(DeliveredTrip.revenue), 0),
    ).where(
        DeliveredTrip.trip_date >= df,
        DeliveredTrip.trip_date <= dt,
    )

    if client_id is not None:
        stmt = stmt.where(DeliveredTrip.client_id == client_id)

    rows = (await db.execute(
        stmt.group_by(DeliveredTrip.trip_date, DeliveredTrip.matched)
    )).all()

    day_map: dict[int, dict[str, int]] = {}
    total = 0
    matched = 0
    pending = 0
    total_revenue = 0
    for trip_date, is_matched, cnt, rev in rows:
        day = trip_date.day if hasattr(trip_date, 'day') else trip_date
        bucket = day_map.setdefault(day, {"matched": 0, "pending": 0})
        total += cnt
        if is_matched:
            bucket["matched"] += cnt
            matched += cnt
            total_revenue += int(rev)
        else:
            bucket["pending"] += cnt
            pending += cnt
            total_revenue += int(rev)

    days_in_month = _cal.monthrange(df.year, df.month)[1]
    buckets = [
        {"day": d, **day_map.get(d, {"matched": 0, "pending": 0})}
        for d in range(1, days_in_month + 1)
    ]

    return TripDailyStatsOut(
        date_from=df,
        date_to=dt,
        total=total,
        matched=matched,
        pending=pending,
        total_revenue=total_revenue,
        match_rate=round(matched / total * 100) if total > 0 else None,
        buckets=buckets,
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
