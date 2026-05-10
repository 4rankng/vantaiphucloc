"""Driver use cases."""

from __future__ import annotations

from dataclasses import dataclass

from app.contexts.fleet.application.dto import DriverDTO, DriverListDTO
from app.contexts.fleet.domain.entities import Driver
from app.contexts.fleet.domain.repositories import DriverRepository


def _to_dto(d: Driver) -> DriverDTO:
    return DriverDTO(
        id=d.id or 0,
        username=d.username,
        phone=d.phone,
        full_name=d.full_name,
        created_at=d.created_at,
        updated_at=d.updated_at,
    )


@dataclass
class CreateDriverInput:
    username: str
    phone: str | None = None
    full_name: str | None = None


class ListDrivers:
    def __init__(self, repo: DriverRepository) -> None:
        self.repo = repo

    async def __call__(self, *, page: int, page_size: int) -> DriverListDTO:
        result = await self.repo.list_paged(page=page, page_size=page_size)
        return DriverListDTO(
            items=[_to_dto(d) for d in result.items],
            total=result.total,
            page=page,
            page_size=page_size,
        )


class CreateDriver:
    def __init__(
        self,
        repo: DriverRepository,
        *,
        password_hasher,
    ) -> None:
        self.repo = repo
        self.hasher = password_hasher

    async def __call__(self, payload: CreateDriverInput) -> DriverDTO:
        hashed = self.hasher.hash(payload.phone)
        driver = await self.repo.create(
            username=payload.username,
            phone=payload.phone,
            hashed_password=hashed,
            full_name=payload.full_name,
        )
        return _to_dto(driver)
