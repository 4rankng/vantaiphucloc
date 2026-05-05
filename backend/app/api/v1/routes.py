import math

from fastapi import APIRouter, Depends, Query, Response
from redis.asyncio import Redis
from sqlalchemy import select

from app.models.base import User
from app.models.domain import Route
from app.schemas.base import PaginatedResponse
from app.schemas.domain import RouteCreate, RouteUpdate, RouteOut
from app.core.deps import require_permission
from app.core.redis import get_redis
from app.core.cache import CacheManager
from app.config import settings
from app.repositories.route_repo import RouteRepository
from app.repositories.deps import get_route_repo
from app.services.summary_loader import (
    load_location_summaries,
    get_location_summary,
)

router = APIRouter()


async def _to_out(repo: RouteRepository, routes: list[Route]) -> list[RouteOut]:
    if not routes:
        return []
    locations = await load_location_summaries(
        repo.session,
        {r.pickup_location_id for r in routes} | {r.dropoff_location_id for r in routes},
    )
    return [
        RouteOut(
            id=r.id,
            route=r.route,
            pickup_location=get_location_summary(locations, r.pickup_location_id),
            dropoff_location=get_location_summary(locations, r.dropoff_location_id),
            is_active=r.is_active,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in routes
    ]


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

    items = await _to_out(repo, list(data))
    response = PaginatedResponse[RouteOut](
        items=items,
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
    await repo.session.commit()
    await repo.session.refresh(route)
    await CacheManager(redis).invalidate_namespace("routes")
    return (await _to_out(repo, [route]))[0]


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
    await repo.session.commit()
    await repo.session.refresh(route)
    await CacheManager(redis).invalidate_namespace("routes")
    return (await _to_out(repo, [route]))[0]


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
