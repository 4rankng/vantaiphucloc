from fastapi import APIRouter, Depends, HTTPException, Response
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database import get_db
from app.models.base import User
from app.models.domain import Pricing, PricingLine
from app.schemas.domain import PricingCreate, PricingUpdate, PricingOut, PricingLineOut
from app.core.deps import require_roles
from app.core.redis import get_redis
from app.core.cache import CacheManager
from app.config import settings

router = APIRouter()


async def _load_pricing_out(db: AsyncSession, pricing: Pricing) -> PricingOut:
    """Load a Pricing with its associated PricingLine rows and return a PricingOut."""
    lines_result = await db.execute(
        select(PricingLine).where(PricingLine.pricing_id == pricing.id)
    )
    lines = lines_result.scalars().all()
    return PricingOut(
        id=pricing.id,
        client_id=pricing.client_id,
        client_name=pricing.client_name,
        work_type=pricing.work_type,
        route=pricing.route,
        unit_price=pricing.unit_price,
        driver_salary=pricing.driver_salary,
        allowance=pricing.allowance,
        created_at=pricing.created_at,
        updated_at=pricing.updated_at,
        lines=[PricingLineOut.model_validate(line) for line in lines],
    )


@router.get("/pricings", response_model=list[PricingOut])
async def list_pricings(
    client_id: int | None = None,
    work_type: str | None = None,
    route: str | None = None,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_id = f"list:{client_id}:{work_type}:{route}"
    cached = await cache.get_json("pricings", current_user.company_id, cache_id)
    if cached is not None:
        return [PricingOut(**p) for p in cached]

    query = select(Pricing).where(Pricing.company_id == current_user.company_id)

    if client_id is not None:
        query = query.where(Pricing.client_id == client_id)
    if work_type is not None:
        query = query.where(Pricing.work_type == work_type)
    if route is not None:
        query = query.where(Pricing.route == route)

    result = await db.execute(query.order_by(Pricing.id.asc()))
    pricings = result.scalars().all()
    data = [await _load_pricing_out(db, p) for p in pricings]
    serialized = [p.model_dump(mode="json") for p in data]
    await cache.set_json("pricings", current_user.company_id, cache_id, serialized, ttl=settings.CACHE_PRICING_TTL)
    return data


@router.post("/pricings", response_model=PricingOut, status_code=201)
async def create_pricing(
    body: PricingCreate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    lines_data = body.lines
    pricing_data = body.model_dump(exclude={"lines"})

    pricing = Pricing(
        company_id=current_user.company_id,
        **pricing_data,
    )
    db.add(pricing)
    await db.flush()  # get pricing.id without committing

    for line in lines_data:
        db.add(PricingLine(
            pricing_id=pricing.id,
            work_type=line.work_type,
            quantity=line.quantity,
        ))

    await db.commit()
    await db.refresh(pricing)
    await CacheManager(redis).invalidate_namespace("pricings", current_user.company_id)

    return await _load_pricing_out(db, pricing)


@router.put("/pricings/{pricing_id}", response_model=PricingOut)
async def update_pricing(
    pricing_id: int,
    body: PricingUpdate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    result = await db.execute(
        select(Pricing).where(
            Pricing.id == pricing_id,
            Pricing.company_id == current_user.company_id,
        )
    )
    pricing = result.scalar_one_or_none()
    if pricing is None:
        raise HTTPException(status_code=404, detail="Pricing not found")

    update_data = body.model_dump(exclude_unset=True)
    new_lines = update_data.pop("lines", None)

    for field, value in update_data.items():
        setattr(pricing, field, value)

    if new_lines is not None:
        await db.execute(
            delete(PricingLine).where(PricingLine.pricing_id == pricing.id)
        )
        for line in new_lines:
            db.add(PricingLine(
                pricing_id=pricing.id,
                work_type=line["work_type"],
                quantity=line["quantity"],
            ))

    await db.commit()
    await db.refresh(pricing)
    await CacheManager(redis).invalidate_namespace("pricings", current_user.company_id)

    return await _load_pricing_out(db, pricing)


@router.delete("/pricings/{pricing_id}", status_code=204)
async def delete_pricing(
    pricing_id: int,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    result = await db.execute(
        select(Pricing).where(
            Pricing.id == pricing_id,
            Pricing.company_id == current_user.company_id,
        )
    )
    pricing = result.scalar_one_or_none()
    if pricing is None:
        raise HTTPException(status_code=404, detail="Pricing not found")

    await db.delete(pricing)
    await db.commit()
    await CacheManager(redis).invalidate_namespace("pricings", current_user.company_id)
    return Response()
