"""Customer (legacy: Client) HTTP endpoints.

Wires the new use cases to the same `/clients` URL paths the legacy
router served, so the frontend keeps working unchanged. Cache layer
preserved.
"""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from redis.asyncio import Redis

from app.contexts.customer_pricing.application import (
    CreateCustomer,
    DeleteCustomer,
    ListCustomers,
    UpdateCustomer,
)
from app.contexts.customer_pricing.application.dto import (
    CustomerCreateInput,
    CustomerUpdateInput,
)
from app.contexts.customer_pricing.domain.exceptions import (
    AlreadyExists,
    NotFound,
)
from app.contexts.customer_pricing.domain.value_objects import ClientId
from app.contexts.customer_pricing.interface.dependencies import (
    get_create_customer,
    get_delete_customer,
    get_list_customers,
    get_update_customer,
)
from app.contexts.customer_pricing.interface.error_translation import translate
from app.contexts.customer_pricing.interface.schemas import (
    CustomerCreate,
    CustomerOut,
    CustomerUpdate,
    customer_to_out,
)
from app.config import settings
from app.core.audit_context import set_audit_reason
from app.core.cache import CacheManager
from app.core.deps import require_permission
from app.core.redis import get_redis
from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.schemas.domain import SoftDeleteRequest


router = APIRouter()


@router.get("/clients", response_model=PaginatedResponse[CustomerOut])
async def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read", "Client")),
    use_case: ListCustomers = Depends(get_list_customers),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_key = f"list:{page}:{page_size}"
    cached = await cache.get_json("clients", cache_key)
    if cached is not None:
        return PaginatedResponse(**cached)

    items, total = await use_case(page=page, page_size=page_size, active_only=True)

    response = PaginatedResponse[CustomerOut](
        items=[customer_to_out(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
    serialized = response.model_dump(mode="json")
    await cache.set_json(
        "clients", cache_key, serialized, ttl=settings.CACHE_CLIENTS_TTL
    )
    return response


@router.post("/clients", response_model=CustomerOut, status_code=201)
async def create_client(
    body: CustomerCreate,
    current_user: User = Depends(require_permission("update", "Client")),
    use_case: CreateCustomer = Depends(get_create_customer),
    redis: Redis = Depends(get_redis),
):
    try:
        c = await use_case(CustomerCreateInput(
            name=body.name,
            type=body.type,
            phone=body.phone,
            code=body.code,
            tax_code=body.tax_code,
            address=body.address,
            contact_person=body.contact_person,
        ))
    except AlreadyExists as e:
        raise translate(e)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    await CacheManager(redis).invalidate_namespace("clients")
    return customer_to_out(c)


@router.put("/clients/{client_id}", response_model=CustomerOut)
async def update_client(
    client_id: int,
    body: CustomerUpdate,
    current_user: User = Depends(require_permission("update", "Client")),
    use_case: UpdateCustomer = Depends(get_update_customer),
    redis: Redis = Depends(get_redis),
):
    try:
        c = await use_case(ClientId(client_id), CustomerUpdateInput(
            name=body.name,
            type=body.type,
            phone=body.phone,
            code=body.code,
            tax_code=body.tax_code,
            address=body.address,
            contact_person=body.contact_person,
            is_active=body.is_active,
        ))
    except NotFound as e:
        raise translate(e)
    except AlreadyExists as e:
        raise translate(e)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    await CacheManager(redis).invalidate_namespace("clients")
    return customer_to_out(c)


@router.delete("/clients/{client_id}", status_code=204)
async def delete_client(
    client_id: int,
    body: SoftDeleteRequest,
    request: Request,
    current_user: User = Depends(require_permission("update", "Client")),
    use_case: DeleteCustomer = Depends(get_delete_customer),
    redis: Redis = Depends(get_redis),
):
    # Cross-context guard: customer cannot be deleted while referenced by
    # work_orders or trip_orders. Operations is a separate bounded
    # context, so we check via a thin SQL — an `OperationsRefsPort` will
    # replace this when C3 lands.
    from sqlalchemy import text
    db = use_case.session  # type: ignore[attr-defined]
    has_wo = (await db.execute(
        text("SELECT 1 FROM work_orders WHERE client_id = :cid LIMIT 1"),
        {"cid": client_id},
    )).scalar()
    if has_wo:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete client with associated work orders",
        )
    has_to = (await db.execute(
        text("SELECT 1 FROM trip_orders WHERE client_id = :cid LIMIT 1"),
        {"cid": client_id},
    )).scalar()
    if has_to:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete client with associated trip orders",
        )

    set_audit_reason(body.reason)
    try:
        await use_case(ClientId(client_id))
    except NotFound as e:
        raise translate(e)
    await CacheManager(redis).invalidate_namespace("clients")
    return Response()
