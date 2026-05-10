"""Payroll domain helpers."""

from __future__ import annotations

import calendar
from datetime import date


def _safe_date(year: int, month: int, day: int) -> date:
    """Clamp `day` to the actual max day of the (year, month)."""
    max_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(day, max_day))


def period_dates_for(
    settings: dict[str, str] | None, reference_date: date
) -> tuple[date, date]:
    """Return (start, end) of the salary period that contains *reference_date*.

    *settings* is a dict like ``{"salary_from_day": "26", "salary_to_day": "25"}``.
    Falls back to 1..28 when the dict or keys are missing.
    """
    from_day = int(settings.get("salary_from_day", "1")) if settings else 1
    to_day = int(settings.get("salary_to_day", "28")) if settings else 28

    year = reference_date.year
    month = reference_date.month

    if from_day <= to_day:
        return _safe_date(year, month, from_day), _safe_date(year, month, to_day)

    if reference_date.day >= from_day:
        start = _safe_date(year, month, from_day)
        next_month = month + 1 if month < 12 else 1
        next_year = year if month < 12 else year + 1
        end = _safe_date(next_year, next_month, to_day)
    else:
        prev_month = month - 1 if month > 1 else 12
        prev_year = year if month > 1 else year - 1
        start = _safe_date(prev_year, prev_month, from_day)
        end = _safe_date(year, month, to_day)
    return start, end
