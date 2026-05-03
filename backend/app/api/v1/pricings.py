import math
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from redis.asyncio import Redis
from sqlalchemy import select, delete as sa_delete, func

from app.models.base import User
from app.models.domain import Pricing, PricingLine
from app.schemas.base import PaginatedResponse
from app.schemas.domain import PricingCreate, PricingUpdate, PricingOut, PricingLineOut
from app.core.deps import require_permission
from app.core.redis import get_redis
from app.core.cache import CacheManager
from app.config import settings
from app.repositories.pricing_repo import PricingRepository
from app.repositories.deps import get_pricing_repo

router = APIRouter()


async def _load_pricing_out(repo: PricingRepository, pricing: Pricing) -> PricingOut:
    lines = await repo.get_lines(pricing.id)
    return PricingOut(
        id=pricing.id,
        client_id=pricing.client_id,
        client_name=pricing.client_name,
        work_type=pricing.work_type,
        route=pricing.route,
        pickup_location=pricing.pickup_location,
        dropoff_location=pricing.dropoff_location,
        is_active=pricing.is_active,
        created_at=pricing.created_at,
        updated_at=pricing.updated_at,
        lines=[PricingLineOut.model_validate(line) for line in lines],
    )


async def _batch_load_pricing_outs(
    repo: PricingRepository, pricings: list[Pricing]
) -> list[PricingOut]:
    if not pricings:
        return []

    pricing_ids = [p.id for p in pricings]
    lines_result = await repo.session.execute(
        select(PricingLine)
        .where(PricingLine.pricing_id.in_(pricing_ids))
        .order_by(PricingLine.pricing_id, PricingLine.id)
    )
    all_lines = lines_result.scalars().all()

    lines_by_pricing: dict[int, list[PricingLine]] = defaultdict(list)
    for line in all_lines:
        lines_by_pricing[line.pricing_id].append(line)

    return [
        PricingOut(
            id=p.id,
            client_id=p.client_id,
            client_name=p.client_name,
            work_type=p.work_type,
            route=p.route,
            pickup_location=p.pickup_location,
            dropoff_location=p.dropoff_location,
            is_active=p.is_active,
            created_at=p.created_at,
            updated_at=p.updated_at,
            lines=[PricingLineOut.model_validate(l) for l in lines_by_pricing.get(p.id, [])],
        )
        for p in pricings
    ]


@router.get("/pricings", response_model=PaginatedResponse[PricingOut])
async def list_pricings(
    client_id: int | None = None,
    work_type: str | None = None,
    route: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read", "Pricing")),
    repo: PricingRepository = Depends(get_pricing_repo),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_id = f"list:{client_id}:{work_type}:{route}:{page}:{page_size}"
    cached = await cache.get_json("pricings", cache_id)
    if cached is not None:
        return PaginatedResponse(**cached)

    query = select(Pricing).where(Pricing.is_active == True)  # noqa: E712
    count_query = select(func.count(Pricing.id)).where(Pricing.is_active == True)  # noqa: E712

    if client_id is not None:
        query = query.where(Pricing.client_id == client_id)
        count_query = count_query.where(Pricing.client_id == client_id)
    if work_type is not None:
        query = query.where(Pricing.work_type == work_type)
        count_query = count_query.where(Pricing.work_type == work_type)
    if route is not None:
        query = query.where(Pricing.route == route)
        count_query = count_query.where(Pricing.route == route)

    total_q = await repo.session.execute(count_query)
    total = total_q.scalar() or 0

    result = await repo.session.execute(
        query.order_by(Pricing.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    pricings = result.scalars().all()

    data = await _batch_load_pricing_outs(repo, pricings)

    response = PaginatedResponse[PricingOut](
        items=data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
    serialized = response.model_dump(mode="json")
    await cache.set_json("pricings", cache_id, serialized, ttl=settings.CACHE_PRICING_TTL)
    return response


@router.post("/pricings", response_model=PricingOut, status_code=201)
async def create_pricing(
    body: PricingCreate,
    current_user: User = Depends(require_permission("update", "Pricing")),
    repo: PricingRepository = Depends(get_pricing_repo),
    redis: Redis = Depends(get_redis),
):
    lines_data = body.lines
    pricing = await repo.create(
        client_id=body.client_id,
        client_name=body.client_name,
        work_type=body.work_type,
        route=body.route,
        pickup_location=body.pickup_location,
        dropoff_location=body.dropoff_location,
    )

    for line in lines_data:
        repo.session.add(PricingLine(
            pricing_id=pricing.id,
            quantity=line.quantity,
            unit_price=line.unit_price,
            driver_salary=line.driver_salary,
            allowance=line.allowance,
        ))

    await repo.session.commit()
    await repo.session.refresh(pricing)
    await CacheManager(redis).invalidate_namespace("pricings")

    return await _load_pricing_out(repo, pricing)


@router.put("/pricings/{pricing_id}", response_model=PricingOut)
async def update_pricing(
    pricing_id: int,
    body: PricingUpdate,
    current_user: User = Depends(require_permission("update", "Pricing")),
    repo: PricingRepository = Depends(get_pricing_repo),
    redis: Redis = Depends(get_redis),
):
    pricing = await repo.get_by_id_or_404(pricing_id)

    update_data = body.model_dump(exclude_unset=True)
    new_lines = update_data.pop("lines", None)

    await repo.update(pricing, **update_data)

    if new_lines is not None:
        await repo.session.execute(sa_delete(PricingLine).where(PricingLine.pricing_id == pricing.id))
        for line in new_lines:
            repo.session.add(PricingLine(
                pricing_id=pricing.id,
                quantity=line["quantity"],
                unit_price=line.get("unit_price", 0),
                driver_salary=line.get("driver_salary", 0),
                allowance=line.get("allowance", 0),
            ))

    await repo.session.commit()
    await repo.session.refresh(pricing)
    await CacheManager(redis).invalidate_namespace("pricings")

    return await _load_pricing_out(repo, pricing)


@router.delete("/pricings/{pricing_id}", status_code=204)
async def delete_pricing(
    pricing_id: int,
    current_user: User = Depends(require_permission("update", "Pricing")),
    repo: PricingRepository = Depends(get_pricing_repo),
    redis: Redis = Depends(get_redis),
):
    pricing = await repo.get_by_id_or_404(pricing_id)
    await repo.soft_delete(pricing)
    await repo.session.commit()
    await CacheManager(redis).invalidate_namespace("pricings")
    return Response()
