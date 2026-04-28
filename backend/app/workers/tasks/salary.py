import logging
from datetime import date

from sqlalchemy import select

from app.database import async_session
from app.models.base import User
from app.models.domain import WorkOrder, TripOrder

logger = logging.getLogger(__name__)


async def calculate_salary_task(
    ctx: dict,
    company_id: int,
    driver_id: int,
    start_date: str,
    end_date: str,
) -> dict:
    """Calculate salary for a driver over a date range."""
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)

    async with async_session() as db:
        try:
            result = await db.execute(
                select(WorkOrder).where(
                    WorkOrder.company_id == company_id,
                    WorkOrder.driver_id == driver_id,
                    WorkOrder.date >= start,
                    WorkOrder.date <= end,
                )
            )
            work_orders = result.scalars().all()

            total_salary = sum(wo.driver_salary or 0 for wo in work_orders)
            total_allowance = sum(wo.allowance or 0 for wo in work_orders)
            total_trips = len(work_orders)

            logger.info(
                "Salary calculated for driver=%s company=%s: %d orders, salary=%d",
                driver_id, company_id, total_trips, total_salary,
            )

            return {
                "driver_id": driver_id,
                "total_orders": total_trips,
                "total_salary": total_salary,
                "total_allowance": total_allowance,
                "period": f"{start_date} to {end_date}",
            }
        except Exception:
            await db.rollback()
            raise
