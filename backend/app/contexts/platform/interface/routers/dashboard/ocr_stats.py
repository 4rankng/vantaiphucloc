"""Dashboard OCR analytics endpoint."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, cast, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import OcrRequest
from app.models.base import User
from app.core.deps import require_roles
from app.database import get_db

router = APIRouter()


@router.get("/ocr-stats")
async def get_ocr_stats(
    days: int = Query(
        30, ge=1, le=730, description="Trailing days including today (UTC)"
    ),
    _current_user: User = Depends(
        require_roles("superadmin", "director", "accountant")
    ),
    db: AsyncSession = Depends(get_db),
):
    """OCR request analytics: total counts per day / month (model-agnostic).

    One row per container-photo OCR request is logged in ``ocr_requests``.
    Counts aggregate across ALL providers (gemini, minimax, openrouter, …) so
    the dashboard shows overall OCR volume regardless of which engine served
    the request. Returns a zero-filled daily series, a monthly roll-up derived
    from it, and overall totals with success counts over the trailing ``days``
    window.
    """
    from datetime import timezone as _tz

    end_date = datetime.now(_tz.utc).date()
    start_date = end_date - timedelta(days=days - 1)
    day_labels = [start_date + timedelta(days=i) for i in range(days)]

    day_expr = func.date(OcrRequest.created_at)

    # ── Daily counts (all providers combined) ────────────────────────────────
    daily_rows = (
        await db.execute(
            select(day_expr.label("d"), func.count(OcrRequest.id))
            .where(day_expr >= start_date, day_expr <= end_date)
            .group_by(day_expr)
        )
    ).all()
    daily_map: dict[str, int] = {}
    for raw_day, cnt in daily_rows:
        daily_map[str(raw_day)[:10]] = int(cnt)

    daily = [
        {"date": d.isoformat(), "total": daily_map.get(d.isoformat(), 0)}
        for d in day_labels
    ]

    # ── Monthly roll-up (derived from the daily series — dialect-agnostic) ───
    monthly_map: dict[str, int] = {}
    for point in daily:
        month = point["date"][:7]  # YYYY-MM
        monthly_map[month] = monthly_map.get(month, 0) + point["total"]
    monthly = [{"month": m, "total": monthly_map[m]} for m in sorted(monthly_map)]

    # ── Totals + success counts over the range (all providers combined) ──────
    total_row = (
        await db.execute(
            select(
                func.count(OcrRequest.id),
                func.sum(cast(OcrRequest.success, Integer)),
            ).where(day_expr >= start_date, day_expr <= end_date)
        )
    ).one()
    total_count = int(total_row[0] or 0)
    success_count = int(total_row[1] or 0)

    return {
        "days": days,
        "endDate": end_date.isoformat(),
        "daily": daily,
        "monthly": monthly,
        "totals": {"total": total_count, "success": success_count},
    }
