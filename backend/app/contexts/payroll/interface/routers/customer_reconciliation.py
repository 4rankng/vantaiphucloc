"""Customer reconciliation import HTTP router.

Endpoints (prefix ``/reconcile/customer-files``):
  - POST   /preview     -- accept parsed rows, persist + resolve to TOs
  - POST   /{id}/commit -- mark import as APPLIED
  - GET    /            -- list recent imports (optional partner filter)
  - GET    /{id}        -- get one import with row detail
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

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
from app.models.base import User
from app.schemas.domain import (
    CustomerReconciliationImportOut,
    CustomerReconciliationPreviewRequest,
    CustomerReconciliationRowOut,
)

router = APIRouter(prefix="/reconcile/customer-files")


def _dto_to_out(dto) -> CustomerReconciliationImportOut:
    return CustomerReconciliationImportOut(
        id=dto.id,
        partner_id=dto.partner_id,
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
                partner_id=body.partner_id,
                period_start=body.period_start,
                period_end=body.period_end,
                source_filename=body.source_filename,
                rows=[
                    ParsedRow(
                        container_number=r.container_number,
                        trip_date=r.trip_date,
                        customer_status=r.customer_status,
                        customer_note=r.customer_note,
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
    partner_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user: User = Depends(require_permission("read", "Salary")),
    use_case: ListCustomerReconciliationImports = Depends(
        get_list_customer_reconciliation_imports
    ),
):
    items = await use_case(partner_id=partner_id, limit=limit)
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
