"""Read-side helpers for the TripOrder ↔ WorkOrder link table.

Reconciliation use cases need to ask:
  - is this TripOrder already linked to anything?
  - which link row points at this WorkOrder / TripOrder id?

Those are pure infrastructure concerns — keeping them out of the
application layer means the use case body stays free of select()
calls.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.infrastructure.orm import TripOrderWorkOrderORM


async def trip_order_has_link(
    session: AsyncSession, trip_order_id: int
) -> bool:
    res = await session.execute(
        select(TripOrderWorkOrderORM).where(
            TripOrderWorkOrderORM.trip_order_id == trip_order_id
        )
    )
    return res.scalar_one_or_none() is not None


async def find_link(
    session: AsyncSession,
    *,
    work_order_id: int | None = None,
    trip_order_id: int | None = None,
) -> TripOrderWorkOrderORM | None:
    q = select(TripOrderWorkOrderORM)
    if work_order_id is not None:
        q = q.where(TripOrderWorkOrderORM.work_order_id == work_order_id)
    if trip_order_id is not None:
        q = q.where(TripOrderWorkOrderORM.trip_order_id == trip_order_id)
    res = await session.execute(q)
    return res.scalar_one_or_none()
