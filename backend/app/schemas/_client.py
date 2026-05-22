from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

__all__ = [
    "ClientCreate",
    "ClientUpdate",
    "ClientSummaryOut",
    "ClientOut",
    "PartnerCreate",
    "PartnerUpdate",
    "PartnerOut",
]


class ClientCreate(BaseModel):
    name: str
    code: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class ClientSummaryOut(BaseModel):
    id: int
    code: str | None = None
    name: str

    model_config = ConfigDict(from_attributes=True)


class ClientOut(BaseModel):
    id: int
    code: str | None
    name: str
    phone: str | None
    tax_code: str | None
    address: str | None
    contact_person: str | None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Backward-compat aliases
PartnerCreate = ClientCreate
PartnerUpdate = ClientUpdate
PartnerOut = ClientOut
