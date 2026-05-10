"""Batch loaders for nested *SummaryOut DTOs.

Domain DB stores only FKs (no denormalized display strings). Read APIs
compose nested summaries here, in one batch query per related table,
so list endpoints stay O(1) on round-trips. See BizLogic.md §4.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import User
from app.models.domain import Client, Location
from app.schemas.domain import (
    ClientSummaryOut,
    DriverSummaryOut,
    LocationSummaryOut,
)


async def load_client_summaries(
    db: AsyncSession, client_ids: set[int] | list[int]
) -> dict[int, ClientSummaryOut]:
    ids = {i for i in client_ids if i is not None}
    if not ids:
        return {}
    res = await db.execute(select(Client).where(Client.id.in_(ids)))
    return {
        c.id: ClientSummaryOut(id=c.id, code=c.code, name=c.name)
        for c in res.scalars().all()
    }


async def load_location_summaries(
    db: AsyncSession, location_ids: set[int | None] | list[int | None]
) -> dict[int, LocationSummaryOut]:
    ids = {i for i in location_ids if i is not None}
    if not ids:
        return {}
    res = await db.execute(select(Location).where(Location.id.in_(ids)))
    return {
        loc.id: LocationSummaryOut(id=loc.id, name=loc.name)
        for loc in res.scalars().all()
    }


async def load_driver_summaries(
    db: AsyncSession, driver_ids: set[int] | list[int]
) -> dict[int, DriverSummaryOut]:
    ids = {i for i in driver_ids if i is not None}
    if not ids:
        return {}
    res = await db.execute(select(User).where(User.id.in_(ids)))
    return {
        u.id: DriverSummaryOut(
            id=u.id,
            name=(u.full_name or u.username),
            phone=u.phone,
            tractor_plate=u.tractor_plate,
        )
        for u in res.scalars().all()
    }


def get_client_summary(
    summaries: dict[int, ClientSummaryOut], client_id: int
) -> ClientSummaryOut:
    """Return the summary or a placeholder if missing (e.g. soft-deleted)."""
    return summaries.get(
        client_id, ClientSummaryOut(id=client_id, code=None, name="(không rõ)")
    )


def get_location_summary(
    summaries: dict[int, LocationSummaryOut], location_id: int | None
) -> LocationSummaryOut:
    if location_id is None:
        return LocationSummaryOut(id=0, name="")
    return summaries.get(location_id, LocationSummaryOut(id=location_id, name=""))


def get_driver_summary(
    summaries: dict[int, DriverSummaryOut], driver_id: int
) -> DriverSummaryOut:
    return summaries.get(
        driver_id, DriverSummaryOut(id=driver_id, name="(không rõ)", phone=None, tractor_plate=None)
    )
