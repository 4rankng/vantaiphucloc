"""Vehicle-driver assignment endpoints.

Used for plate lookups in P&L and salary reports.
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_permission
from app.database import get_db
from app.models.base import User
from app.models.domain import Vehicle, VehicleDriver
from app.schemas.domain import VehicleDriverCreate, VehicleDriverOut

router = APIRouter(prefix="/vehicle-drivers", tags=["vehicle-drivers"])


async def _enrich(db: AsyncSession, vd: VehicleDriver) -> VehicleDriverOut:
    plate = None
    driver_name = None
    v = (await db.execute(select(Vehicle).where(Vehicle.id == vd.vehicle_id))).scalar_one_or_none()
    if v:
        plate = v.plate
    u = (await db.execute(select(User).where(User.id == vd.driver_id))).scalar_one_or_none()
    if u:
        driver_name = u.full_name or u.username
    return VehicleDriverOut(
        id=int(vd.id),  # type: ignore[arg-type]
        vehicle_id=vd.vehicle_id,
        vehicle_plate=plate,
        driver_id=vd.driver_id,
        driver_name=driver_name,
        effective_from=vd.effective_from,
        effective_to=vd.effective_to,
        is_active=vd.is_active,
    )


@router.get("", response_model=list[VehicleDriverOut])
async def list_vehicle_drivers(
    vehicle_id: int | None = Query(None),
    driver_id: int | None = Query(None),
    active_only: bool = Query(True),
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(VehicleDriver)
    if vehicle_id is not None:
        q = q.where(VehicleDriver.vehicle_id == vehicle_id)
    if driver_id is not None:
        q = q.where(VehicleDriver.driver_id == driver_id)
    if active_only:
        q = q.where(VehicleDriver.is_active == True)  # noqa: E712
    q = q.order_by(VehicleDriver.effective_from.desc())
    rows = (await db.execute(q)).scalars().all()
    return [await _enrich(db, r) for r in rows]


@router.post("", response_model=VehicleDriverOut, status_code=201)
async def create_vehicle_driver(
    body: VehicleDriverCreate,
    _current_user: User = Depends(require_permission("update", "Driver")),
    db: AsyncSession = Depends(get_db),
):
    v = (await db.execute(select(Vehicle).where(Vehicle.id == body.vehicle_id))).scalar_one_or_none()
    if v is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    u = (await db.execute(select(User).where(User.id == body.driver_id, User.role == "driver"))).scalar_one_or_none()
    if u is None:
        raise HTTPException(status_code=404, detail="Driver not found")

    vd = VehicleDriver(
        vehicle_id=body.vehicle_id,
        driver_id=body.driver_id,
        effective_from=body.effective_from,
        effective_to=body.effective_to,
        is_active=True,
    )
    db.add(vd)
    await db.commit()
    await db.refresh(vd)
    return await _enrich(db, vd)


@router.delete("/{vehicle_driver_id}", status_code=204)
async def deactivate_vehicle_driver(
    vehicle_driver_id: int,
    _current_user: User = Depends(require_permission("update", "Driver")),
    db: AsyncSession = Depends(get_db),
):
    vd = (await db.execute(select(VehicleDriver).where(VehicleDriver.id == vehicle_driver_id))).scalar_one_or_none()
    if vd is None:
        raise HTTPException(status_code=404, detail="Vehicle-driver assignment not found")
    vd.is_active = False
    vd.effective_to = date.today()
    await db.execute(
        update(Vehicle).where(Vehicle.id == vd.vehicle_id, Vehicle.driver_id == vd.driver_id).values(driver_id=None)
    )
    await db.commit()
