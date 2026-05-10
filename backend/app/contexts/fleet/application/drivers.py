"""Driver use cases."""

from __future__ import annotations

from dataclasses import dataclass

from app.contexts.fleet.application.dto import DriverDTO, DriverListDTO
from app.contexts.fleet.domain.entities import Driver
from app.contexts.fleet.domain.repositories import DriverRepository

PHUC_LOC = "Vận Tải Phúc Lộc"


def _to_dto(d: Driver) -> DriverDTO:
    return DriverDTO(
        id=d.id or 0,
        username=d.username,
        phone=d.phone,
        full_name=d.full_name,
        vendor=d.vendor or PHUC_LOC,
        tractor_plate=d.tractor_plate,
        created_at=d.created_at,
        updated_at=d.updated_at,
    )


@dataclass
class CreateDriverInput:
    username: str
    phone: str
    vendor: str | None = None
    tractor_plate: str | None = None


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
        # Password defaults to phone (existing convention from legacy
        # `app/api/v1/drivers.py`); keeps drivers self-onboarding.
        hashed = self.hasher.hash(payload.phone)
        driver = await self.repo.create(
            username=payload.username,
            phone=payload.phone,
            hashed_password=hashed,
            vendor=payload.vendor or PHUC_LOC,
            tractor_plate=payload.tractor_plate,
        )
        return _to_dto(driver)
