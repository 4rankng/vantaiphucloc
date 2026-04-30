from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.models.domain import Vendor
from app.schemas.domain import VendorCreate, VendorUpdate, VendorOut
from app.core.deps import require_roles

router = APIRouter()


@router.get("/vendors", response_model=list[VendorOut])
async def list_vendors(
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vendor).order_by(Vendor.id.asc()))
    return result.scalars().all()


@router.post("/vendors", response_model=VendorOut, status_code=201)
async def create_vendor(
    body: VendorCreate,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
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
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
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
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")

    await db.delete(vendor)
    await db.commit()
