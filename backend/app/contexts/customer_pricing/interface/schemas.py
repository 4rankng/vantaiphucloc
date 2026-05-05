"""Pydantic schemas for the Customer & Pricing interface layer.

For now, these re-export the legacy `app.schemas.domain` shapes that
were already wire-compatible with the existing frontend. As the
application layer grows, schemas may diverge to stay focused on the
context's vocabulary.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
