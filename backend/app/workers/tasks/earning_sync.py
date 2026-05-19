"""Background task: sync DeliveredTrip earning fields from updated BookedTrip."""

import logging

from sqlalchemy import select

from app.database import get_session
from app.models.domain import BookedTrip, DeliveredTrip, Reconciliation

logger = logging.getLogger(__name__)


async def sync_wo_earning_on_to_update(ctx: dict, *, booked_trip_id: int) -> None:
    """After a BookedTrip's salary/allowance changes, propagate to linked DeliveredTrips."""
    async with get_session() as db:
        result = await db.execute(
            select(BookedTrip).where(BookedTrip.id == booked_trip_id)
        )
        booked_trip = result.scalar_one_or_none()
        if booked_trip is None:
            logger.warning("sync_wo_earning: BookedTrip %d not found", booked_trip_id)
            return

        # Find linked work orders via Reconciliation table
        recon_result = await db.execute(
            select(Reconciliation.delivered_trip_id).where(
                Reconciliation.booked_trip_id == booked_trip_id,
                Reconciliation.is_active == True,  # noqa: E712
            )
        )
        wo_ids = [row[0] for row in recon_result.all()]
        if not wo_ids:
            return

        # Load and update each linked work order
        wo_result = await db.execute(
            select(DeliveredTrip).where(
                DeliveredTrip.id.in_(wo_ids),
                DeliveredTrip.status != "CANCELLED",
            )
        )
        updated = 0
        for wo in wo_result.scalars().all():
            wo.driver_salary = booked_trip.driver_salary
            wo.allowance = booked_trip.allowance
            updated += 1

        if updated:
            await db.commit()
            logger.info(
                "sync_wo_earning: updated %d WOs for TO#%d (salary=%d, allowance=%d)",
                updated, booked_trip_id, booked_trip.driver_salary, booked_trip.allowance,
            )
