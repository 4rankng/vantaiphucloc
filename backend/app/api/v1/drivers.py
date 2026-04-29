import math

from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.schemas.domain import DriverCreate, DriverOut
from app.core.deps import get_current_user, require_roles
from app.core.security import hash_password
from app.core.redis import get_redis
from app.core.cache import CacheManager
from app.config import settings

PHUC_LOC = "Phúc Lộc"

router = APIRouter()


@router.get("/drivers", response_model=PaginatedResponse[DriverOut])
async def list_drivers(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_key = f"list:{page}:{page_size}"
    cached = await cache.get_json("drivers", cache_key)
    if cached is not None:
        return PaginatedResponse(**cached)

    base_q = select(User).where(User.role == "driver")
    count_q = select(func.count(User.id)).where(User.role == "driver")

    total_q = await db.execute(count_q)
    total = total_q.scalar() or 0

    result = await db.execute(
        base_q.order_by(User.username.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    drivers = result.scalars().all()

    items = [
        DriverOut(
            id=d.id,
            username=d.username,
            phone=d.phone,
            tractor_plate=d.tractor_plate,
            vendor=d.vendor or PHUC_LOC,
            created_at=d.created_at,
            updated_at=d.updated_at,
        )
        for d in drivers
    ]

    response = PaginatedResponse[DriverOut](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
    serialized = response.model_dump(mode="json")
    await cache.set_json("drivers", cache_key, serialized, ttl=settings.CACHE_DRIVERS_TTL)
    return response


@router.post("/drivers", response_model=DriverOut, status_code=201)
async def create_driver(
    body: DriverCreate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    driver = User(
        phone=body.phone,
        username=body.username,
        hashed_password=hash_password(body.phone),
        role="driver",
        vendor=body.vendor or PHUC_LOC,
        is_active=True,
        tractor_plate=body.tractor_plate,
    )
    db.add(driver)
    await db.commit()
    await db.refresh(driver)
    await CacheManager(redis).invalidate_namespace("drivers")

    return DriverOut(
        id=driver.id,
        username=driver.username,
        phone=driver.phone,
        tractor_plate=driver.tractor_plate,
        vendor=driver.vendor or PHUC_LOC,
        created_at=driver.created_at,
        updated_at=driver.updated_at,
    )
