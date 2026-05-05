"""FastAPI wiring for the Fleet context."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.fleet.application import CreateDriver, ListDrivers
from app.contexts.fleet.domain.repositories import DriverRepository
from app.contexts.fleet.infrastructure.repositories import SqlDriverRepository
from app.contexts.identity.interface.dependencies import get_password_hasher
from app.database import get_db


def get_driver_repository(db: AsyncSession = Depends(get_db)) -> DriverRepository:
    return SqlDriverRepository(db)


def get_list_drivers(
    repo: DriverRepository = Depends(get_driver_repository),
) -> ListDrivers:
    return ListDrivers(repo)


def get_create_driver(
    repo: DriverRepository = Depends(get_driver_repository),
    hasher=Depends(get_password_hasher),
) -> CreateDriver:
    return CreateDriver(repo, password_hasher=hasher)
