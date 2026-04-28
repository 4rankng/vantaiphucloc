import calendar
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import SalaryPeriodConfig


def _safe_date(year: int, month: int, day: int) -> date:
    """Return a date clamped to the actual max day of the month."""
    max_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(day, max_day))


async def get_salary_period_dates(
    db: AsyncSession, company_id: int, reference_date: date
) -> tuple[date, date]:
    """Return the (start_date, end_date) of the salary period containing *reference_date*."""
    result = await db.execute(
        select(SalaryPeriodConfig).where(SalaryPeriodConfig.company_id == company_id)
    )
    config = result.scalar_one_or_none()

    from_day = config.from_day if config else 1
    to_day = config.to_day if config else 28

    year = reference_date.year
    month = reference_date.month

    if from_day <= to_day:
        return _safe_date(year, month, from_day), _safe_date(year, month, to_day)

    # Period crosses a month boundary (e.g. 26th → 25th).
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
