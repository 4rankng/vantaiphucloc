import math

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from redis.asyncio import Redis
from sqlalchemy import select

from app.models.base import User
from app.models.domain import Route, Location
from app.schemas.base import PaginatedResponse
from app.schemas.domain import RouteCreate, RouteUpdate, RouteOut
from app.core.deps import require_permission
from app.core.redis import get_redis
from app.core.cache import CacheManager
from app.config import settings
from app.repositories.route_repo import RouteRepository
from app.repositories.deps import get_route_repo

router = APIRouter()


async def _resolve_location_fk(session, route: Route) -> None:
    """Resolve pickup/dropoff location strings to FK IDs."""
    if route.pickup_location:
        loc_result = await session.execute(
            select(Location).where(Location.name == route.pickup_location, Location.is_active == True)  # noqa: E712
        )
        loc = loc_result.scalar_one_or_none()
        if loc:
            route.pickup_location_id = loc.id
    if route.dropoff_location:
        loc_result = await session.execute(
            select(Location).where(Location.name == route.dropoff_location, Location.is_active == True)  # noqa: E712
        )
        loc = loc_result.scalar_one_or_none()
        if loc:
            route.dropoff_location_id = loc.id


@router.get("/routes", response_model=PaginatedResponse[RouteOut])
async def list_routes(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read", "Route")),
    repo: RouteRepository = Depends(get_route_repo),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_key = f"list:{page}:{page_size}"
    cached = await cache.get_json("routes", cache_key)
    if cached is not None:
        return PaginatedResponse(**cached)

    data, total = await repo.paginate(
        page, page_size, active_only=True, order_by=repo.model.route.asc()
    )

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
    current_user: User = Depends(require_permission("update", "Route")),
    repo: RouteRepository = Depends(get_route_repo),
    redis: Redis = Depends(get_redis),
):
    route = await repo.create(**body.model_dump())
    await _resolve_location_fk(repo.session, route)
    await repo.session.commit()
    await repo.session.refresh(route)
    await CacheManager(redis).invalidate_namespace("routes")
    return route


@router.put("/routes/{route_id}", response_model=RouteOut)
async def update_route(
    route_id: int,
    body: RouteUpdate,
    current_user: User = Depends(require_permission("update", "Route")),
    repo: RouteRepository = Depends(get_route_repo),
    redis: Redis = Depends(get_redis),
):
    route = await repo.get_by_id_or_404(route_id)
    await repo.update(route, **body.model_dump(exclude_unset=True))
    await _resolve_location_fk(repo.session, route)
    await repo.session.commit()
    await repo.session.refresh(route)
    await CacheManager(redis).invalidate_namespace("routes")
    return route


@router.delete("/routes/{route_id}", status_code=204)
async def delete_route(
    route_id: int,
    current_user: User = Depends(require_permission("update", "Route")),
    repo: RouteRepository = Depends(get_route_repo),
    redis: Redis = Depends(get_redis),
):
    route = await repo.get_by_id_or_404(route_id)
    await repo.soft_delete(route)
    await repo.session.commit()
    await CacheManager(redis).invalidate_namespace("routes")
    return Response()
