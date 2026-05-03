from fastapi import APIRouter, Depends, HTTPException, Query, Response
from redis.asyncio import Redis
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.base import User
from app.models.domain import Location
from app.schemas.base import PaginatedResponse
from app.schemas.domain import LocationCreate, LocationUpdate, LocationOut
from app.core.deps import require_permission
from app.core.redis import get_redis
from app.core.cache import CacheManager
from app.config import settings

router = APIRouter()


@router.get("/locations", response_model=PaginatedResponse[LocationOut])
async def list_locations(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read", "Location")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_key = f"list:{page}:{page_size}"
    cached = await cache.get_json("locations", cache_key)
    if cached is not None:
        return PaginatedResponse(**cached)

    total_q = await db.execute(select(func.count(Location.id)).where(Location.is_active == True))
    total = total_q.scalar() or 0

    result = await db.execute(
        select(Location)
        .where(Location.is_active == True)
        .order_by(Location.name.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    data = result.scalars().all()

    import math
    from app.schemas.base import PaginatedResponse as PR
    response = PR[LocationOut](
        items=[LocationOut.model_validate(loc) for loc in data],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
    serialized = response.model_dump(mode="json")
    await cache.set_json("locations", cache_key, serialized, ttl=settings.CACHE_LOCATIONS_TTL)
    return response


@router.get("/locations/all", response_model=list[LocationOut])
async def list_all_locations(
    current_user: User = Depends(require_permission("read", "Location")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Location)
        .where(Location.is_active == True)
        .order_by(Location.name.asc())
    )
    data = result.scalars().all()
    return [LocationOut.model_validate(loc) for loc in data]


@router.post("/locations", response_model=LocationOut, status_code=201)
async def create_location(
    body: LocationCreate,
    current_user: User = Depends(require_permission("update", "Location")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    existing = await db.execute(
        select(Location).where(Location.name == body.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Location already exists")

    location = Location(name=body.name)
    db.add(location)
    await db.commit()
    await db.refresh(location)
    await CacheManager(redis).invalidate_namespace("locations")
    return location


@router.put("/locations/{location_id}", response_model=LocationOut)
async def update_location(
    location_id: int,
    body: LocationUpdate,
    current_user: User = Depends(require_permission("update", "Location")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    result = await db.execute(
        select(Location).where(Location.id == location_id)
    )
    location = result.scalar_one_or_none()
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(location, field, value)

    await db.commit()
    await db.refresh(location)
    await CacheManager(redis).invalidate_namespace("locations")
    return location


@router.delete("/locations/{location_id}", status_code=204)
async def delete_location(
    location_id: int,
    current_user: User = Depends(require_permission("update", "Location")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    result = await db.execute(
        select(Location).where(Location.id == location_id)
    )
    location = result.scalar_one_or_none()
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")

    # Guard: check for FK references
    from sqlalchemy import text
    tables_cols = [
        ("routes", "pickup_location_id"),
        ("routes", "dropoff_location_id"),
        ("work_orders", "pickup_location_id"),
        ("work_orders", "dropoff_location_id"),
        ("trip_orders", "pickup_location_id"),
        ("trip_orders", "dropoff_location_id"),
        ("pricings", "pickup_location_id"),
        ("pricings", "dropoff_location_id"),
    ]
    for table, col in tables_cols:
        r = await db.execute(
            text(f"SELECT 1 FROM {table} WHERE {col} = :lid LIMIT 1"),
            {"lid": location_id},
        )
        if r.scalar():
            raise HTTPException(
                status_code=409,
                detail=f"Cannot delete: location is referenced in {table}.{col}",
            )

    location.is_active = False
    await db.commit()
    await CacheManager(redis).invalidate_namespace("locations")
    return Response()
