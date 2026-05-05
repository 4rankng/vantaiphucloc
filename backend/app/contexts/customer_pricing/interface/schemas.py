"""Pydantic schemas for the Customer & Pricing interface layer.

Defines wire shapes for `/clients`, `/vendors`, `/locations`, `/pricings`,
and `/routes`. Read-DTOs use the shared `*SummaryOut` shapes from
`app.schemas.domain` for cross-context summaries (Client/Location nested
inside Pricing/Route etc.).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.schemas.domain import (
    ClientSummaryOut,
    LocationSummaryOut,
)


# ── Customer ─────────────────────────────────────────────────────


class CustomerOut(BaseModel):
    id: int
    code: str | None
    name: str
    type: str
    phone: str
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None
    outstanding_debt: int
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerCreate(BaseModel):
    name: str
    code: str | None = None
    type: str          # "company" | "individual" — validated by domain
    phone: str
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class CustomerUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    type: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None
    is_active: bool | None = None


def customer_to_out(c) -> CustomerOut:
    """Domain Customer → wire shape."""
    return CustomerOut(
        id=int(c.id),
        code=c.code,
        name=c.name,
        type=c.type,
        phone=c.phone,
        tax_code=c.tax_code,
        address=c.address,
        contact_person=c.contact_person,
        outstanding_debt=int(c.outstanding_debt),
        is_active=c.is_active,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


# ── Vendor ───────────────────────────────────────────────────────


class VendorOut(BaseModel):
    id: int
    name: str
    type: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VendorCreate(BaseModel):
    name: str
    type: Literal["company", "individual"] | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class VendorUpdate(BaseModel):
    name: str | None = None
    type: Literal["company", "individual"] | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


def vendor_to_out(v) -> VendorOut:
    return VendorOut(
        id=int(v.id),
        name=v.name,
        type=v.type,
        phone=v.phone,
        tax_code=v.tax_code,
        address=v.address,
        contact_person=v.contact_person,
        is_active=v.is_active,
        created_at=v.created_at,
        updated_at=v.updated_at,
    )


# ── Location ─────────────────────────────────────────────────────


class LocationOut(BaseModel):
    id: int
    name: str
    is_active: bool = True
    lat: float | None = None
    lng: float | None = None
    geocoded_at: datetime | None = None
    geocode_source: str | None = None
    pending_geocode: bool = True
    created_via: str | None = None
    location_review_needed: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LocationCreate(BaseModel):
    name: str


class LocationUpdate(BaseModel):
    name: str | None = None


class LocationNearbyOut(BaseModel):
    id: int
    name: str
    lat: float | None = None
    lng: float | None = None
    distance_km: float | None = None  # null when location has no coords

    model_config = ConfigDict(from_attributes=True)


class LocationPinRequest(BaseModel):
    name: str
    lat: float
    lng: float
    note: str | None = None


def location_to_out(loc) -> LocationOut:
    return LocationOut(
        id=int(loc.id),
        name=loc.name,
        is_active=loc.is_active,
        lat=loc.lat,
        lng=loc.lng,
        geocoded_at=loc.geocoded_at,
        geocode_source=loc.geocode_source,
        pending_geocode=loc.pending_geocode,
        created_via=loc.created_via,
        location_review_needed=loc.location_review_needed,
        created_at=loc.created_at,
        updated_at=loc.updated_at,
    )


# ── Route ────────────────────────────────────────────────────────


class RouteCreate(BaseModel):
    route: str
    pickup_location_id: int
    dropoff_location_id: int


class RouteUpdate(BaseModel):
    route: str | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None


class RouteOut(BaseModel):
    id: int
    route: str
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Pricing ──────────────────────────────────────────────────────


class PricingLineCreate(BaseModel):
    quantity: int
    unit_price: int = 0
    driver_salary: int = 0
    allowance: int = 0


class PricingLineOut(BaseModel):
    id: int
    quantity: int
    unit_price: int = 0
    driver_salary: int = 0
    allowance: int = 0

    model_config = ConfigDict(from_attributes=True)


class PricingCreate(BaseModel):
    client_id: int
    work_type: str
    pickup_location_id: int
    dropoff_location_id: int
    lines: list[PricingLineCreate]


class PricingUpdate(BaseModel):
    client_id: int | None = None
    work_type: str | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    lines: list[PricingLineCreate] | None = None


class PricingOut(BaseModel):
    id: int
    client: ClientSummaryOut
    work_type: str
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    lines: list[PricingLineOut] = []
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


def pricing_line_to_out(ln) -> PricingLineOut:
    return PricingLineOut(
        id=int(ln.id),
        quantity=int(ln.quantity),
        unit_price=int(ln.unit_price),
        driver_salary=int(ln.driver_salary),
        allowance=int(ln.allowance),
    )
