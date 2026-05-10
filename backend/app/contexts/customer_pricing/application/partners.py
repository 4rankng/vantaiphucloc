"""Partner use cases.

Each use case is a callable class that depends only on the domain
repository ABC. The interface layer wires concrete repos via FastAPI
`Depends`.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.application.dto import (
    PartnerCreateInput,
    PartnerUpdateInput,
)
from app.contexts.customer_pricing.domain.entities import Partner
from app.contexts.customer_pricing.domain.exceptions import (
    AlreadyExists,
    NotFound,
)
from app.contexts.customer_pricing.domain.repositories import PartnerRepository
from app.contexts.customer_pricing.domain.value_objects import PartnerId


class GetPartner:
    def __init__(self, repo: PartnerRepository) -> None:
        self.repo = repo

    async def __call__(self, pid: PartnerId) -> Partner:
        p = await self.repo.get_by_id(pid)
        if p is None:
            raise NotFound("Partner", int(pid))
        return p


class ListPartners:
    def __init__(self, repo: PartnerRepository) -> None:
        self.repo = repo

    async def __call__(
        self,
        *,
        page: int,
        page_size: int,
        partner_type: str | None = None,
        active_only: bool = True,
    ) -> tuple[list[Partner], int]:
        offset = (page - 1) * page_size
        items, total = await self.repo.list(
            offset=offset,
            limit=page_size,
            partner_type=partner_type,
            active_only=active_only,
        )
        return list(items), total


class CreatePartner:
    def __init__(self, repo: PartnerRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, data: PartnerCreateInput) -> Partner:
        if data.code:
            existing = await self.repo.find_by_code(data.code)
            if existing is not None:
                raise AlreadyExists("Partner", data.code)
        p = Partner(
            id=None,
            name=data.name,
            partner_type=data.partner_type,
            partner_role=data.partner_role,
            code=data.code,
            phone=data.phone,
            tax_code=data.tax_code,
            address=data.address,
            contact_person=data.contact_person,
        )
        saved = await self.repo.add(p)
        await self.session.commit()
        return saved


class UpdatePartner:
    def __init__(self, repo: PartnerRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self, pid: PartnerId, data: PartnerUpdateInput
    ) -> Partner:
        p = await self.repo.get_by_id(pid)
        if p is None:
            raise NotFound("Partner", int(pid))
        if data.name is not None:
            p.name = data.name
        if data.partner_type is not None:
            p.partner_type = data.partner_type
        if data.partner_role is not None:
            p.partner_role = data.partner_role
        if data.code is not None:
            if data.code != p.code:
                clash = await self.repo.find_by_code(data.code)
                if clash is not None and clash.id != p.id:
                    raise AlreadyExists("Partner", data.code)
            p.code = data.code
        if data.phone is not None:
            p.phone = data.phone
        if data.tax_code is not None:
            p.tax_code = data.tax_code
        if data.address is not None:
            p.address = data.address
        if data.contact_person is not None:
            p.contact_person = data.contact_person
        if data.is_active is not None:
            if data.is_active:
                p.reactivate()
            else:
                p.deactivate()
        saved = await self.repo.save(p)
        await self.session.commit()
        return saved


class DeletePartner:
    """Soft-delete (sets is_active=False)."""

    def __init__(self, repo: PartnerRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, pid: PartnerId) -> None:
        p = await self.repo.get_by_id(pid)
        if p is None:
            raise NotFound("Partner", int(pid))
        p.deactivate()
        await self.repo.save(p)
        await self.session.commit()
