"""Dashboard OCR analytics endpoint."""

import statistics
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, cast, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import OcrRequest
from app.models.base import User
from app.core.deps import require_roles
from app.database import get_db

router = APIRouter()


# Daily latency buckets with fewer than this many non-null samples return null
# for both avg and p95. Prevents noisy precision on quiet days where one slow
# request skews the "average" by an order of magnitude.
MIN_LATENCY_SAMPLES = 5


def _percentile_p95(values: list[int]) -> float:
    """P95 over ``values`` using linear interpolation (statistics.quantiles n=20).

    Returns the 95th percentile via ``statistics.quantiles(method='inclusive')``,
    which mirrors numpy.percentile default. Stdlib only — no new dependency.
    Empty input returns 0.0; callers gate on sample count.
    """
    if not values:
        return 0.0
    if len(values) == 1:
        return float(values[0])
    # n=20 yields 19 cut points at 5%, 10%, … 95%. The 95% cut is index 18.
    cuts = statistics.quantiles(values, n=20, method="inclusive")
    return float(cuts[18])


def _avg(values: list[int]) -> float:
    if not values:
        return 0.0
    return float(sum(values) / len(values))


def _summarize_latency(values: list[int]) -> tuple[Optional[float], Optional[float]]:
    """Return (avg_ms, p95_ms) for a non-empty ``values`` list.

    Buckets with fewer than MIN_LATENCY_SAMPLES samples return (None, None) so
    quiet days render as a gap instead of a misleading single-request spike.
    """
    if len(values) < MIN_LATENCY_SAMPLES:
        return None, None
    return _avg(values), _percentile_p95(values)


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

    Latency (``latency_ms``) is captured per request by the OCR router and
    surfaced here as:

    - ``totals.latencyAvgMs`` / ``totals.latencyP95Ms`` over the full window
    - ``daily[i].latencyAvgMs`` / ``daily[i].latencyP95Ms`` per day
    - ``monthly[i].latencyAvgMs`` per month (no p95 by design)

    Buckets with fewer than ``MIN_LATENCY_SAMPLES`` latency rows return null
    so a single slow request does not skew an otherwise quiet day. Rows with
    ``latency_ms IS NULL`` (legacy rows or near-failures where the provider
    never returned) are excluded from latency aggregation but are still
    counted in ``totals.total`` so request counts stay aligned with the rest
    of the system.
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
    daily_count_map: dict[str, int] = {}
    for raw_day, cnt in daily_rows:
        daily_count_map[str(raw_day)[:10]] = int(cnt)

    # ── Latency rows over the window — single query, aggregate in Python ─────
    # Pulling (date, latency_ms) keeps the endpoint dialect-agnostic: SQLite
    # has no percentile_cont, and Python's statistics.quantiles matches
    # numpy.percentile for the dashboards' purposes.
    latency_rows = (
        await db.execute(
            select(day_expr.label("d"), OcrRequest.latency_ms).where(
                day_expr >= start_date,
                day_expr <= end_date,
                OcrRequest.latency_ms.isnot(None),
            )
        )
    ).all()
    daily_latency_map: dict[str, list[int]] = {}
    overall_latency: list[int] = []
    for raw_day, latency in latency_rows:
        # latency is guaranteed non-null: the WHERE above filters latency_ms
        # IS NOT NULL, so no None-guard is needed here.
        key = str(raw_day)[:10]
        daily_latency_map.setdefault(key, []).append(int(latency))
        overall_latency.append(int(latency))

    daily = []
    for d in day_labels:
        key = d.isoformat()
        latencies = daily_latency_map.get(key, [])
        avg_ms, p95_ms = _summarize_latency(latencies)
        daily.append(
            {
                "date": key,
                "total": daily_count_map.get(key, 0),
                "latencyAvgMs": avg_ms,
                "latencyP95Ms": p95_ms,
            }
        )

    # ── Monthly roll-up (derived from the daily series — dialect-agnostic) ───
    monthly_map: dict[str, dict] = {}
    for point in daily:
        month = point["date"][:7]  # YYYY-MM
        bucket = monthly_map.setdefault(month, {"total": 0, "latencies": []})
        bucket["total"] += point["total"]
        if point["latencyAvgMs"] is not None:
            # Reconstruct sample count from the day's pre-aggregated stats is
            # not exact (avg over N samples, not the samples themselves), so
            # for monthly avg we use a weighted average via the daily avg +
            # the per-day sample counts we already know.
            # Sample count for the day is len(daily_latency_map[date]).
            n = len(daily_latency_map.get(point["date"], []))
            if n >= MIN_LATENCY_SAMPLES:
                bucket["latencies"].append((n, point["latencyAvgMs"]))

    monthly: list[dict] = []
    for month in sorted(monthly_map):
        bucket = monthly_map[month]
        if bucket["latencies"]:
            total_n = sum(n for n, _ in bucket["latencies"])
            weighted = sum(n * avg for n, avg in bucket["latencies"]) / total_n
            month_avg: Optional[float] = float(weighted)
        else:
            month_avg = None
        monthly.append(
            {
                "month": month,
                "total": bucket["total"],
                "latencyAvgMs": month_avg,
            }
        )

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

    overall_avg, overall_p95 = _summarize_latency(overall_latency)

    return {
        "days": days,
        "endDate": end_date.isoformat(),
        "daily": daily,
        "monthly": monthly,
        "totals": {
            "total": total_count,
            "success": success_count,
            "latencyAvgMs": overall_avg,
            "latencyP95Ms": overall_p95,
        },
    }
