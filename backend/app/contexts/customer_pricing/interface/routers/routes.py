"""Route HTTP endpoints."""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.contexts.customer_pricing.application import (
    CreateRoute,
    DeleteRoute,
    ListRoutes,
    UpdateRoute,
)
from app.contexts.customer_pricing.application.dto import (
    RouteCreateInput,
    RouteUpdateInput,
)
from app.contexts.customer_pricing.domain.entities import Route
from app.contexts.customer_pricing.domain.exceptions import NotFound
from app.contexts.customer_pricing.domain.value_objects import RouteId
from app.contexts.customer_pricing.interface.dependencies import (
    get_create_route,
    get_delete_route,
    get_list_routes,
    get_update_route,
)
from app.contexts.customer_pricing.interface.error_translation import translate
from app.contexts.customer_pricing.interface.schemas import (
    RouteCreate,
    RouteOut,
    RouteUpdate,
)
from app.core.cache import CacheManager
from app.core.deps import require_permission
from app.core.redis import get_redis
from app.database import get_db
from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.services.summary_loader import (
    get_location_summary,
    load_location_summaries,
)


router = APIRouter()


async def _to_out(db: AsyncSession, routes: list[Route]) -> list[RouteOut]:
    if not routes:
        return []
    locations = await load_location_summaries(
        db,
        {int(r.pickup_location_id) for r in routes}
        | {int(r.dropoff_location_id) for r in routes},
    )
    return [
        RouteOut(
            id=int(r.id),
            route=r.route,
            pickup_location=get_location_summary(locations, int(r.pickup_location_id)),
            dropoff_location=get_location_summary(locations, int(r.dropoff_location_id)),
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
    use_case: ListRoutes = Depends(get_list_routes),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_key = f"list:{page}:{page_size}"
    cached = await cache.get_json("routes", cache_key)
    if cached is not None:
        return PaginatedResponse(**cached)

    items, total = await use_case(page=page, page_size=page_size, active_only=True)
    out_items = await _to_out(db, items)
    response = PaginatedResponse[RouteOut](
        items=out_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
    serialized = response.model_dump(mode="json")
    await cache.set_json(
        "routes", cache_key, serialized, ttl=settings.CACHE_ROUTES_TTL
    )
    return response


@router.post("/routes", response_model=RouteOut, status_code=201)
async def create_route(
    body: RouteCreate,
    current_user: User = Depends(require_permission("update", "Route")),
    use_case: CreateRoute = Depends(get_create_route),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    try:
        r = await use_case(RouteCreateInput(
            route=body.route,
            pickup_location_id=body.pickup_location_id,
            dropoff_location_id=body.dropoff_location_id,
        ))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    await CacheManager(redis).invalidate_namespace("routes")
    return (await _to_out(db, [r]))[0]


@router.put("/routes/{route_id}", response_model=RouteOut)
async def update_route(
    route_id: int,
    body: RouteUpdate,
    current_user: User = Depends(require_permission("update", "Route")),
    use_case: UpdateRoute = Depends(get_update_route),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    try:
        r = await use_case(RouteId(route_id), RouteUpdateInput(
            route=body.route,
            pickup_location_id=body.pickup_location_id,
            dropoff_location_id=body.dropoff_location_id,
        ))
    except NotFound as e:
        raise translate(e)
    await CacheManager(redis).invalidate_namespace("routes")
    return (await _to_out(db, [r]))[0]


@router.delete("/routes/{route_id}", status_code=204)
async def delete_route(
    route_id: int,
    current_user: User = Depends(require_permission("update", "Route")),
    use_case: DeleteRoute = Depends(get_delete_route),
    redis: Redis = Depends(get_redis),
):
    try:
        await use_case(RouteId(route_id))
    except NotFound as e:
        raise translate(e)
    await CacheManager(redis).invalidate_namespace("routes")
    return Response()
