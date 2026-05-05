"""Customer use cases.

Each use case is a callable class that depends only on the domain
repository ABC. The interface layer wires concrete repos via FastAPI
`Depends`.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.application.dto import (
    CustomerCreateInput,
    CustomerUpdateInput,
)
from app.contexts.customer_pricing.domain.entities import Customer
from app.contexts.customer_pricing.domain.exceptions import (
    AlreadyExists,
    NotFound,
)
from app.contexts.customer_pricing.domain.repositories import ClientRepository
from app.contexts.customer_pricing.domain.value_objects import ClientId


class GetCustomer:
    def __init__(self, repo: ClientRepository) -> None:
        self.repo = repo

    async def __call__(self, cid: ClientId) -> Customer:
        c = await self.repo.get_by_id(cid)
        if c is None:
            raise NotFound("Customer", int(cid))
        return c


class ListCustomers:
    def __init__(self, repo: ClientRepository) -> None:
        self.repo = repo

    async def __call__(
        self, *, page: int, page_size: int, active_only: bool = True,
    ) -> tuple[list[Customer], int]:
        offset = (page - 1) * page_size
        items, total = await self.repo.list(
            offset=offset, limit=page_size, active_only=active_only
        )
        return list(items), total


class CreateCustomer:
    def __init__(self, repo: ClientRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, data: CustomerCreateInput) -> Customer:
        if data.code:
            existing = await self.repo.find_by_code(data.code)
            if existing is not None:
                raise AlreadyExists("Customer", data.code)
        c = Customer(
            id=None,
            name=data.name,
            type=data.type,
            phone=data.phone,
            code=data.code,
            tax_code=data.tax_code,
            address=data.address,
            contact_person=data.contact_person,
        )
        saved = await self.repo.add(c)
        await self.session.commit()
        return saved


class UpdateCustomer:
    def __init__(self, repo: ClientRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self, cid: ClientId, data: CustomerUpdateInput
    ) -> Customer:
        c = await self.repo.get_by_id(cid)
        if c is None:
            raise NotFound("Customer", int(cid))
        if data.name is not None:
            c.name = data.name
        if data.type is not None:
            from app.contexts.customer_pricing.domain.value_objects import (
                normalize_client_type,
            )
            c.type = normalize_client_type(data.type)
        if data.phone is not None:
            c.phone = data.phone
        if data.code is not None:
            if data.code != c.code:
                clash = await self.repo.find_by_code(data.code)
                if clash is not None and clash.id != c.id:
                    raise AlreadyExists("Customer", data.code)
            c.code = data.code
        if data.tax_code is not None:
            c.tax_code = data.tax_code
        if data.address is not None:
            c.address = data.address
        if data.contact_person is not None:
            c.contact_person = data.contact_person
        if data.is_active is not None:
            if data.is_active:
                c.reactivate()
            else:
                c.deactivate()
        saved = await self.repo.save(c)
        await self.session.commit()
        return saved


class DeleteCustomer:
    """Soft-delete (sets is_active=False)."""

    def __init__(self, repo: ClientRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, cid: ClientId) -> None:
        c = await self.repo.get_by_id(cid)
        if c is None:
            raise NotFound("Customer", int(cid))
        c.deactivate()
        await self.repo.save(c)
        await self.session.commit()
