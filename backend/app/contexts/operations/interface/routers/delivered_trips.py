"""DeliveredTrip HTTP endpoints."""

from __future__ import annotations

import base64
import io
import logging
import math
from datetime import date

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.application import (
    BatchCreateDeliveredTrips,
    CreateDeliveredTrip,
    CurrentUserContext,
    GetDeliveredTrip,
    ListDeliveredTrips,
    UpdateDeliveredTrip,
)
from app.contexts.operations.application.dto import (
    DeliveredTripContainerInput,
    DeliveredTripCreateInput,
    DeliveredTripListFilters,
    DeliveredTripUpdateInput,
)
from app.contexts.operations.domain.entities import DeliveredTrip
from app.contexts.operations.domain.value_objects import DeliveredTripStatus
from app.contexts.operations.interface.dependencies import (
    get_batch_create_delivered_trips,
    get_create_delivered_trip,
    get_get_delivered_trip,
    get_list_delivered_trips,
    get_update_delivered_trip,
)
from app.contexts.operations.interface.error_translation import translate
from app.core.audit_context import set_audit_reason
from app.core.deps import get_current_user, require_permission
from app.core.redis import get_redis
from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.database import get_db
from app.schemas.domain import (
    TemplateParseResponse,
    BatchDeliveredTripCreate,
    BatchDeliveredTripResult,
    BulkImportAndMatchResult,
    ContainerOCRRequest,
    ContainerOCRResponse,
    ContainerOut,
    DeliveredTripCreate,
    DeliveredTripOut,
    DeliveredTripUpdate,
)
from app.core.summaries import (
    get_driver_summary,
    get_location_summary,
    get_partner_summary,
    load_driver_summaries,
    load_location_summaries,
    load_partner_summaries,
)
from app.utils.iso6346 import normalize_container_number as _norm

_logger = logging.getLogger(__name__)

_OCR_ATTEMPT_TTL = 600

router = APIRouter()


# ---------------------------------------------------------------------------
# Response shaping
# ---------------------------------------------------------------------------


def _wo_to_out(w: DeliveredTrip, partners, drivers, locations, matched_trip_count: int = 0) -> DeliveredTripOut:
    return DeliveredTripOut(
        id=int(w.id),  # type: ignore[arg-type]
        partner=get_partner_summary(partners, w.client_id),
        pickup_location=get_location_summary(locations, w.pickup_location_id),
        dropoff_location=get_location_summary(locations, w.dropoff_location_id),
        driver=get_driver_summary(drivers, w.driver_id),
        vendor_id=w.vendor_id,
        vessel=w.vessel,
        operation_type=w.operation_type,
        work_type=w.work_type,
        gps_lat=w.gps_lat,
        gps_lng=w.gps_lng,
        gps_address=w.gps_address,
        revenue=w.revenue,
        driver_salary=w.driver_salary,
        allowance=w.allowance,
        trip_date=w.trip_date,
        status=w.status,
        containers=[
            ContainerOut(
                id=int(c.id),  # type: ignore[arg-type]
                container_number=c.container_number,
                cont_type=c.cont_type,
                photo_url=c.photo_url,
                photo_lat=c.photo_lat,
                photo_lng=c.photo_lng,
                photo_timestamp=c.photo_timestamp,
                photo_address=c.photo_address,
            )
            for c in w.containers
        ],
        matched_trip_count=matched_trip_count,
        created_at=w.created_at,
        updated_at=w.updated_at,
    )


async def _load_one(session, w: DeliveredTrip) -> DeliveredTripOut:
    return (await _load_many(session, [w]))[0]


async def _load_many(session, wos: list[DeliveredTrip]) -> list[DeliveredTripOut]:
    if not wos:
        return []
    partners = await load_partner_summaries(session, {w.client_id for w in wos})
    drivers = await load_driver_summaries(session, {w.driver_id for w in wos})
    locations = await load_location_summaries(
        session,
        {w.pickup_location_id for w in wos}
        | {w.dropoff_location_id for w in wos},
    )
    # Count active reconciliation links per WO (multi-container matching)
    from sqlalchemy import func, select as sa_select
    from app.models.domain import Reconciliation
    wo_ids = [int(w.id) for w in wos]  # type: ignore[arg-type]
    link_counts: dict[int, int] = {}
    if wo_ids:
        rows = (await session.execute(
            sa_select(Reconciliation.delivered_trip_id, func.count())
            .where(
                Reconciliation.delivered_trip_id.in_(wo_ids),
                Reconciliation.is_active == True,  # noqa: E712
            )
            .group_by(Reconciliation.delivered_trip_id)
        )).all()
        link_counts = {r[0]: r[1] for r in rows}

    return [
        _wo_to_out(w, partners, drivers, locations, link_counts.get(int(w.id), 0))  # type: ignore[arg-type]
        for w in wos
    ]


def _hide_salary_fields(wo_out: DeliveredTripOut) -> None:
    wo_out.driver_salary = 0
    wo_out.allowance = 0


def _hide_vessel_field(wo_out: DeliveredTripOut) -> None:
    """Mask vessel from accountant views while the trip is PENDING.

    Số tàu is driver-only knowledge during transport; accountant should
    only see it after the work order has been matched (MATCHED status).
    """
    wo_out.vessel = None


def _container_inputs(items) -> list[DeliveredTripContainerInput]:
    from fastapi import HTTPException
    from app.utils.iso6346 import validate_container_number
    results: list[DeliveredTripContainerInput] = []
    for c in (items or []):
        cn = (c.container_number or "").strip()
        if cn:
            is_valid, error_msg = validate_container_number(cn)
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"Số cont '{cn}': {error_msg}")
        results.append(DeliveredTripContainerInput(
            container_number=c.container_number,
            cont_type=c.cont_type,
            photo_url=c.photo_url,
            photo_lat=c.photo_lat,
            photo_lng=c.photo_lng,
            photo_timestamp=c.photo_timestamp,
        ))
    return results


def _user_ctx(u: User) -> CurrentUserContext:
    return CurrentUserContext(id=u.id, role=u.role)


async def _enqueue_geocode(delivered_trip_id: int, lat: float, lng: float) -> None:
    try:
        from app.workers import enqueue
        await enqueue(
            "geocode_delivered_trip_task",
            delivered_trip_id=delivered_trip_id, lat=lat, lng=lng,
        )
    except Exception:
        _logger.warning("Failed to enqueue geocode for WO#%s", delivered_trip_id)


async def _enqueue_notification(w: DeliveredTrip) -> None:
    try:
        from app.workers import enqueue
        await enqueue(
            "send_notification_task",
            user_id=None,
            title="Phieu lam viec moi",
            message=f"{w.id} da duoc tao (driver_id={w.driver_id})",
            channel="in_app",
        )
    except Exception:
        _logger.warning("Failed to enqueue notification for WO#%s", w.id)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/delivered-trips/validate-container")
async def validate_container(
    container_number: str = Query(..., description="Container number to validate"),
    current_user: User = Depends(get_current_user),
):
    from app.utils.iso6346 import validate_container_number
    valid, error = validate_container_number(container_number)
    return {
        "valid": valid,
        "error": error or None,
        "normalized": _norm(container_number),
    }


@router.post("/delivered-trips", response_model=DeliveredTripOut, status_code=201)
async def create_delivered_trip_endpoint(
    body: DeliveredTripCreate,
    current_user: User = Depends(require_permission("create", "DeliveredTrip")),
    use_case: CreateDeliveredTrip = Depends(get_create_delivered_trip),
):
    try:
        w = await use_case(
            DeliveredTripCreateInput(
                client_id=body.client_id,
                pickup_location_id=body.pickup_location_id,
                dropoff_location_id=body.dropoff_location_id,
                driver_id=body.driver_id,
                vendor_id=body.vendor_id,
                vehicle_id=body.vehicle_id,
                vessel=body.vessel,
                operation_type=body.operation_type,
                containers=_container_inputs(body.containers),
                gps_lat=body.gps_lat,
                gps_lng=body.gps_lng,
                trip_date=body.trip_date,
            ),
            _user_ctx(current_user),
        )
    except Exception as exc:
        raise translate(exc)

    await _enqueue_notification(w)
    if body.gps_lat and body.gps_lng:
        await _enqueue_geocode(int(w.id), body.gps_lat, body.gps_lng)  # type: ignore[arg-type]

    return await _load_one(use_case.session, w)


@router.get("/delivered-trips", response_model=PaginatedResponse[DeliveredTripOut])
async def list_delivered_trips(
    driver_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    use_case: ListDeliveredTrips = Depends(get_list_delivered_trips),
):
    if current_user.role == "driver":
        driver_id = current_user.id

    items, total = await use_case(DeliveredTripListFilters(
        page=page, page_size=page_size,
        driver_id=driver_id,
        date_from=date_from, date_to=date_to, status=status,
    ))
    out = await _load_many(use_case.repo.session, items)  # type: ignore[attr-defined]

    if current_user.role == "driver":
        for i, w in enumerate(items):
            if w.status == DeliveredTripStatus.PENDING:
                _hide_salary_fields(out[i])
    elif current_user.role == "accountant":
        for i, w in enumerate(items):
            if w.status == DeliveredTripStatus.PENDING:
                _hide_vessel_field(out[i])

    return PaginatedResponse[DeliveredTripOut](
        items=out, total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/delivered-trips/export")
async def export_delivered_trips_excel(
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    current_user: User = Depends(require_permission("export", "DeliveredTrip")),
    use_case: GetDeliveredTrip = Depends(get_get_delivered_trip),
):
    from app.contexts.operations.infrastructure.excel import generate_delivered_trips_excel
    session = use_case.repo.session  # type: ignore[attr-defined]
    content = await generate_delivered_trips_excel(
        session,
        date_from=date_from.isoformat() if date_from else None,
        date_to=date_to.isoformat() if date_to else None,
        status=status,
    )
    return StreamingResponse(
        io.BytesIO(content),
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": "attachment; filename=delivered_trips.xlsx"},
    )


@router.post("/delivered-trips/batch", status_code=207)
async def batch_create_delivered_trips(
    body: BatchDeliveredTripCreate,
    current_user: User = Depends(require_permission("create", "DeliveredTrip")),
    use_case: BatchCreateDeliveredTrips = Depends(get_batch_create_delivered_trips),
):
    items_input = [
        DeliveredTripCreateInput(
            client_id=item.client_id,
            pickup_location_id=item.pickup_location_id,
            dropoff_location_id=item.dropoff_location_id,
            driver_id=item.driver_id,
            vehicle_id=item.vehicle_id,
            containers=_container_inputs(item.containers),
            gps_lat=item.gps_lat,
            gps_lng=item.gps_lng,
        )
        for item in body.items
    ]
    raw = await use_case(items_input, _user_ctx(current_user))
    results = [
        BatchDeliveredTripResult(
            index=i,
            id=wo_id,
            success=err is None,
            error=err,
        )
        for (i, wo_id, err) in raw
    ]
    for r in results:
        item = body.items[r.index]
        if r.success and r.id and item.gps_lat and item.gps_lng:
            await _enqueue_geocode(r.id, item.gps_lat, item.gps_lng)
    return results


@router.post("/delivered-trips/ocr-container", response_model=ContainerOCRResponse)
async def ocr_container_number(
    body: ContainerOCRRequest,
    current_user: User = Depends(get_current_user),
    redis=Depends(get_redis),
):
    from app.contexts.operations.infrastructure.ocr import MAX_OCR_ATTEMPTS, extract_container_number
    user_id = current_user.id
    rkey = f"ocr_attempts:{user_id}:{body.container_index}"

    val = await redis.get(rkey)
    attempts = int(val) if val else 0
    attempts_remaining = max(0, MAX_OCR_ATTEMPTS - attempts)
    if attempts_remaining <= 0:
        return ContainerOCRResponse(
            success=False,
            container_number=None,
            error="Da het so lan quet OCR. Vui long nhap so container thu cong.",
            attempts_remaining=0,
        )

    try:
        image_bytes = base64.b64decode(body.image_data)
    except Exception:
        return ContainerOCRResponse(
            success=False,
            container_number=None,
            error="Du lieu hinh anh khong hop le",
            attempts_remaining=attempts_remaining,
        )

    pipe = redis.pipeline()
    pipe.incr(rkey)
    pipe.expire(rkey, _OCR_ATTEMPT_TTL)
    await pipe.execute()

    result = await extract_container_number(
        image_bytes=image_bytes, mime_type=body.mime_type
    )
    val2 = await redis.get(rkey)
    attempts2 = int(val2) if val2 else 0
    result["attempts_remaining"] = max(0, MAX_OCR_ATTEMPTS - attempts2)
    return ContainerOCRResponse(**result)


@router.get("/delivered-trips/{delivered_trip_id:int}", response_model=DeliveredTripOut)
async def get_delivered_trip(
    delivered_trip_id: int,
    current_user: User = Depends(get_current_user),
    use_case: GetDeliveredTrip = Depends(get_get_delivered_trip),
):
    try:
        w = await use_case(delivered_trip_id)
    except Exception as exc:
        raise translate(exc)
    # Drivers can only access their own work orders; mask others as 404
    # to avoid leaking existence to a horizontally-scoped caller.
    if current_user.role == "driver" and w.driver_id != current_user.id:
        from app.contexts.operations.domain.exceptions import NotFound
        raise translate(NotFound("DeliveredTrip", delivered_trip_id))
    out = await _load_one(use_case.repo.session, w)  # type: ignore[attr-defined]
    if current_user.role == "driver" and w.status == DeliveredTripStatus.PENDING:
        _hide_salary_fields(out)
    elif current_user.role == "accountant" and w.status == DeliveredTripStatus.PENDING:
        _hide_vessel_field(out)
    return out


@router.post("/delivered-trips/bulk-import-and-match", response_model=BulkImportAndMatchResult, status_code=201)
async def bulk_import_and_match(
    file: UploadFile = File(...),
    client_id: int | None = Form(None),
    current_user: User = Depends(require_permission("create", "DeliveredTrip")),
    db: AsyncSession = Depends(get_db),
):
    """Import work orders from Excel and auto-match against trip orders.

    Accepts .xlsx files with columns: container, date, client, pickup, dropoff,
    amount. Columns are auto-detected from headers (Vietnamese + English).
    """
    if file.filename is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Tệp tải lên không có tên.")
    if not file.filename.endswith((".xlsx", ".xls")):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file .xlsx hoặc .xls.")

    content = await file.read()
    if not content:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Tệp tải lên rỗng.")

    from app.contexts.operations.application.bulk_import_service import BulkImportService
    service = BulkImportService(db)
    try:
        result = await service.import_and_match(
            content=content,
            filename=file.filename,
            client_id=client_id,
            user_id=current_user.id,
        )
    except Exception as exc:
        _logger.exception("Bulk import failed: %s", exc)
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail=f"Không thể xử lý file: {exc}")

    return BulkImportAndMatchResult(
        total_rows=result.total_rows,
        created=result.created,
        matched=result.matched,
        warnings=result.warnings,
        unmatched=result.unmatched,
        errors=result.errors,
    )


@router.put("/delivered-trips/{delivered_trip_id:int}", response_model=DeliveredTripOut)
async def update_delivered_trip(
    delivered_trip_id: int,
    body: DeliveredTripUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    use_case: UpdateDeliveredTrip = Depends(get_update_delivered_trip),
):
    containers_input = (
        _container_inputs(body.containers) if body.containers is not None
        else None
    )
    try:
        w = await use_case(
            delivered_trip_id,
            DeliveredTripUpdateInput(
                client_id=body.client_id,
                pickup_location_id=body.pickup_location_id,
                dropoff_location_id=body.dropoff_location_id,
                driver_id=body.driver_id,
                vendor_id=body.vendor_id,
                vehicle_id=body.vehicle_id,
                vessel=body.vessel,
                operation_type=body.operation_type,
                containers=containers_input,
                gps_lat=body.gps_lat,
                gps_lng=body.gps_lng,
                revenue=body.revenue,
                driver_salary=body.driver_salary,
                allowance=body.allowance,
                status=body.status,
            ),
            _user_ctx(current_user),
        )
    except Exception as exc:
        raise translate(exc)
    try:
        return await _load_one(use_case.session, w)
    except Exception as exc:
        _logger.exception("Failed to load WO#%s after update", delivered_trip_id)
        raise translate(exc)


# ---------------------------------------------------------------------------
# Container number update (inline edit during reconciliation)
# ---------------------------------------------------------------------------

@router.patch("/delivered-trips/{delivered_trip_id:int}/containers/{container_id:int}", response_model=ContainerOut)
async def update_container_number(
    delivered_trip_id: int,
    container_id: int,
    body: dict,
    current_user: User = Depends(require_permission("update", "DeliveredTrip")),
    session: AsyncSession = Depends(get_db),
):
    from fastapi import HTTPException
    from pydantic import BaseModel
    from sqlalchemy import select

    class ContainerNumberUpdate(BaseModel):
        container_number: str

    update = ContainerNumberUpdate(**body)
    new_cn = update.container_number.strip().upper().replace(" ", "").replace("-", "")

    # Validate ISO 6346
    from app.utils.iso6346 import validate_container_number
    is_valid, error_msg = validate_container_number(new_cn)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    from app.models.domain import DeliveredTripContainer
    container = (await session.execute(
        select(DeliveredTripContainer).where(
            DeliveredTripContainer.id == container_id,
            DeliveredTripContainer.delivered_trip_id == delivered_trip_id,
        )
    )).scalar_one_or_none()

    if container is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy container")

    container.container_number = new_cn
    await session.commit()

    return ContainerOut(
        id=container.id,
        container_number=container.container_number,
        cont_type=container.cont_type,
    )


# ---------------------------------------------------------------------------
# Template Excel Parse Preview
# ---------------------------------------------------------------------------

@router.post("/delivered-trips/ai-parse-preview", response_model=TemplateParseResponse)
async def ai_parse_preview(
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("create", "DeliveredTrip")),
):
    """Parse a customer-template Excel file (SL sheet, fixed column layout).
    Returns rows with Vietnamese column names for accountant review.
    Does NOT commit to DB — user must confirm via bulk-import-and-match.
    """
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file .xlsx hoặc .xls.")

    contents = await file.read()

    try:
        from app.ai.pipeline import parse_template_excel
        result = parse_template_excel(io.BytesIO(contents), file.filename)
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        _logger.exception("Excel parse failed: %s", e)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Lỗi đọc file Excel: {e}")

    return TemplateParseResponse(
        filename=result.filename,
        sheet_name=result.sheet_name,
        total_rows=result.total_rows,
        columns=result.columns,
        rows=result.rows,
        duplicate_groups=[
            {"type": g.type, "row_indices": g.row_indices, "containers": g.containers, "message": g.message}
            for g in (result.duplicate_groups or [])
        ],
        warnings=result.warnings or [],
    )
