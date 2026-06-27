"""Dashboard OCR analytics endpoint."""

import re
import statistics
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, cast, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import OcrDriverRequest, OcrRequest
from app.models.base import User
from app.core.deps import require_roles
from app.database import get_db

router = APIRouter()


# Daily latency buckets with fewer than this many non-null samples return null
# for both avg and p95. Prevents noisy precision on quiet days where one slow
# request skews the "average" by an order of magnitude.
MIN_LATENCY_SAMPLES = 5
HTTP_STATUS_RE = re.compile(r"\bHTTP\s+(\d{3})\b", re.IGNORECASE)


def _http_action(status: int) -> str:
    if status == 429:
        return "Kiểm tra rate limit, quota hoặc bật fallback provider"
    if status == 401 or status == 403:
        return "Kiểm tra API key và quyền truy cập provider"
    if status == 400:
        return "Kiểm tra payload ảnh hoặc model request"
    if 400 <= status < 500:
        return "Kiểm tra cấu hình request/provider"
    if 500 <= status < 600:
        return "Theo dõi sự cố provider hoặc chuyển provider dự phòng"
    return "Xem chi tiết lỗi để xử lý"


def _categorize_ocr_error(error: str | None) -> dict:
    text = (error or "").strip()
    lower = text.lower()
    match = HTTP_STATUS_RE.search(text)
    if match:
        status = int(match.group(1))
        return {
            "category": f"http_{status}",
            "label": f"HTTP {status}",
            "statusCode": status,
            "action": _http_action(status),
        }
    if "timeout" in lower or "timed out" in lower:
        return {
            "category": "timeout",
            "label": "Timeout",
            "statusCode": None,
            "action": "Kiểm tra độ trễ provider và giảm kích thước ảnh nếu cần",
        }
    if "connect" in lower or "network" in lower or "readerror" in lower:
        return {
            "category": "network",
            "label": "Mạng/provider",
            "statusCode": None,
            "action": "Kiểm tra kết nối tới provider hoặc DNS/proxy",
        }
    if (
        "no valid numbers" in lower
        or "không nhận dạng" in lower
        or "khong nhan dang" in lower
    ):
        return {
            "category": "no_detection",
            "label": "Không nhận dạng được",
            "statusCode": None,
            "action": "Kiểm tra chất lượng ảnh hoặc prompt OCR",
        }
    if "no response generated" in lower or "empty response" in lower:
        return {
            "category": "empty_response",
            "label": "Provider trả rỗng",
            "statusCode": None,
            "action": "Kiểm tra model/provider trả nội dung rỗng",
        }
    if not text:
        return {
            "category": "unknown",
            "label": "Không rõ lỗi",
            "statusCode": None,
            "action": "Bổ sung log lỗi chi tiết cho provider",
        }
    return {
        "category": "other",
        "label": "Lỗi khác",
        "statusCode": None,
        "action": "Mở sample lỗi để phân loại thêm",
    }


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
    current_user: User = Depends(require_roles("superadmin", "director", "accountant")),
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
    surfaced to superadmins as:

    - ``totals.latencyAvgMs`` / ``totals.latencyP95Ms`` over the full window
    - ``daily[i].latencyAvgMs`` / ``daily[i].latencyP95Ms`` per day
    - ``monthly[i].latencyAvgMs`` per month (no p95 by design)

    Buckets with fewer than ``MIN_LATENCY_SAMPLES`` latency rows return null
    so a single slow request does not skew an otherwise quiet day. Rows with
    ``latency_ms IS NULL`` (legacy rows or near-failures where the provider
    never returned) are excluded from latency aggregation but are still
    counted in ``totals.total`` so request counts stay aligned with the rest
    of the system. Non-admin roles still receive the request-count analytics,
    but latency fields are returned as ``null``.
    """
    from datetime import timezone as _tz

    can_view_latency = current_user.role == "superadmin"

    end_date = datetime.now(_tz.utc).date()
    start_date = end_date - timedelta(days=days - 1)
    day_labels = [start_date + timedelta(days=i) for i in range(days)]

    day_expr = func.date(OcrRequest.created_at)

    # ── Daily counts (all providers combined) ────────────────────────────────
    daily_rows = (
        await db.execute(
            select(
                day_expr.label("d"),
                func.count(OcrRequest.id),
                func.sum(cast(OcrRequest.success, Integer)),
            )
            .where(day_expr >= start_date, day_expr <= end_date)
            .group_by(day_expr)
        )
    ).all()
    daily_count_map: dict[str, dict[str, int]] = {}
    for raw_day, cnt, success in daily_rows:
        total = int(cnt or 0)
        success_count = int(success or 0)
        daily_count_map[str(raw_day)[:10]] = {
            "total": total,
            "success": success_count,
            "failed": max(total - success_count, 0),
        }

    # ── Latency rows over the window — single query, aggregate in Python ─────
    # Pulling (date, latency_ms) keeps the endpoint dialect-agnostic: SQLite
    # has no percentile_cont, and Python's statistics.quantiles matches
    # numpy.percentile for the dashboards' purposes.
    latency_rows = []
    if can_view_latency:
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
        counts = daily_count_map.get(key, {"total": 0, "success": 0, "failed": 0})
        latencies = daily_latency_map.get(key, [])
        avg_ms, p95_ms = (
            _summarize_latency(latencies) if can_view_latency else (None, None)
        )
        daily.append(
            {
                "date": key,
                "total": counts["total"],
                "success": counts["success"],
                "failed": counts["failed"],
                "latencyAvgMs": avg_ms,
                "latencyP95Ms": p95_ms,
            }
        )

    # ── Monthly roll-up (derived from the daily series — dialect-agnostic) ───
    monthly_map: dict[str, dict] = {}
    for point in daily:
        month = point["date"][:7]  # YYYY-MM
        bucket = monthly_map.setdefault(
            month,
            {"total": 0, "success": 0, "failed": 0, "latencies": []},
        )
        bucket["total"] += point["total"]
        bucket["success"] += point["success"]
        bucket["failed"] += point["failed"]
        if can_view_latency and point["latencyAvgMs"] is not None:
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
                "success": bucket["success"],
                "failed": bucket["failed"],
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

    overall_avg, overall_p95 = (
        _summarize_latency(overall_latency) if can_view_latency else (None, None)
    )

    error_breakdown = []
    if can_view_latency:
        error_rows = (
            await db.execute(
                select(OcrRequest.error, func.count(OcrRequest.id))
                .where(
                    day_expr >= start_date,
                    day_expr <= end_date,
                    OcrRequest.success.is_(False),
                )
                .group_by(OcrRequest.error)
            )
        ).all()
        buckets: dict[str, dict] = {}
        for raw_error, count in error_rows:
            meta = _categorize_ocr_error(raw_error)
            key = meta["category"]
            bucket = buckets.setdefault(
                key,
                {
                    **meta,
                    "total": 0,
                    "sampleError": None,
                },
            )
            bucket["total"] += int(count or 0)
            if bucket["sampleError"] is None and raw_error:
                bucket["sampleError"] = str(raw_error)[:160]
        error_breakdown = sorted(
            buckets.values(),
            key=lambda item: (-item["total"], item["label"]),
        )

    # ── Driver experience: one row per photo upload (count + e2e latency) ───
    # Distinct grain from the per-attempt ocr_requests analytics above. Counts
    # are returned to every role; the end-to-end latency is superadmin-only, so
    # it lands as null for director/accountant just like the provider-call
    # latency above.
    driver_day_expr = func.date(OcrDriverRequest.created_at)
    driver_daily_rows = (
        await db.execute(
            select(
                driver_day_expr.label("d"),
                func.count(OcrDriverRequest.id),
                func.sum(cast(OcrDriverRequest.success, Integer)),
            )
            .where(driver_day_expr >= start_date, driver_day_expr <= end_date)
            .group_by(driver_day_expr)
        )
    ).all()
    driver_count_map: dict[str, dict[str, int]] = {}
    for raw_day, cnt, success in driver_daily_rows:
        total = int(cnt or 0)
        success_count_d = int(success or 0)
        driver_count_map[str(raw_day)[:10]] = {
            "total": total,
            "success": success_count_d,
            "failed": max(total - success_count_d, 0),
        }

    driver_latency_rows = []
    if can_view_latency:
        driver_latency_rows = (
            await db.execute(
                select(driver_day_expr.label("d"), OcrDriverRequest.latency_ms).where(
                    driver_day_expr >= start_date,
                    driver_day_expr <= end_date,
                    OcrDriverRequest.latency_ms.isnot(None),
                )
            )
        ).all()
    driver_daily_latency: dict[str, list[int]] = {}
    driver_overall_latency: list[int] = []
    for raw_day, latency in driver_latency_rows:
        key = str(raw_day)[:10]
        driver_daily_latency.setdefault(key, []).append(int(latency))
        driver_overall_latency.append(int(latency))

    driver_daily = []
    for d in day_labels:
        key = d.isoformat()
        counts = driver_count_map.get(key, {"total": 0, "success": 0, "failed": 0})
        lats = driver_daily_latency.get(key, [])
        d_avg_ms, d_p95_ms = (
            _summarize_latency(lats) if can_view_latency else (None, None)
        )
        driver_daily.append(
            {
                "date": key,
                "requests": counts["total"],
                "success": counts["success"],
                "failed": counts["failed"],
                "latencyAvgMs": d_avg_ms,
                "latencyP95Ms": d_p95_ms,
            }
        )

    driver_monthly_map: dict[str, dict] = {}
    for point in driver_daily:
        month = point["date"][:7]
        bucket = driver_monthly_map.setdefault(
            month,
            {"requests": 0, "success": 0, "failed": 0, "latencies": []},
        )
        bucket["requests"] += point["requests"]
        bucket["success"] += point["success"]
        bucket["failed"] += point["failed"]
        if can_view_latency and point["latencyAvgMs"] is not None:
            n = len(driver_daily_latency.get(point["date"], []))
            if n >= MIN_LATENCY_SAMPLES:
                bucket["latencies"].append((n, point["latencyAvgMs"]))

    driver_monthly: list[dict] = []
    for month in sorted(driver_monthly_map):
        bucket = driver_monthly_map[month]
        if bucket["latencies"]:
            total_n = sum(n for n, _ in bucket["latencies"])
            weighted = sum(n * avg for n, avg in bucket["latencies"]) / total_n
            d_month_avg: Optional[float] = float(weighted)
        else:
            d_month_avg = None
        driver_monthly.append(
            {
                "month": month,
                "requests": bucket["requests"],
                "success": bucket["success"],
                "failed": bucket["failed"],
                "latencyAvgMs": d_month_avg,
            }
        )

    driver_total_row = (
        await db.execute(
            select(
                func.count(OcrDriverRequest.id),
                func.sum(cast(OcrDriverRequest.success, Integer)),
            ).where(driver_day_expr >= start_date, driver_day_expr <= end_date)
        )
    ).one()
    driver_total_count = int(driver_total_row[0] or 0)
    driver_success_count = int(driver_total_row[1] or 0)
    driver_overall_avg, driver_overall_p95 = (
        _summarize_latency(driver_overall_latency) if can_view_latency else (None, None)
    )

    driver_experience = {
        "daily": driver_daily,
        "monthly": driver_monthly,
        "totals": {
            "requests": driver_total_count,
            "success": driver_success_count,
            "latencyAvgMs": driver_overall_avg,
            "latencyP95Ms": driver_overall_p95,
        },
    }

    return {
        "days": days,
        "endDate": end_date.isoformat(),
        "daily": daily,
        "monthly": monthly,
        "errorBreakdown": error_breakdown,
        "driverExperience": driver_experience,
        "totals": {
            "total": total_count,
            "success": success_count,
            "latencyAvgMs": overall_avg,
            "latencyP95Ms": overall_p95,
        },
    }
