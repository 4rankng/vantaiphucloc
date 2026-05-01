"""Reconciliation API endpoints."""

import logging
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.models.domain import WorkOrder, TripOrder, TripOrderWorkOrder
from app.schemas.domain import (
    ReconcileRequest,
    TripOrderOut,
    SuggestMatchesResponse,
    SuggestWosResponse,
)
from app.core.deps import require_roles
from app.api.v1.trip_orders import _load_trip_order_out, _enqueue_salary_recalc
from app.services.matching_service import suggest_trip_matches, suggest_wo_matches
from app.services.excel_service import (
    parse_customer_excel,
    compare_with_system_records,
    generate_reconciliation_excel,
)

_logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/reconcile", response_model=TripOrderOut)
async def reconcile(
    body: ReconcileRequest,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    # Load work order
    wo_result = await db.execute(
        select(WorkOrder).where(WorkOrder.id == body.work_order_id)
    )
    work_order = wo_result.scalar_one_or_none()
    if work_order is None:
        raise HTTPException(status_code=404, detail="Work order not found")

    # Load trip order
    to_result = await db.execute(
        select(TripOrder).where(TripOrder.id == body.trip_order_id)
    )
    trip_order = to_result.scalar_one_or_none()
    if trip_order is None:
        raise HTTPException(status_code=404, detail="Trip order not found")

    # Check if already matched or completed
    if work_order.status in ("MATCHED", "COMPLETED"):
        raise HTTPException(status_code=409, detail="Work order is already matched")

    # Sync salary fields from TO to WO
    work_order.driver_salary = trip_order.driver_salary
    work_order.allowance = trip_order.allowance
    work_order.earning = trip_order.driver_salary + trip_order.allowance
    # WO.unit_price stays 0 (revenue tracked in TO only)

    # Determine WO status based on whether TO has pricing data
    if trip_order.unit_price > 0 and trip_order.driver_salary > 0:
        work_order.status = "COMPLETED"
    else:
        work_order.status = "MATCHED"

    # Add to join table
    db.add(TripOrderWorkOrder(
        trip_order_id=trip_order.id,
        work_order_id=work_order.id,
    ))

    await db.commit()
    await db.refresh(trip_order)

    ref_date = work_order.created_at.date() if work_order.created_at else trip_order.trip_date
    await _enqueue_salary_recalc(db, work_order.driver_id, ref_date)

    return await _load_trip_order_out(db, trip_order)


@router.get("/suggest-matches/{work_order_id}", response_model=SuggestMatchesResponse)
async def suggest_matches(
    work_order_id: int,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    wo_result = await db.execute(
        select(WorkOrder).where(WorkOrder.id == work_order_id)
    )
    work_order = wo_result.scalar_one_or_none()
    if work_order is None:
        raise HTTPException(status_code=404, detail="Work order not found")

    suggestions = await suggest_trip_matches(db, work_order)
    return SuggestMatchesResponse(
        work_order_id=work_order_id,
        suggestions=suggestions,
    )


@router.get("/suggest-wos/{trip_order_id}", response_model=SuggestWosResponse)
async def suggest_wos(
    trip_order_id: int,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    to_result = await db.execute(
        select(TripOrder).where(TripOrder.id == trip_order_id)
    )
    trip_order = to_result.scalar_one_or_none()
    if trip_order is None:
        raise HTTPException(status_code=404, detail="Trip order not found")

    suggestions = await suggest_wo_matches(db, trip_order)
    return SuggestWosResponse(
        trip_order_id=trip_order_id,
        suggestions=suggestions,
    )


@router.post("/upload-excel")
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


@router.get("/export-excel")
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
