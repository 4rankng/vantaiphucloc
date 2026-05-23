"""Vendor Route Pricing HTTP endpoints."""
from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File as FastAPIFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.vendor_route_pricing.application.dto import (
    VendorRoutePricingCreateInput,
    VendorRoutePricingUpdateInput,
)
from app.contexts.vendor_route_pricing.domain.entities import VendorRoutePricing
from app.contexts.vendor_route_pricing.domain.value_objects import VendorRoutePricingId
from app.contexts.vendor_route_pricing.interface.dependencies import (
    get_create_vendor_route_pricing,
    get_delete_vendor_route_pricing,
    get_list_vendor_route_pricings,
    get_update_vendor_route_pricing,
)
from app.contexts.vendor_route_pricing.interface.error_translation import translate
from app.contexts.vendor_route_pricing.interface.schemas import (
    VendorRoutePricingCreate,
    VendorRoutePricingOut,
    VendorRoutePricingUpdate,
    VendorRoutePricingImportCommit,
    VendorRoutePricingImportResult,
)
from app.contexts.vendor_route_pricing.infrastructure.vendor_route_pricing_import import (
    preview_with_matching,
    commit_import_rows,
)
from app.core.deps import require_permission
from app.core.summaries import (
    get_location_summary,
    get_vendor_summary,
    load_location_summaries,
    load_vendor_summaries,
)
from app.database import get_db
from app.models.base import User
from app.schemas.base import PaginatedResponse


router = APIRouter()


async def _to_out(db: AsyncSession, items: list[VendorRoutePricing]) -> list[VendorRoutePricingOut]:
    if not items:
        return []
    vendors = await load_vendor_summaries(db, {int(rp.vendor_id) for rp in items})
    locations = await load_location_summaries(
        db,
        {int(rp.pickup_location_id) for rp in items}
        | {int(rp.dropoff_location_id) for rp in items},
    )
    return [
        VendorRoutePricingOut(
            id=int(rp.id),
            vendor=get_vendor_summary(vendors, int(rp.vendor_id)),
            pickup_location=get_location_summary(locations, int(rp.pickup_location_id)),
            dropoff_location=get_location_summary(
                locations, int(rp.dropoff_location_id)
            ),
            work_type=rp.work_type,
            f20_price=rp.f20_price,
            f40_price=rp.f40_price,
            e20_price=rp.e20_price,
            e40_price=rp.e40_price,
            is_active=rp.is_active,
            created_at=rp.created_at,
            updated_at=rp.updated_at,
        )
        for rp in items
    ]


@router.get("/vendor-route-pricings", response_model=PaginatedResponse[VendorRoutePricingOut])
async def list_vendor_route_pricings(
    vendor_id: int | None = None,
    work_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    _current_user: User = Depends(require_permission("read", "VendorRoutePricing")),
    use_case=Depends(get_list_vendor_route_pricings),
    db: AsyncSession = Depends(get_db),
):
    items, total = await use_case(
        page=page,
        page_size=page_size,
        vendor_id=vendor_id,
        work_type=work_type,
        active_only=True,
    )
    out_items = await _to_out(db, items)
    return PaginatedResponse[VendorRoutePricingOut](
        items=out_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/vendor-route-pricings", response_model=VendorRoutePricingOut, status_code=201)
async def create_vendor_route_pricing(
    body: VendorRoutePricingCreate,
    _current_user: User = Depends(require_permission("update", "VendorRoutePricing")),
    use_case=Depends(get_create_vendor_route_pricing),
    db: AsyncSession = Depends(get_db),
):
    try:
        rp = await use_case(
            VendorRoutePricingCreateInput(
                vendor_id=body.vendor_id,
                pickup_location_id=body.pickup_location_id,
                dropoff_location_id=body.dropoff_location_id,
                work_type=body.work_type,
                f20_price=body.f20_price,
                f40_price=body.f40_price,
                e20_price=body.e20_price,
                e40_price=body.e40_price,
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return (await _to_out(db, [rp]))[0]


@router.put("/vendor-route-pricings/{pricing_id}", response_model=VendorRoutePricingOut)
async def update_vendor_route_pricing(
    pricing_id: int,
    body: VendorRoutePricingUpdate,
    _current_user: User = Depends(require_permission("update", "VendorRoutePricing")),
    use_case=Depends(get_update_vendor_route_pricing),
    db: AsyncSession = Depends(get_db),
):
    try:
        rp = await use_case(
            VendorRoutePricingId(pricing_id),
            VendorRoutePricingUpdateInput(
                vendor_id=body.vendor_id,
                pickup_location_id=body.pickup_location_id,
                dropoff_location_id=body.dropoff_location_id,
                work_type=body.work_type,
                f20_price=body.f20_price,
                f40_price=body.f40_price,
                e20_price=body.e20_price,
                e40_price=body.e40_price,
            ),
        )
    except Exception as e:
        raise translate(e)
    return (await _to_out(db, [rp]))[0]


@router.delete("/vendor-route-pricings/{pricing_id}", status_code=204)
async def delete_vendor_route_pricing(
    pricing_id: int,
    _current_user: User = Depends(require_permission("update", "VendorRoutePricing")),
    use_case=Depends(get_delete_vendor_route_pricing),
):
    try:
        await use_case(VendorRoutePricingId(pricing_id))
    except Exception as e:
        raise translate(e)
    return Response()


@router.post("/vendor-route-pricings/import-preview")
async def import_preview_vendor_route_pricings(
    file: UploadFile = FastAPIFile(...),
    _current_user: User = Depends(require_permission("update", "VendorRoutePricing")),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    return await preview_with_matching(db, content)


@router.post("/vendor-route-pricings/import-commit", response_model=VendorRoutePricingImportResult)
async def import_commit_vendor_route_pricings(
    body: VendorRoutePricingImportCommit,
    _current_user: User = Depends(require_permission("update", "VendorRoutePricing")),
    db: AsyncSession = Depends(get_db),
):
    rows = [r.model_dump() for r in body.rows]
    return await commit_import_rows(db, rows)
