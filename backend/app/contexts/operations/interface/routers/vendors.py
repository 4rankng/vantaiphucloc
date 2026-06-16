"""Vendor CRUD endpoints."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.database import get_db
from app.models.base import User
from app.models.domain import Vendor

router = APIRouter(tags=["vendors"])


VendorType = Literal["company", "individual"]


class VendorCreateBody(BaseModel):
    name: str
    code: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None
    type: VendorType | None = None


class VendorUpdateBody(BaseModel):
    name: str | None = None
    code: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None
    type: VendorType | None = None


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
    page: int = 1
    page_size: int = 100
    total_pages: int = 1


_VALID_VENDOR_SORT = {'name', 'code', 'created_at'}


@router.get("/vendors", response_model=PaginatedVendorOut)
async def list_vendors(
    search: str | None = Query(None, description="Search by name, code, phone, tax code, address, contact person"),
    sort_by: str | None = Query(None, description="Sort column: name | code | created_at"),
    sort_order: str = Query('asc', pattern='^(asc|desc)$'),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    from sqlalchemy import func, or_
    q = select(Vendor).where(Vendor.is_active == True)  # noqa: E712
    if search:
        from app.core.vi_search import vi_ilike
        q = q.where(or_(
            vi_ilike(Vendor.name, search),
            vi_ilike(Vendor.code, search),
            vi_ilike(Vendor.phone, search),
            vi_ilike(Vendor.tax_code, search),
            vi_ilike(Vendor.address, search),
            vi_ilike(Vendor.contact_person, search),
        ))
    count_q = select(func.count()).select_from(q.subquery())
    total_count = (await db.execute(count_q)).scalar() or 0
    safe_sort_by = sort_by if sort_by in _VALID_VENDOR_SORT else None
    _SORTABLE = {'name': Vendor.name, 'code': Vendor.code, 'created_at': Vendor.id}
    sort_col = _SORTABLE.get(safe_sort_by or '')
    if sort_col is not None:
        order_expr = sort_col.asc() if sort_order == 'asc' else sort_col.desc()
        q = q.order_by(order_expr, Vendor.id.asc())
    else:
        q = q.order_by(Vendor.name.asc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    import math
    items = (await db.execute(q)).scalars().all()
    return PaginatedVendorOut(
        items=list(items),
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total_count / page_size) if total_count > 0 else 0,
    )


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
        type=body.type or "individual",
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
