"""Repository ABC for the Vendor Route Pricing context."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence

from app.contexts.vendor_route_pricing.domain.entities import VendorRoutePricing
from app.contexts.vendor_route_pricing.domain.value_objects import (
    LocationId,
    VendorId,
    VendorRoutePricingId,
    WorkType,
)


class VendorRoutePricingRepository(ABC):
    @abstractmethod
    async def get_by_id(self, pid: VendorRoutePricingId) -> VendorRoutePricing | None: ...

    @abstractmethod
    async def find_by_lane(
        self,
        *,
        vendor_id: VendorId,
        pickup_location_id: LocationId,
        dropoff_location_id: LocationId,
        work_type: WorkType,
    ) -> VendorRoutePricing | None: ...

    @abstractmethod
    async def list(
        self,
        *,
        offset: int,
        limit: int,
        vendor_id: VendorId | None = None,
        work_type: WorkType | None = None,
        active_only: bool = True,
    ) -> tuple[Sequence[VendorRoutePricing], int]: ...

    @abstractmethod
    async def add(self, rp: VendorRoutePricing) -> VendorRoutePricing: ...

    @abstractmethod
    async def save(self, rp: VendorRoutePricing) -> VendorRoutePricing: ...
