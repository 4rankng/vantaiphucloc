import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select

from app.database import get_session
from app.models.domain import DeliveredTrip

logger = logging.getLogger(__name__)


async def generate_monthly_report_task(
    ctx: dict,
    month: int,
    year: int,
) -> dict:
    """Generate a monthly financial summary."""
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)

    start_dt = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    end_dt = datetime(end.year, end.month, end.day, tzinfo=timezone.utc) + timedelta(days=1)

    async with get_session() as db:
        result = await db.execute(
            select(DeliveredTrip).where(
                DeliveredTrip.created_at >= start_dt,
                DeliveredTrip.created_at < end_dt,
            )
        )
        orders = result.scalars().all()

        total_revenue = sum(wo.revenue or 0 for wo in orders)
        total_driver_cost = sum(wo.driver_salary or 0 for wo in orders)
        total_allowance = sum(wo.allowance or 0 for wo in orders)

        report = {
            "period": f"{year}-{month:02d}",
            "total_orders": len(orders),
            "total_revenue": total_revenue,
            "total_driver_cost": total_driver_cost,
            "total_allowance": total_allowance,
            "gross_margin": total_revenue - total_driver_cost - total_allowance,
        }

        logger.info("Monthly report generated: period=%s", report["period"])
        return report
