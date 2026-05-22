"""Reconciliation router — sub-module: Excel upload/export endpoints."""

from __future__ import annotations

import logging

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)

from app.contexts.operations.application import GetDeliveredTrip
from app.contexts.operations.interface.dependencies import get_get_delivered_trip
from app.core.deps import require_permission
from app.models.base import User

_logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/upload-excel")
async def upload_customer_excel(
    file: UploadFile = File(...),
    client_id: int = Query(..., description="Client ID for reconciliation"),
    date_from: str | None = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="Filter to date (YYYY-MM-DD)"),
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetDeliveredTrip = Depends(get_get_delivered_trip),
):
    from app.contexts.operations.infrastructure.excel import (
        compare_with_system_records,
        parse_customer_excel,
    )

    if not file.filename or not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Only Excel files (.xlsx, .xls) are supported",
        )

    file_content = await file.read()
    excel_data = await parse_customer_excel(file_content, client_id)
    if not excel_data:
        raise HTTPException(status_code=400, detail="No data found in Excel file")

    db = use_case.repo.session  # type: ignore[attr-defined]
    results = await compare_with_system_records(
        db=db, client_id=client_id, excel_data=excel_data,
        date_from=date_from, date_to=date_to,
    )

    return {
        "success": True,
        "data": {
            "total_containers": len(results),
            "duplicates_found": sum(1 for r in results if r.is_duplicate),
            "confirmed": sum(1 for r in results if r.status == "confirmed"),
            "pending": sum(1 for r in results if r.status == "pending"),
            "results": [r.to_dict() for r in results],
        },
    }


@router.get("/export-excel")
async def export_reconciliation_excel(
    client_id: int = Query(..., description="Client ID"),
    date_from: str | None = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="Filter to date (YYYY-MM-DD)"),
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetDeliveredTrip = Depends(get_get_delivered_trip),
):
    from app.contexts.operations.infrastructure.excel import generate_reconciliation_excel

    db = use_case.repo.session  # type: ignore[attr-defined]
    excel_content = await generate_reconciliation_excel(
        db=db, client_id=client_id, date_from=date_from, date_to=date_to,
    )

    filename = f"reconciliation_client_{client_id}"
    if date_from:
        filename += f"_{date_from}"
    if date_to:
        filename += f"_{date_to}"
    filename += ".xlsx"

    return Response(
        content=excel_content,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
