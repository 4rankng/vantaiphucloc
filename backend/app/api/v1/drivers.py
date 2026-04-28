from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.schemas.domain import DriverCreate, DriverOut
from app.core.deps import get_current_user, require_roles
from app.core.security import hash_password
from app.core.redis import get_redis
from app.core.cache import CacheManager
from app.config import settings

PHUC_LOC = "Phúc Lộc"

router = APIRouter()


@router.get("/drivers", response_model=list[DriverOut])
async def list_drivers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cached = await cache.get_json("drivers", "list")
    if cached is not None:
        return [DriverOut(**d) for d in cached]

    result = await db.execute(
        select(User).where(
            User.role == "driver",
        ).order_by(User.username.asc())
    )
    drivers = result.scalars().all()
    data = [
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
    serialized = [d.model_dump(mode="json") for d in data]
    await cache.set_json("drivers", "list", serialized, ttl=settings.CACHE_DRIVERS_TTL)
    return data


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
