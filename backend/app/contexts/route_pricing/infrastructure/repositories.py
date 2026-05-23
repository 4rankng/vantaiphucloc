"""Concrete repository implementation for the Route Pricing context."""
from __future__ import annotations

from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.route_pricing.domain.entities import RoutePricing
from app.contexts.route_pricing.domain.repositories import RoutePricingRepository
from app.contexts.route_pricing.domain.value_objects import (
    LocationId,
    PartnerId,
    RoutePricingId,
    WorkType,
)
from app.contexts.route_pricing.infrastructure.mappers import (
    route_pricing_to_domain,
    route_pricing_to_orm,
)
from app.contexts.route_pricing.infrastructure.orm import RoutePricingORM


class SqlRoutePricingRepository(RoutePricingRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, pid: RoutePricingId) -> RoutePricing | None:
        orm = (
            await self.session.execute(
                select(RoutePricingORM).where(RoutePricingORM.id == int(pid))
            )
        ).scalar_one_or_none()
        return route_pricing_to_domain(orm) if orm else None

    async def find_by_lane(
        self,
        *,
        client_id: PartnerId,
        pickup_location_id: LocationId,
        dropoff_location_id: LocationId,
        work_type: WorkType,
    ) -> RoutePricing | None:
        orm = (
            await self.session.execute(
                select(RoutePricingORM).where(
                    RoutePricingORM.client_id == int(client_id),
                    RoutePricingORM.pickup_location_id == int(pickup_location_id),
                    RoutePricingORM.dropoff_location_id == int(dropoff_location_id),
                    RoutePricingORM.work_type == work_type,
                    RoutePricingORM.is_active.is_(True),
                )
            )
        ).scalar_one_or_none()
        return route_pricing_to_domain(orm) if orm else None

    async def list(
        self,
        *,
        offset: int,
        limit: int,
        client_id: PartnerId | None = None,
        work_type: WorkType | None = None,
        active_only: bool = True,
    ) -> tuple[Sequence[RoutePricing], int]:
        q = select(RoutePricingORM)
        if client_id is not None:
            q = q.where(RoutePricingORM.client_id == int(client_id))
        if work_type is not None:
            q = q.where(RoutePricingORM.work_type == work_type)
        if active_only:
            q = q.where(RoutePricingORM.is_active.is_(True))
        total = (
            await self.session.scalar(select(func.count()).select_from(q.subquery()))
            or 0
        )
        q = q.order_by(RoutePricingORM.id.desc()).offset(offset).limit(limit)
        rows = list((await self.session.execute(q)).scalars().all())
        return [route_pricing_to_domain(r) for r in rows], int(total)

    async def add(self, rp: RoutePricing) -> RoutePricing:
        orm = route_pricing_to_orm(rp)
        self.session.add(orm)
        await self.session.flush()
        return route_pricing_to_domain(orm)

    async def save(self, rp: RoutePricing) -> RoutePricing:
        existing = (
            await self.session.execute(
                select(RoutePricingORM).where(RoutePricingORM.id == int(rp.id))
            )
        ).scalar_one()
        route_pricing_to_orm(rp, existing)
        await self.session.flush()
        return route_pricing_to_domain(existing)
