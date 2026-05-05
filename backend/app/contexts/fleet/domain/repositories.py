"""Fleet repository ABCs."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.contexts.fleet.domain.entities import Driver
from app.contexts.fleet.domain.value_objects import DriverId


@dataclass
class DriverPage:
    items: list[Driver]
    total: int


class DriverRepository(ABC):
    @abstractmethod
    async def get(self, driver_id: DriverId) -> Driver | None: ...

    @abstractmethod
    async def list_paged(self, *, page: int, page_size: int) -> DriverPage: ...

    @abstractmethod
    async def create(
        self,
        *,
        username: str,
        phone: str,
        hashed_password: str,
        vendor: str | None,
        tractor_plate: str | None,
    ) -> Driver: ...
