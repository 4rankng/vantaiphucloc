"""Domain entity for the Route Pricing context."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from app.utils.dates import utcnow

from app.contexts.route_pricing.domain.exceptions import NoPriceSet
from app.contexts.route_pricing.domain.value_objects import (
    LocationId,
    PartnerId,
    RoutePricingId,
    WorkType,
    validate_work_type,
)




@dataclass
class RoutePricing:
    id: RoutePricingId | None
    client_id: PartnerId
    pickup_location_id: LocationId
    dropoff_location_id: LocationId
    work_type: WorkType
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None
    f20_driver_salary: int | None = None
    f40_driver_salary: int | None = None
    e20_driver_salary: int | None = None
    e40_driver_salary: int | None = None
    is_active: bool = True
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)

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
        self.updated_at = utcnow()
