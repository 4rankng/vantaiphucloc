"""Dashboard trip daily stats endpoint."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import DeliveredTrip
from app.models.base import User
from app.core.deps import get_current_user
from app.database import get_db
from app.schemas.domain import TripDailyStatsOut

router = APIRouter()


@router.get("/trip-daily-stats", response_model=TripDailyStatsOut)
async def get_trip_daily_stats(
    date_from: str = Query(..., description="YYYY-MM-DD"),
    date_to: str = Query(..., description="YYYY-MM-DD"),
    client_id: int | None = None,
    driver_id: int | None = None,
    matched: bool | None = None,
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lightweight daily trip aggregation for the dashboard bar chart.

    Returns matched/pending counts per day without fetching
    full booked-trip objects.  ~10x faster than fetching all trips.
    """
    try:
        df = datetime.strptime(date_from, "%Y-%m-%d").date()
        dt = datetime.strptime(date_to, "%Y-%m-%d").date()
    except ValueError:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422, detail="Invalid date format. Use YYYY-MM-DD."
        )

    stmt = select(
        DeliveredTrip.trip_date,
        DeliveredTrip.booked_trip_id,
        func.count(DeliveredTrip.id),
        func.coalesce(func.sum(DeliveredTrip.revenue), 0),
    ).where(
        DeliveredTrip.trip_date >= df,
        DeliveredTrip.trip_date <= dt,
    )

    if client_id is not None:
        stmt = stmt.where(DeliveredTrip.client_id == client_id)
    if driver_id is not None:
        stmt = stmt.where(DeliveredTrip.driver_id == driver_id)
    if matched is not None:
        stmt = stmt.where(
            DeliveredTrip.booked_trip_id.isnot(None)
            if matched
            else DeliveredTrip.booked_trip_id.is_(None)
        )

    rows = (
        await db.execute(
            stmt.group_by(DeliveredTrip.trip_date, DeliveredTrip.booked_trip_id)
        )
    ).all()

    date_map: dict[str, dict[str, int]] = {}
    total = 0
    matched = 0
    pending = 0
    internal_count = 0
    vendor_count = 0
    total_revenue = 0
    for trip_date, booked_id, cnt, rev in rows:
        ds = (
            str(trip_date)
            if not hasattr(trip_date, "isoformat")
            else trip_date.isoformat()
        )
        bucket = date_map.setdefault(ds, {"matched": 0, "pending": 0})
        total += cnt
        if booked_id is not None:
            bucket["matched"] += cnt
            matched += cnt
            total_revenue += int(rev)
        else:
            bucket["pending"] += cnt
            pending += cnt
            total_revenue += int(rev)

    # Build one bucket per day across the full date range
    from datetime import timedelta as _td

    buckets = []
    cur = df
    idx = 0
    while cur <= dt:
        ds = cur.isoformat()
        b = date_map.get(ds, {"matched": 0, "pending": 0})
        buckets.append(
            {
                "day": idx + 1,
                "date": ds,
                "matched": b["matched"],
                "pending": b["pending"],
            }
        )
        cur += _td(days=1)
        idx += 1

    # Distinct vehicle counts (not trip counts)
    base_where = [
        DeliveredTrip.trip_date >= df,
        DeliveredTrip.trip_date <= dt,
    ]
    if client_id is not None:
        base_where.append(DeliveredTrip.client_id == client_id)
    if driver_id is not None:
        base_where.append(DeliveredTrip.driver_id == driver_id)
    if matched is not None:
        base_where.append(
            DeliveredTrip.booked_trip_id.isnot(None)
            if matched
            else DeliveredTrip.booked_trip_id.is_(None)
        )

    internal_count = (
        await db.execute(
            select(func.count(func.distinct(DeliveredTrip.driver_id))).where(
                DeliveredTrip.vendor_id.is_(None),
                DeliveredTrip.driver_id.isnot(None),
                *base_where,
            )
        )
    ).scalar() or 0

    vendor_count = (
        await db.execute(
            select(func.count(func.distinct(DeliveredTrip.vendor_id))).where(
                DeliveredTrip.vendor_id.isnot(None), *base_where
            )
        )
    ).scalar() or 0

    return TripDailyStatsOut(
        date_from=df,
        date_to=dt,
        total=total,
        matched=matched,
        pending=pending,
        internal_count=internal_count,
        vendor_count=vendor_count,
        total_revenue=total_revenue,
        match_rate=round(matched / total * 100) if total > 0 else None,
        buckets=buckets,
    )
