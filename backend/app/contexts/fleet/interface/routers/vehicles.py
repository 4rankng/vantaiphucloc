"""HTTP router for /vehicles endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_permission
from app.database import get_db
from app.models.base import User
from app.models.domain import Vehicle
from app.schemas.domain import VehicleOut

router = APIRouter()


class VehicleCreateIn(BaseModel):
    plate: str = Field(..., min_length=4, max_length=20)
    vehicle_type: str | None = None
    vendor_id: int | None = None


class VehicleUpdateIn(BaseModel):
    vehicle_type: str | None = None
    is_active: bool | None = None


@router.get("/vehicles", response_model=list[VehicleOut])
async def list_vehicles(
    active_only: bool = Query(True),
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Vehicle)
    if active_only:
        q = q.where(Vehicle.is_active == True)  # noqa: E712
    q = q.order_by(Vehicle.plate)
    rows = (await db.execute(q)).scalars().all()
    return rows


@router.post("/vehicles", response_model=VehicleOut, status_code=201)
async def create_vehicle(
    body: VehicleCreateIn,
    _current_user: User = Depends(require_permission("create", "Vehicle")),
    db: AsyncSession = Depends(get_db),
):
    plate = body.plate.strip().upper()
    existing = (await db.execute(
        select(Vehicle).where(Vehicle.plate == plate)
    )).scalar_one_or_none()
    if existing:
        if body.vehicle_type and not existing.vehicle_type:
            existing.vehicle_type = body.vehicle_type
            await db.flush()
            await db.refresh(existing)
        return existing
    vehicle = Vehicle(
        plate=plate,
        is_active=True,
        vehicle_type=body.vehicle_type,
        vendor_id=body.vendor_id,
    )
    db.add(vehicle)
    await db.flush()
    await db.refresh(vehicle)
    return vehicle


@router.patch("/vehicles/{vehicle_id}", response_model=VehicleOut)
async def update_vehicle(
    vehicle_id: int,
    body: VehicleUpdateIn,
    _current_user: User = Depends(require_permission("create", "Vehicle")),
    db: AsyncSession = Depends(get_db),
):
    vehicle = (await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id)
    )).scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if body.vehicle_type is not None:
        vehicle.vehicle_type = body.vehicle_type
    if body.is_active is not None:
        vehicle.is_active = body.is_active
    await db.flush()
    await db.refresh(vehicle)
    return vehicle
