"""Background task: sync WorkOrder earning fields from updated TripOrder."""

import logging

from sqlalchemy import select

from app.database import get_session
from app.models.domain import TripOrder, WorkOrder, Reconciliation

logger = logging.getLogger(__name__)


async def sync_wo_earning_on_to_update(ctx: dict, *, trip_order_id: int) -> None:
    """After a TripOrder's salary/allowance changes, propagate to linked WorkOrders."""
    async with get_session() as db:
        result = await db.execute(
            select(TripOrder).where(TripOrder.id == trip_order_id)
        )
        trip_order = result.scalar_one_or_none()
        if trip_order is None:
            logger.warning("sync_wo_earning: TripOrder %d not found", trip_order_id)
            return

        # Find linked work orders via Reconciliation table
        recon_result = await db.execute(
            select(Reconciliation.work_order_id).where(
                Reconciliation.trip_order_id == trip_order_id,
                Reconciliation.is_active == True,  # noqa: E712
            )
        )
        wo_ids = [row[0] for row in recon_result.all()]
        if not wo_ids:
            return

        # Load and update each linked work order
        wo_result = await db.execute(
            select(WorkOrder).where(
                WorkOrder.id.in_(wo_ids),
                WorkOrder.status != "CANCELLED",
            )
        )
        updated = 0
        for wo in wo_result.scalars().all():
            wo.driver_salary = trip_order.driver_salary
            wo.allowance = trip_order.allowance
            updated += 1

        if updated:
            await db.commit()
            logger.info(
                "sync_wo_earning: updated %d WOs for TO#%d (salary=%d, allowance=%d)",
                updated, trip_order_id, trip_order.driver_salary, trip_order.allowance,
            )
