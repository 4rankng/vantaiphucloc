"""Vendor reconciliation endpoints — upload vendor Excel and auto-match."""

from __future__ import annotations

import logging
from datetime import date

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.database import get_db
from app.models.base import User
from app.models.domain import Vendor

_logger = logging.getLogger(__name__)

router = APIRouter(tags=["vendor-reconciliation"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class VendorImportResponse(BaseModel):
    total_rows: int
    created: int
    matched: int
    fraud_skipped: int
    errors: list[str] = Field(default_factory=list)
    details: list[dict] = Field(default_factory=list)


class VendorCommitRow(BaseModel):
    container_no: str
    container_size: str = ""
    freight_kind: str = ""
    cont_type: str = "E20"
    work_type: str = "CHUYỂN BÃI"
    container_type_iso: str = ""
    gross_weight_kg: float | None = None
    seal_no: str = ""
    pickup_location: str = ""
    dropoff_location: str = ""
    pickup_date: date | None = None
    dropoff_date: date | None = None
    trip_date: date
    customer_ref: str = ""
    consignee: str = ""
    commodity: str = ""
    driver_name: str = ""
    vehicle_plate: str = ""
    freight_charge: float | None = None
    remarks: str = ""


class VendorCommitRequest(BaseModel):
    vendor_id: int
    rows: list[VendorCommitRow]


class VendorCommitResponse(BaseModel):
    created: int
    matched: int
    fraud_skipped: int
    errors: list[str] = Field(default_factory=list)
    details: list[dict] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Preview — parse Excel, no DB writes
# ---------------------------------------------------------------------------


@router.post("/vendor-reconciliation/preview")
async def preview_vendor_excel(
    vendor_id: int = Form(..., description="Vendor (nha xe) ID"),
    file: UploadFile = File(..., description="Vendor Excel file (.xlsx)"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Parse vendor Excel file and return preview. No data saved to DB."""
    vendor = (
        await db.execute(
            select(Vendor).where(Vendor.id == vendor_id, Vendor.is_active == True)  # noqa: E712
        )
    ).scalar_one_or_none()
    if vendor is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà xe.")

    if file.filename is None:
        raise HTTPException(status_code=400, detail="Tệp tải lên không có tên.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tải lên rỗng.")

    from app.contexts.operations.infrastructure.vendor_import_service import (
        ReconciliationImportService,
    )

    service = ReconciliationImportService(db)

    try:
        return await service.preview_reconciliation_excel(content, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Commit — save confirmed rows
# ---------------------------------------------------------------------------


@router.post(
    "/vendor-reconciliation/commit",
    response_model=VendorCommitResponse,
)
async def commit_vendor_excel(
    body: VendorCommitRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Take confirmed rows from preview, create DeliveredTrips and auto-match."""
    if not body.rows:
        raise HTTPException(status_code=400, detail="Không có dòng nào để tạo.")

    from app.contexts.operations.infrastructure.vendor_import_service import (
        ReconciliationImportService,
    )

    service = ReconciliationImportService(db)
    result = await service.commit_reconciliation_rows(
        rows=[r.model_dump() for r in body.rows],
        vendor_id=body.vendor_id,
    )

    return VendorCommitResponse(
        created=result.created,
        matched=result.matched,
        fraud_skipped=result.fraud_skipped,
        errors=result.errors,
        details=result.details,
    )


# ---------------------------------------------------------------------------
# Legacy one-shot upload (kept for backward compat)
# ---------------------------------------------------------------------------


@router.post(
    "/vendor-reconciliation/upload",
    response_model=VendorImportResponse,
)
async def upload_vendor_excel(
    vendor_id: int = Form(..., description="Vendor (nha xe) ID"),
    file: UploadFile = File(..., description="Vendor Excel file (.xlsx)"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Upload vendor Excel file, create DeliveredTrips, auto-match against BookedTrips."""
    vendor = (
        await db.execute(
            select(Vendor).where(Vendor.id == vendor_id, Vendor.is_active == True)  # noqa: E712
        )
    ).scalar_one_or_none()
    if vendor is None:
        raise HTTPException(status_code=404, detail="Khong tim thay nha xe.")

    if file.filename is None:
        raise HTTPException(status_code=400, detail="Tep tai len khong co ten.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tep tai len rong.")

    from app.contexts.operations.infrastructure.vendor_import_service import (
        ReconciliationImportService,
    )

    service = ReconciliationImportService(db)
    result = await service.import_reconciliation_excel(
        content, file.filename, vendor_id=vendor_id
    )

    if result.total_rows == 0:
        raise HTTPException(
            status_code=400,
            detail="Khong tim thay du lieu hop le trong file Excel.",
        )

    return VendorImportResponse(
        total_rows=result.total_rows,
        created=result.created,
        matched=result.matched,
        fraud_skipped=result.fraud_skipped,
        errors=result.errors,
        details=result.details,
    )
