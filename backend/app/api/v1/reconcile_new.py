"""New reconciliation API endpoints for Excel upload/export and confirmation."""

import logging
from datetime import date
from io import BytesIO
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.base import User
from app.core.deps import require_roles
from app.services.excel_service import (
    parse_customer_excel,
    compare_with_system_records,
    generate_reconciliation_excel,
    ReconciliationResult,
)

_logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/reconcile/upload-excel")
async def upload_customer_excel(
    file: UploadFile = File(...),
    client_id: int = Query(..., description="Customer ID for reconciliation"),
    date_from: str | None = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="Filter to date (YYYY-MM-DD)"),
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload Excel file from customer and compare with system records.

    Returns list of containers with duplicate highlighting.
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Only Excel files (.xlsx, .xls) are supported"
        )

    try:
        # Read file content
        file_content = await file.read()

        # Parse Excel
        excel_data = await parse_customer_excel(file_content, client_id)

        if not excel_data:
            raise HTTPException(
                status_code=400,
                detail="No data found in Excel file"
            )

        # Compare with system records
        results = await compare_with_system_records(
            db=db,
            client_id=client_id,
            excel_data=excel_data,
            date_from=date_from,
            date_to=date_to,
        )

        # Return results
        return {
            "success": True,
            "data": {
                "total_containers": len(results),
                "duplicates_found": sum(1 for r in results if r.is_duplicate),
                "confirmed": sum(1 for r in results if r.status == "confirmed"),
                "pending": sum(1 for r in results if r.status == "pending"),
                "results": [r.to_dict() for r in results],
            }
        }

    except Exception as e:
        _logger.error(f"Error processing Excel upload: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing Excel file: {str(e)}"
        )


@router.get("/reconcile/export-excel")
async def export_reconciliation_excel(
    client_id: int = Query(..., description="Customer ID"),
    date_from: str | None = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="Filter to date (YYYY-MM-DD)"),
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Export reconciliation data to Excel file.

    Returns Excel file for download.
    """
    try:
        # Generate Excel
        excel_content = await generate_reconciliation_excel(
            db=db,
            client_id=client_id,
            date_from=date_from,
            date_to=date_to,
        )

        # Create filename
        filename = f"reconciliation_client_{client_id}"
        if date_from:
            filename += f"_{date_from}"
        if date_to:
            filename += f"_{date_to}"
        filename += ".xlsx"

        # Return file
        return Response(
            content=excel_content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    except Exception as e:
        _logger.error(f"Error generating Excel export: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error generating Excel file: {str(e)}"
        )
