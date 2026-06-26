"""Dashboard KPI trends endpoint."""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import DeliveredTrip
from app.models.base import User
from app.core.deps import get_current_user
from app.database import get_db
from app.schemas.domain import (
    KpiTrendDeltas,
    KpiTrendsOut,
)

router = APIRouter()


@router.get("/kpi-trends", response_model=KpiTrendsOut)
async def get_kpi_trends(
    days: int = Query(
        12, ge=2, le=90, description="Number of trailing days, including end_date"
    ),
    end_date: Optional[str] = Query(
        None, description="YYYY-MM-DD; defaults to today (UTC)"
    ),
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
            raise HTTPException(
                status_code=422, detail="Invalid end_date. Use YYYY-MM-DD."
            )
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
    wo_pending_rows = (
        await db.execute(
            select(wo_day.label("d"), func.count(DeliveredTrip.id))
            .where(
                wo_day >= start_date,
                wo_day <= parsed_end,
                DeliveredTrip.booked_trip_id.is_(None),
            )
            .group_by(wo_day)
        )
    ).all()
    wo_pending_map: dict = {_normalize(r[0]): int(r[1]) for r in wo_pending_rows}

    # ── 4. Pending trips (UNMATCHED DeliveredTrips in window) ──────────────────
    trip_pending_rows = (
        await db.execute(
            select(wo_day.label("d"), func.count(DeliveredTrip.id))
            .where(
                wo_day >= start_date,
                wo_day <= parsed_end,
                DeliveredTrip.booked_trip_id.is_(None),
            )
            .group_by(wo_day)
        )
    ).all()
    trip_pending_map: dict = {_normalize(r[0]): int(r[1]) for r in trip_pending_rows}

    # ── 5. Driver salary per day (MATCHED WOs) ───────────────────────────────
    salary_rows = (
        await db.execute(
            select(
                wo_day.label("d"),
                func.coalesce(func.sum(DeliveredTrip.driver_salary), 0),
            )
            .where(
                wo_day >= start_date,
                wo_day <= parsed_end,
                DeliveredTrip.booked_trip_id.isnot(None),
            )
            .group_by(wo_day)
        )
    ).all()
    salary_map: dict = {_normalize(r[0]): int(r[1] or 0) for r in salary_rows}

    # ── 6. Revenue per day (matched DeliveredTrips dated in window) ───────────
    revenue_rows = (
        await db.execute(
            select(
                func.coalesce(
                    DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                ).label("d"),
                func.coalesce(func.sum(DeliveredTrip.revenue), 0),
            )
            .where(
                DeliveredTrip.booked_trip_id.isnot(None),  # noqa: E712
                func.coalesce(
                    DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                )
                >= start_date,
                func.coalesce(
                    DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                )
                <= parsed_end,
            )
            .group_by(
                func.coalesce(
                    DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                )
            )
        )
    ).all()
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
