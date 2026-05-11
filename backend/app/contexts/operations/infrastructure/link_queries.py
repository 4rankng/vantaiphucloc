"""Read-side helpers for the TripOrder ↔ WorkOrder reconciliation.

Reconciliation use cases need to ask:
  - is this TripOrder already linked to anything?
  - which link row points at this WorkOrder / TripOrder id?
  - how many TripOrders are linked to this WorkOrder? (multi-container)

Those are pure infrastructure concerns — keeping them out of the
application layer means the use case body stays free of select()
calls.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.infrastructure.orm import ReconciliationORM


async def trip_order_has_link(
    session: AsyncSession, trip_order_id: int
) -> bool:
    res = await session.execute(
        select(ReconciliationORM).where(
            ReconciliationORM.trip_order_id == trip_order_id,
            ReconciliationORM.is_active == True,  # noqa: E712
        )
    )
    return res.scalars().first() is not None


async def find_link(
    session: AsyncSession,
    *,
    work_order_id: int | None = None,
    trip_order_id: int | None = None,
) -> ReconciliationORM | None:
    q = select(ReconciliationORM).where(
        ReconciliationORM.is_active == True,  # noqa: E712
    )
    if work_order_id is not None:
        q = q.where(ReconciliationORM.work_order_id == work_order_id)
    if trip_order_id is not None:
        q = q.where(ReconciliationORM.trip_order_id == trip_order_id)
    # Use scalars().first() instead of scalar_one_or_none() to avoid
    # MultipleResultsFound when a WO has multiple active links.
    res = await session.execute(q)
    return res.scalars().first()


async def find_all_links_for_wo(
    session: AsyncSession, work_order_id: int
) -> list[ReconciliationORM]:
    res = await session.execute(
        select(ReconciliationORM).where(
            ReconciliationORM.work_order_id == work_order_id,
            ReconciliationORM.is_active == True,  # noqa: E712
        )
    )
    return list(res.scalars().all())


async def count_links_for_wo(
    session: AsyncSession, work_order_id: int
) -> int:
    from sqlalchemy import func
    res = await session.execute(
        select(func.count()).select_from(ReconciliationORM).where(
            ReconciliationORM.work_order_id == work_order_id,
            ReconciliationORM.is_active == True,  # noqa: E712
        )
    )
    return res.scalar_one()
