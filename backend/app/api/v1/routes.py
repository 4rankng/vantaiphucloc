from fastapi import APIRouter, Depends, HTTPException, Response
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.models.domain import Route
from app.schemas.domain import RouteCreate, RouteUpdate, RouteOut
from app.core.deps import require_roles
from app.core.redis import get_redis
from app.core.cache import CacheManager
from app.config import settings

router = APIRouter()


@router.get("/routes", response_model=list[RouteOut])
async def list_routes(
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cached = await cache.get_json("routes", "list")
    if cached is not None:
        return [RouteOut(**r) for r in cached]

    result = await db.execute(
        select(Route).order_by(Route.route.asc())
    )
    data = result.scalars().all()
    serialized = [RouteOut.model_validate(r).model_dump(mode="json") for r in data]
    await cache.set_json("routes", "list", serialized, ttl=settings.CACHE_ROUTES_TTL)
    return data


@router.post("/routes", response_model=RouteOut, status_code=201)
async def create_route(
    body: RouteCreate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
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
    current_user: User = Depends(require_roles("accountant", "superadmin")),
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
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    result = await db.execute(
        select(Route).where(Route.id == route_id)
    )
    route = result.scalar_one_or_none()
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")

    await db.delete(route)
    await db.commit()
    await CacheManager(redis).invalidate_namespace("routes")
    return Response()
