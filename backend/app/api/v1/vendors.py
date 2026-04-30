import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.base import User
from app.models.domain import Vendor, WorkOrder, TripOrder
from app.schemas.base import PaginatedResponse
from app.schemas.domain import VendorCreate, VendorUpdate, VendorOut
from app.core.deps import require_roles

router = APIRouter()


@router.get("/vendors", response_model=PaginatedResponse[VendorOut])
async def list_vendors(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    total_q = await db.execute(select(func.count(Vendor.id)))
    total = total_q.scalar() or 0

    result = await db.execute(
        select(Vendor)
        .order_by(Vendor.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    data = result.scalars().all()

    return PaginatedResponse[VendorOut](
        items=[VendorOut.model_validate(v) for v in data],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/vendors", response_model=VendorOut, status_code=201)
async def create_vendor(
    body: VendorCreate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Vendor).where(Vendor.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Vendor already exists")

    vendor = Vendor(name=body.name)
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    return vendor


@router.put("/vendors/{vendor_id}", response_model=VendorOut)
async def update_vendor(
    vendor_id: int,
    body: VendorUpdate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")

    if body.name is not None:
        existing = await db.execute(
            select(Vendor).where(Vendor.name == body.name, Vendor.id != vendor_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Vendor name already exists")
        vendor.name = body.name

    await db.commit()
    await db.refresh(vendor)
    return vendor


@router.delete("/vendors/{vendor_id}", status_code=204)
async def delete_vendor(
    vendor_id: int,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Guard: check for drivers associated with this vendor
    drivers_with_vendor = await db.execute(
        select(User).where(User.vendor == vendor.name).limit(1)
    )
    if drivers_with_vendor.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Cannot delete vendor with associated drivers",
        )

    await db.delete(vendor)
    await db.commit()
