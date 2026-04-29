import math

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.base import User
from app.models.domain import Client
from app.schemas.base import PaginatedResponse
from app.schemas.domain import ClientCreate, ClientUpdate, ClientOut
from app.core.deps import require_roles
from app.core.redis import get_redis
from app.core.cache import CacheManager
from app.config import settings

router = APIRouter()


@router.get("/clients", response_model=PaginatedResponse[ClientOut])
async def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_key = f"list:{page}:{page_size}"
    cached = await cache.get_json("clients", cache_key)
    if cached is not None:
        return PaginatedResponse(**cached)

    total_q = await db.execute(select(func.count(Client.id)))
    total = total_q.scalar() or 0

    result = await db.execute(
        select(Client)
        .order_by(Client.name.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    data = result.scalars().all()

    response = PaginatedResponse[ClientOut](
        items=[ClientOut.model_validate(c) for c in data],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
    serialized = response.model_dump(mode="json")
    await cache.set_json("clients", cache_key, serialized, ttl=settings.CACHE_CLIENTS_TTL)
    return response


@router.post("/clients", response_model=ClientOut, status_code=201)
async def create_client(
    body: ClientCreate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    client = Client(**body.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    await CacheManager(redis).invalidate_namespace("clients")
    return client


@router.put("/clients/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: int,
    body: ClientUpdate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)
    await CacheManager(redis).invalidate_namespace("clients")
    return client


@router.delete("/clients/{client_id}", status_code=204)
async def delete_client(
    client_id: int,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    await db.delete(client)
    await db.commit()
    await CacheManager(redis).invalidate_namespace("clients")
    return Response()
