"""Pricing use cases (CRUD + tariff lookup wrappers)."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.application.dto import (
    PricingCreateInput,
    PricingLineInput,
    PricingUpdateInput,
)
from app.contexts.customer_pricing.domain.entities import Pricing, PricingLine
from app.contexts.customer_pricing.domain.exceptions import NotFound
from app.contexts.customer_pricing.domain.repositories import PricingRepository
from app.contexts.customer_pricing.domain.value_objects import (
    LocationId,
    PartnerId,
    PricingId,
)


def _build_lines(items: list[PricingLineInput]) -> list[PricingLine]:
    return [
        PricingLine(
            id=None,
            pricing_id=None,
            quantity=int(li.quantity),
            unit_price=int(li.unit_price),
            driver_salary=int(li.driver_salary),
            allowance=int(li.allowance),
        )
        for li in items
    ]


class GetPricing:
    def __init__(self, repo: PricingRepository) -> None:
        self.repo = repo

    async def __call__(self, pid: PricingId) -> Pricing:
        p = await self.repo.get_by_id(pid)
        if p is None:
            raise NotFound("Pricing", int(pid))
        return p


class ListPricings:
    def __init__(self, repo: PricingRepository) -> None:
        self.repo = repo

    async def __call__(
        self,
        *,
        page: int,
        page_size: int,
        partner_id: int | None = None,
        active_only: bool = True,
    ) -> tuple[list[Pricing], int]:
        offset = (page - 1) * page_size
        items, total = await self.repo.list(
            offset=offset,
            limit=page_size,
            partner_id=PartnerId(partner_id) if partner_id is not None else None,
            active_only=active_only,
        )
        return list(items), total


class CreatePricing:
    def __init__(self, repo: PricingRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, data: PricingCreateInput) -> Pricing:
        p = Pricing(
            id=None,
            partner_id=PartnerId(data.partner_id),
            work_type=data.work_type,
            pickup_location_id=LocationId(data.pickup_location_id),
            dropoff_location_id=LocationId(data.dropoff_location_id),
            lines=_build_lines(data.lines),
        )
        saved = await self.repo.add(p)
        await self.session.commit()
        return saved


class UpdatePricing:
    """Updates pricing scalars and (optionally) replaces the tier set.

    When `data.lines` is None, lines are untouched. When provided, the
    repo reconciles: existing tiers update, new tiers insert, missing
    tiers delete -- matching the legacy "delete-and-replace" behavior.
    """

    def __init__(self, repo: PricingRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self, pid: PricingId, data: PricingUpdateInput
    ) -> Pricing:
        p = await self.repo.get_by_id(pid)
        if p is None:
            raise NotFound("Pricing", int(pid))
        if data.partner_id is not None:
            p.partner_id = PartnerId(data.partner_id)
        if data.work_type is not None:
            from app.contexts.customer_pricing.domain.value_objects import (
                normalize_work_type,
            )
            p.work_type = normalize_work_type(data.work_type)
        if data.pickup_location_id is not None:
            p.pickup_location_id = LocationId(data.pickup_location_id)
        if data.dropoff_location_id is not None:
            p.dropoff_location_id = LocationId(data.dropoff_location_id)
        if data.lines is not None:
            p.lines = _build_lines(data.lines)
        saved = await self.repo.save(p)
        await self.session.commit()
        return saved


class DeletePricing:
    """Soft-delete (sets is_active=False)."""

    def __init__(self, repo: PricingRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, pid: PricingId) -> None:
        p = await self.repo.get_by_id(pid)
        if p is None:
            raise NotFound("Pricing", int(pid))
        p.deactivate()
        await self.repo.save(p)
        await self.session.commit()
