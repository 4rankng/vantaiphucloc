"""FastAPI dependency wiring for the Customer & Pricing context."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.application import (
    CreateCustomer,
    DeleteCustomer,
    GetCustomer,
    ListCustomers,
    UpdateCustomer,
)
from app.contexts.customer_pricing.domain.repositories import (
    ClientRepository,
)
from app.contexts.customer_pricing.infrastructure.repositories import (
    SqlClientRepository,
)
from app.database import get_db


def get_client_repository(
    db: AsyncSession = Depends(get_db),
) -> ClientRepository:
    return SqlClientRepository(db)


def get_list_customers(
    repo: ClientRepository = Depends(get_client_repository),
) -> ListCustomers:
    return ListCustomers(repo)


def get_create_customer(
    repo: ClientRepository = Depends(get_client_repository),
    db: AsyncSession = Depends(get_db),
) -> CreateCustomer:
    return CreateCustomer(repo, db)


def get_update_customer(
    repo: ClientRepository = Depends(get_client_repository),
    db: AsyncSession = Depends(get_db),
) -> UpdateCustomer:
    return UpdateCustomer(repo, db)


def get_delete_customer(
    repo: ClientRepository = Depends(get_client_repository),
    db: AsyncSession = Depends(get_db),
) -> DeleteCustomer:
    return DeleteCustomer(repo, db)


def get_get_customer(
    repo: ClientRepository = Depends(get_client_repository),
) -> GetCustomer:
    return GetCustomer(repo)
