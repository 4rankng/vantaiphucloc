"""Vendor (xe ngoài) reconciliation endpoints.

Flow:
  1. POST /vendor-reconciliation/upload       — multipart, parse vendor Excel
  2. GET  /vendor-reconciliation/             — list imports (optional vendor_id filter)
  3. GET  /vendor-reconciliation/{import_id}  — import header + all rows
  4. PATCH /vendor-reconciliation/{import_id}/rows/{row_id} — update row verdict
  5. POST /vendor-reconciliation/{import_id}/apply — apply import (write back vendor_amount)
  6. DELETE /vendor-reconciliation/{import_id}     — discard import

The parser is intentionally simple: it walks the Excel rows looking for a
container-number-shaped column (pattern ABCU1234567 / 11 chars) and pulls
adjacent columns for date and amount.  Each vendor tends to have a
consistent layout so this heuristic covers most real files; the reviewer
can still correct any mismatches in the review UI before applying.
"""

from __future__ import annotations

import logging
import re
from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.database import get_db
from app.models.base import User
from app.models.domain import (
    Partner,
    VendorReconciliationImport,
    VendorReconciliationRow,
    WorkOrder,
    WorkOrderContainer,
)

_logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/vendor-reconciliation",
    tags=["vendor-reconciliation"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_CONTAINER_RE = re.compile(r"\b[A-Z]{4}\d{7}\b")
_DATE_FMTS = ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y"]


def _parse_date(raw: Any) -> date | None:
    if raw is None:
        return None
    if isinstance(raw, (date, datetime)):
        return raw.date() if isinstance(raw, datetime) else raw
    s = str(raw).strip()
    for fmt in _DATE_FMTS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def _parse_amount(raw: Any) -> int | None:
    if raw is None:
        return None
    s = re.sub(r"[^\d]", "", str(raw))
    return int(s) if s else None


def _looks_like_container(val: Any) -> bool:
    if val is None:
        return False
    return bool(_CONTAINER_RE.search(str(val).upper().replace(" ", "")))


def _parse_vendor_excel(content: bytes, filename: str) -> list[dict]:
    """Parse a vendor Excel file into a list of raw row dicts.

    Strategy:
      1. Load the workbook via openpyxl.
      2. For each sheet, scan for the first row that contains a container-
         number-shaped cell (ABCU1234567).
      3. For that sheet, extract: container_number, trip_date, vendor_amount,
         work_type (inferred from container prefix if available), route_text
         (concatenate other string columns).
    """
    try:
        import openpyxl
    except ImportError:
        raise RuntimeError("openpyxl is required for Excel parsing")

    import io
    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)

    parsed: list[dict] = []

    for sheet in wb.worksheets:
        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            continue

        # Find a row containing a container number to start data extraction
        data_start = None
        for idx, row in enumerate(rows):
            if any(_looks_like_container(cell) for cell in row):
                data_start = idx
                break

        if data_start is None:
            continue

        # Heuristic: try to identify column indices for container, date, amount
        # by inspecting the first data row and building a simple signature.
        for row in rows[data_start:]:
            cells = [c for c in row]
            if not any(_looks_like_container(c) for c in cells):
                continue

            container = None
            trip_date = None
            vendor_amount = None
            other_texts: list[str] = []

            for c in cells:
                if c is None:
                    continue
                if _looks_like_container(c) and container is None:
                    m = _CONTAINER_RE.search(str(c).upper().replace(" ", ""))
                    if m:
                        container = m.group(0)
                elif isinstance(c, (date, datetime)) and trip_date is None:
                    trip_date = _parse_date(c)
                elif isinstance(c, (int, float)) and vendor_amount is None:
                    if c > 0:
                        vendor_amount = int(c)
                elif isinstance(c, str):
                    stripped = c.strip()
                    # Try as date string first
                    d = _parse_date(stripped)
                    if d and trip_date is None:
                        trip_date = d
                    elif stripped and stripped not in (container or ""):
                        other_texts.append(stripped)

            if container:
                route_text = " | ".join(other_texts[:3]) if other_texts else None
                # Infer work_type from container if possible (not typically in vendor files)
                parsed.append(
                    {
                        "container_number": container,
                        "work_type": None,
                        "route_text": route_text,
                        "trip_date": trip_date.isoformat() if trip_date else None,
                        "vendor_amount": vendor_amount,
                    }
                )
        break  # Use first sheet that has data

    wb.close()
    return parsed


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class VendorReconRowOut(BaseModel):
    id: int
    import_id: int
    container_number: str | None
    work_type: str | None
    route_text: str | None
    trip_date: date | None
    vendor_amount: int | None
    match_status: str
    matched_work_order_id: int | None
    reviewer_note: str | None


class VendorReconImportOut(BaseModel):
    id: int
    vendor_partner_id: int
    vendor_partner_name: str
    period_from: date
    period_to: date
    source_filename: str | None
    status: str
    totals: dict | None
    notes: str | None
    uploaded_at: datetime
    uploaded_by: int | None
    applied_at: datetime | None
    applied_by: int | None
    rows: list[VendorReconRowOut] = Field(default_factory=list)


class RowUpdateBody(BaseModel):
    match_status: str | None = None
    reviewer_note: str | None = None
    matched_work_order_id: int | None = None
    vendor_amount: int | None = None


class ApplyResponse(BaseModel):
    applied: int
    skipped: int


class OurOnlyRowOut(BaseModel):
    work_order_id: int
    container_number: str
    trip_date: date | None
    vehicle_plate: str | None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/upload")
async def upload_vendor_excel(
    file: UploadFile = File(...),
    vendor_id: int = Form(...),
    period_from: date = Form(...),
    period_to: date = Form(...),
    notes: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Parse a vendor Excel file and create a VendorReconciliationImport with rows."""
    if file.filename is None:
        raise HTTPException(status_code=400, detail="Tệp tải lên không có tên.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tải lên rỗng.")

    vendor = (
        await db.execute(select(Partner).where(Partner.id == vendor_id))
    ).scalar_one_or_none()
    if vendor is None or vendor.partner_type != "vendor":
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà xe.")

    try:
        raw_rows = _parse_vendor_excel(content, file.filename)
    except Exception as exc:
        _logger.exception("Failed to parse vendor Excel: %s", exc)
        raise HTTPException(status_code=422, detail=f"Không thể đọc file Excel: {exc}")

    if not raw_rows:
        raise HTTPException(
            status_code=422,
            detail="Không tìm thấy dữ liệu container trong file. "
                   "Hãy kiểm tra định dạng file (cần có cột số cont dạng ABCU1234567).",
        )

    # Auto-match each row against WorkOrders for this vendor in this period
    wo_by_container: dict[str, int] = {}
    wo_rows = (
        await db.execute(
            select(WorkOrderContainer.container_number, WorkOrderContainer.work_order_id)
            .join(WorkOrder, WorkOrder.id == WorkOrderContainer.work_order_id)
            .where(
                WorkOrder.vendor_partner_id == vendor_id,
                WorkOrder.trip_date >= period_from,
                WorkOrder.trip_date <= period_to,
            )
        )
    ).all()
    for cont_num, wo_id in wo_rows:
        if cont_num:
            wo_by_container[cont_num.upper()] = wo_id

    # Build rows
    orm_rows: list[VendorReconciliationRow] = []
    matched_count = 0
    vendor_only_count = 0

    for r in raw_rows:
        cont = (r["container_number"] or "").upper()
        wo_id = wo_by_container.get(cont)
        if wo_id:
            status = "MATCHED"
            matched_count += 1
        else:
            status = "VENDOR_ONLY"
            vendor_only_count += 1

        trip_date_val = None
        if r["trip_date"]:
            try:
                from datetime import date as _date
                trip_date_val = _date.fromisoformat(r["trip_date"])
            except (ValueError, TypeError):
                pass

        orm_rows.append(
            VendorReconciliationRow(
                container_number=r["container_number"],
                work_type=r["work_type"],
                route_text=r["route_text"],
                trip_date=trip_date_val,
                vendor_amount=r["vendor_amount"],
                match_status=status,
                matched_work_order_id=wo_id,
            )
        )

    # Find OUR_ONLY WOs (we have WO for this vendor+period, vendor didn't claim them)
    claimed_containers = {(r["container_number"] or "").upper() for r in raw_rows}
    our_only_count = 0
    for cont, wo_id in wo_by_container.items():
        if cont not in claimed_containers:
            orm_rows.append(
                VendorReconciliationRow(
                    container_number=cont,
                    work_type=None,
                    route_text=None,
                    trip_date=None,
                    vendor_amount=None,
                    match_status="OUR_ONLY",
                    matched_work_order_id=wo_id,
                )
            )
            our_only_count += 1

    totals = {
        "total": len(raw_rows),
        "matched": matched_count,
        "vendor_only": vendor_only_count,
        "our_only": our_only_count,
        "disputed": 0,
    }

    imp = VendorReconciliationImport(
        vendor_partner_id=vendor_id,
        period_from=period_from,
        period_to=period_to,
        source_filename=file.filename,
        status="PENDING_REVIEW",
        totals=totals,
        notes=notes,
        uploaded_by=user.id,
    )
    db.add(imp)
    await db.flush()

    for row in orm_rows:
        row.import_id = imp.id
        db.add(row)

    await db.commit()
    await db.refresh(imp)

    return {
        "import_id": imp.id,
        "vendor_partner_id": imp.vendor_partner_id,
        "status": imp.status,
        "totals": imp.totals,
        "row_count": len(orm_rows),
    }


@router.get("/")
async def list_imports(
    vendor_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """List vendor reconciliation imports, optionally filtered by vendor."""
    q = select(VendorReconciliationImport)
    if vendor_id is not None:
        q = q.where(VendorReconciliationImport.vendor_partner_id == vendor_id)
    q = q.order_by(VendorReconciliationImport.uploaded_at.desc())
    imports = (await db.execute(q)).scalars().all()

    # Fetch partner names in bulk
    partner_ids = list({imp.vendor_partner_id for imp in imports})
    partners_map: dict[int, str] = {}
    if partner_ids:
        partners = (
            await db.execute(select(Partner).where(Partner.id.in_(partner_ids)))
        ).scalars().all()
        partners_map = {p.id: p.name for p in partners}

    return [
        {
            "id": imp.id,
            "vendor_partner_id": imp.vendor_partner_id,
            "vendor_partner_name": partners_map.get(imp.vendor_partner_id, ""),
            "period_from": imp.period_from,
            "period_to": imp.period_to,
            "source_filename": imp.source_filename,
            "status": imp.status,
            "totals": imp.totals,
            "notes": imp.notes,
            "uploaded_at": imp.uploaded_at,
            "uploaded_by": imp.uploaded_by,
            "applied_at": imp.applied_at,
            "applied_by": imp.applied_by,
        }
        for imp in imports
    ]


@router.get("/{import_id}")
async def get_import(
    import_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Return one import with all its rows."""
    imp = (
        await db.execute(
            select(VendorReconciliationImport).where(
                VendorReconciliationImport.id == import_id
            )
        )
    ).scalar_one_or_none()
    if imp is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy import.")

    vendor = (
        await db.execute(select(Partner).where(Partner.id == imp.vendor_partner_id))
    ).scalar_one_or_none()

    rows = (
        await db.execute(
            select(VendorReconciliationRow).where(
                VendorReconciliationRow.import_id == import_id
            )
        )
    ).scalars().all()

    return {
        "id": imp.id,
        "vendor_partner_id": imp.vendor_partner_id,
        "vendor_partner_name": vendor.name if vendor else "",
        "period_from": imp.period_from,
        "period_to": imp.period_to,
        "source_filename": imp.source_filename,
        "status": imp.status,
        "totals": imp.totals,
        "notes": imp.notes,
        "uploaded_at": imp.uploaded_at,
        "uploaded_by": imp.uploaded_by,
        "applied_at": imp.applied_at,
        "applied_by": imp.applied_by,
        "rows": [
            {
                "id": r.id,
                "import_id": r.import_id,
                "container_number": r.container_number,
                "work_type": r.work_type,
                "route_text": r.route_text,
                "trip_date": r.trip_date,
                "vendor_amount": r.vendor_amount,
                "match_status": r.match_status,
                "matched_work_order_id": r.matched_work_order_id,
                "reviewer_note": r.reviewer_note,
            }
            for r in rows
        ],
    }


@router.patch("/{import_id}/rows/{row_id}")
async def update_row(
    import_id: int,
    row_id: int,
    body: RowUpdateBody = Body(...),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Update a single row's verdict (match_status, reviewer_note, etc.)."""
    row = (
        await db.execute(
            select(VendorReconciliationRow).where(
                VendorReconciliationRow.id == row_id,
                VendorReconciliationRow.import_id == import_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy dòng.")

    if body.match_status is not None:
        valid_statuses = {"MATCHED", "VENDOR_ONLY", "OUR_ONLY", "DISPUTED", "IGNORED"}
        if body.match_status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"match_status không hợp lệ. Phải là một trong: {valid_statuses}",
            )
        row.match_status = body.match_status
    if body.reviewer_note is not None:
        row.reviewer_note = body.reviewer_note
    if body.matched_work_order_id is not None:
        row.matched_work_order_id = body.matched_work_order_id
    if body.vendor_amount is not None:
        row.vendor_amount = body.vendor_amount

    # Recompute parent totals
    all_rows = (
        await db.execute(
            select(VendorReconciliationRow).where(
                VendorReconciliationRow.import_id == import_id
            )
        )
    ).scalars().all()

    totals: dict[str, int] = {
        "total": 0,
        "matched": 0,
        "vendor_only": 0,
        "our_only": 0,
        "disputed": 0,
    }
    for r in all_rows:
        status = body.match_status if r.id == row_id else r.match_status
        totals["total"] += 1
        if status == "MATCHED":
            totals["matched"] += 1
        elif status == "VENDOR_ONLY":
            totals["vendor_only"] += 1
        elif status == "OUR_ONLY":
            totals["our_only"] += 1
        elif status == "DISPUTED":
            totals["disputed"] += 1

    imp = (
        await db.execute(
            select(VendorReconciliationImport).where(
                VendorReconciliationImport.id == import_id
            )
        )
    ).scalar_one_or_none()
    if imp:
        imp.totals = totals

    await db.commit()
    await db.refresh(row)

    return {
        "id": row.id,
        "match_status": row.match_status,
        "reviewer_note": row.reviewer_note,
        "matched_work_order_id": row.matched_work_order_id,
        "vendor_amount": row.vendor_amount,
    }


@router.post("/{import_id}/apply", response_model=ApplyResponse)
async def apply_import(
    import_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Apply the import: write vendor_amount back to matched WorkOrders.

    Only MATCHED rows with a vendor_amount are written.  Idempotent (re-apply
    overwrites the previously written amount).  Marks the import as APPLIED.
    """
    imp = (
        await db.execute(
            select(VendorReconciliationImport).where(
                VendorReconciliationImport.id == import_id
            )
        )
    ).scalar_one_or_none()
    if imp is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy import.")
    if imp.status == "DISCARDED":
        raise HTTPException(status_code=409, detail="Import đã bị huỷ, không thể áp dụng.")

    rows = (
        await db.execute(
            select(VendorReconciliationRow).where(
                VendorReconciliationRow.import_id == import_id,
                VendorReconciliationRow.match_status == "MATCHED",
            )
        )
    ).scalars().all()

    applied = 0
    skipped = 0
    for row in rows:
        if row.matched_work_order_id is None or row.vendor_amount is None:
            skipped += 1
            continue
        wo = (
            await db.execute(
                select(WorkOrder).where(WorkOrder.id == row.matched_work_order_id)
            )
        ).scalar_one_or_none()
        if wo is None:
            skipped += 1
            continue
        # Store vendor cost on the WorkOrder's driver_salary field as vendor cost proxy.
        # TODO: When a dedicated VendorInvoiceLine table exists, write there instead.
        wo.driver_salary = row.vendor_amount
        applied += 1

    imp.status = "APPLIED"
    imp.applied_at = datetime.now(timezone.utc)
    imp.applied_by = user.id

    await db.commit()
    return ApplyResponse(applied=applied, skipped=skipped)


@router.delete("/{import_id}", status_code=204)
async def discard_import(
    import_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Mark import as DISCARDED (soft-delete)."""
    imp = (
        await db.execute(
            select(VendorReconciliationImport).where(
                VendorReconciliationImport.id == import_id
            )
        )
    ).scalar_one_or_none()
    if imp is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy import.")
    if imp.status == "APPLIED":
        raise HTTPException(
            status_code=409,
            detail="Import đã áp dụng, không thể huỷ. Liên hệ quản trị viên nếu cần điều chỉnh.",
        )
    imp.status = "DISCARDED"
    await db.commit()
