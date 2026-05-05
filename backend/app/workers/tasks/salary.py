import logging
from datetime import date

from app.contexts.payroll.application import CalculateSalary
from app.contexts.payroll.infrastructure.repositories import (
    SqlSalaryPeriodRepository,
)
from app.database import get_session

logger = logging.getLogger(__name__)


async def calculate_salary_task(
    ctx: dict,
    driver_id: int,
    start_date: str,
    end_date: str,
) -> dict:
    """Calculate salary for a driver over a date range and persist the SalaryPeriod."""
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)

    async with get_session() as db:
        use_case = CalculateSalary(db, SqlSalaryPeriodRepository(db))
        period_id = await use_case(
            driver_id=driver_id, start_date=start, end_date=end
        )
        return {"salary_period_id": period_id, "status": "CALCULATED"}
