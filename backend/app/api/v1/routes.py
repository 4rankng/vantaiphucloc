import math

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.base import User
from app.models.domain import Route
from app.schemas.base import PaginatedResponse
from app.schemas.domain import RouteCreate, RouteUpdate, RouteOut
from app.core.deps import require_roles
from app.core.redis import get_redis
from app.core.cache import CacheManager
from app.config import settings

router = APIRouter()


@router.get("/routes", response_model=PaginatedResponse[RouteOut])
async def list_routes(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_roles("accountant", "director", "driver", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_key = f"list:{page}:{page_size}"
    cached = await cache.get_json("routes", cache_key)
    if cached is not None:
        return PaginatedResponse(**cached)

    total_q = await db.execute(select(func.count(Route.id)).where(Route.is_active == True))
    total = total_q.scalar() or 0

    result = await db.execute(
        select(Route)
        .where(Route.is_active == True)
        .order_by(Route.route.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    data = result.scalars().all()

    response = PaginatedResponse[RouteOut](
        items=[RouteOut.model_validate(r) for r in data],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
    serialized = response.model_dump(mode="json")
    await cache.set_json("routes", cache_key, serialized, ttl=settings.CACHE_ROUTES_TTL)
    return response


@router.post("/routes", response_model=RouteOut, status_code=201)
async def create_route(
    body: RouteCreate,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    route = Route(**body.model_dump())
    db.add(route)
    await db.commit()
    await db.refresh(route)
    await CacheManager(redis).invalidate_namespace("routes")
    return route


@router.put("/routes/{route_id}", response_model=RouteOut)
async def update_route(
    route_id: int,
    body: RouteUpdate,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    result = await db.execute(
        select(Route).where(Route.id == route_id)
    )
    route = result.scalar_one_or_none()
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(route, field, value)

    await db.commit()
    await db.refresh(route)
    await CacheManager(redis).invalidate_namespace("routes")
    return route


@router.delete("/routes/{route_id}", status_code=204)
async def delete_route(
    route_id: int,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    result = await db.execute(
        select(Route).where(Route.id == route_id)
    )
    route = result.scalar_one_or_none()
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")

    route.is_active = False
    await db.commit()
    await CacheManager(redis).invalidate_namespace("routes")
    return Response()
