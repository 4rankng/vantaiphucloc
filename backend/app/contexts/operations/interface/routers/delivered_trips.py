"""DeliveredTrip HTTP endpoints."""

from __future__ import annotations

import base64
import io
import logging
import math
from datetime import date

from fastapi import APIRouter, Depends, Query, Request, UploadFile
from fastapi.responses import StreamingResponse

from app.contexts.operations.application import (
    CreateDeliveredTrip,
    CurrentUserContext,
    DeleteDeliveredTrip,
    GetDeliveredTrip,
    ListDeliveredTrips,
    UpdateDeliveredTrip,
)
from app.contexts.operations.application.dto import (
    DeliveredTripCreateInput,
    DeliveredTripListFilters,
    DeliveredTripUpdateInput,
)
from app.contexts.operations.domain.entities import DeliveredTrip
from app.contexts.operations.interface.dependencies import (
    get_create_delivered_trip,
    get_delete_delivered_trip,
    get_get_delivered_trip,
    get_list_delivered_trips,
    get_update_delivered_trip,
)
from app.contexts.operations.interface.error_translation import translate
from app.core.deps import get_current_user, require_permission
from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.schemas.domain import (
    DeliveredTripCreate,
    DeliveredTripOut,
    DeliveredTripUpdate,
)
from app.core.summaries import (
    load_driver_summaries,
    load_location_summaries,
    load_client_summaries,
    load_vendor_summaries,
    get_driver_summary,
    get_location_summary,
    get_client_summary,
    get_vendor_summary,
)
from app.schemas._ocr import ContainerOCRRequest
from app.contexts.operations.infrastructure.ocr import extract_container_number
from app.utils.iso6346 import normalize_container_number as _norm

_logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Response shaping
# ---------------------------------------------------------------------------


def _wo_to_out(w: DeliveredTrip, partners, drivers, locations, vendors) -> DeliveredTripOut:
    return DeliveredTripOut(
        id=int(w.id),  # type: ignore[arg-type]
        client=get_client_summary(partners, w.client_id),
        pickup_location=get_location_summary(locations, w.pickup_location_id),
        dropoff_location=get_location_summary(locations, w.dropoff_location_id),
        driver=get_driver_summary(drivers, w.driver_id),
        vendor=get_vendor_summary(vendors, w.vendor_id),
        vendor_id=w.vendor_id,
        vehicle_plate=w.vehicle_plate or "",
        vessel=w.vessel,
        work_type=w.work_type,
        cont_number=w.cont_number,
        cont_type=w.cont_type,
        revenue=w.revenue,
        driver_salary=w.driver_salary,
        trip_date=w.trip_date,
        booked_trip_id=w.booked_trip_id,
        created_at=w.created_at,
        updated_at=w.updated_at,
    )


async def _load_one(session, w: DeliveredTrip) -> DeliveredTripOut:
    return (await _load_many(session, [w]))[0]


async def _load_many(session, wos: list[DeliveredTrip]) -> list[DeliveredTripOut]:
    if not wos:
        return []
    partners = await load_client_summaries(session, {w.client_id for w in wos})
    drivers = await load_driver_summaries(session, {w.driver_id for w in wos})
    vendors = await load_vendor_summaries(session, {w.vendor_id for w in wos})
    locations = await load_location_summaries(
        session,
        {w.pickup_location_id for w in wos}
        | {w.dropoff_location_id for w in wos},
    )
    return [
        _wo_to_out(w, partners, drivers, locations, vendors)
        for w in wos
    ]


def _user_ctx(u: User) -> CurrentUserContext:
    return CurrentUserContext(id=u.id, role=u.role)


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
    from app.utils.iso6346 import (
        suggest_corrections,
        validate_container_number,
    )
    valid, error = validate_container_number(container_number)
    # Only compute suggestions when the format is right but the check digit is
    # wrong — that's the recoverable case where a 1-2 digit typo is likely.
    # For format errors there's too much guesswork (e.g. wrong length).
    suggestions: list[str] = []
    if not valid and error and "kiểm tra" in error:
        suggestions = suggest_corrections(container_number, max_results=3)
    return {
        "valid": valid,
        "error": error or None,
        "normalized": _norm(container_number),
        "suggestions": suggestions,
    }


@router.post("/delivered-trips/ocr-container")
async def ocr_container(
    body: ContainerOCRRequest,
    current_user: User = Depends(get_current_user),
):
    image_bytes = base64.b64decode(body.image_data)
    result = await extract_container_number(image_bytes, body.mime_type)
    return {
        "success": result["success"],
        "container_number": result.get("container_number"),
        "error": result.get("error"),
        "attempts_remaining": 3,
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
                vehicle_plate=body.vehicle_plate,
                vessel=body.vessel,
                work_type=body.work_type,
                cont_number=body.cont_number,
                cont_type=body.cont_type,
                trip_date=body.trip_date,
            ),
            _user_ctx(current_user),
        )
    except Exception as exc:
        raise translate(exc)

    await _enqueue_notification(w)
    return await _load_one(use_case.session, w)


_VALID_SORT_COLS = {
    'trip_date', 'vessel', 'matched', 'revenue', 'created_at',
    'client_code', 'vehicle_plate', 'pickup_name', 'dropoff_name',
    'cont_number', 'cont_type', 'work_type',
}


@router.get("/delivered-trips", response_model=PaginatedResponse[DeliveredTripOut])
async def list_delivered_trips(
    client_id: int | None = None,
    driver_id: int | None = None,
    vendor_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    matched: bool | None = None,
    search: str | None = Query(None, description="Search vessel, container number, client name/code"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    sort_by: str | None = Query(None, description="Sort column: trip_date | vessel | matched | revenue | created_at"),
    sort_order: str = Query('desc', pattern='^(asc|desc)$'),
    current_user: User = Depends(get_current_user),
    use_case: ListDeliveredTrips = Depends(get_list_delivered_trips),
):
    if current_user.role == "driver":
        driver_id = current_user.id

    safe_sort_by = sort_by if sort_by in _VALID_SORT_COLS else None

    items, total = await use_case(DeliveredTripListFilters(
        page=page, page_size=page_size,
        client_id=client_id,
        driver_id=driver_id,
        vendor_id=vendor_id,
        date_from=date_from, date_to=date_to, matched=matched,
        sort_by=safe_sort_by,
        sort_order=sort_order,
        search=search,
    ))
    out = await _load_many(use_case.repo.session, items)  # type: ignore[attr-defined]

    return PaginatedResponse[DeliveredTripOut](
        items=out, total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/delivered-trips/export")
async def export_delivered_trips_excel(
    date_from: date | None = None,
    date_to: date | None = None,
    matched: bool | None = None,
    current_user: User = Depends(require_permission("export", "DeliveredTrip")),
    use_case: GetDeliveredTrip = Depends(get_get_delivered_trip),
):
    from app.contexts.operations.infrastructure.excel import generate_delivered_trips_excel
    session = use_case.repo.session  # type: ignore[attr-defined]
    content = await generate_delivered_trips_excel(
        session,
        date_from=date_from.isoformat() if date_from else None,
        date_to=date_to.isoformat() if date_to else None,
        matched=matched,
    )
    return StreamingResponse(
        io.BytesIO(content),
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": "attachment; filename=delivered_trips.xlsx"},
    )


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
    return out


@router.put("/delivered-trips/{delivered_trip_id:int}", response_model=DeliveredTripOut)
async def update_delivered_trip(
    delivered_trip_id: int,
    body: DeliveredTripUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    use_case: UpdateDeliveredTrip = Depends(get_update_delivered_trip),
):
    try:
        w = await use_case(
            delivered_trip_id,
            DeliveredTripUpdateInput(
                client_id=body.client_id,
                pickup_location_id=body.pickup_location_id,
                dropoff_location_id=body.dropoff_location_id,
                driver_id=body.driver_id,
                vendor_id=body.vendor_id,
                vehicle_plate=body.vehicle_plate,
                vessel=body.vessel,
                work_type=body.work_type,
                cont_number=body.cont_number,
                cont_type=body.cont_type,
                trip_date=body.trip_date,
                revenue=body.revenue,
                driver_salary=body.driver_salary,
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


@router.delete("/delivered-trips/{delivered_trip_id:int}", status_code=204)
async def delete_delivered_trip(
    delivered_trip_id: int,
    current_user: User = Depends(get_current_user),
    use_case: DeleteDeliveredTrip = Depends(get_delete_delivered_trip),
):
    try:
        await use_case(delivered_trip_id, _user_ctx(current_user))
    except Exception as exc:
        raise translate(exc)


# ---------------------------------------------------------------------------
# Parse preview (heuristic column mapping — no DB write)
# ---------------------------------------------------------------------------

@router.post("/delivered-trips/parse-preview")
async def parse_preview(
    file: UploadFile,
    current_user: User = Depends(require_permission("create", "DeliveredTrip")),
):
    """Heuristic column-mapping preview for Excel/CSV input files.

    Detects header row, maps columns, parses rows, and checks for duplicate
    containers.  Does NOT write to DB — the user must confirm via the
    bulk-import-and-match endpoint.
    """
    from dataclasses import asdict
    from fastapi import HTTPException

    if not file.filename:
        raise HTTPException(status_code=400, detail="Tệp tải lên không có tên.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Tệp tải lên rỗng.")

    try:
        from app.ai.pipeline import parse_template_excel
        result = parse_template_excel(io.BytesIO(contents), file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        _logger.exception("parse_preview failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Lỗi phân tích file: {exc}") from exc

    return {
        "filename": result.filename,
        "sheet_name": result.sheet_name,
        "total_rows": result.total_rows,
        "columns": result.columns,
        "rows": result.rows[:100],
        "duplicate_groups": [asdict(g) for g in (result.duplicate_groups or [])],
        "warnings": result.warnings or [],
    }
