"""Reconciliation API endpoints."""

import logging
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Query, Response
from sqlalchemy import select, delete, func

from app.models.base import User
from app.models.domain import WorkOrder, TripOrder, TripOrderWorkOrder, WorkOrderContainer
from app.schemas.domain import (
    ReconcileRequest,
    UnmatchRequest,
    TripOrderOut,
    SuggestMatchesResponse,
    SuggestWosResponse,
)
from app.core.deps import require_permission
from app.api.v1.trip_orders import _load_trip_order_out, _enqueue_salary_recalc
from app.services.matching_service import suggest_trip_matches, suggest_wo_matches
from app.services.excel_service import (
    parse_customer_excel,
    compare_with_system_records,
    generate_reconciliation_excel,
)
from app.services.audit_service import log_action
from app.core.audit_context import set_audit_reason
from app.repositories.work_order_repo import WorkOrderRepository
from app.repositories.trip_order_repo import TripOrderRepository
from app.repositories.deps import get_work_order_repo, get_trip_order_repo

_logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/reconcile", response_model=TripOrderOut)
async def reconcile(
    body: ReconcileRequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    wo_repo: WorkOrderRepository = Depends(get_work_order_repo),
    to_repo: TripOrderRepository = Depends(get_trip_order_repo),
):
    db = wo_repo.session
    work_order = await wo_repo.get_by_id_or_404(body.work_order_id)

    # Work order must have at least one container to be matched
    container_count = await db.execute(
        select(func.count()).where(WorkOrderContainer.work_order_id == work_order.id)
    )
    if container_count.scalar() == 0:
        raise HTTPException(
            status_code=409,
            detail="Work order must have at least one container before matching",
        )

    trip_order = await to_repo.get_by_id_or_404(body.trip_order_id)

    if work_order.status in ("MATCHED", "COMPLETED", "CANCELLED"):
        raise HTTPException(status_code=409, detail="Work order is already matched")

    existing_link = await db.execute(
        select(TripOrderWorkOrder).where(
            TripOrderWorkOrder.trip_order_id == trip_order.id
        )
    )
    if existing_link.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Trip order is already matched")

    if trip_order.status != "PENDING":
        raise HTTPException(status_code=409, detail="Trip order must be in PENDING status to match")

    if trip_order.is_confirmed:
        raise HTTPException(status_code=409, detail="Cannot match a confirmed trip order")

    now = datetime.now(timezone.utc)

    work_order.driver_salary = trip_order.driver_salary
    work_order.allowance = trip_order.allowance
    work_order.earning = trip_order.driver_salary + trip_order.allowance
    work_order.pricing_id = trip_order.pricing_id

    work_order.status = "MATCHED"
    work_order.is_locked = True
    work_order.locked_at = now
    work_order.locked_by = current_user.id

    trip_order.status = "COMPLETED"
    trip_order.is_locked = True
    trip_order.locked_at = now
    trip_order.locked_by = current_user.id

    db.add(TripOrderWorkOrder(
        trip_order_id=trip_order.id,
        work_order_id=work_order.id,
    ))

    await db.flush()

    await log_action(
        db, user_id=current_user.id, action="MATCH", table_name="trip_order_work_orders",
        record_id=trip_order.id, new_value={"work_order_id": work_order.id, "trip_order_id": trip_order.id},
        request=request,
    )

    await db.commit()
    await db.refresh(trip_order)

    ref_date = work_order.created_at.date() if work_order.created_at else trip_order.trip_date
    await _enqueue_salary_recalc(db, work_order.driver_id, ref_date)

    return await _load_trip_order_out(to_repo, trip_order)


@router.post("/reconcile/unmatch")
async def unmatch(
    body: UnmatchRequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    wo_repo: WorkOrderRepository = Depends(get_work_order_repo),
    to_repo: TripOrderRepository = Depends(get_trip_order_repo),
):
    db = wo_repo.session
    wo_id = body.work_order_id if hasattr(body, 'work_order_id') else None
    to_id = body.trip_order_id if hasattr(body, 'trip_order_id') else None

    if not wo_id and not to_id:
        raise HTTPException(status_code=400, detail="Must provide work_order_id or trip_order_id")

    q = select(TripOrderWorkOrder)
    if wo_id:
        q = q.where(TripOrderWorkOrder.work_order_id == wo_id)
    if to_id:
        q = q.where(TripOrderWorkOrder.trip_order_id == to_id)
    link_result = await db.execute(q)
    link = link_result.scalar_one_or_none()
    if link is None:
        raise HTTPException(status_code=404, detail="No match found")

    work_order = await wo_repo.get_by_id_or_404(link.work_order_id)
    trip_order = await to_repo.get_by_id_or_404(link.trip_order_id)

    if trip_order.is_confirmed:
        raise HTTPException(status_code=409, detail="Cannot unmatch a confirmed trip order")

    await db.execute(
        delete(TripOrderWorkOrder).where(
            TripOrderWorkOrder.trip_order_id == trip_order.id,
            TripOrderWorkOrder.work_order_id == work_order.id,
        )
    )

    work_order.status = "PENDING"
    work_order.is_locked = False
    work_order.locked_at = None
    work_order.locked_by = None
    work_order.driver_salary = 0
    work_order.allowance = 0
    work_order.earning = 0

    trip_order.status = "PENDING"
    trip_order.is_locked = False
    trip_order.locked_at = None
    trip_order.locked_by = None

    set_audit_reason(body.reason)

    await db.flush()

    await log_action(
        db, user_id=current_user.id, action="UNMATCH", table_name="trip_order_work_orders",
        record_id=trip_order.id, reason=body.reason,
        old_value={"work_order_id": work_order.id, "trip_order_id": trip_order.id},
        request=request,
    )

    await db.commit()

    if work_order.driver_id:
        ref_date = work_order.created_at.date() if work_order.created_at else trip_order.trip_date
        await _enqueue_salary_recalc(db, work_order.driver_id, ref_date)

    return {"success": True, "message": "Unmatched successfully"}


@router.get("/suggest-matches/{work_order_id:int}", response_model=SuggestMatchesResponse)
async def suggest_matches(
    work_order_id: int,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    repo: WorkOrderRepository = Depends(get_work_order_repo),
):
    work_order = await repo.get_by_id_or_404(work_order_id)
    suggestions = await suggest_trip_matches(repo.session, work_order)
    return SuggestMatchesResponse(
        work_order_id=work_order_id,
        suggestions=suggestions,
    )


@router.get("/suggest-wos/{trip_order_id}", response_model=SuggestWosResponse)
async def suggest_wos(
    trip_order_id: int,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    repo: TripOrderRepository = Depends(get_trip_order_repo),
):
    trip_order = await repo.get_by_id_or_404(trip_order_id)
    suggestions = await suggest_wo_matches(repo.session, trip_order)
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
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    repo: WorkOrderRepository = Depends(get_work_order_repo),
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Only Excel files (.xlsx, .xls) are supported"
        )

    try:
        file_content = await file.read()
        excel_data = await parse_customer_excel(file_content, client_id)

        if not excel_data:
            raise HTTPException(status_code=400, detail="No data found in Excel file")

        results = await compare_with_system_records(
            db=repo.session, client_id=client_id, excel_data=excel_data,
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
            }
        }

    except Exception as e:
        _logger.error(f"Error processing Excel upload: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing Excel file: {str(e)}")


@router.get("/export-excel")
async def export_reconciliation_excel(
    client_id: int = Query(..., description="Customer ID"),
    date_from: str | None = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="Filter to date (YYYY-MM-DD)"),
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    repo: WorkOrderRepository = Depends(get_work_order_repo),
):
    try:
        excel_content = await generate_reconciliation_excel(
            db=repo.session, client_id=client_id, date_from=date_from, date_to=date_to,
        )

        filename = f"reconciliation_client_{client_id}"
        if date_from:
            filename += f"_{date_from}"
        if date_to:
            filename += f"_{date_to}"
        filename += ".xlsx"

        return Response(
            content=excel_content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    except Exception as e:
        _logger.error(f"Error generating Excel export: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating Excel file: {str(e)}")
