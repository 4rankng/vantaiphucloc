"""Pydantic schemas for the Customer & Pricing interface layer.

Defines wire shapes for `/partners`, `/locations`, and `/pricings`.
Read-DTOs use the shared `*SummaryOut` shapes from `app.schemas.domain`
for cross-context summaries (Partner/Location nested inside Pricing etc.).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.domain import (
    LocationSummaryOut,
    ClientSummaryOut,
)


# -- Partner ---------------------------------------------------------


class PartnerCreateBody(BaseModel):
    name: str
    code: str | None = None
    partner_type: Literal["client", "vendor"]
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None

    @field_validator("tax_code")
    @classmethod
    def validate_tax_code(cls, v: str | None) -> str | None:
        if v and not v.isdigit():
            raise ValueError("Mã số thuế chỉ chứa chữ số")
        if v and len(v) not in (10, 13):
            raise ValueError("Mã số thuế phải 10 hoặc 13 chữ số")
        return v

class PartnerUpdateBody(BaseModel):
    name: str | None = None
    code: str | None = None
    partner_type: Literal["client", "vendor"] | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None
    is_active: bool | None = None

    @field_validator("tax_code")
    @classmethod
    def validate_tax_code(cls, v: str | None) -> str | None:
        if v and not v.isdigit():
            raise ValueError("Mã số thuế chỉ chứa chữ số")
        if v and len(v) not in (10, 13):
            raise ValueError("Mã số thuế phải 10 hoặc 13 chữ số")
        return v

class PartnerOutBody(BaseModel):
    id: int
    code: str | None
    name: str
    partner_type: str
    phone: str | None
    tax_code: str | None
    address: str | None
    contact_person: str | None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


def partner_to_out(p) -> PartnerOutBody:
    """Domain Partner -> wire shape."""
    return PartnerOutBody(
        id=int(p.id),
        code=p.code,
        name=p.name,
        partner_type=p.partner_type,
        phone=p.phone,
        tax_code=p.tax_code,
        address=p.address,
        contact_person=p.contact_person,
        is_active=p.is_active,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


# -- Location --------------------------------------------------------


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


# -- Pricing ---------------------------------------------------------


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
