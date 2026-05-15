"""HTTP router for /drivers endpoints."""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.contexts.fleet.application import (
    CreateDriver,
    CreateDriverInput,
    ListDrivers,
)
from app.contexts.fleet.application.dto import DriverDTO
from app.contexts.fleet.interface.dependencies import (
    get_create_driver,
    get_list_drivers,
)
from app.contexts.fleet.interface.schemas import DriverCreateIn, DriverOut
from app.core.cache import CacheManager
from app.database import get_db
from app.core.deps import get_current_user, require_permission
from app.core.redis import get_redis
from app.models.base import User
from app.models.domain import Vehicle, VehicleDriver
from app.schemas.base import PaginatedResponse

router = APIRouter()


def _to_out(d: DriverDTO, plate: str | None = None) -> DriverOut:
    return DriverOut(
        id=d.id,
        username=d.username,
        full_name=d.full_name,
        phone=d.phone,
        vehicle_plate=plate,
        created_at=d.created_at,
        updated_at=d.updated_at,
    )


@router.get("/drivers", response_model=PaginatedResponse[DriverOut])
async def list_drivers(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _current_user: User = Depends(get_current_user),
    use_case: ListDrivers = Depends(get_list_drivers),
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
):
    cache = CacheManager(redis)
    cache_key = f"list:{page}:{page_size}"
    cached = await cache.get_json("drivers", cache_key)
    if cached is not None:
        return PaginatedResponse(**cached)

    result = await use_case(page=page, page_size=page_size)

    # Load vehicle plates for these drivers via VehicleDriver
    driver_ids = [d.id for d in result.items]
    plate_map: dict[int, str | None] = {}
    if driver_ids:
        vd_rows = (await db.execute(
            select(VehicleDriver.driver_id, Vehicle.plate)
            .join(Vehicle, Vehicle.id == VehicleDriver.vehicle_id)
            .where(
                VehicleDriver.driver_id.in_(driver_ids),
                VehicleDriver.is_active == True,  # noqa: E712
                VehicleDriver.role == "PRIMARY",
                Vehicle.is_active == True,  # noqa: E712
            )
        )).all()
        for did, plate in vd_rows:
            plate_map[did] = plate

    response = PaginatedResponse[DriverOut](
        items=[_to_out(d, plate_map.get(d.id)) for d in result.items],
        total=result.total,
        page=result.page,
        page_size=result.page_size,
        total_pages=math.ceil(result.total / result.page_size)
        if result.total > 0
        else 0,
    )
    await cache.set_json(
        "drivers",
        cache_key,
        response.model_dump(mode="json"),
        ttl=settings.CACHE_DRIVERS_TTL,
    )
    return response


@router.post("/drivers", response_model=DriverOut, status_code=201)
async def create_driver(
    body: DriverCreateIn,
    _current_user: User = Depends(require_permission("create", "Driver")),
    use_case: CreateDriver = Depends(get_create_driver),
    redis: Redis = Depends(get_redis),
):
    if body.phone is None:
        # Pre-DDD constraint: drivers' default password = phone, so phone is required.
        from fastapi import HTTPException

        raise HTTPException(status_code=400, detail="phone is required")
    payload = CreateDriverInput(
        username=body.username,
        phone=body.phone,
        full_name=body.full_name,
    )
    dto = await use_case(payload)
    await CacheManager(redis).invalidate_namespace("drivers")
    return _to_out(dto)


# ── PUT /drivers/{id}/vehicle ─────────────────────────────────────────────────
# Set / update the biển số xe for a driver. Useful for accountant UI and for
# the seed script (`python -m app.seed_plates_for_all_drivers`).

from pydantic import BaseModel, Field


class DriverVehicleSetIn(BaseModel):
    plate: str = Field(..., min_length=4, max_length=20)


@router.put("/drivers/{driver_id}/vehicle", response_model=DriverOut)
async def set_driver_vehicle(
    driver_id: int,
    body: DriverVehicleSetIn,
    _current_user: User = Depends(require_permission("update", "Driver")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Assign or update the biển số xe for a driver.

    Finds or creates the Vehicle by plate, then upserts a PRIMARY
    VehicleDriver record for the driver.
    """
    from datetime import date as _date

    from fastapi import HTTPException

    user = (await db.execute(
        select(User).where(User.id == driver_id, User.role == "driver")
    )).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Driver not found")

    plate = body.plate.strip().upper()

    # Find or create the vehicle
    vehicle = (await db.execute(
        select(Vehicle).where(Vehicle.plate == plate, Vehicle.is_active == True)  # noqa: E712
    )).scalar_one_or_none()
    if vehicle is None:
        vehicle = Vehicle(plate=plate, is_active=True)
        db.add(vehicle)
        await db.flush()

    # Deactivate any existing active PRIMARY assignment for this driver
    existing_vd = (await db.execute(
        select(VehicleDriver).where(
            VehicleDriver.driver_id == driver_id,
            VehicleDriver.is_active == True,  # noqa: E712
            VehicleDriver.role == "PRIMARY",
        )
    )).scalars().all()
    for vd in existing_vd:
        vd.is_active = False
        vd.effective_to = _date.today()

    # Create new PRIMARY assignment
    db.add(VehicleDriver(
        vehicle_id=vehicle.id,
        driver_id=driver_id,
        role="PRIMARY",
        effective_from=_date.today(),
        is_active=True,
    ))
    await db.commit()

    await CacheManager(redis).invalidate_namespace("drivers")
    return DriverOut(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        vehicle_plate=plate,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )
