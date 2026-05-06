"""Read-side query helpers for the customer-Excel import + apply-pricing
flows in operations.application.trip_orders.

Both flows still drive the legacy ORM rows directly (predates DDD), so
the use cases need raw lookups against TripOrderORM / TripOrderContainerORM
/ ClientORM / LocationORM. Keeping the SQL here means the use case body
stays free of select/and_/func calls.

Mutations (price assignment, status flip) still happen on the ORM rows
themselves inside the use case — this module only reads.
"""

from __future__ import annotations

from datetime import date
from typing import Sequence

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    Client,
    Location,
    TripOrder as TripOrderORM,
    TripOrderContainer as TripOrderContainerORM,
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
) -> TripOrderORM | None:
    res = await session.execute(
        select(TripOrderORM)
        .join(
            TripOrderContainerORM,
            TripOrderContainerORM.trip_order_id == TripOrderORM.id,
        )
        .where(
            and_(
                TripOrderORM.client_id == client_id,
                TripOrderORM.trip_date == trip_date,
                TripOrderContainerORM.container_number == container_no,
            )
        )
        .limit(1)
    )
    return res.scalar_one_or_none()


async def list_drafts_for_pricing(
    session: AsyncSession,
    *,
    client_id: int | None,
    trip_ids: list[int] | None,
    draft_status: str,
) -> Sequence[TripOrderORM]:
    """Trips eligible for bulk apply-pricing.

    When `client_id` is set we restrict to that client's DRAFT trips;
    when `trip_ids` is set we narrow further to the explicit ids.
    """
    q = select(TripOrderORM)
    if client_id is not None:
        q = q.where(
            TripOrderORM.client_id == client_id,
            TripOrderORM.status == draft_status,
        )
    if trip_ids:
        q = q.where(TripOrderORM.id.in_(trip_ids))
    res = await session.execute(q)
    return list(res.scalars().all())


async def count_containers_for_trip(
    session: AsyncSession, trip_id: int
) -> int:
    val = await session.scalar(
        select(func.count(TripOrderContainerORM.id)).where(
            TripOrderContainerORM.trip_order_id == trip_id
        )
    )
    return int(val or 0)


async def first_container_work_type(
    session: AsyncSession, trip_id: int
) -> str | None:
    res = await session.execute(
        select(TripOrderContainerORM.work_type)
        .where(TripOrderContainerORM.trip_order_id == trip_id)
        .limit(1)
    )
    return res.scalar_one_or_none()
