"""Read-side query helpers for the partner-Excel import flow
in operations.application.booked_trips.
"""

from __future__ import annotations

from datetime import date

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


async def find_near_duplicate_trip(
    session: AsyncSession,
    *,
    client_id: int,
    trip_date: date,
    container_no: str,
    max_distance: int = 1,
) -> BookedTripORM | None:
    """Find a trip with the same client/date but a container number within *max_distance* edits.

    Returns None if no near-duplicate is found.
    """
    from app.utils.fuzzy import levenshtein_distance

    norm = (container_no or "").upper().strip()
    if not norm:
        return None

    candidates = (await session.execute(
        select(BookedTripORM).where(
            and_(
                BookedTripORM.client_id == client_id,
                BookedTripORM.trip_date == trip_date,
                BookedTripORM.cont_number.isnot(None),
            )
        )
    )).scalars().all()

    for trip in candidates:
        cn = (trip.cont_number or "").upper().strip()
        if cn and levenshtein_distance(norm, cn) <= max_distance:
            return trip
    return None
