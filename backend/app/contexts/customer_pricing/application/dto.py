"""Plain dataclasses used at the application boundary.

Distinct from interface schemas (Pydantic) and domain entities
(business invariants).
"""

from __future__ import annotations

from dataclasses import dataclass, field


# ── Customer ─────────────────────────────────────────────────────


@dataclass
class CustomerCreateInput:
    name: str
    type: str
    phone: str
    code: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


@dataclass
class CustomerUpdateInput:
    name: str | None = None
    type: str | None = None
    phone: str | None = None
    code: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None
    is_active: bool | None = None


# ── Vendor ───────────────────────────────────────────────────────


@dataclass
class VendorCreateInput:
    name: str
    type: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


@dataclass
class VendorUpdateInput:
    name: str | None = None
    type: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None
    is_active: bool | None = None


# ── Location ─────────────────────────────────────────────────────


@dataclass
class LocationCreateInput:
    name: str


@dataclass
class LocationUpdateInput:
    name: str | None = None


@dataclass
class LocationPinInput:
    """Driver pins their current location."""
    name: str
    lat: float
    lng: float
    user_id: int | None = None


# ── Route ────────────────────────────────────────────────────────


@dataclass
class RouteCreateInput:
    route: str
    pickup_location_id: int
    dropoff_location_id: int


@dataclass
class RouteUpdateInput:
    route: str | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None


# ── Pricing ──────────────────────────────────────────────────────


@dataclass
class PricingLineInput:
    quantity: int
    unit_price: int = 0
    driver_salary: int = 0
    allowance: int = 0


@dataclass
class PricingCreateInput:
    client_id: int
    work_type: str
    pickup_location_id: int
    dropoff_location_id: int
    lines: list[PricingLineInput] = field(default_factory=list)


@dataclass
class PricingUpdateInput:
    client_id: int | None = None
    work_type: str | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    lines: list[PricingLineInput] | None = None
