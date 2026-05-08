"""Repository ABCs for the Customer & Pricing context.

Concrete implementations live in `infrastructure/repositories.py`. Use
cases depend only on these ABCs.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence

from app.contexts.customer_pricing.domain.entities import (
    Customer,
    Location,
    Pricing,
    Route,
    Vendor,
)
from app.contexts.customer_pricing.domain.value_objects import (
    ClientId,
    LocationId,
    PricingId,
    RouteId,
    VendorId,
    WorkType,
)


class ClientRepository(ABC):
    @abstractmethod
    async def get_by_id(self, cid: ClientId) -> Customer | None: ...

    @abstractmethod
    async def find_by_code(self, code: str) -> Customer | None: ...

    @abstractmethod
    async def find_by_name(self, name: str) -> Customer | None: ...

    @abstractmethod
    async def list(
        self, *, offset: int, limit: int, active_only: bool = True
    ) -> tuple[Sequence[Customer], int]: ...

    @abstractmethod
    async def add(self, c: Customer) -> Customer: ...

    @abstractmethod
    async def save(self, c: Customer) -> Customer: ...

    @abstractmethod
    async def increment_debt(self, cid: ClientId, amount: int) -> None:
        """Bump outstanding_debt on the Client. No-op if amount ≤ 0.

        Cross-context callers (e.g. operations) depend on this method
        instead of touching the Client aggregate directly.
        """


class VendorRepository(ABC):
    @abstractmethod
    async def get_by_id(self, vid: VendorId) -> Vendor | None: ...

    @abstractmethod
    async def find_by_name(self, name: str) -> Vendor | None: ...

    @abstractmethod
    async def list(
        self, *, offset: int, limit: int, active_only: bool = True
    ) -> tuple[Sequence[Vendor], int]: ...

    @abstractmethod
    async def add(self, v: Vendor) -> Vendor: ...

    @abstractmethod
    async def save(self, v: Vendor) -> Vendor: ...


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
        client_id: ClientId,
        work_type: WorkType,
        pickup_location_id: LocationId,
        dropoff_location_id: LocationId,
    ) -> Pricing | None: ...

    @abstractmethod
    async def list_for_client(
        self, client_id: ClientId, *, active_only: bool = True
    ) -> Sequence[Pricing]: ...

    @abstractmethod
    async def list(
        self, *, offset: int, limit: int, client_id: ClientId | None = None,
        active_only: bool = True,
    ) -> tuple[Sequence[Pricing], int]: ...

    @abstractmethod
    async def add(self, p: Pricing) -> Pricing: ...

    @abstractmethod
    async def save(self, p: Pricing) -> Pricing: ...


class RouteRepository(ABC):
    @abstractmethod
    async def get_by_id(self, rid: RouteId) -> Route | None: ...

    @abstractmethod
    async def find_by_lane(
        self, pickup_id: LocationId, dropoff_id: LocationId
    ) -> Route | None: ...

    @abstractmethod
    async def list(
        self, *, offset: int, limit: int, active_only: bool = True
    ) -> tuple[Sequence[Route], int]: ...

    @abstractmethod
    async def add(self, r: Route) -> Route: ...

    @abstractmethod
    async def save(self, r: Route) -> Route: ...
