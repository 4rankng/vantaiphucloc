import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.models.base import User
from app.models.domain import Vendor
from app.schemas.base import PaginatedResponse
from app.schemas.domain import VendorCreate, VendorUpdate, VendorOut
from app.core.deps import require_permission
from app.repositories.vendor_repo import VendorRepository
from app.repositories.deps import get_vendor_repo

router = APIRouter()


@router.get("/vendors", response_model=PaginatedResponse[VendorOut])
async def list_vendors(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read", "Vendor")),
    repo: VendorRepository = Depends(get_vendor_repo),
):
    data, total = await repo.paginate(
        page, page_size, active_only=True, order_by=repo.model.id.asc()
    )

    return PaginatedResponse[VendorOut](
        items=[VendorOut.model_validate(v) for v in data],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/vendors", response_model=VendorOut, status_code=201)
async def create_vendor(
    body: VendorCreate,
    current_user: User = Depends(require_permission("update", "Vendor")),
    repo: VendorRepository = Depends(get_vendor_repo),
):
    if await repo.find_one(name=body.name):
        raise HTTPException(status_code=409, detail="Vendor already exists")

    vendor = await repo.create(
        name=body.name,
        type=body.type,
        phone=body.phone,
        tax_code=body.tax_code,
        address=body.address,
        contact_person=body.contact_person,
    )
    await repo.session.commit()
    await repo.session.refresh(vendor)
    return vendor


@router.put("/vendors/{vendor_id}", response_model=VendorOut)
async def update_vendor(
    vendor_id: int,
    body: VendorUpdate,
    current_user: User = Depends(require_permission("update", "Vendor")),
    repo: VendorRepository = Depends(get_vendor_repo),
):
    vendor = await repo.get_by_id_or_404(vendor_id)

    if body.name is not None:
        existing = await repo.session.execute(
            select(Vendor).where(Vendor.name == body.name, Vendor.id != vendor_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Vendor name already exists")

    await repo.update(vendor, **body.model_dump(exclude_unset=True))
    await repo.session.commit()
    await repo.session.refresh(vendor)
    return vendor


@router.delete("/vendors/{vendor_id}", status_code=204)
async def delete_vendor(
    vendor_id: int,
    current_user: User = Depends(require_permission("update", "Vendor")),
    repo: VendorRepository = Depends(get_vendor_repo),
):
    vendor = await repo.get_by_id_or_404(vendor_id)
    await repo.soft_delete(vendor)
    await repo.session.commit()
