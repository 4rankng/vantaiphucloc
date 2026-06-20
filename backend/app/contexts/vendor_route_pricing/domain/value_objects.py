"""Value objects for the Vendor Route Pricing context."""

from __future__ import annotations

from typing import NewType

from app.contexts.route_pricing.domain.value_objects import (
    LocationId,
    Money,
    VALID_WORK_TYPES,
    WorkType,
    get_valid_work_types,
    validate_work_type,
)

VendorRoutePricingId = NewType("VendorRoutePricingId", int)
VendorId = NewType("VendorId", int)

__all__ = [
    "VendorRoutePricingId",
    "VendorId",
    "LocationId",
    "WorkType",
    "Money",
    "VALID_WORK_TYPES",
    "get_valid_work_types",
    "validate_work_type",
]
