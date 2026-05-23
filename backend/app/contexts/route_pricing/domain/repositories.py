"""Repository ABC for the Route Pricing context."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence

from app.contexts.route_pricing.domain.entities import RoutePricing
from app.contexts.route_pricing.domain.value_objects import (
    LocationId,
    OperationType,
    PartnerId,
    RoutePricingId,
)


class RoutePricingRepository(ABC):
    @abstractmethod
    async def get_by_id(self, pid: RoutePricingId) -> RoutePricing | None: ...

    @abstractmethod
    async def find_by_lane(
        self,
        *,
        client_id: PartnerId,
        pickup_location_id: LocationId,
        dropoff_location_id: LocationId,
        operation_type: OperationType,
    ) -> RoutePricing | None: ...

    @abstractmethod
    async def list(
        self,
        *,
        offset: int,
        limit: int,
        client_id: PartnerId | None = None,
        operation_type: OperationType | None = None,
        active_only: bool = True,
    ) -> tuple[Sequence[RoutePricing], int]: ...

    @abstractmethod
    async def add(self, rp: RoutePricing) -> RoutePricing: ...

    @abstractmethod
    async def save(self, rp: RoutePricing) -> RoutePricing: ...
