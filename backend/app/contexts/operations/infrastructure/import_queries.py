"""Read-side query helpers for the partner-Excel import + apply-pricing
flows in operations.application.booked_trips.

Mutations (price assignment, status flip) still happen on the ORM rows
themselves inside the use case -- this module only reads.
"""

from __future__ import annotations

from datetime import date
from typing import Sequence

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    Location,
    Client,
    BookedTrip as BookedTripORM,
)


async def fetch_client(session: AsyncSession, client_id: int) -> Client | None:
    res = await session.execute(
        select(Client).where(Client.id == client_id)
    )
    return res.scalar_one_or_none()


async def count_locations(session: AsyncSession) -> int:
    res = await session.execute(select(func.count()).select_from(Location))
    return int(res.scalar_one())


async def find_duplicate_trip(
    session: AsyncSession,
    *,
    client_id: int,
    trip_date: date,
    container_no: str,
) -> BookedTripORM | None:
    res = await session.execute(
        select(BookedTripORM)
        .where(
            and_(
                BookedTripORM.client_id == client_id,
                BookedTripORM.trip_date == trip_date,
                BookedTripORM.cont_number == container_no,
            )
        )
        .limit(1)
    )
    return res.scalar_one_or_none()


async def list_unpriced_trips(
    session: AsyncSession,
    *,
    client_id: int | None,
    trip_ids: list[int] | None,
) -> Sequence[BookedTripORM]:
    """Trips eligible for bulk apply-pricing."""
    q = select(BookedTripORM)
    if client_id is not None:
        q = q.where(
            BookedTripORM.client_id == client_id,
            (BookedTripORM.revenue == 0) | (BookedTripORM.revenue.is_(None)),
        )
    if trip_ids:
        q = q.where(BookedTripORM.id.in_(trip_ids))
    res = await session.execute(q)
    return list(res.scalars().all())
