import math

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from redis.asyncio import Redis

from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.schemas.domain import ClientCreate, ClientUpdate, ClientOut, SoftDeleteRequest
from app.core.deps import require_permission
from app.core.redis import get_redis
from app.core.cache import CacheManager
from app.config import settings
from app.core.audit_context import set_audit_reason
from app.repositories.client_repo import ClientRepository
from app.repositories.deps import get_client_repo

router = APIRouter()


@router.get("/clients", response_model=PaginatedResponse[ClientOut])
async def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read", "Client")),
    repo: ClientRepository = Depends(get_client_repo),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_key = f"list:{page}:{page_size}"
    cached = await cache.get_json("clients", cache_key)
    if cached is not None:
        return PaginatedResponse(**cached)

    data, total = await repo.paginate(
        page, page_size, active_only=True, order_by=repo.model.name.asc()
    )

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
    current_user: User = Depends(require_permission("update", "Client")),
    repo: ClientRepository = Depends(get_client_repo),
    redis: Redis = Depends(get_redis),
):
    client = await repo.create(**body.model_dump())
    await repo.session.commit()
    await repo.session.refresh(client)
    await CacheManager(redis).invalidate_namespace("clients")
    return client


@router.put("/clients/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: int,
    body: ClientUpdate,
    current_user: User = Depends(require_permission("update", "Client")),
    repo: ClientRepository = Depends(get_client_repo),
    redis: Redis = Depends(get_redis),
):
    client = await repo.get_by_id_or_404(client_id)
    await repo.update(client, **body.model_dump(exclude_unset=True))
    await repo.session.commit()
    await repo.session.refresh(client)
    await CacheManager(redis).invalidate_namespace("clients")
    return client


@router.delete("/clients/{client_id}", status_code=204)
async def delete_client(
    client_id: int,
    body: SoftDeleteRequest,
    request: Request,
    current_user: User = Depends(require_permission("update", "Client")),
    repo: ClientRepository = Depends(get_client_repo),
    redis: Redis = Depends(get_redis),
):
    client = await repo.get_by_id_or_404(client_id)

    if await repo.has_work_orders(client_id):
        raise HTTPException(status_code=409, detail="Cannot delete client with associated work orders")
    if await repo.has_trip_orders(client_id):
        raise HTTPException(status_code=409, detail="Cannot delete client with associated trip orders")

    set_audit_reason(body.reason)
    await repo.soft_delete(client)
    await repo.session.commit()
    await CacheManager(redis).invalidate_namespace("clients")
    return Response()
