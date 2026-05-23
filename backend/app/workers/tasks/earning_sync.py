"""Background task: sync DeliveredTrip earning fields from updated BookedTrip.

Since reconciliation links have been removed, this task is now a no-op.
Kept for backward compatibility with pending ARQ jobs.
"""

import logging

logger = logging.getLogger(__name__)


async def sync_wo_earning_on_to_update(ctx: dict, *, booked_trip_id: int) -> None:
    logger.info("sync_wo_earning: no-op (reconciliation removed), TO#%d", booked_trip_id)
