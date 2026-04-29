import logging
from datetime import date

from sqlalchemy import select

from app.database import async_session
from app.models.base import User
from app.models.domain import WorkOrder, SalaryPeriod

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

    async with async_session() as db:
        try:
            # Load driver name
            driver_result = await db.execute(select(User).where(User.id == driver_id))
            driver = driver_result.scalar_one_or_none()
            driver_name = driver.username if driver else f"driver_{driver_id}"

            # Query MATCHED work orders for the driver in the period
            result = await db.execute(
                select(WorkOrder).where(
                    WorkOrder.driver_id == driver_id,
                    WorkOrder.status == "MATCHED",
                    WorkOrder.created_at >= start,
                    WorkOrder.created_at <= end,
                )
            )
            work_orders = result.scalars().all()

            total_salary = sum(wo.driver_salary or 0 for wo in work_orders)
            total_allowance = sum(wo.allowance or 0 for wo in work_orders)
            total_deduction = 0
            net_pay = total_salary + total_allowance - total_deduction
            work_order_count = len(work_orders)

            # Upsert SalaryPeriod
            existing = await db.execute(
                select(SalaryPeriod).where(
                    SalaryPeriod.driver_id == driver_id,
                    SalaryPeriod.start_date == start,
                    SalaryPeriod.end_date == end,
                )
            )
            period = existing.scalar_one_or_none()

            if period is None:
                period = SalaryPeriod(
                    driver_id=driver_id,
                    driver_name=driver_name,
                    start_date=start,
                    end_date=end,
                    work_order_count=work_order_count,
                    price_per_order=total_salary // work_order_count if work_order_count > 0 else 0,
                    total_salary=total_salary,
                    total_allowance=total_allowance,
                    total_deduction=total_deduction,
                    net_pay=net_pay,
                    status="CALCULATED",
                )
                db.add(period)
            else:
                period.work_order_count = work_order_count
                period.price_per_order = total_salary // work_order_count if work_order_count > 0 else 0
                period.total_salary = total_salary
                period.total_allowance = total_allowance
                period.total_deduction = total_deduction
                period.net_pay = net_pay
                period.driver_name = driver_name
                period.status = "CALCULATED"

            await db.commit()
            await db.refresh(period)

            logger.info(
                "Salary period %s calculated for driver=%s: %d orders, salary=%d",
                period.id, driver_id, work_order_count, total_salary,
            )

            return {"salary_period_id": period.id, "status": "CALCULATED"}
        except Exception:
            await db.rollback()
            raise
