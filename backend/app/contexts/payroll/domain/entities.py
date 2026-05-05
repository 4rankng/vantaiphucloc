"""Payroll aggregates."""

from __future__ import annotations

import calendar
from dataclasses import dataclass, field
from datetime import date, datetime, timezone

from app.contexts.payroll.domain.exceptions import InvalidSalaryConfig
from app.contexts.payroll.domain.value_objects import (
    DriverId,
    SalaryPeriodId,
    SalaryStatus,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class SalaryPeriod:
    """One driver's pay window plus its calculated totals.

    Mutations go through `recalculate()` so the invariant
    `net_pay == total_salary + total_allowance - total_deduction` is
    enforced in one place.
    """

    id: SalaryPeriodId | None
    driver_id: DriverId
    start_date: date
    end_date: date
    work_order_count: int = 0
    price_per_order: int = 0
    total_salary: int = 0
    total_allowance: int = 0
    total_deduction: int = 0
    net_pay: int = 0
    status: SalaryStatus = SalaryStatus.OPEN
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    def recalculate(
        self,
        *,
        work_order_count: int,
        total_salary: int,
        total_allowance: int,
        total_deduction: int,
    ) -> None:
        self.work_order_count = work_order_count
        self.total_salary = total_salary
        self.total_allowance = total_allowance
        self.total_deduction = total_deduction
        self.price_per_order = (
            total_salary // work_order_count if work_order_count > 0 else 0
        )
        self.net_pay = total_salary + total_allowance - total_deduction
        self.status = SalaryStatus.CALCULATED
        self.updated_at = _utcnow()


@dataclass
class SalaryPeriodConfig:
    """Singleton — one row for the whole app. Defines the from_day/to_day window."""

    id: int | None
    from_day: int = 1
    to_day: int = 28
    updated_at: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        if not (1 <= self.from_day <= 31) or not (1 <= self.to_day <= 31):
            raise InvalidSalaryConfig("from_day/to_day must be in 1..31")


def _safe_date(year: int, month: int, day: int) -> date:
    """Clamp `day` to the actual max day of the (year, month)."""
    max_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(day, max_day))


def period_dates_for(
    config: SalaryPeriodConfig | None, reference_date: date
) -> tuple[date, date]:
    """Return (start, end) of the salary period that contains *reference_date*."""
    from_day = config.from_day if config else 1
    to_day = config.to_day if config else 28

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
