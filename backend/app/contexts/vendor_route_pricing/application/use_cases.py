"""Vendor Route Pricing use cases (CRUD)."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.route_pricing.domain.value_objects import (
    LocationId,
    validate_work_type,
)
from app.contexts.vendor_route_pricing.application.dto import (
    VendorRoutePricingCreateInput,
    VendorRoutePricingUpdateInput,
)
from app.contexts.vendor_route_pricing.domain.entities import VendorRoutePricing
from app.contexts.vendor_route_pricing.domain.exceptions import AlreadyExists, NotFound
from app.contexts.vendor_route_pricing.domain.repositories import (
    VendorRoutePricingRepository,
)
from app.contexts.vendor_route_pricing.domain.value_objects import (
    VendorId,
    VendorRoutePricingId,
)


class GetVendorRoutePricing:
    def __init__(self, repo: VendorRoutePricingRepository) -> None:
        self.repo = repo

    async def __call__(self, pid: VendorRoutePricingId) -> VendorRoutePricing:
        rp = await self.repo.get_by_id(pid)
        if rp is None:
            raise NotFound(int(pid))
        return rp


class ListVendorRoutePricings:
    def __init__(self, repo: VendorRoutePricingRepository) -> None:
        self.repo = repo

    async def __call__(
        self,
        *,
        page: int,
        page_size: int,
        vendor_id: int | None = None,
        work_type: str | None = None,
        active_only: bool = True,
    ) -> tuple[list[VendorRoutePricing], int]:
        offset = (page - 1) * page_size
        items, total = await self.repo.list(
            offset=offset,
            limit=page_size,
            vendor_id=VendorId(vendor_id) if vendor_id is not None else None,
            work_type=work_type,
            active_only=active_only,
        )
        return list(items), total


class CreateVendorRoutePricing:
    def __init__(
        self, repo: VendorRoutePricingRepository, session: AsyncSession
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, data: VendorRoutePricingCreateInput) -> VendorRoutePricing:
        rp = VendorRoutePricing(
            id=None,
            vendor_id=VendorId(data.vendor_id),
            pickup_location_id=LocationId(data.pickup_location_id),
            dropoff_location_id=LocationId(data.dropoff_location_id),
            work_type=data.work_type,
            f20_price=data.f20_price,
            f40_price=data.f40_price,
            e20_price=data.e20_price,
            e40_price=data.e40_price,
        )
        rp.ensure_has_price()
        existing = await self.repo.find_by_lane(
            vendor_id=rp.vendor_id,
            pickup_location_id=rp.pickup_location_id,
            dropoff_location_id=rp.dropoff_location_id,
            work_type=rp.work_type,
        )
        if existing is not None:
            raise AlreadyExists(
                (
                    data.vendor_id,
                    data.pickup_location_id,
                    data.dropoff_location_id,
                    data.work_type,
                )
            )
        saved = await self.repo.add(rp)
        await self.session.commit()
        return saved


class UpdateVendorRoutePricing:
    def __init__(
        self, repo: VendorRoutePricingRepository, session: AsyncSession
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self, pid: VendorRoutePricingId, data: VendorRoutePricingUpdateInput
    ) -> VendorRoutePricing:
        rp = await self.repo.get_by_id(pid)
        if rp is None:
            raise NotFound(int(pid))
        if data.vendor_id is not None:
            rp.vendor_id = VendorId(data.vendor_id)
        if data.pickup_location_id is not None:
            rp.pickup_location_id = LocationId(data.pickup_location_id)
        if data.dropoff_location_id is not None:
            rp.dropoff_location_id = LocationId(data.dropoff_location_id)
        if data.work_type is not None:
            rp.work_type = validate_work_type(data.work_type)
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


class DeleteVendorRoutePricing:
    def __init__(
        self, repo: VendorRoutePricingRepository, session: AsyncSession
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, pid: VendorRoutePricingId) -> None:
        rp = await self.repo.get_by_id(pid)
        if rp is None:
            raise NotFound(int(pid))
        rp.deactivate()
        await self.repo.save(rp)
        await self.session.commit()
