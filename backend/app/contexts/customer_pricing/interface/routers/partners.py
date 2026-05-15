"""Partner HTTP endpoints.

CRUD for the unified Partner entity (replaces the former separate
clients and vendors routers).
"""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.application import (
    CreatePartner,
    DeletePartner,
    GetPartner,
    ListPartners,
    UpdatePartner,
)
from app.contexts.customer_pricing.application.dto import (
    PartnerCreateInput,
    PartnerUpdateInput,
)
from app.contexts.customer_pricing.domain.exceptions import (
    AlreadyExists,
    NotFound,
)
from app.contexts.customer_pricing.domain.value_objects import PartnerId
from app.contexts.customer_pricing.interface.dependencies import (
    get_create_partner,
    get_delete_partner,
    get_get_partner,
    get_list_partners,
    get_update_partner,
)
from app.contexts.customer_pricing.interface.error_translation import translate
from app.contexts.customer_pricing.interface.schemas import (
    PartnerCreateBody,
    PartnerOutBody,
    PartnerUpdateBody,
    partner_to_out,
)
from app.config import settings
from app.core.audit_context import set_audit_reason
from app.core.cache import CacheManager
from app.core.deps import require_permission
from app.core.redis import get_redis
from app.database import get_db
from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.schemas.domain import SoftDeleteRequest


router = APIRouter()


@router.get("/partners", response_model=PaginatedResponse[PartnerOutBody])
async def list_partners(
    type: str | None = Query(None, alias="type"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read", "Partner")),
    use_case: ListPartners = Depends(get_list_partners),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_key = f"list:{type}:{page}:{page_size}"
    cached = await cache.get_json("partners", cache_key)
    if cached is not None:
        return PaginatedResponse(**cached)

    items, total = await use_case(
        page=page,
        page_size=page_size,
        partner_type=type,
        active_only=True,
    )

    response = PaginatedResponse[PartnerOutBody](
        items=[partner_to_out(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
    serialized = response.model_dump(mode="json")
    await cache.set_json(
        "partners", cache_key, serialized, ttl=settings.CACHE_CLIENTS_TTL
    )
    return response


@router.get("/partners/{partner_id}", response_model=PartnerOutBody)
async def get_partner(
    partner_id: int,
    current_user: User = Depends(require_permission("read", "Partner")),
    use_case: GetPartner = Depends(get_get_partner),
):
    try:
        p = await use_case(PartnerId(partner_id))
    except NotFound as e:
        raise translate(e)
    return partner_to_out(p)


@router.post("/partners", response_model=PartnerOutBody, status_code=201)
async def create_partner(
    body: PartnerCreateBody,
    current_user: User = Depends(require_permission("update", "Partner")),
    use_case: CreatePartner = Depends(get_create_partner),
    redis: Redis = Depends(get_redis),
):
    try:
        p = await use_case(PartnerCreateInput(
            name=body.name,
            partner_type=body.partner_type,
            code=body.code,
            phone=body.phone,
            tax_code=body.tax_code,
            address=body.address,
            contact_person=body.contact_person,
        ))
    except AlreadyExists as e:
        raise translate(e)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    await CacheManager(redis).invalidate_namespace("partners")
    return partner_to_out(p)


@router.put("/partners/{partner_id}", response_model=PartnerOutBody)
async def update_partner(
    partner_id: int,
    body: PartnerUpdateBody,
    current_user: User = Depends(require_permission("update", "Partner")),
    use_case: UpdatePartner = Depends(get_update_partner),
    redis: Redis = Depends(get_redis),
):
    try:
        p = await use_case(PartnerId(partner_id), PartnerUpdateInput(
            name=body.name,
            partner_type=body.partner_type,
            code=body.code,
            phone=body.phone,
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
    await CacheManager(redis).invalidate_namespace("partners")
    return partner_to_out(p)


@router.delete("/partners/{partner_id}", status_code=204)
async def delete_partner(
    partner_id: int,
    body: SoftDeleteRequest,
    request: Request,
    current_user: User = Depends(require_permission("update", "Partner")),
    use_case: DeletePartner = Depends(get_delete_partner),
    redis: Redis = Depends(get_redis),
):
    # Cross-context guard: partner cannot be deleted while referenced by
    # work_orders or trip_orders.
    from sqlalchemy import text
    db = use_case.session  # type: ignore[attr-defined]
    has_wo = (await db.execute(
        text("SELECT 1 FROM work_orders WHERE client_id = :pid LIMIT 1"),
        {"pid": partner_id},
    )).scalar()
    if has_wo:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete partner with associated work orders",
        )
    has_to = (await db.execute(
        text("SELECT 1 FROM trip_orders WHERE client_id = :pid LIMIT 1"),
        {"pid": partner_id},
    )).scalar()
    if has_to:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete partner with associated trip orders",
        )

    set_audit_reason(body.reason)
    try:
        await use_case(PartnerId(partner_id))
    except NotFound as e:
        raise translate(e)
    await CacheManager(redis).invalidate_namespace("partners")
    return Response()
