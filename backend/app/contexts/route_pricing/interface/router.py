"""Route Pricing HTTP endpoints."""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File as FastAPIFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.route_pricing.application.dto import (
    RoutePricingCreateInput,
    RoutePricingUpdateInput,
)
from app.contexts.route_pricing.domain.entities import RoutePricing
from app.contexts.route_pricing.domain.value_objects import RoutePricingId
from app.contexts.route_pricing.interface.dependencies import (
    get_create_route_pricing,
    get_delete_route_pricing,
    get_list_route_pricings,
    get_update_route_pricing,
)
from app.contexts.route_pricing.interface.error_translation import translate
from app.contexts.route_pricing.interface.schemas import (
    RoutePricingCreate,
    RoutePricingOut,
    RoutePricingUpdate,
    RoutePricingImportCommit,
    RoutePricingImportResult,
)
from app.contexts.route_pricing.infrastructure.route_pricing_import import (
    preview_with_matching,
    commit_import_rows,
)
from app.core.deps import require_permission
from app.core.summaries import (
    get_client_summary,
    get_location_summary,
    load_client_summaries,
    load_location_summaries,
)
from app.database import get_db
from app.models.base import User
from app.schemas.base import PaginatedResponse


router = APIRouter()


async def _to_out(db: AsyncSession, items: list[RoutePricing]) -> list[RoutePricingOut]:
    if not items:
        return []
    partners = await load_client_summaries(db, {int(rp.client_id) for rp in items})
    locations = await load_location_summaries(
        db,
        {int(rp.pickup_location_id) for rp in items}
        | {int(rp.dropoff_location_id) for rp in items},
    )
    return [
        RoutePricingOut(
            id=int(rp.id),
            client=get_client_summary(partners, int(rp.client_id)),
            pickup_location=get_location_summary(locations, int(rp.pickup_location_id)),
            dropoff_location=get_location_summary(
                locations, int(rp.dropoff_location_id)
            ),
            work_type=rp.work_type,
            f20_price=rp.f20_price,
            f40_price=rp.f40_price,
            e20_price=rp.e20_price,
            e40_price=rp.e40_price,
            f20_driver_salary=rp.f20_driver_salary,
            f40_driver_salary=rp.f40_driver_salary,
            e20_driver_salary=rp.e20_driver_salary,
            e40_driver_salary=rp.e40_driver_salary,
            is_active=rp.is_active,
            created_at=rp.created_at,
            updated_at=rp.updated_at,
        )
        for rp in items
    ]


@router.get("/route-pricings", response_model=PaginatedResponse[RoutePricingOut])
async def list_route_pricings(
    client_id: int | None = None,
    work_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    _current_user: User = Depends(require_permission("read", "RoutePricing")),
    use_case=Depends(get_list_route_pricings),
    db: AsyncSession = Depends(get_db),
):
    items, total = await use_case(
        page=page,
        page_size=page_size,
        client_id=client_id,
        work_type=work_type,
        active_only=True,
    )
    out_items = await _to_out(db, items)
    return PaginatedResponse[RoutePricingOut](
        items=out_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/route-pricings", response_model=RoutePricingOut, status_code=201)
async def create_route_pricing(
    body: RoutePricingCreate,
    _current_user: User = Depends(require_permission("update", "RoutePricing")),
    use_case=Depends(get_create_route_pricing),
    db: AsyncSession = Depends(get_db),
):
    try:
        rp = await use_case(
            RoutePricingCreateInput(
                client_id=body.client_id,
                pickup_location_id=body.pickup_location_id,
                dropoff_location_id=body.dropoff_location_id,
                work_type=body.work_type,
                f20_price=body.f20_price,
                f40_price=body.f40_price,
                e20_price=body.e20_price,
                e40_price=body.e40_price,
                f20_driver_salary=body.f20_driver_salary,
                f40_driver_salary=body.f40_driver_salary,
                e20_driver_salary=body.e20_driver_salary,
                e40_driver_salary=body.e40_driver_salary,
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise translate(e)
    return (await _to_out(db, [rp]))[0]


@router.put("/route-pricings/{pricing_id}", response_model=RoutePricingOut)
async def update_route_pricing(
    pricing_id: int,
    body: RoutePricingUpdate,
    _current_user: User = Depends(require_permission("update", "RoutePricing")),
    use_case=Depends(get_update_route_pricing),
    db: AsyncSession = Depends(get_db),
):
    try:
        rp = await use_case(
            RoutePricingId(pricing_id),
            RoutePricingUpdateInput(
                client_id=body.client_id,
                pickup_location_id=body.pickup_location_id,
                dropoff_location_id=body.dropoff_location_id,
                work_type=body.work_type,
                f20_price=body.f20_price,
                f40_price=body.f40_price,
                e20_price=body.e20_price,
                e40_price=body.e40_price,
                f20_driver_salary=body.f20_driver_salary,
                f40_driver_salary=body.f40_driver_salary,
                e20_driver_salary=body.e20_driver_salary,
                e40_driver_salary=body.e40_driver_salary,
            ),
        )
    except Exception as e:
        raise translate(e)
    return (await _to_out(db, [rp]))[0]


@router.delete("/route-pricings/{pricing_id}", status_code=204)
async def delete_route_pricing(
    pricing_id: int,
    _current_user: User = Depends(require_permission("update", "RoutePricing")),
    use_case=Depends(get_delete_route_pricing),
):
    try:
        await use_case(RoutePricingId(pricing_id))
    except Exception as e:
        raise translate(e)
    return Response()


@router.post("/route-pricings/import-preview")
async def import_preview_route_pricings(
    file: UploadFile = FastAPIFile(...),
    _current_user: User = Depends(require_permission("update", "RoutePricing")),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    return await preview_with_matching(db, content)


@router.post("/route-pricings/import-commit", response_model=RoutePricingImportResult)
async def import_commit_route_pricings(
    body: RoutePricingImportCommit,
    _current_user: User = Depends(require_permission("update", "RoutePricing")),
    db: AsyncSession = Depends(get_db),
):
    rows = [r.model_dump() for r in body.rows]
    return await commit_import_rows(db, rows)
