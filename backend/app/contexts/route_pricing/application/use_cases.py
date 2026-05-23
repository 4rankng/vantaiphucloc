"""Route Pricing use cases (CRUD)."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.route_pricing.application.dto import (
    RoutePricingCreateInput,
    RoutePricingUpdateInput,
)
from app.contexts.route_pricing.domain.entities import RoutePricing
from app.contexts.route_pricing.domain.exceptions import AlreadyExists, NotFound
from app.contexts.route_pricing.domain.repositories import RoutePricingRepository
from app.contexts.route_pricing.domain.value_objects import (
    LocationId,
    PartnerId,
    RoutePricingId,
)


class GetRoutePricing:
    def __init__(self, repo: RoutePricingRepository) -> None:
        self.repo = repo

    async def __call__(self, pid: RoutePricingId) -> RoutePricing:
        rp = await self.repo.get_by_id(pid)
        if rp is None:
            raise NotFound(int(pid))
        return rp


class ListRoutePricings:
    def __init__(self, repo: RoutePricingRepository) -> None:
        self.repo = repo

    async def __call__(
        self,
        *,
        page: int,
        page_size: int,
        client_id: int | None = None,
        operation_type: str | None = None,
        active_only: bool = True,
    ) -> tuple[list[RoutePricing], int]:
        offset = (page - 1) * page_size
        items, total = await self.repo.list(
            offset=offset,
            limit=page_size,
            client_id=PartnerId(client_id) if client_id is not None else None,
            operation_type=operation_type,
            active_only=active_only,
        )
        return list(items), total


class CreateRoutePricing:
    def __init__(self, repo: RoutePricingRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, data: RoutePricingCreateInput) -> RoutePricing:
        rp = RoutePricing(
            id=None,
            client_id=PartnerId(data.client_id),
            pickup_location_id=LocationId(data.pickup_location_id),
            dropoff_location_id=LocationId(data.dropoff_location_id),
            operation_type=data.operation_type,
            f20_price=data.f20_price,
            f40_price=data.f40_price,
            e20_price=data.e20_price,
            e40_price=data.e40_price,
        )
        rp.ensure_has_price()
        existing = await self.repo.find_by_lane(
            client_id=rp.client_id,
            pickup_location_id=rp.pickup_location_id,
            dropoff_location_id=rp.dropoff_location_id,
            operation_type=rp.operation_type,
        )
        if existing is not None:
            raise AlreadyExists(
                (
                    data.client_id,
                    data.pickup_location_id,
                    data.dropoff_location_id,
                    data.operation_type,
                )
            )
        saved = await self.repo.add(rp)
        await self.session.commit()
        return saved


class UpdateRoutePricing:
    def __init__(self, repo: RoutePricingRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self, pid: RoutePricingId, data: RoutePricingUpdateInput
    ) -> RoutePricing:
        rp = await self.repo.get_by_id(pid)
        if rp is None:
            raise NotFound(int(pid))
        if data.client_id is not None:
            rp.client_id = PartnerId(data.client_id)
        if data.pickup_location_id is not None:
            rp.pickup_location_id = LocationId(data.pickup_location_id)
        if data.dropoff_location_id is not None:
            rp.dropoff_location_id = LocationId(data.dropoff_location_id)
        if data.operation_type is not None:
            from app.contexts.route_pricing.domain.value_objects import (
                validate_operation_type,
            )

            rp.operation_type = validate_operation_type(data.operation_type)
        if data.f20_price is not None:
            rp.f20_price = data.f20_price
        if data.f40_price is not None:
            rp.f40_price = data.f40_price
        if data.e20_price is not None:
            rp.e20_price = data.e20_price
        if data.e40_price is not None:
            rp.e40_price = data.e40_price
        saved = await self.repo.save(rp)
        await self.session.commit()
        return saved


class DeleteRoutePricing:
    def __init__(self, repo: RoutePricingRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, pid: RoutePricingId) -> None:
        rp = await self.repo.get_by_id(pid)
        if rp is None:
            raise NotFound(int(pid))
        rp.deactivate()
        await self.repo.save(rp)
        await self.session.commit()
