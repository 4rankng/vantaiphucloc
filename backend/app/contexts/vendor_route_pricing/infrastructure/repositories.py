"""Concrete repository implementation for the Vendor Route Pricing context."""
from __future__ import annotations

from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.vendor_route_pricing.domain.entities import VendorRoutePricing
from app.contexts.vendor_route_pricing.domain.repositories import (
    VendorRoutePricingRepository,
)
from app.contexts.vendor_route_pricing.domain.value_objects import (
    LocationId,
    VendorId,
    VendorRoutePricingId,
    WorkType,
)
from app.contexts.vendor_route_pricing.infrastructure.mappers import (
    vendor_route_pricing_to_domain,
    vendor_route_pricing_to_orm,
)
from app.contexts.vendor_route_pricing.infrastructure.orm import (
    VendorRoutePricingORM,
)


class SqlVendorRoutePricingRepository(VendorRoutePricingRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, pid: VendorRoutePricingId) -> VendorRoutePricing | None:
        orm = (
            await self.session.execute(
                select(VendorRoutePricingORM).where(
                    VendorRoutePricingORM.id == int(pid)
                )
            )
        ).scalar_one_or_none()
        return vendor_route_pricing_to_domain(orm) if orm else None

    async def find_by_lane(
        self,
        *,
        vendor_id: VendorId,
        pickup_location_id: LocationId,
        dropoff_location_id: LocationId,
        work_type: WorkType,
    ) -> VendorRoutePricing | None:
        orm = (
            await self.session.execute(
                select(VendorRoutePricingORM).where(
                    VendorRoutePricingORM.vendor_id == int(vendor_id),
                    VendorRoutePricingORM.pickup_location_id == int(pickup_location_id),
                    VendorRoutePricingORM.dropoff_location_id == int(dropoff_location_id),
                    VendorRoutePricingORM.work_type == work_type,
                    VendorRoutePricingORM.is_active.is_(True),
                )
            )
        ).scalar_one_or_none()
        return vendor_route_pricing_to_domain(orm) if orm else None

    async def list(
        self,
        *,
        offset: int,
        limit: int,
        vendor_id: VendorId | None = None,
        work_type: WorkType | None = None,
        active_only: bool = True,
    ) -> tuple[Sequence[VendorRoutePricing], int]:
        q = select(VendorRoutePricingORM)
        if vendor_id is not None:
            q = q.where(VendorRoutePricingORM.vendor_id == int(vendor_id))
        if work_type is not None:
            q = q.where(VendorRoutePricingORM.work_type == work_type)
        if active_only:
            q = q.where(VendorRoutePricingORM.is_active.is_(True))
        total = (
            await self.session.scalar(
                select(func.count()).select_from(q.subquery())
            )
            or 0
        )
        q = q.order_by(VendorRoutePricingORM.id.desc()).offset(offset).limit(limit)
        rows = list((await self.session.execute(q)).scalars().all())
        return [vendor_route_pricing_to_domain(r) for r in rows], int(total)

    async def add(self, rp: VendorRoutePricing) -> VendorRoutePricing:
        orm = vendor_route_pricing_to_orm(rp)
        self.session.add(orm)
        await self.session.flush()
        return vendor_route_pricing_to_domain(orm)

    async def save(self, rp: VendorRoutePricing) -> VendorRoutePricing:
        existing = (
            await self.session.execute(
                select(VendorRoutePricingORM).where(
                    VendorRoutePricingORM.id == int(rp.id)
                )
            )
        ).scalar_one()
        vendor_route_pricing_to_orm(rp, existing)
        await self.session.flush()
        return vendor_route_pricing_to_domain(existing)
