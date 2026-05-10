"""HTTP router for /drivers endpoints."""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis

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
from app.core.deps import get_current_user, require_permission
from app.core.redis import get_redis
from app.models.base import User
from app.schemas.base import PaginatedResponse

router = APIRouter()


def _to_out(d: DriverDTO) -> DriverOut:
    return DriverOut(
        id=d.id,
        username=d.username,
        full_name=d.full_name,
        phone=d.phone,
        tractor_plate=d.tractor_plate,
        vendor=d.vendor,
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
):
    cache = CacheManager(redis)
    cache_key = f"list:{page}:{page_size}"
    cached = await cache.get_json("drivers", cache_key)
    if cached is not None:
        return PaginatedResponse(**cached)

    result = await use_case(page=page, page_size=page_size)
    response = PaginatedResponse[DriverOut](
        items=[_to_out(d) for d in result.items],
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
        vendor=body.vendor,
        tractor_plate=body.tractor_plate,
    )
    dto = await use_case(payload)
    await CacheManager(redis).invalidate_namespace("drivers")
    return _to_out(dto)
