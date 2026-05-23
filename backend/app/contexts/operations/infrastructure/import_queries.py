"""Read-side query helpers for the partner-Excel import flow
in operations.application.booked_trips.
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
