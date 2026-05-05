"""Vendor (subcontractor) use cases."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.application.dto import (
    VendorCreateInput,
    VendorUpdateInput,
)
from app.contexts.customer_pricing.domain.entities import Vendor
from app.contexts.customer_pricing.domain.exceptions import (
    AlreadyExists,
    NotFound,
)
from app.contexts.customer_pricing.domain.repositories import VendorRepository
from app.contexts.customer_pricing.domain.value_objects import VendorId


class GetVendor:
    def __init__(self, repo: VendorRepository) -> None:
        self.repo = repo

    async def __call__(self, vid: VendorId) -> Vendor:
        v = await self.repo.get_by_id(vid)
        if v is None:
            raise NotFound("Vendor", int(vid))
        return v


class ListVendors:
    def __init__(self, repo: VendorRepository) -> None:
        self.repo = repo

    async def __call__(
        self, *, page: int, page_size: int, active_only: bool = True,
    ) -> tuple[list[Vendor], int]:
        offset = (page - 1) * page_size
        items, total = await self.repo.list(
            offset=offset, limit=page_size, active_only=active_only
        )
        return list(items), total


class CreateVendor:
    def __init__(self, repo: VendorRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, data: VendorCreateInput) -> Vendor:
        existing = await self.repo.find_by_name(data.name)
        if existing is not None:
            raise AlreadyExists("Vendor", data.name)
        v = Vendor(
            id=None,
            name=data.name,
            type=data.type,
            phone=data.phone,
            tax_code=data.tax_code,
            address=data.address,
            contact_person=data.contact_person,
        )
        saved = await self.repo.add(v)
        await self.session.commit()
        return saved


class UpdateVendor:
    def __init__(self, repo: VendorRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self, vid: VendorId, data: VendorUpdateInput
    ) -> Vendor:
        v = await self.repo.get_by_id(vid)
        if v is None:
            raise NotFound("Vendor", int(vid))
        if data.name is not None and data.name != v.name:
            clash = await self.repo.find_by_name(data.name)
            if clash is not None and clash.id != v.id:
                raise AlreadyExists("Vendor", data.name)
            v.name = data.name
        if data.type is not None:
            v.type = data.type
        if data.phone is not None:
            v.phone = data.phone
        if data.tax_code is not None:
            v.tax_code = data.tax_code
        if data.address is not None:
            v.address = data.address
        if data.contact_person is not None:
            v.contact_person = data.contact_person
        saved = await self.repo.save(v)
        await self.session.commit()
        return saved


class DeleteVendor:
    """Soft-delete (sets is_active=False)."""

    def __init__(self, repo: VendorRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, vid: VendorId) -> None:
        v = await self.repo.get_by_id(vid)
        if v is None:
            raise NotFound("Vendor", int(vid))
        v.is_active = False
        await self.repo.save(v)
        await self.session.commit()
