from fastapi import APIRouter, Depends, HTTPException, Response
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.models.domain import Client
from app.schemas.domain import ClientCreate, ClientUpdate, ClientOut
from app.core.deps import require_roles
from app.core.redis import get_redis
from app.core.cache import CacheManager
from app.config import settings

router = APIRouter()


@router.get("/clients", response_model=list[ClientOut])
async def list_clients(
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cached = await cache.get_json("clients", "list")
    if cached is not None:
        return [ClientOut(**c) for c in cached]

    result = await db.execute(
        select(Client).order_by(Client.name.asc())
    )
    data = result.scalars().all()
    serialized = [ClientOut.model_validate(c).model_dump(mode="json") for c in data]
    await cache.set_json("clients", "list", serialized, ttl=settings.CACHE_CLIENTS_TTL)
    return data


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
