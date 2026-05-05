"""Route use cases."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.application.dto import (
    RouteCreateInput,
    RouteUpdateInput,
)
from app.contexts.customer_pricing.domain.entities import Route
from app.contexts.customer_pricing.domain.exceptions import NotFound
from app.contexts.customer_pricing.domain.repositories import RouteRepository
from app.contexts.customer_pricing.domain.value_objects import (
    LocationId,
    RouteId,
)


class GetRoute:
    def __init__(self, repo: RouteRepository) -> None:
        self.repo = repo

    async def __call__(self, rid: RouteId) -> Route:
        r = await self.repo.get_by_id(rid)
        if r is None:
            raise NotFound("Route", int(rid))
        return r


class ListRoutes:
    def __init__(self, repo: RouteRepository) -> None:
        self.repo = repo

    async def __call__(
        self, *, page: int, page_size: int, active_only: bool = True,
    ) -> tuple[list[Route], int]:
        offset = (page - 1) * page_size
        items, total = await self.repo.list(
            offset=offset, limit=page_size, active_only=active_only
        )
        return list(items), total


class CreateRoute:
    def __init__(self, repo: RouteRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, data: RouteCreateInput) -> Route:
        r = Route(
            id=None,
            route=data.route,
            pickup_location_id=LocationId(data.pickup_location_id),
            dropoff_location_id=LocationId(data.dropoff_location_id),
        )
        saved = await self.repo.add(r)
        await self.session.commit()
        return saved


class UpdateRoute:
    def __init__(self, repo: RouteRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self, rid: RouteId, data: RouteUpdateInput
    ) -> Route:
        r = await self.repo.get_by_id(rid)
        if r is None:
            raise NotFound("Route", int(rid))
        if data.route is not None:
            r.route = data.route
        if data.pickup_location_id is not None:
            r.pickup_location_id = LocationId(data.pickup_location_id)
        if data.dropoff_location_id is not None:
            r.dropoff_location_id = LocationId(data.dropoff_location_id)
        saved = await self.repo.save(r)
        await self.session.commit()
        return saved


class DeleteRoute:
    """Soft-delete (sets is_active=False)."""

    def __init__(self, repo: RouteRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, rid: RouteId) -> None:
        r = await self.repo.get_by_id(rid)
        if r is None:
            raise NotFound("Route", int(rid))
        r.is_active = False
        await self.repo.save(r)
        await self.session.commit()
