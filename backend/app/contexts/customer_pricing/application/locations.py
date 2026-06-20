"""Location use cases (CRUD + driver-pin)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.application.dto import (
    LocationCreateInput,
    LocationPinInput,
    LocationUpdateInput,
)
from app.contexts.customer_pricing.domain.entities import Location
from app.contexts.customer_pricing.domain.exceptions import (
    AlreadyExists,
    LocationInUse,
    NotFound,
)
from app.contexts.customer_pricing.domain.repositories import LocationRepository
from app.contexts.customer_pricing.domain.value_objects import LocationId


class GetLocation:
    def __init__(self, repo: LocationRepository) -> None:
        self.repo = repo

    async def __call__(self, lid: LocationId) -> Location:
        loc = await self.repo.get_by_id(lid)
        if loc is None:
            raise NotFound("Location", int(lid))
        return loc


class ListLocations:
    def __init__(self, repo: LocationRepository) -> None:
        self.repo = repo

    async def __call__(
        self,
        *,
        page: int,
        page_size: int,
        active_only: bool = True,
    ) -> tuple[list[Location], int]:
        offset = (page - 1) * page_size
        items, total = await self.repo.list(
            offset=offset, limit=page_size, active_only=active_only
        )
        return list(items), total


class ListAllActiveLocations:
    """Used by the driver-facing dropdown — no pagination, alpha-sorted."""

    def __init__(self, repo: LocationRepository) -> None:
        self.repo = repo

    async def __call__(self, *, limit: int = 10000) -> list[Location]:
        return list(await self.repo.list_active(limit=limit))


class CreateLocation:
    def __init__(self, repo: LocationRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, data: LocationCreateInput) -> Location:
        existing = await self.repo.find_by_name(data.name)
        if existing is not None:
            raise AlreadyExists("Location", data.name)
        loc = Location(
            id=None,
            name=data.name,
            is_active=True,
            pending_geocode=True,
        )
        saved = await self.repo.add(loc)
        await self.session.commit()
        return saved


class UpdateLocation:
    def __init__(self, repo: LocationRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, lid: LocationId, data: LocationUpdateInput) -> Location:
        loc = await self.repo.get_by_id(lid)
        if loc is None:
            raise NotFound("Location", int(lid))
        if data.name is not None:
            loc.name = data.name
        saved = await self.repo.save(loc)
        await self.session.commit()
        return saved


class DeleteLocation:
    """Soft-delete; refuses if any external aggregate references the row."""

    def __init__(self, repo: LocationRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, lid: LocationId) -> None:
        loc = await self.repo.get_by_id(lid)
        if loc is None:
            raise NotFound("Location", int(lid))
        ref = await self.repo.has_external_references(lid)
        if ref is not None:
            raise LocationInUse(table=ref[0], column=ref[1])
        loc.deactivate()
        await self.repo.save(loc)
        await self.session.commit()


class PinDriverLocation:
    """Driver-pin: idempotent on `name`. Records GPS coords and source.

    Returns the existing or freshly-created Location.
    """

    def __init__(self, repo: LocationRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, data: LocationPinInput) -> Location:
        name = data.name.strip()[:255]
        if not name:
            name = f"Pinned at ({data.lat:.4f}, {data.lng:.4f})"

        existing = await self.repo.find_by_name(name)
        if existing is not None:
            if not existing.has_coords():
                existing.record_gps_pin(
                    lat=data.lat,
                    lng=data.lng,
                    source="driver_pin",
                    review_needed=False,
                )
                saved = await self.repo.save(existing)
                await self.session.commit()
                return saved
            return existing

        loc = Location(
            id=None,
            name=name,
            is_active=True,
            lat=data.lat,
            lng=data.lng,
            geocoded_at=datetime.now(timezone.utc),
            geocode_source="driver_pin",
            pending_geocode=False,
            created_via="driver_pin",
            created_by_id=data.user_id,
            location_review_needed=True,
        )
        saved = await self.repo.add(loc)
        await self.session.commit()
        return saved
