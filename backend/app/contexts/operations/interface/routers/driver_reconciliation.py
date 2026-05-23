"""Driver reconciliation endpoints — preview, commit, and legacy upload."""

from __future__ import annotations

import logging
from datetime import date

from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.database import get_db
from app.models.base import User

_logger = logging.getLogger(__name__)

router = APIRouter(tags=["driver-reconciliation"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class DriverImportResponse(BaseModel):
    total_rows: int
    created: int
    matched: int
    fraud_skipped: int
    errors: list[str] = Field(default_factory=list)
    details: list[dict] = Field(default_factory=list)


class DriverCommitRow(BaseModel):
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


class DriverCommitRequest(BaseModel):
    rows: list[DriverCommitRow]


class DriverCommitResponse(BaseModel):
    created: int
    matched: int
    fraud_skipped: int
    errors: list[str] = Field(default_factory=list)
    details: list[dict] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Preview — parse Excel, no DB writes
# ---------------------------------------------------------------------------


@router.post("/driver-reconciliation/preview")
async def preview_driver_excel(
    file: UploadFile = File(..., description="Driver Excel file (.xlsx)"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Parse driver Excel file and return preview. No data saved to DB."""
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
    "/driver-reconciliation/commit",
    response_model=DriverCommitResponse,
)
async def commit_driver_excel(
    body: DriverCommitRequest = Body(...),
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
    )

    return DriverCommitResponse(
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
    "/driver-reconciliation/upload",
    response_model=DriverImportResponse,
)
async def upload_driver_excel(
    file: UploadFile = File(..., description="Driver Excel file (.xlsx)"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Upload driver Excel file, create DeliveredTrips (internal), auto-match against BookedTrips."""
    if file.filename is None:
        raise HTTPException(status_code=400, detail="Tệp tải lên không có tên.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tải lên rỗng.")

    from app.contexts.operations.infrastructure.vendor_import_service import (
        ReconciliationImportService,
    )

    service = ReconciliationImportService(db)
    result = await service.import_reconciliation_excel(content, file.filename)

    if result.total_rows == 0:
        raise HTTPException(
            status_code=400,
            detail="Không tìm thấy dữ liệu hợp lệ trong file Excel.",
        )

    return DriverImportResponse(
        total_rows=result.total_rows,
        created=result.created,
        matched=result.matched,
        fraud_skipped=result.fraud_skipped,
        errors=result.errors,
        details=result.details,
    )
