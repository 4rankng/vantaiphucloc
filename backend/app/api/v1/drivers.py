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

router = APIRouter()


@router.get("/drivers", response_model=list[DriverOut])
async def list_drivers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cached = await cache.get_json("drivers", current_user.company_id, "list")
    if cached is not None:
        return [DriverOut(**d) for d in cached]

    result = await db.execute(
        select(User).where(
            User.company_id == current_user.company_id,
            User.role == "driver",
        ).order_by(User.username.asc())
    )
    data = result.scalars().all()
    serialized = [DriverOut.model_validate(d).model_dump(mode="json") for d in data]
    await cache.set_json("drivers", current_user.company_id, "list", serialized, ttl=settings.CACHE_DRIVERS_TTL)
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
        company_id=current_user.company_id,
        is_active=True,
        tractor_plate=body.tractor_plate,
    )
    db.add(driver)
    await db.commit()
    await db.refresh(driver)
    await CacheManager(redis).invalidate_namespace("drivers", current_user.company_id)

    return driver
