import math

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from redis.asyncio import Redis
from sqlalchemy import text

from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.schemas.domain import LocationCreate, LocationUpdate, LocationOut
from app.core.deps import require_permission
from app.core.redis import get_redis
from app.core.cache import CacheManager
from app.config import settings
from app.repositories.location_repo import LocationRepository
from app.repositories.deps import get_location_repo

router = APIRouter()


@router.get("/locations", response_model=PaginatedResponse[LocationOut])
async def list_locations(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read", "Location")),
    repo: LocationRepository = Depends(get_location_repo),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_key = f"list:{page}:{page_size}"
    cached = await cache.get_json("locations", cache_key)
    if cached is not None:
        return PaginatedResponse(**cached)

    data, total = await repo.paginate(
        page, page_size, active_only=True, order_by=repo.model.name.asc()
    )

    response = PaginatedResponse[LocationOut](
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
    repo: LocationRepository = Depends(get_location_repo),
):
    data = await repo.list_active(order_by=repo.model.name.asc(), limit=10000)
    return [LocationOut.model_validate(loc) for loc in data]


@router.post("/locations", response_model=LocationOut, status_code=201)
async def create_location(
    body: LocationCreate,
    current_user: User = Depends(require_permission("update", "Location")),
    repo: LocationRepository = Depends(get_location_repo),
    redis: Redis = Depends(get_redis),
):
    if await repo.find_by_name(body.name):
        raise HTTPException(status_code=409, detail="Location already exists")

    location = await repo.create(name=body.name)
    await repo.session.commit()
    await repo.session.refresh(location)
    await CacheManager(redis).invalidate_namespace("locations")
    return location


@router.put("/locations/{location_id}", response_model=LocationOut)
async def update_location(
    location_id: int,
    body: LocationUpdate,
    current_user: User = Depends(require_permission("update", "Location")),
    repo: LocationRepository = Depends(get_location_repo),
    redis: Redis = Depends(get_redis),
):
    location = await repo.get_by_id_or_404(location_id)
    await repo.update(location, **body.model_dump(exclude_unset=True))
    await repo.session.commit()
    await repo.session.refresh(location)
    await CacheManager(redis).invalidate_namespace("locations")
    return location


@router.delete("/locations/{location_id}", status_code=204)
async def delete_location(
    location_id: int,
    current_user: User = Depends(require_permission("update", "Location")),
    repo: LocationRepository = Depends(get_location_repo),
    redis: Redis = Depends(get_redis),
):
    location = await repo.get_by_id_or_404(location_id)

    # Guard: check for FK references
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
        r = await repo.session.execute(
            text(f"SELECT 1 FROM {table} WHERE {col} = :lid LIMIT 1"),
            {"lid": location_id},
        )
        if r.scalar():
            raise HTTPException(
                status_code=409,
                detail=f"Cannot delete: location is referenced in {table}.{col}",
            )

    await repo.soft_delete(location)
    await repo.session.commit()
    await CacheManager(redis).invalidate_namespace("locations")
    return Response()
