"""Batch loaders for nested *SummaryOut DTOs.

Domain DB stores only FKs (no denormalized display strings). Read APIs
compose nested summaries here, in one batch query per related table,
so list endpoints stay O(1) on round-trips. See BizLogic.md §4.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import User
from app.models.domain import Location, Partner, Vehicle
from app.schemas.domain import (
    DriverSummaryOut,
    LocationSummaryOut,
    PartnerSummaryOut,
    VehicleSummaryOut,
)


async def load_partner_summaries(
    db: AsyncSession, partner_ids: set[int] | list[int]
) -> dict[int, PartnerSummaryOut]:
    ids = {i for i in partner_ids if i is not None}
    if not ids:
        return {}
    res = await db.execute(sa_select(Partner).where(Partner.id.in_(ids)))
    return {
        p.id: PartnerSummaryOut(id=p.id, code=p.code, name=p.name)
        for p in res.scalars().all()
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
    res = await db.execute(sa_select(User).where(User.id.in_(ids)))
    users = {u.id: u for u in res.scalars().all()}
    vehicle_res = await db.execute(
        sa_select(Vehicle).where(Vehicle.driver_id.in_(ids))
    )
    vehicle_by_driver: dict[int, Vehicle] = {}
    for v in vehicle_res.scalars().all():
        vehicle_by_driver[v.driver_id] = v
    return {
        uid: DriverSummaryOut(
            id=uid,
            name=(u.full_name or u.username),
            phone=u.phone,
            vehicle=VehicleSummaryOut(id=v.id, plate=v.plate) if (v := vehicle_by_driver.get(uid)) else None,
        )
        for uid, u in users.items()
    }


def get_partner_summary(
    summaries: dict[int, PartnerSummaryOut], partner_id: int
) -> PartnerSummaryOut:
    """Return the summary or a placeholder if missing (e.g. soft-deleted)."""
    return summaries.get(
        partner_id, PartnerSummaryOut(id=partner_id, code=None, name="(không rõ)")
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
        driver_id, DriverSummaryOut(id=driver_id, name="(không rõ)", phone=None, vehicle=None)
    )


# ── Backward-compatible aliases (consumers still referencing old names) ──

# Some modules still import these names; they delegate to the partner versions.
get_client_summary = get_partner_summary
load_client_summaries = load_partner_summaries
