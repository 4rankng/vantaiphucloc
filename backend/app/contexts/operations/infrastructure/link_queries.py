"""Read-side helpers for the BookedTrip ↔ DeliveredTrip reconciliation.

Reconciliation use cases need to ask:
  - is this BookedTrip already linked to anything?
  - which link row points at this DeliveredTrip / BookedTrip id?
  - how many BookedTrips are linked to this DeliveredTrip? (multi-container)

Those are pure infrastructure concerns — keeping them out of the
application layer means the use case body stays free of select()
calls.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.infrastructure.orm import ReconciliationORM


async def booked_trip_has_link(
    session: AsyncSession, booked_trip_id: int
) -> bool:
    res = await session.execute(
        select(ReconciliationORM).where(
            ReconciliationORM.booked_trip_id == booked_trip_id,
            ReconciliationORM.is_active == True,  # noqa: E712
        )
    )
    return res.scalars().first() is not None


async def find_link(
    session: AsyncSession,
    *,
    delivered_trip_id: int | None = None,
    booked_trip_id: int | None = None,
) -> ReconciliationORM | None:
    q = select(ReconciliationORM).where(
        ReconciliationORM.is_active == True,  # noqa: E712
    )
    if delivered_trip_id is not None:
        q = q.where(ReconciliationORM.delivered_trip_id == delivered_trip_id)
    if booked_trip_id is not None:
        q = q.where(ReconciliationORM.booked_trip_id == booked_trip_id)
    # Use scalars().first() instead of scalar_one_or_none() to avoid
    # MultipleResultsFound when a WO has multiple active links.
    res = await session.execute(q)
    return res.scalars().first()


async def find_all_links_for_wo(
    session: AsyncSession, delivered_trip_id: int
) -> list[ReconciliationORM]:
    res = await session.execute(
        select(ReconciliationORM).where(
            ReconciliationORM.delivered_trip_id == delivered_trip_id,
            ReconciliationORM.is_active == True,  # noqa: E712
        )
    )
    return list(res.scalars().all())


async def count_links_for_wo(
    session: AsyncSession, delivered_trip_id: int
) -> int:
    from sqlalchemy import func
    res = await session.execute(
        select(func.count()).select_from(ReconciliationORM).where(
            ReconciliationORM.delivered_trip_id == delivered_trip_id,
            ReconciliationORM.is_active == True,  # noqa: E712
        )
    )
    return res.scalar_one()


async def delivered_trip_has_link(
    session: AsyncSession, delivered_trip_id: int
) -> bool:
    """Check if a DeliveredTrip has any active reconciliation link."""
    res = await session.execute(
        select(ReconciliationORM).where(
            ReconciliationORM.delivered_trip_id == delivered_trip_id,
            ReconciliationORM.is_active == True,  # noqa: E712
        )
    )
    return res.scalars().first() is not None


async def count_links_for_to(
    session: AsyncSession, booked_trip_id: int
) -> int:
    """Count active reconciliations for a BookedTrip (TO-centric capacity)."""
    from sqlalchemy import func
    res = await session.execute(
        select(func.count()).select_from(ReconciliationORM).where(
            ReconciliationORM.booked_trip_id == booked_trip_id,
            ReconciliationORM.is_active == True,  # noqa: E712
        )
    )
    return res.scalar_one()


async def find_all_links_for_to(
    session: AsyncSession, booked_trip_id: int
) -> list[ReconciliationORM]:
    """Return all active reconciliation links for a BookedTrip."""
    res = await session.execute(
        select(ReconciliationORM).where(
            ReconciliationORM.booked_trip_id == booked_trip_id,
            ReconciliationORM.is_active == True,  # noqa: E712
        )
    )
    return list(res.scalars().all())
