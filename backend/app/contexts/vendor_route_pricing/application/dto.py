"""Application-layer DTOs for the Vendor Route Pricing context."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class VendorRoutePricingCreateInput:
    vendor_id: int
    pickup_location_id: int
    dropoff_location_id: int
    work_type: str
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None


@dataclass
class VendorRoutePricingUpdateInput:
    vendor_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    work_type: str | None = None
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None
