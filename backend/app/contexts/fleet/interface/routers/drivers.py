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
from app.models.domain import Vehicle
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

    # Load vehicle plates for these drivers
    driver_ids = [d.id for d in result.items]
    plate_map: dict[int, str | None] = {}
    if driver_ids:
        rows = (await db.execute(
            select(Vehicle.driver_id, Vehicle.plate)
            .where(Vehicle.driver_id.in_(driver_ids), Vehicle.is_active == True)  # noqa: E712
        )).all()
        for r in rows:
            plate_map[r[0]] = r[1]

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
