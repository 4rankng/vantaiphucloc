"""Vendor reconciliation endpoints — upload vendor Excel and auto-match."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
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


# ---------------------------------------------------------------------------
# Endpoints
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
    vendor = (await db.execute(
        select(Vendor).where(Vendor.id == vendor_id, Vendor.is_active == True)  # noqa: E712
    )).scalar_one_or_none()
    if vendor is None:
        raise HTTPException(status_code=404, detail="Khong tim thay nha xe.")

    if file.filename is None:
        raise HTTPException(status_code=400, detail="Tep tai len khong co ten.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tep tai len rong.")

    from app.contexts.operations.infrastructure.vendor_import_service import (
        VendorImportService,
    )

    service = VendorImportService(db)
    result = await service.import_vendor_excel(content, file.filename, vendor_id)

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
