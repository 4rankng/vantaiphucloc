"""Periodic cleanup of stale MATCHED work orders.

A work order is considered stale-MATCHED when its status is MATCHED but it
has zero active reconciliation links. This can happen when links are removed
or never created due to a race. The cleanup resets such WOs back to PENDING.

Runs as an arq cron job (every 5 minutes) and uses SELECT FOR UPDATE to
prevent concurrent workers from healing the same rows.
"""

from __future__ import annotations

import logging

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.domain.value_objects import WorkOrderStatus
from app.models.domain import Reconciliation, WorkOrder as WorkOrderORM

logger = logging.getLogger(__name__)

# Only heal WOs that have been in MATCHED state for at least this many seconds
# to avoid racing with in-progress matching flows.
_STALE_THRESHOLD_SECONDS = 300  # 5 minutes


async def cleanup_stale_matched(ctx: dict) -> None:
    """Find MATCHED work orders with zero active reconciliation links and reset to PENDING."""
    from app.database import get_session
    from datetime import datetime, timedelta, timezone

    cutoff = datetime.now(timezone.utc) - timedelta(seconds=_STALE_THRESHOLD_SECONDS)

    healed = 0
    async with get_session() as db:
        # Find MATCHED WOs with no active reconciliation links using an anti-join.
        # SELECT FOR UPDATE locks the rows to prevent concurrent cleanup races.
        subq = (
            select(Reconciliation.work_order_id)
            .where(Reconciliation.is_active == True)  # noqa: E712
            .correlate(WorkOrderORM)
        )
        rows = (
            await db.execute(
                select(WorkOrderORM.id)
                .where(
                    WorkOrderORM.status == str(WorkOrderStatus.MATCHED),
                    WorkOrderORM.updated_at < cutoff,
                    ~WorkOrderORM.id.in_(subq),
                )
                .with_for_update(skip_locked=True)
            )
        ).scalars().all()

        if not rows:
            return

        result = await db.execute(
            update(WorkOrderORM)
            .where(WorkOrderORM.id.in_(rows))
            .values(status=str(WorkOrderStatus.PENDING))
        )
        await db.commit()
        healed = result.rowcount

    if healed:
        logger.info(
            "Cleaned up %d stale MATCHED work orders (reset to PENDING)", healed
        )
