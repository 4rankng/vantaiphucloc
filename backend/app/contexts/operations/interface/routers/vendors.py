"""Vendor CRUD endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.database import get_db
from app.models.base import User
from app.models.domain import Vendor

router = APIRouter(tags=["vendors"])


class VendorCreateBody(BaseModel):
    name: str
    code: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None
    type: str | None = None


class VendorUpdateBody(BaseModel):
    name: str | None = None
    code: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None
    type: str | None = None


class VendorOut(BaseModel):
    id: int
    code: str | None
    name: str
    phone: str | None
    tax_code: str | None
    address: str | None
    contact_person: str | None
    is_active: bool
    type: str | None = None

    class Config:
        from_attributes = True


class PaginatedVendorOut(BaseModel):
    items: list[VendorOut]
    total: int


@router.get("/vendors", response_model=PaginatedVendorOut)
async def list_vendors(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    total = (await db.execute(
        select(Vendor).where(Vendor.is_active == True)  # noqa: E712
    )).scalars().all()
    return PaginatedVendorOut(items=total, total=len(total))


@router.get("/vendors/{vendor_id}", response_model=VendorOut)
async def get_vendor(
    vendor_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    vendor = (await db.execute(
        select(Vendor).where(Vendor.id == vendor_id)
    )).scalar_one_or_none()
    if vendor is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà thầu.")
    return vendor


@router.post("/vendors", response_model=VendorOut, status_code=201)
async def create_vendor(
    body: VendorCreateBody,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    vendor = Vendor(
        name=body.name,
        code=body.code,
        phone=body.phone,
        tax_code=body.tax_code,
        address=body.address,
        contact_person=body.contact_person,
        is_active=True,
    )
    db.add(vendor)
    await db.flush()
    await db.refresh(vendor)
    await db.commit()
    return vendor


@router.put("/vendors/{vendor_id}", response_model=VendorOut)
async def update_vendor(
    vendor_id: int,
    body: VendorUpdateBody,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    vendor = (await db.execute(
        select(Vendor).where(Vendor.id == vendor_id)
    )).scalar_one_or_none()
    if vendor is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà thầu.")
    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "type":
            continue
        setattr(vendor, field, value)
    await db.flush()
    await db.refresh(vendor)
    await db.commit()
    return vendor


@router.delete("/vendors/{vendor_id}", status_code=204)
async def delete_vendor(
    vendor_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    vendor = (await db.execute(
        select(Vendor).where(Vendor.id == vendor_id)
    )).scalar_one_or_none()
    if vendor is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà thầu.")
    vendor.is_active = False
    await db.commit()
