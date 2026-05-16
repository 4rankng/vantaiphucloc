"""Customer reconciliation import HTTP router.

Endpoints (prefix ``/reconcile/customer-files``):
  - POST   /preview     -- accept parsed rows, persist + resolve to TOs
  - POST   /{id}/commit -- mark import as APPLIED
  - GET    /            -- list recent imports (optional partner filter)
  - GET    /{id}        -- get one import with row detail
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.contexts.payroll.application.customer_reconciliation import (
    CommitCustomerReconciliationImport,
    GetCustomerReconciliationImport,
    ListCustomerReconciliationImports,
    ParsedRow,
    PreviewCustomerReconciliationImport,
    PreviewInput,
)
from app.contexts.payroll.interface.dependencies_recon import (
    get_commit_customer_reconciliation_import,
    get_customer_reconciliation_import,
    get_list_customer_reconciliation_imports,
    get_preview_customer_reconciliation_import,
)
from app.core.deps import require_permission
from app.database import get_db
from app.models.base import User
from app.schemas.domain import (
    CustomerReconciliationImportOut,
    CustomerReconciliationPreviewRequest,
    CustomerReconciliationRowOut,
    RowVerdictUpdate,
)

router = APIRouter(prefix="/reconcile/customer-files")


def _dto_to_out(dto) -> CustomerReconciliationImportOut:
    return CustomerReconciliationImportOut(
        id=dto.id,
        client_id=dto.client_id,
        partner_name=dto.partner_name,
        period_start=dto.period_start,
        period_end=dto.period_end,
        source_filename=dto.source_filename,
        status=dto.status,
        summary=dto.summary,
        uploaded_at=dto.uploaded_at,
        applied_at=dto.applied_at,
        rows=[
            CustomerReconciliationRowOut(
                id=r.id,
                container_number=r.container_number,
                trip_date=r.trip_date,
                customer_status=r.customer_status,
                customer_note=r.customer_note,
                resolved_trip_order_id=r.resolved_trip_order_id,
                apply_status=r.apply_status,
                apply_message=r.apply_message,
                diff_classification=r.diff_classification,
                customer_amount=r.customer_amount,
                our_amount=r.our_amount,
            )
            for r in dto.rows
        ],
    )


@router.post("/preview", response_model=CustomerReconciliationImportOut, status_code=201)
async def preview_import(
    body: CustomerReconciliationPreviewRequest,
    current_user: User = Depends(require_permission("update", "Salary")),
    use_case: PreviewCustomerReconciliationImport = Depends(
        get_preview_customer_reconciliation_import
    ),
):
    try:
        dto = await use_case(
            PreviewInput(
                client_id=body.client_id,
                period_start=body.period_start,
                period_end=body.period_end,
                source_filename=body.source_filename,
                rows=[
                    ParsedRow(
                        container_number=r.container_number,
                        trip_date=r.trip_date,
                        customer_status=r.customer_status,
                        customer_note=r.customer_note,
                        customer_amount=r.customer_amount if hasattr(r, 'customer_amount') else None,
                    )
                    for r in body.rows
                ],
                uploaded_by=current_user.id,
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _dto_to_out(dto)


@router.post(
    "/{import_id}/commit",
    response_model=CustomerReconciliationImportOut,
)
async def commit_import(
    import_id: int,
    current_user: User = Depends(require_permission("update", "Salary")),
    use_case: CommitCustomerReconciliationImport = Depends(
        get_commit_customer_reconciliation_import
    ),
):
    try:
        dto = await use_case(import_id=import_id, applied_by=current_user.id)
    except ValueError as e:
        # 404 when missing, 409 when already applied
        msg = str(e)
        status_code = 409 if "already applied" in msg else 404
        raise HTTPException(status_code=status_code, detail=msg)
    return _dto_to_out(dto)


@router.get("", response_model=list[CustomerReconciliationImportOut])
async def list_imports(
    client_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user: User = Depends(require_permission("read", "Salary")),
    use_case: ListCustomerReconciliationImports = Depends(
        get_list_customer_reconciliation_imports
    ),
):
    items = await use_case(client_id=client_id, limit=limit)
    return [_dto_to_out(i) for i in items]


@router.get("/{import_id}", response_model=CustomerReconciliationImportOut)
async def get_import(
    import_id: int,
    _current_user: User = Depends(require_permission("read", "Salary")),
    use_case: GetCustomerReconciliationImport = Depends(
        get_customer_reconciliation_import
    ),
):
    try:
        dto = await use_case(import_id=import_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return _dto_to_out(dto)


@router.patch("/{import_id}/rows/{row_id}", response_model=CustomerReconciliationRowOut)
async def update_row_verdict(
    import_id: int,
    row_id: int,
    body: RowVerdictUpdate,
    _current_user: User = Depends(require_permission("update", "Salary")),
    db=Depends(get_db),
):
    """Per-row action: accept, dispute, or edit a single reconciliation row."""
    from sqlalchemy import select as sa_select
    from app.models.domain import CustomerReconciliationRow as RowModel

    row = (
        await db.execute(
            sa_select(RowModel).where(
                RowModel.id == row_id,
                RowModel.import_id == import_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy dòng.")

    if body.action == "accept":
        row.apply_status = "APPLIED"
        row.diff_classification = "ok"
        if body.note:
            row.customer_note = body.note
    elif body.action == "dispute":
        row.apply_status = "DISPUTED"
        row.diff_classification = "rejected"
        if body.note:
            row.customer_note = body.note
    elif body.action == "edit":
        if body.amount is not None:
            row.customer_amount = body.amount
            row.diff_classification = "amount_changed"
        if body.note:
            row.customer_note = body.note
        row.apply_status = "EDITED"

    await db.commit()
    await db.refresh(row)

    return CustomerReconciliationRowOut(
        id=row.id,
        container_number=row.container_number,
        trip_date=row.trip_date,
        customer_status=row.customer_status,
        customer_note=row.customer_note,
        resolved_trip_order_id=row.resolved_trip_order_id,
        apply_status=row.apply_status,
        apply_message=row.apply_message,
        diff_classification=row.diff_classification,
        customer_amount=row.customer_amount,
        our_amount=row.our_amount,
    )


@router.post("/upload-response", response_model=CustomerReconciliationImportOut, status_code=201)
async def upload_customer_response(
    client_id: int = Query(..., description="Client (khách hàng) ID"),
    period_start: str = Query(..., description="From date (YYYY-MM-DD)"),
    period_end: str = Query(..., description="To date (YYYY-MM-DD)"),
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("update", "Salary")),
    use_case: PreviewCustomerReconciliationImport = Depends(
        get_preview_customer_reconciliation_import
    ),
):
    """Upload an Excel file from customer and parse it into reconciliation rows."""
    from datetime import date as date_type
    from app.contexts.operations.infrastructure.excel import parse_customer_response_excel

    content = await file.read()
    try:
        parsed_rows = await parse_customer_response_excel(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi đọc file: {e}")

    if not parsed_rows:
        raise HTTPException(status_code=400, detail="File không có dữ liệu hợp lệ")

    try:
        ps = date_type.fromisoformat(period_start)
        pe = date_type.fromisoformat(period_end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Ngày không hợp lệ (YYYY-MM-DD)")

    try:
        dto = await use_case(
            PreviewInput(
                client_id=client_id,
                period_start=ps,
                period_end=pe,
                source_filename=file.filename,
                rows=[
                    ParsedRow(
                        container_number=r.get("container_number"),
                        trip_date=r.get("trip_date"),
                        customer_status=r.get("customer_status", "UNKNOWN"),
                        customer_note=r.get("customer_note"),
                        customer_amount=r.get("customer_amount"),
                    )
                    for r in parsed_rows
                ],
                uploaded_by=current_user.id,
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _dto_to_out(dto)
