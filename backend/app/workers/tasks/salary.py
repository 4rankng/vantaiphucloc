"""Salary calculation task.

SalaryPeriod has been removed — earnings are now calculated on-the-fly
from matched work_orders. This task is kept as a no-op placeholder
to avoid breaking arq worker registration until all references are cleaned up.
"""

import logging

logger = logging.getLogger(__name__)


async def calculate_salary_task(
    ctx: dict,
    driver_id: int,
    start_date: str,
    end_date: str,
) -> dict:
    """No-op: salary periods removed. Earnings are calculated on-the-fly."""
    logger.info(
        "calculate_salary_task called (no-op) for driver=%s range=%s..%s",
        driver_id, start_date, end_date,
    )
    return {"status": "NOOP", "message": "SalaryPeriod removed; earnings calculated on-the-fly"}
