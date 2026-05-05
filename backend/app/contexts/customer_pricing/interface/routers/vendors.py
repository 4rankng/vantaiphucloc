"""Vendor (subcontractor) HTTP endpoints."""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query

from app.contexts.customer_pricing.application import (
    CreateVendor,
    DeleteVendor,
    ListVendors,
    UpdateVendor,
)
from app.contexts.customer_pricing.application.dto import (
    VendorCreateInput,
    VendorUpdateInput,
)
from app.contexts.customer_pricing.domain.exceptions import (
    AlreadyExists,
    NotFound,
)
from app.contexts.customer_pricing.domain.value_objects import VendorId
from app.contexts.customer_pricing.interface.dependencies import (
    get_create_vendor,
    get_delete_vendor,
    get_list_vendors,
    get_update_vendor,
)
from app.contexts.customer_pricing.interface.error_translation import translate
from app.contexts.customer_pricing.interface.schemas import (
    VendorCreate,
    VendorOut,
    VendorUpdate,
    vendor_to_out,
)
from app.core.deps import require_permission
from app.models.base import User
from app.schemas.base import PaginatedResponse


router = APIRouter()


@router.get("/vendors", response_model=PaginatedResponse[VendorOut])
async def list_vendors(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read", "Vendor")),
    use_case: ListVendors = Depends(get_list_vendors),
):
    items, total = await use_case(page=page, page_size=page_size, active_only=True)
    return PaginatedResponse[VendorOut](
        items=[vendor_to_out(v) for v in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/vendors", response_model=VendorOut, status_code=201)
async def create_vendor(
    body: VendorCreate,
    current_user: User = Depends(require_permission("update", "Vendor")),
    use_case: CreateVendor = Depends(get_create_vendor),
):
    try:
        v = await use_case(VendorCreateInput(
            name=body.name,
            type=body.type,
            phone=body.phone,
            tax_code=body.tax_code,
            address=body.address,
            contact_person=body.contact_person,
        ))
    except AlreadyExists as e:
        raise translate(e)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return vendor_to_out(v)


@router.put("/vendors/{vendor_id}", response_model=VendorOut)
async def update_vendor(
    vendor_id: int,
    body: VendorUpdate,
    current_user: User = Depends(require_permission("update", "Vendor")),
    use_case: UpdateVendor = Depends(get_update_vendor),
):
    try:
        v = await use_case(VendorId(vendor_id), VendorUpdateInput(
            name=body.name,
            type=body.type,
            phone=body.phone,
            tax_code=body.tax_code,
            address=body.address,
            contact_person=body.contact_person,
        ))
    except NotFound as e:
        raise translate(e)
    except AlreadyExists as e:
        raise translate(e)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return vendor_to_out(v)


@router.delete("/vendors/{vendor_id}", status_code=204)
async def delete_vendor(
    vendor_id: int,
    current_user: User = Depends(require_permission("update", "Vendor")),
    use_case: DeleteVendor = Depends(get_delete_vendor),
):
    try:
        await use_case(VendorId(vendor_id))
    except NotFound as e:
        raise translate(e)
