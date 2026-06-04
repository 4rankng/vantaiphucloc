"""Domain entity for the Vendor Route Pricing context."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.contexts.route_pricing.domain.value_objects import (
    validate_work_type,
)
from app.contexts.vendor_route_pricing.domain.exceptions import NoPriceSet
from app.contexts.vendor_route_pricing.domain.value_objects import (
    LocationId,
    VendorId,
    VendorRoutePricingId,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class VendorRoutePricing:
    id: VendorRoutePricingId | None
    vendor_id: VendorId
    pickup_location_id: LocationId
    dropoff_location_id: LocationId
    work_type: str
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None
    is_active: bool = True
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.work_type = validate_work_type(self.work_type)

    def ensure_has_price(self) -> None:
        if all(
            getattr(self, k) is None
            for k in ("f20_price", "f40_price", "e20_price", "e40_price")
        ):
            raise NoPriceSet()

    def deactivate(self) -> None:
        self.is_active = False
        self.updated_at = _utcnow()
