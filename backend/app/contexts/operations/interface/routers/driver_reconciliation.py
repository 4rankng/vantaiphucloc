"""Driver reconciliation endpoints — upload driver Excel and auto-match."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
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


# ---------------------------------------------------------------------------
# Endpoints
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
