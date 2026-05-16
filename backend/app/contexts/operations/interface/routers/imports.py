"""Customer-Excel + customer-pricing import endpoints.

Two-stage flow per upload:

  1. `POST /imports/customer-excel/preview` — multipart upload. Detects
     sheet, header row, column mapping; returns parsed preview rows
     plus a per-string LocationResolver "find" result for the UI.

  2. `POST /imports/customer-excel/commit` — JSON body with confirmed
     rows. Hands rows to `CreateTripOrderFromImport`. Idempotent on
     `(client_id, trip_date, container_number)`.

The `customer-pricing` (bảng giá) preview/commit + `apply-pricing`
endpoints share this router for now — they belong to customer_pricing
context but the import-pipeline layer hosts the file-handling.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any

from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.infrastructure.location_resolver import (
    LocationResolverService,
    ResolverSource,
)
from app.contexts.operations.application import CreateTripOrderFromImport
from app.contexts.operations.application.dto import (
    ImportCommitInput,
    ImportTripRow,
)
from app.contexts.operations.interface.dependencies import (
    get_apply_pricing_to_trips,
    get_create_trip_order_from_import,
)
from app.contexts.operations.interface.error_translation import translate
from app.core.deps import require_roles
from app.database import get_db
from app.models.base import User
from app.models.domain import Client
from app.contexts.operations.infrastructure.import_pipeline.canonical import CANONICAL_FIELDS, SKIP_FIELD
from app.contexts.operations.infrastructure.import_pipeline.column_mapper import ColumnMapping
from app.contexts.operations.infrastructure.import_pipeline.llm import get_default_classifier
from app.contexts.operations.infrastructure.import_pipeline.pipeline import (
    column_mappings_from_dicts,
    compute_structure_hash,
    run_preview,
)
from app.contexts.operations.infrastructure.import_pipeline.templates import (
    find_template,
    list_templates_for_partner,
    save_template,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import load_workbook

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/imports", tags=["imports"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class CommitRow(BaseModel):
    container_no: str
    container_size: str
    freight_kind: str
    work_type: str
    container_type_iso: str = ""
    gross_weight_kg: float | None = None
    seal_no: str = ""
    pickup_location: str = ""
    dropoff_location: str = ""
    pickup_date: date | None = None
    dropoff_date: date | None = None
    trip_date: date
    customer_ref: str = ""
    consignee: str = ""
    commodity: str = ""
    driver_name: str = ""
    remarks: str = ""


class CommitRequest(BaseModel):
    client_id: int
    rows: list[CommitRow]
    overwrite_duplicates: bool = False
    save_template_as: str | None = None
    structure_hash: str | None = None
    sheet_name: str | None = None
    header_row_index: int | None = None
    column_mapping: list[dict[str, Any]] | None = None


class CommitResponse(BaseModel):
    created: int
    containers_created: int = 0
    grouped_trips: int = 0
    skipped_duplicates: int = 0
    locations_created: int = 0
    locations_review_flagged: int = 0
    errors: list[str] = Field(default_factory=list)
    template_id: int | None = None
    created_trip_ids: list[int] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class SheetInfo(BaseModel):
    name: str
    score: float
    container_hits: int
    n_rows: int
    is_auto_selected: bool


# ---------------------------------------------------------------------------
# Sheet listing (lightweight — no AI, no column mapping)
# ---------------------------------------------------------------------------


@router.post("/customer-excel/sheets")
async def list_excel_sheets(
    file: UploadFile = File(...),
    _user: User = Depends(require_roles("accountant", "superadmin")),
) -> list[SheetInfo]:
    """Return all sheets in the uploaded workbook with their auto-detection scores.

    This is a fast probe — no AI, no full parsing. The frontend uses the result
    to render a sheet picker so users can override the auto-selected sheet before
    triggering a full preview.
    """
    if file.filename is None:
        raise HTTPException(status_code=400, detail="Tệp tải lên không có tên.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tải lên rỗng.")

    from app.contexts.operations.infrastructure.import_pipeline.sheet_picker import score_sheets

    sheets = load_workbook(content, file.filename)
    if not sheets:
        return []

    scored = score_sheets(sheets)
    best_name = scored[0].sheet.name if scored and scored[0].score > 0 else (sheets[0].name if sheets else None)

    return [
        SheetInfo(
            name=s.sheet.name,
            score=round(s.score, 1),
            container_hits=s.container_hits,
            n_rows=s.sheet.n_rows,
            is_auto_selected=s.sheet.name == best_name,
        )
        for s in scored
    ]


# ---------------------------------------------------------------------------
# Schema introspection
# ---------------------------------------------------------------------------


@router.get("/customer-excel/schema")
async def get_canonical_schema(
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    return {
        "fields": [
            {
                "name": f.name,
                "label": f.label,
                "required": f.required,
                "description": f.description,
            }
            for f in CANONICAL_FIELDS
        ],
        "skip_field": SKIP_FIELD,
    }


# ---------------------------------------------------------------------------
# Preview
# ---------------------------------------------------------------------------


@router.post("/customer-excel/preview")
async def preview_customer_excel(
    file: UploadFile = File(...),
    client_id: int | None = Form(None),
    default_trip_date: date | None = Form(None),
    sheet_name: str | None = Form(None),
    header_row_index: int | None = Form(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    if file.filename is None:
        raise HTTPException(status_code=400, detail="Tệp tải lên không có tên.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tải lên rỗng.")

    trip_date = default_trip_date or date.today()
    classifier = get_default_classifier()

    cached_mapping: list[ColumnMapping] | None = None
    if client_id is not None:
        sheets = load_workbook(content, file.filename)
        if not sheets:
            raise HTTPException(
                status_code=400, detail="Tệp Excel không có sheet nào."
            )
        from app.contexts.operations.infrastructure.import_pipeline.header_finder import (
            find_header_row,
            header_row_text,
        )
        from app.contexts.operations.infrastructure.import_pipeline.sheet_picker import score_sheets

        sheet = None
        if sheet_name:
            for s in sheets:
                if s.name == sheet_name:
                    sheet = s
                    break
        if sheet is None:
            scored = score_sheets(sheets)
            sheet = scored[0].sheet if scored and scored[0].score > 0 else None

        if sheet is not None:
            row_idx = header_row_index
            if row_idx is None:
                hit = find_header_row(sheet)
                row_idx = hit.row_index if hit else None
            if row_idx is not None:
                hdr_cells = header_row_text(sheet, row_idx)
                structure_hash = compute_structure_hash(sheet.name, hdr_cells)
                tpl = await find_template(db, client_id, structure_hash)
                if tpl is not None:
                    cached_mapping = column_mappings_from_dicts(
                        list(tpl.column_mapping)
                    )

    try:
        result = await run_preview(
            content,
            file.filename,
            default_trip_date=trip_date,
            classifier=classifier,
            cached_mapping=cached_mapping,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    location_resolutions = await _resolve_preview_locations(db, result.accepted)

    payload = result.to_dict()
    payload["template_used"] = cached_mapping is not None
    payload["location_resolutions"] = location_resolutions
    return payload


async def _resolve_preview_locations(
    db: AsyncSession, accepted: list[dict],
) -> dict[str, dict]:
    resolver = LocationResolverService(db)
    seen: set[str] = set()
    for r in accepted:
        v = r.get("values") or {}
        for key in ("pickup_location", "dropoff_location"):
            s = (v.get(key) or "").strip()
            if s:
                seen.add(s)

    out: dict[str, dict] = {}
    for raw in seen:
        result = await resolver.find_match(raw)
        out[raw] = {
            "raw": raw,
            "match_kind": result.match_kind.value,
            "location_id": result.location.id if result.location else None,
            "location_name": result.location.name if result.location else None,
            "review_needed": result.review_needed,
            "suggestions": [
                {"location_id": s.location_id, "name": s.name, "score": s.score}
                for s in result.suggestions
            ],
        }
    return out


# ---------------------------------------------------------------------------
# Commit
# ---------------------------------------------------------------------------


@router.post("/customer-excel/commit", response_model=CommitResponse)
async def commit_customer_excel(
    body: CommitRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles("accountant", "superadmin")),
    use_case: CreateTripOrderFromImport = Depends(
        get_create_trip_order_from_import
    ),
):
    if not body.rows:
        raise HTTPException(status_code=400, detail="Không có dòng nào để tạo.")

    client = (await db.execute(
        select(Client).where(Client.id == body.client_id)
    )).scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng.")

    rows = [
        ImportTripRow(
            container_no=r.container_no,
            container_size=r.container_size,
            freight_kind=r.freight_kind,
            work_type=r.work_type,
            container_type_iso=r.container_type_iso,
            gross_weight_kg=r.gross_weight_kg,
            seal_no=r.seal_no,
            commodity=r.commodity,
            pickup_location=r.pickup_location,
            dropoff_location=r.dropoff_location,
            trip_date=r.trip_date,
            customer_ref=r.customer_ref,
            consignee=r.consignee,
            driver_name=r.driver_name,
            remarks=r.remarks,
        )
        for r in body.rows
    ]

    try:
        result = await use_case(ImportCommitInput(
            client_id=body.client_id,
            rows=rows,
            overwrite_duplicates=body.overwrite_duplicates,
            user_id=user.id,
        ))
    except Exception as exc:
        raise translate(exc)

    template_id: int | None = None
    if (
        body.save_template_as
        and body.structure_hash
        and body.sheet_name
        and body.header_row_index is not None
        and body.column_mapping is not None
    ):
        tpl = await save_template(
            db,
            client_id=body.client_id,
            structure_hash=body.structure_hash,
            template_name=body.save_template_as,
            sheet_name=body.sheet_name,
            header_row_index=body.header_row_index,
            column_mapping=body.column_mapping,
            user_id=user.id,
        )
        template_id = tpl.id
        await db.commit()

    return CommitResponse(
        created=result.created,
        containers_created=result.containers_created,
        grouped_trips=result.grouped_trips,
        skipped_duplicates=result.skipped_duplicates,
        locations_created=result.locations_created,
        locations_review_flagged=result.locations_review_flagged,
        errors=result.errors,
        template_id=template_id,
        created_trip_ids=result.created_trip_ids,
    )


# ---------------------------------------------------------------------------
# Apply pricing
# ---------------------------------------------------------------------------


class ApplyPricingRequest(BaseModel):
    client_id: int
    trip_order_ids: list[int] | None = None


class ApplyPricingResponse(BaseModel):
    priced: int
    not_found: int
    not_found_trip_ids: list[int] = Field(default_factory=list)


class ApplyPricingByIdsRequest(BaseModel):
    trip_ids: list[int]


class ApplyPricingByIdsResponse(BaseModel):
    priced: int
    unpriced: int
    unpriced_trip_ids: list[int] = Field(default_factory=list)


@router.post("/apply-pricing", response_model=ApplyPricingResponse)
async def apply_pricing(
    body: ApplyPricingRequest = Body(...),
    use_case=Depends(get_apply_pricing_to_trips),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Legacy endpoint — kept for back-compat. See
    /imports/customer-excel/apply-pricing for the trip-id-only shape."""
    priced, unpriced_ids = await use_case(
        client_id=body.client_id,
        trip_ids=body.trip_order_ids,
        skip_already_priced=False,
    )
    return ApplyPricingResponse(
        priced=priced,
        not_found=len(unpriced_ids),
        not_found_trip_ids=unpriced_ids[:50],
    )


@router.post(
    "/customer-excel/apply-pricing", response_model=ApplyPricingByIdsResponse
)
async def apply_pricing_to_trip_ids(
    body: ApplyPricingByIdsRequest = Body(...),
    use_case=Depends(get_apply_pricing_to_trips),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Bulk-apply pricing to a specific list of trip ids. Idempotent —
    trips with unit_price > 0 are counted as already priced and not
    re-touched."""
    if not body.trip_ids:
        return ApplyPricingByIdsResponse(priced=0, unpriced=0, unpriced_trip_ids=[])

    priced, unpriced_ids = await use_case(
        client_id=None,
        trip_ids=body.trip_ids,
        skip_already_priced=True,
    )
    return ApplyPricingByIdsResponse(
        priced=priced,
        unpriced=len(unpriced_ids),
        unpriced_trip_ids=unpriced_ids[:200],
    )


@router.get("/customer-excel/templates")
async def list_templates(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    rows = await list_templates_for_partner(db, client_id)
    return [
        {
            "id": r.id,
            "client_id": r.client_id,
            "template_name": r.template_name,
            "structure_hash": r.structure_hash,
            "sheet_name": r.sheet_name,
            "header_row_index": r.header_row_index,
            "last_used_at": r.last_used_at,
            "column_count": len(r.column_mapping or []),
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Customer pricing (bảng giá) import — preview + commit
# ---------------------------------------------------------------------------


class PricingPreviewRowDto(BaseModel):
    pickup_location: str
    dropoff_location: str
    work_type: str
    unit_price: int
    quantity: int = 1
    driver_salary: int = 0
    allowance: int = 0
    note: str = ""


class PricingCommitRequest(BaseModel):
    client_id: int
    rows: list[PricingPreviewRowDto]
    update_existing_lines: bool = False


class PricingCommitResponse(BaseModel):
    pricings_created: int
    pricings_existing: int
    lines_created: int
    lines_updated: int
    lines_existing: int
    skipped_no_locations: int
    locations_created: int


@router.post("/customer-pricing/preview")
async def preview_customer_pricing(
    file: UploadFile = File(...),
    format: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    from app.contexts.customer_pricing.infrastructure.pricing_import import (
        SUPPORTED_FORMATS,
        detect_format,
        parse_tariff_bytes,
        resolve_preview_locations,
    )

    if file.filename is None:
        raise HTTPException(status_code=400, detail="Tệp tải lên không có tên.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tải lên rỗng.")

    fmt = (format or "").lower().strip() or detect_format(file.filename or "")
    if not fmt:
        raise HTTPException(
            status_code=400,
            detail=(
                "Không nhận diện được định dạng tệp bảng giá. "
                "Hãy chọn pan, hap hoặc newway."
            ),
        )
    if fmt not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Định dạng không hợp lệ: {fmt!r}. "
                f"Các định dạng được hỗ trợ: {', '.join(SUPPORTED_FORMATS)}."
            ),
        )

    try:
        preview = parse_tariff_bytes(content, fmt)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    location_resolutions = await resolve_preview_locations(db, preview.rows)
    payload = preview.to_dict()
    payload["filename"] = file.filename
    payload["location_resolutions"] = location_resolutions
    payload["supported_formats"] = list(SUPPORTED_FORMATS)
    return payload


@router.post("/customer-pricing/commit", response_model=PricingCommitResponse)
async def commit_customer_pricing(
    body: PricingCommitRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles("accountant", "superadmin")),
):
    from app.contexts.customer_pricing.infrastructure.pricing_import import TariffRow, commit_tariff_rows

    if not body.rows:
        raise HTTPException(status_code=400, detail="Không có dòng nào để tạo.")
    client = (
        await db.execute(select(Client).where(Client.id == body.client_id))
    ).scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng.")

    tariff_rows = [
        TariffRow(
            pickup_raw=r.pickup_location,
            dropoff_raw=r.dropoff_location,
            work_type=r.work_type,
            unit_price=r.unit_price,
            quantity=r.quantity,
            driver_salary=r.driver_salary,
            allowance=r.allowance,
            note=r.note,
        )
        for r in body.rows
    ]
    result = await commit_tariff_rows(
        db,
        client=client,
        rows=tariff_rows,
        user_id=user.id,
        update_existing_lines=body.update_existing_lines,
    )
    return PricingCommitResponse(
        pricings_created=result.pricings_created,
        pricings_existing=result.pricings_existing,
        lines_created=result.lines_created,
        lines_updated=result.lines_updated,
        lines_existing=result.lines_existing,
        skipped_no_locations=result.skipped_no_locations,
        locations_created=result.locations_created,
    )
