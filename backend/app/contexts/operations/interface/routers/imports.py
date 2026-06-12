"""Customer-Excel + customer-pricing import endpoints.

Two-stage flow per upload:

  1. `POST /imports/customer-excel/preview` — multipart upload. Detects
     sheet, header row, column mapping; returns parsed preview rows
     plus a per-string LocationResolver "find" result for the UI.

  2. `POST /imports/customer-excel/commit` — JSON body with confirmed
     rows. Hands rows to `CreateBookedTripFromImport`. Idempotent on
     `(client_id, trip_date, container_number)`.
"""

from __future__ import annotations

import base64

import json
import logging
import uuid
from datetime import date, datetime

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
)
from app.contexts.operations.application import CreateBookedTripFromImport
from app.contexts.operations.application.dto import (
    ImportCommitInput,
    ImportTripRow,
)
from app.contexts.operations.interface.dependencies import (
    get_create_booked_trip_from_import,
    get_mapping_profile_repository,
)
from app.contexts.operations.interface.error_translation import translate
from app.core.deps import require_roles
from app.database import get_db
from app.models.base import User
from app.models.domain import Client
from app.contexts.operations.infrastructure.repositories import (
    MappingProfileRepository,
)
from app.contexts.operations.infrastructure.import_pipeline.canonical import CANONICAL_FIELDS, SKIP_FIELD
from app.contexts.operations.infrastructure.import_pipeline.llm import get_batch_classifier
from app.contexts.operations.infrastructure.import_pipeline.pipeline import (
    run_preview,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import load_workbook
from app.core.worker import get_arq_pool
from app.workers import enqueue

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/imports", tags=["imports"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class CommitRow(BaseModel):
    container_no: str
    container_size: str
    freight_kind: str
    cont_type: str = ""
    work_type: str = "CHUYỂN BÃI"
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
    vessel: str = ""
    remarks: str = ""
    freight_kind_unknown: bool = False  # True if freight_kind needs ketoan resolution


class CommitRequest(BaseModel):
    client_id: int
    rows: list[CommitRow]
    overwrite_duplicates: bool = False


class CommitResponse(BaseModel):
    created: int
    updated: int = 0
    grouped_trips: int = 0
    skipped_duplicates: int = 0
    locations_created: int = 0
    locations_review_flagged: int = 0
    errors: list[str] = Field(default_factory=list)
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


class ImportPreviewEnqueueResponse(BaseModel):
    job_id: str
    status: str = "queued"
    message: str = "Đang phân tích file, vui lòng chờ."


@router.post("/customer-excel/preview-async", response_model=ImportPreviewEnqueueResponse)
async def enqueue_preview_customer_excel(
    file: UploadFile = File(...),
    default_trip_date: date | None = Form(None),
    sheet_name: str | None = Form(None),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Enqueue a customer-Excel preview job. Returns job_id; the frontend
    polls `/imports/customer-excel/jobs/{job_id}` for the result.
    
    Generates a unique job ID for every upload to prevent stale caching issues.
    """
    if file.filename is None:
        raise HTTPException(status_code=400, detail="Tệp tải lên không có tên.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tải lên rỗng.")

    trip_date = default_trip_date or date.today()
    job_id = uuid.uuid4().hex

    try:
        await enqueue(
            "import_excel_preview_task",
            _job_id=job_id,
            job_id=job_id,
            file_bytes_b64=base64.b64encode(content).decode(),
            filename=file.filename,
            default_trip_date_iso=trip_date.isoformat(),
            sheet_name=sheet_name,
        )
    except Exception as exc:
        _logger.exception("Failed to enqueue import preview: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Không thể enqueue job. Vui lòng thử lại sau.",
        ) from exc

    return ImportPreviewEnqueueResponse(job_id=job_id)


@router.get("/customer-excel/jobs/{job_id}")
async def get_import_preview_status(
    job_id: str,
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Return the worker's preview result. Polls the same Redis job that
    /jobs/{job_id} reads, but keeps the URL scoped to the imports
    namespace so the frontend has a clean per-feature polling target.

    The worker stores the full PreviewResult under the job's result key.
    Once `status == "complete"`, `result` is a dict with keys
    `accepted`, `rejected`, `warnings`, `column_mappings`, `stats`,
    `location_resolutions`, etc.
    """
    from arq.jobs import Job, JobStatus

    pool = get_arq_pool()
    job = Job(job_id, redis=pool)
    status = await job.status()

    if status == JobStatus.not_found:
        return {"job_id": job_id, "status": "not_found"}

    info = await job.info()
    result = None
    if info and hasattr(info, "result") and info.result is not None:
        result = (
            info.result
            if isinstance(info.result, dict)
            else {"value": str(info.result)}
        )

    return {"job_id": job_id, "status": status.value, "result": result}


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
    """Synchronous fallback. Use /preview-async for production.

    Kept for: (1) backwards compatibility with internal scripts that
    curl the endpoint, (2) cases where the worker is down and we want
    a best-effort sync response.
    """
    if file.filename is None:
        raise HTTPException(status_code=400, detail="Tệp tải lên không có tên.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tải lên rỗng.")

    trip_date = default_trip_date or date.today()
    classifier = get_batch_classifier()

    try:
        result = await run_preview(
            content,
            file.filename,
            default_trip_date=trip_date,
            classifier=classifier,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    location_resolutions = await resolve_preview_locations(db, result.accepted)

    payload = result.to_dict()
    payload["location_resolutions"] = location_resolutions
    return payload


async def resolve_preview_locations(
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
    use_case: CreateBookedTripFromImport = Depends(
        get_create_booked_trip_from_import
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
            cont_type=r.cont_type,
            work_type=r.work_type,
            container_type_iso=r.container_type_iso,
            gross_weight_kg=r.gross_weight_kg,
            seal_no=r.seal_no,
            commodity=r.commodity,
            pickup_date=r.pickup_date,
            dropoff_date=r.dropoff_date,
            pickup_location=r.pickup_location,
            dropoff_location=r.dropoff_location,
            trip_date=r.trip_date,
            customer_ref=r.customer_ref,
            consignee=r.consignee,
            driver_name=r.driver_name,
            vessel=r.vessel,
            remarks=r.remarks,
            freight_kind_unknown=r.freight_kind_unknown,
        )
        for r in body.rows
    ]

    # Validate that all rows have resolved freight kinds
    unresolved_indices = [
        i for i, row in enumerate(rows) if row.freight_kind_unknown
    ]
    if unresolved_indices:
        raise HTTPException(
            status_code=400,
            detail=f"Các dòng sau cần xác định loại container (E/F): {unresolved_indices}. "
                   f"Vui lòng giải quyết trong preview trước khi lưu.",
        )

    try:
        result = await use_case(ImportCommitInput(
            client_id=body.client_id,
            rows=rows,
            overwrite_duplicates=body.overwrite_duplicates,
            user_id=user.id,
        ))
    except Exception as exc:
        raise translate(exc)

    return CommitResponse(
        created=result.created,
        updated=result.updated,
        grouped_trips=result.grouped_trips,
        skipped_duplicates=result.skipped_duplicates,
        locations_created=result.locations_created,
        locations_review_flagged=result.locations_review_flagged,
        errors=result.errors,
        created_trip_ids=result.created_trip_ids,
    )


# ---------------------------------------------------------------------------
# Customer pricing (bảng giá) import — preview + commit
# ---------------------------------------------------------------------------


class PricingPreviewRowDto(BaseModel):
    pickup_location: str
    dropoff_location: str
    work_type: str
    revenue: int
    quantity: int = 1
    driver_salary: int = 0
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
    client_id: int | None = Form(None),
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

    location_resolutions = await resolve_preview_locations(db, preview.rows, client_id=client_id)
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
            revenue=r.revenue,
            quantity=r.quantity,
            driver_salary=r.driver_salary,
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


# ---------------------------------------------------------------------------
# Mapping Profile schemas
# ---------------------------------------------------------------------------


class MappingProfileCreateSchema(BaseModel):
    profile_name: str = Field(..., min_length=1, max_length=64)
    template_filename: str
    header_signature: str
    column_mapping: dict[str, str]
    pivot_columns: list[str] = Field(default_factory=list)


class MappingProfileSchema(BaseModel):
    id: int
    profile_name: str
    template_filename: str
    header_signature: str
    column_mapping: dict[str, str]
    pivot_columns: list[str]
    created_at: datetime
    last_used_at: datetime | None
    use_count: int

    model_config = {"from_attributes": True}


def _profile_to_dict(profile) -> dict:
    """Convert a MappingProfile ORM object to a dict for MappingProfileSchema."""
    return {
        "id": profile.id,
        "profile_name": profile.profile_name,
        "template_filename": profile.template_filename,
        "header_signature": profile.header_signature,
        "column_mapping": json.loads(profile.column_mapping_json),
        "pivot_columns": json.loads(profile.pivot_columns_json),
        "created_at": profile.created_at,
        "last_used_at": profile.last_used_at,
        "use_count": profile.use_count,
    }


# ---------------------------------------------------------------------------
# Mapping Profile endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/customer-excel/profiles",
    response_model=list[MappingProfileSchema],
)
async def list_profiles(
    profile_name: str | None = None,
    repo: MappingProfileRepository = Depends(get_mapping_profile_repository),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    profiles = await repo.list_active(profile_name=profile_name)
    return [_profile_to_dict(p) for p in profiles]


@router.post(
    "/customer-excel/profiles",
    response_model=MappingProfileSchema,
    status_code=201,
)
async def save_profile(
    payload: MappingProfileCreateSchema,
    repo: MappingProfileRepository = Depends(get_mapping_profile_repository),
    user: User = Depends(require_roles("accountant", "superadmin")),
):
    profile = await repo.create(
        profile_name=payload.profile_name,
        template_filename=payload.template_filename,
        header_signature=payload.header_signature,
        column_mapping_json=json.dumps(payload.column_mapping),
        pivot_columns_json=json.dumps(payload.pivot_columns),
        created_by_id=user.id,
    )
    return _profile_to_dict(profile)
