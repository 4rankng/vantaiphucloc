"""Pricing HTTP endpoints."""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.contexts.customer_pricing.application import (
    CreatePricing,
    DeletePricing,
    ListPricings,
    UpdatePricing,
)
from app.contexts.customer_pricing.application.dto import (
    PricingCreateInput,
    PricingLineInput,
    PricingUpdateInput,
)
from app.contexts.customer_pricing.domain.entities import Pricing
from app.contexts.customer_pricing.domain.exceptions import NotFound
from app.contexts.customer_pricing.domain.value_objects import PricingId
from app.contexts.customer_pricing.interface.dependencies import (
    get_create_pricing,
    get_delete_pricing,
    get_list_pricings,
    get_update_pricing,
)
from app.contexts.customer_pricing.interface.error_translation import translate
from app.contexts.customer_pricing.interface.schemas import (
    PricingCreate,
    PricingLineOut,
    PricingOut,
    PricingUpdate,
    pricing_line_to_out,
)
from app.core.cache import CacheManager
from app.core.deps import require_permission
from app.core.redis import get_redis
from app.database import get_db
from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.services.summary_loader import (
    get_client_summary,
    get_location_summary,
    load_client_summaries,
    load_location_summaries,
)


router = APIRouter()


async def _to_out(db: AsyncSession, pricings: list[Pricing]) -> list[PricingOut]:
    if not pricings:
        return []
    clients = await load_client_summaries(
        db, {int(p.client_id) for p in pricings}
    )
    locations = await load_location_summaries(
        db,
        {int(p.pickup_location_id) for p in pricings}
        | {int(p.dropoff_location_id) for p in pricings},
    )
    return [
        PricingOut(
            id=int(p.id),
            client=get_client_summary(clients, int(p.client_id)),
            work_type=p.work_type,
            pickup_location=get_location_summary(
                locations, int(p.pickup_location_id)
            ),
            dropoff_location=get_location_summary(
                locations, int(p.dropoff_location_id)
            ),
            lines=[pricing_line_to_out(ln) for ln in sorted(p.lines, key=lambda x: int(x.id) if x.id else 0)],
            is_active=p.is_active,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in pricings
    ]


def _line_inputs(items) -> list[PricingLineInput]:
    return [
        PricingLineInput(
            quantity=int(li.quantity),
            unit_price=int(li.unit_price),
            driver_salary=int(li.driver_salary),
            allowance=int(li.allowance),
        )
        for li in items
    ]


@router.get("/pricings", response_model=PaginatedResponse[PricingOut])
async def list_pricings(
    client_id: int | None = None,
    work_type: str | None = None,
    pickup_location_id: int | None = None,
    dropoff_location_id: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read", "Pricing")),
    use_case: ListPricings = Depends(get_list_pricings),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_id = f"list:{client_id}:{work_type}:{pickup_location_id}:{dropoff_location_id}:{page}:{page_size}"
    cached = await cache.get_json("pricings", cache_id)
    if cached is not None:
        return PaginatedResponse(**cached)

    items, total = await use_case(
        page=page, page_size=page_size, client_id=client_id, active_only=True,
    )
    # Optional in-memory filters that the use case doesn't expose directly.
    if work_type is not None:
        items = [p for p in items if p.work_type == work_type]
    if pickup_location_id is not None:
        items = [p for p in items if int(p.pickup_location_id) == pickup_location_id]
    if dropoff_location_id is not None:
        items = [p for p in items if int(p.dropoff_location_id) == dropoff_location_id]

    out_items = await _to_out(db, items)
    response = PaginatedResponse[PricingOut](
        items=out_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
    serialized = response.model_dump(mode="json")
    await cache.set_json(
        "pricings", cache_id, serialized, ttl=settings.CACHE_PRICING_TTL
    )
    return response


@router.post("/pricings", response_model=PricingOut, status_code=201)
async def create_pricing(
    body: PricingCreate,
    current_user: User = Depends(require_permission("update", "Pricing")),
    use_case: CreatePricing = Depends(get_create_pricing),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    try:
        p = await use_case(PricingCreateInput(
            client_id=body.client_id,
            work_type=body.work_type,
            pickup_location_id=body.pickup_location_id,
            dropoff_location_id=body.dropoff_location_id,
            lines=_line_inputs(body.lines),
        ))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    await CacheManager(redis).invalidate_namespace("pricings")
    return (await _to_out(db, [p]))[0]


@router.put("/pricings/{pricing_id}", response_model=PricingOut)
async def update_pricing(
    pricing_id: int,
    body: PricingUpdate,
    current_user: User = Depends(require_permission("update", "Pricing")),
    use_case: UpdatePricing = Depends(get_update_pricing),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    try:
        lines = _line_inputs(body.lines) if body.lines is not None else None
        p = await use_case(PricingId(pricing_id), PricingUpdateInput(
            client_id=body.client_id,
            work_type=body.work_type,
            pickup_location_id=body.pickup_location_id,
            dropoff_location_id=body.dropoff_location_id,
            lines=lines,
        ))
    except NotFound as e:
        raise translate(e)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    await CacheManager(redis).invalidate_namespace("pricings")
    return (await _to_out(db, [p]))[0]


@router.delete("/pricings/{pricing_id}", status_code=204)
async def delete_pricing(
    pricing_id: int,
    current_user: User = Depends(require_permission("update", "Pricing")),
    use_case: DeletePricing = Depends(get_delete_pricing),
    redis: Redis = Depends(get_redis),
):
    try:
        await use_case(PricingId(pricing_id))
    except NotFound as e:
        raise translate(e)
    await CacheManager(redis).invalidate_namespace("pricings")
    return Response()
