"""HTTP router for /vehicles endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
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
    vendor_id: int | None = None


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
        return existing
    vehicle = Vehicle(plate=plate, is_active=True, vendor_id=body.vendor_id)
    db.add(vehicle)
    await db.flush()
    await db.refresh(vehicle)
    return vehicle
