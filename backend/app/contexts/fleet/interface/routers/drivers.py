"""HTTP router for /drivers endpoints."""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from redis.asyncio import Redis
from sqlalchemy import select, update
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
from app.contexts.identity.interface.dependencies import get_password_hasher
from app.contexts.fleet.interface.schemas import DriverCreateIn, DriverOut, DriverResetPasswordIn
from app.models.vehicle_helpers import (
    deactivate_existing_assignments,
    ensure_vehicle,
    resolve_driver_plate,
    resolve_driver_plates_batch,
)
from app.core.cache import CacheManager
from app.database import get_db
from app.core.deps import get_current_user, require_permission
from app.core.redis import get_redis
from app.models.base import User
from app.models.domain import DeliveredTrip, Vehicle, VehicleDriver
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


_VALID_DRIVER_SORT = {'username', 'full_name', 'phone'}


@router.get("/drivers", response_model=PaginatedResponse[DriverOut])
async def list_drivers(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    search: str | None = Query(None, description="Search by username, full name, phone"),
    sort_by: str | None = Query(None, description="Sort column: username | full_name | phone"),
    sort_order: str = Query('asc', pattern='^(asc|desc)$'),
    _current_user: User = Depends(get_current_user),
    use_case: ListDrivers = Depends(get_list_drivers),
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
):
    safe_sort_by = sort_by if sort_by in _VALID_DRIVER_SORT else None
    cache = CacheManager(redis)
    cache_key = f"list:{page}:{page_size}:{search}:{safe_sort_by}:{sort_order}"
    if not search:
        cached = await cache.get_json("drivers", cache_key)
        if cached is not None:
            return PaginatedResponse(**cached)

    result = await use_case(
        page=page,
        page_size=page_size,
        search=search,
        sort_by=safe_sort_by,
        sort_order=sort_order,
    )

    # Load vehicle plates for these drivers via VehicleDriver
    driver_ids = [d.id for d in result.items]
    plate_map = await resolve_driver_plates_batch(db, driver_ids)

    response = PaginatedResponse[DriverOut](
        items=[_to_out(d, plate_map.get(d.id)) for d in result.items],
        total=result.total,
        page=result.page,
        page_size=result.page_size,
        total_pages=math.ceil(result.total / result.page_size)
        if result.total > 0
        else 0,
    )
    if not search:
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
    db: AsyncSession = Depends(get_db),
):
    payload = CreateDriverInput(
        username=body.username,
        phone=(body.phone.strip() if body.phone else None) or None,
        full_name=body.full_name,
        password=body.password,
    )
    try:
        dto = await use_case(payload)
    except IntegrityError as e:
        await db.rollback()
        if "username" in str(e.orig):
            raise HTTPException(status_code=409, detail="Tên đăng nhập đã tồn tại")
        if "phone" in str(e.orig):
            raise HTTPException(status_code=409, detail="Số điện thoại đã tồn tại")
        raise HTTPException(status_code=409, detail="Thông tin bị trùng lặp")

    # Optionally assign vehicle plate in the same transaction
    assigned_plate: str | None = None
    if body.plate and body.plate.strip():
        from datetime import date as _date

        plate = body.plate.strip().upper()
        vehicle = await ensure_vehicle(db, plate)
        await deactivate_existing_assignments(db, dto.id)
        db.add(VehicleDriver(
            vehicle_id=vehicle.id,
            driver_id=dto.id,
            effective_from=_date.today(),
            is_active=True,
        ))
        assigned_plate = plate

    await CacheManager(redis).invalidate_namespace("drivers")
    return _to_out(dto, plate=assigned_plate)


# ── PUT /drivers/{id}/vehicle ─────────────────────────────────────────────────
# Set / update the biển số xe for a driver. Useful for accountant UI and for
# the seed script (`python -m app.seed_plates_for_all_drivers`).

from pydantic import BaseModel, Field


class DriverVehicleSetIn(BaseModel):
    plate: str = Field(..., min_length=4, max_length=20)


class DriverUpdateIn(BaseModel):
    username: str | None = None
    full_name: str | None = None
    phone: str | None = None


@router.put("/drivers/{driver_id}", response_model=DriverOut)
async def update_driver(
    driver_id: int,
    body: DriverUpdateIn,
    _current_user: User = Depends(require_permission("update", "Driver")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    user = (await db.execute(
        select(User).where(User.id == driver_id, User.role == "driver")
    )).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Driver not found")

    if body.username is not None:
        user.username = body.username
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.phone is not None:
        user.phone = body.phone

    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError as e:
        await db.rollback()
        if "username" in str(e.orig):
            raise HTTPException(status_code=409, detail="Tên đăng nhập đã tồn tại")
        if "phone" in str(e.orig):
            raise HTTPException(status_code=409, detail="Số điện thoại đã tồn tại")
        raise HTTPException(status_code=409, detail="Thông tin bị trùng lặp")

    plate_row = await resolve_driver_plate(db, driver_id)

    await CacheManager(redis).invalidate_namespace("drivers")
    return DriverOut(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        vehicle_plate=plate_row,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


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
    vehicle = await ensure_vehicle(db, plate)
    await deactivate_existing_assignments(db, driver_id)
    await db.execute(update(Vehicle).where(Vehicle.id == vehicle.id).values(driver_id=driver_id))
    db.add(VehicleDriver(
        vehicle_id=vehicle.id,
        driver_id=driver_id,
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


@router.put("/drivers/{driver_id}/reset-password")
async def reset_driver_password(
    driver_id: int,
    body: DriverResetPasswordIn,
    _current_user: User = Depends(require_permission("update", "Driver")),
    db: AsyncSession = Depends(get_db),
    hasher=Depends(get_password_hasher),
):
    from fastapi import HTTPException

    user = (await db.execute(
        select(User).where(User.id == driver_id, User.role == "driver")
    )).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Driver not found")

    user.hashed_password = hasher.hash(body.new_password)
    await db.commit()
    return {"message": "Password reset successfully"}


@router.delete("/drivers/{driver_id}", status_code=204)
async def delete_driver(
    driver_id: int,
    _current_user: User = Depends(require_permission("delete", "Driver")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    user = (await db.execute(
        select(User).where(User.id == driver_id, User.role == "driver")
    )).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Driver not found")
    # Null out FK references that don't cascade
    await db.execute(update(Vehicle).where(Vehicle.driver_id == driver_id).values(driver_id=None))
    await db.execute(update(DeliveredTrip).where(DeliveredTrip.driver_id == driver_id).values(driver_id=None))
    # Hard delete — VehicleDriver, DriverSalaryConfig, DriverSalary cascade via ondelete="CASCADE"
    try:
        await db.delete(user)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Cannot delete driver: associated data prevents deletion. Please ensure the driver has no active work orders, locations, or expenses created.")
    await CacheManager(redis).invalidate_namespace("drivers")
    return None
