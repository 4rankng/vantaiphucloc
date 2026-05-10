"""Repository ABCs for the Customer & Pricing context.

Concrete implementations live in `infrastructure/repositories.py`. Use
cases depend only on these ABCs.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence

from app.contexts.customer_pricing.domain.entities import (
    Location,
    Partner,
    Pricing,
)
from app.contexts.customer_pricing.domain.value_objects import (
    LocationId,
    PartnerId,
    PricingId,
    WorkType,
)


class PartnerRepository(ABC):
    @abstractmethod
    async def get_by_id(self, pid: PartnerId) -> Partner | None: ...

    @abstractmethod
    async def find_by_code(self, code: str) -> Partner | None: ...

    @abstractmethod
    async def find_by_name(self, name: str) -> Partner | None: ...

    @abstractmethod
    async def list(
        self,
        *,
        offset: int,
        limit: int,
        partner_type: str | None = None,
        active_only: bool = True,
    ) -> tuple[Sequence[Partner], int]: ...

    @abstractmethod
    async def add(self, p: Partner) -> Partner: ...

    @abstractmethod
    async def save(self, p: Partner) -> Partner: ...


class LocationRepository(ABC):
    @abstractmethod
    async def get_by_id(self, lid: LocationId) -> Location | None: ...

    @abstractmethod
    async def find_by_name(self, name: str) -> Location | None: ...

    @abstractmethod
    async def list_active(self, *, limit: int = 10000) -> Sequence[Location]: ...

    @abstractmethod
    async def list(
        self, *, offset: int, limit: int, active_only: bool = True
    ) -> tuple[Sequence[Location], int]: ...

    @abstractmethod
    async def add(self, loc: Location) -> Location: ...

    @abstractmethod
    async def save(self, loc: Location) -> Location: ...

    @abstractmethod
    async def has_external_references(self, lid: LocationId) -> tuple[str, str] | None:
        """Returns (table, column) of the first external FK or None."""


class PricingRepository(ABC):
    @abstractmethod
    async def get_by_id(self, pid: PricingId) -> Pricing | None: ...

    @abstractmethod
    async def find_by_lane(
        self,
        *,
        partner_id: PartnerId,
        work_type: WorkType,
        pickup_location_id: LocationId,
        dropoff_location_id: LocationId,
    ) -> Pricing | None: ...

    @abstractmethod
    async def list_for_partner(
        self, partner_id: PartnerId, *, active_only: bool = True
    ) -> Sequence[Pricing]: ...

    @abstractmethod
    async def list(
        self, *, offset: int, limit: int, partner_id: PartnerId | None = None,
        active_only: bool = True,
    ) -> tuple[Sequence[Pricing], int]: ...

    @abstractmethod
    async def add(self, p: Pricing) -> Pricing: ...

    @abstractmethod
    async def save(self, p: Pricing) -> Pricing: ...
