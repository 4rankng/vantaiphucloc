"""Value objects for the Customer & Pricing context."""

from __future__ import annotations

from typing import NewType


PartnerId = NewType("PartnerId", int)
LocationId = NewType("LocationId", int)
PricingId = NewType("PricingId", int)
LocationAliasId = NewType("LocationAliasId", int)
PricingLineId = NewType("PricingLineId", int)


# Work types describe the operation: CHUYỂN BÃI, XUẤT/NHẬP TÀU, etc.
WorkType = str

# Provenance tag for how a Location's GPS coords arrived.
# Known values: "manual", "driver_pin", "geocoder", "alias_match".
GeocodeSource = str

# VND amounts. We carry plain ints -- the schema uses Integer columns.
Money = int


def normalize_work_type(value: str | None) -> str:
    """Strip + normalize. Raises ValueError on empty."""
    if value is None:
        raise ValueError("work_type is required")
    norm = value.strip()
    if not norm:
        raise ValueError("work_type cannot be empty")
    return norm
