"""Read-side query helpers for the partner-Excel import + apply-pricing
flows in operations.application.booked_trips.

Both flows still drive the legacy ORM rows directly (predates DDD), so
the use cases need raw lookups against BookedTripORM / BookedTripContainerORM
/ PartnerORM / LocationORM. Keeping the SQL here means the use case body
stays free of select/and_/func calls.

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
    BookedTripContainer as BookedTripContainerORM,
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
        .join(
            BookedTripContainerORM,
            BookedTripContainerORM.booked_trip_id == BookedTripORM.id,
        )
        .where(
            and_(
                BookedTripORM.client_id == client_id,
                BookedTripORM.trip_date == trip_date,
                BookedTripContainerORM.container_number == container_no,
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
    """Trips eligible for bulk apply-pricing.

    When `client_id` is set we restrict to that partner's unpriced trips;
    when `trip_ids` is set we narrow further to the explicit ids.
    """
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


async def count_containers_for_trip(
    session: AsyncSession, trip_id: int
) -> int:
    val = await session.scalar(
        select(func.count(BookedTripContainerORM.id)).where(
            BookedTripContainerORM.booked_trip_id == trip_id
        )
    )
    return int(val or 0)


async def first_container_work_type(
    session: AsyncSession, trip_id: int
) -> str | None:
    res = await session.execute(
        select(BookedTripContainerORM.work_type)
        .where(BookedTripContainerORM.booked_trip_id == trip_id)
        .limit(1)
    )
    return res.scalar_one_or_none()
