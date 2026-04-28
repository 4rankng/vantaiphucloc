import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select

from app.database import async_session
from app.models.domain import WorkOrder, SalaryPeriod
from app.workers import enqueue

logger = logging.getLogger(__name__)


async def generate_monthly_report_task(
    ctx: dict,
    company_id: int,
    month: int,
    year: int,
) -> dict:
    """Generate a monthly financial summary for a company."""
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)

    start_dt = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    end_dt = datetime(end.year, end.month, end.day, 23, 59, 59, tzinfo=timezone.utc)

    async with async_session() as db:
        try:
            result = await db.execute(
                select(WorkOrder).where(
                    WorkOrder.company_id == company_id,
                    WorkOrder.created_at >= start_dt,
                    WorkOrder.created_at <= end_dt,
                )
            )
            orders = result.scalars().all()

            total_revenue = sum(wo.unit_price or 0 for wo in orders)
            total_driver_cost = sum(wo.driver_salary or 0 for wo in orders)
            total_allowance = sum(wo.allowance or 0 for wo in orders)

            report = {
                "company_id": company_id,
                "period": f"{year}-{month:02d}",
                "total_orders": len(orders),
                "total_revenue": total_revenue,
                "total_driver_cost": total_driver_cost,
                "total_allowance": total_allowance,
                "gross_margin": total_revenue - total_driver_cost - total_allowance,
            }

            logger.info("Monthly report generated: company=%s period=%s", company_id, report["period"])
            return report
        except Exception:
            await db.rollback()
            raise


async def remind_salary_period_end(ctx: dict) -> None:
    """Check for salary periods closing soon and queue notifications."""
    today = date.today()
    soon = today + timedelta(days=3)

    async with async_session() as db:
        result = await db.execute(
            select(SalaryPeriod).where(
                SalaryPeriod.status == "CALCULATED",
                SalaryPeriod.end_date <= soon,
                SalaryPeriod.end_date >= today,
            )
        )
        periods = result.scalars().all()

        for period in periods:
            try:
                await enqueue(
                    "send_notification_task",
                    user_id=period.driver_id,
                    title="Sắp hết kỳ lương",
                    message=f"Kỳ lương {period.start_date} - {period.end_date} sắp kết thúc",
                    channel="in_app",
                )
            except RuntimeError:
                logger.warning("Failed to enqueue reminder for period %s", period.id)

        logger.info("Salary period reminder: %d periods found", len(periods))


async def recalculate_open_periods(ctx: dict) -> None:
    """Recalculate any OPEN salary periods."""
    async with async_session() as db:
        result = await db.execute(
            select(SalaryPeriod).where(SalaryPeriod.status == "OPEN")
        )
        periods = result.scalars().all()

        for period in periods:
            try:
                await enqueue(
                    "calculate_salary_task",
                    company_id=period.company_id,
                    driver_id=period.driver_id,
                    start_date=period.start_date.isoformat(),
                    end_date=period.end_date.isoformat(),
                )
            except RuntimeError:
                logger.warning("Failed to enqueue recalculation for period %s", period.id)

        logger.info("Open period recalculation: %d periods queued", len(periods))
