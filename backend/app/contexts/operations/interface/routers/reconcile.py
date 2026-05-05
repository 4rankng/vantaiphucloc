"""Reconciliation HTTP endpoints."""

from __future__ import annotations

import logging
from io import BytesIO

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

from app.contexts.operations.application import (
    GetTripOrder,
    GetWorkOrder,
    MatchTripToWorkOrder,
    UnmatchTripFromWorkOrder,
)
from app.contexts.operations.application.dto import (
    ReconcileInput,
    UnmatchInput,
)
from app.contexts.operations.application.match_suggester import (
    suggest_trip_matches,
    suggest_wo_matches,
)
from app.contexts.operations.interface.dependencies import (
    get_get_trip_order,
    get_get_work_order,
    get_match_trip_to_work_order,
    get_unmatch_trip_from_work_order,
)
from app.contexts.operations.interface.error_translation import translate
from app.contexts.operations.interface.routers.trip_orders import (
    _enqueue_salary_recalc,
    _load_one as _load_trip_one,
)
from app.core.audit_context import set_audit_reason
from app.core.deps import require_permission
from app.models.base import User
from app.models.domain import TripOrder as TripOrderORM, WorkOrder as WorkOrderORM
from app.schemas.domain import (
    ReconcileRequest,
    SuggestMatchesResponse,
    SuggestWosResponse,
    TripOrderOut,
    UnmatchRequest,
)
from app.core.audit import log_action

_logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/reconcile", response_model=TripOrderOut)
async def reconcile(
    body: ReconcileRequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: MatchTripToWorkOrder = Depends(get_match_trip_to_work_order),
):
    try:
        to = await use_case(ReconcileInput(
            work_order_id=body.work_order_id,
            trip_order_id=body.trip_order_id,
            user_id=current_user.id,
        ))
    except Exception as exc:
        raise translate(exc)

    db = use_case.session
    await log_action(
        db, user_id=current_user.id, action="MATCH",
        table_name="trip_order_work_orders",
        record_id=int(to.id),  # type: ignore[arg-type]
        new_value={
            "work_order_id": body.work_order_id,
            "trip_order_id": body.trip_order_id,
        },
        request=request,
    )
    await db.commit()

    # Salary recalc for the assigned driver. Pull the WO's driver from the
    # ORM directly to avoid a second hydration round-trip.
    from sqlalchemy import select
    wo = (await db.execute(
        select(WorkOrderORM).where(WorkOrderORM.id == body.work_order_id)
    )).scalar_one_or_none()
    if wo is not None and wo.driver_id:
        ref_date = (
            wo.created_at.date() if wo.created_at else to.trip_date
        )
        await _enqueue_salary_recalc(db, wo.driver_id, ref_date)

    return await _load_trip_one(db, to)


@router.post("/reconcile/unmatch")
async def unmatch(
    body: UnmatchRequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: UnmatchTripFromWorkOrder = Depends(get_unmatch_trip_from_work_order),
):
    if not body.work_order_id and not body.trip_order_id:
        raise HTTPException(
            status_code=400,
            detail="Must provide work_order_id or trip_order_id",
        )

    set_audit_reason(body.reason)
    try:
        to, wo = await use_case(UnmatchInput(
            user_id=current_user.id,
            reason=body.reason,
            work_order_id=body.work_order_id,
            trip_order_id=body.trip_order_id,
        ))
    except Exception as exc:
        raise translate(exc)

    db = use_case.session
    await log_action(
        db, user_id=current_user.id, action="UNMATCH",
        table_name="trip_order_work_orders",
        record_id=int(to.id),  # type: ignore[arg-type]
        reason=body.reason,
        old_value={
            "work_order_id": int(wo.id),  # type: ignore[arg-type]
            "trip_order_id": int(to.id),  # type: ignore[arg-type]
        },
        request=request,
    )
    await db.commit()

    if wo.driver_id:
        ref_date = wo.created_at.date() if wo.created_at else to.trip_date
        await _enqueue_salary_recalc(db, wo.driver_id, ref_date)

    return {"success": True, "message": "Unmatched successfully"}


@router.get(
    "/suggest-matches/{work_order_id:int}",
    response_model=SuggestMatchesResponse,
)
async def suggest_matches(
    work_order_id: int,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetWorkOrder = Depends(get_get_work_order),
):
    db = use_case.repo.session  # type: ignore[attr-defined]
    from sqlalchemy import select
    wo = (await db.execute(
        select(WorkOrderORM).where(WorkOrderORM.id == work_order_id)
    )).scalar_one_or_none()
    if wo is None:
        raise HTTPException(status_code=404, detail="WorkOrder not found")
    suggestions = await suggest_trip_matches(db, wo)
    return SuggestMatchesResponse(
        work_order_id=work_order_id, suggestions=suggestions,
    )


@router.get("/suggest-wos/{trip_order_id}", response_model=SuggestWosResponse)
async def suggest_wos(
    trip_order_id: int,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetTripOrder = Depends(get_get_trip_order),
):
    db = use_case.repo.session  # type: ignore[attr-defined]
    from sqlalchemy import select
    to = (await db.execute(
        select(TripOrderORM).where(TripOrderORM.id == trip_order_id)
    )).scalar_one_or_none()
    if to is None:
        raise HTTPException(status_code=404, detail="TripOrder not found")
    suggestions = await suggest_wo_matches(db, to)
    return SuggestWosResponse(
        trip_order_id=trip_order_id, suggestions=suggestions,
    )


@router.post("/upload-excel")
async def upload_customer_excel(
    file: UploadFile = File(...),
    client_id: int = Query(..., description="Customer ID for reconciliation"),
    date_from: str | None = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="Filter to date (YYYY-MM-DD)"),
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetWorkOrder = Depends(get_get_work_order),
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
    client_id: int = Query(..., description="Customer ID"),
    date_from: str | None = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="Filter to date (YYYY-MM-DD)"),
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetWorkOrder = Depends(get_get_work_order),
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
