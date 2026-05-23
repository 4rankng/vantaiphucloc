"""BookedTrip HTTP endpoints.

Wires use cases to the same `/booked-trips` URL paths the legacy router
served, so the frontend keeps working unchanged.
"""

from __future__ import annotations

import io
import logging
import math
from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse

from app.contexts.operations.application import (
    CreateBookedTrip,
    DeleteBookedTrip,
    GetBookedTrip,
    ListBookedTrips,
    UpdateBookedTrip,
)
from app.contexts.operations.application.dto import (
    BookedTripCreateInput,
    BookedTripListFilters,
    BookedTripUpdateInput,
)
from app.contexts.operations.domain.entities import BookedTrip
from app.contexts.operations.interface.dependencies import (
    get_create_booked_trip,
    get_delete_booked_trip,
    get_get_booked_trip,
    get_list_booked_trips,
    get_update_booked_trip,
)
from app.contexts.operations.interface.error_translation import translate
from app.core.audit_context import set_audit_reason
from app.core.deps import require_permission
from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.schemas.domain import (
    CancelRequest,
    BookedTripCreate,
    BookedTripOut,
    BookedTripUpdate,
)
from app.core.summaries import (
    get_client_summary,
    get_location_summary,
    load_client_summaries,
    load_location_summaries,
)

_logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Response shaping
# ---------------------------------------------------------------------------


def _trip_to_out(t: BookedTrip, clients, locations) -> BookedTripOut:
    return BookedTripOut(
        id=int(t.id),  # type: ignore[arg-type]
        trip_date=t.trip_date,
        client=get_client_summary(clients, t.client_id),
        pickup_location=get_location_summary(locations, t.pickup_location_id),
        dropoff_location=get_location_summary(locations, t.dropoff_location_id),
        cont_number=t.cont_number,
        cont_type=t.cont_type,
        vessel=t.vessel,
        vehicle_plate=t.vehicle_plate,
        work_type=t.work_type,
        revenue=t.revenue,
        matched=t.matched,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


async def _load_one(session, t: BookedTrip) -> BookedTripOut:
    return (await _load_many(session, [t]))[0]


async def _load_many(session, trips: list[BookedTrip]) -> list[BookedTripOut]:
    if not trips:
        return []
    clients = await load_client_summaries(
        session, {t.client_id for t in trips}
    )
    locations = await load_location_summaries(
        session,
        {t.pickup_location_id for t in trips}
        | {t.dropoff_location_id for t in trips},
    )
    return [_trip_to_out(t, clients, locations) for t in trips]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/booked-trips", response_model=BookedTripOut, status_code=201)
async def create_booked_trip(
    body: BookedTripCreate,
    request: Request,
    current_user: User = Depends(require_permission("read", "BookedTrip")),
    use_case: CreateBookedTrip = Depends(get_create_booked_trip),
):
    try:
        t = await use_case(BookedTripCreateInput(
            trip_date=body.trip_date,
            client_id=body.client_id,
            pickup_location_id=body.pickup_location_id,
            dropoff_location_id=body.dropoff_location_id,
            cont_number=body.cont_number,
            cont_type=body.cont_type,
            revenue=body.revenue,
        ))
    except Exception as exc:
        raise translate(exc)
    return await _load_one(use_case.session, t)


@router.get("/booked-trips", response_model=PaginatedResponse[BookedTripOut])
async def list_booked_trips(
    client_id: int | None = None,
    matched: bool | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    unpriced: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    current_user: User = Depends(require_permission("read", "BookedTrip")),
    use_case: ListBookedTrips = Depends(get_list_booked_trips),
):
    items, total = await use_case(BookedTripListFilters(
        page=page, page_size=page_size,
        client_id=client_id, matched=matched,
        date_from=date_from, date_to=date_to,
        unpriced=unpriced,
    ))
    out = await _load_many(use_case.repo.session, items)  # type: ignore[attr-defined]
    return PaginatedResponse[BookedTripOut](
        items=out, total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/booked-trips/template")
async def download_booked_trip_template(
    current_user: User = Depends(require_permission("create", "BookedTrip")),
):
    from app.contexts.operations.infrastructure.excel import generate_booked_trip_template
    content = generate_booked_trip_template()
    return StreamingResponse(
        io.BytesIO(content),
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": "attachment; filename=booked_trip_template.xlsx"
        },
    )


@router.post("/booked-trips/import", status_code=200)
async def import_booked_trips_excel(
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("create", "BookedTrip")),
    use_case: GetBookedTrip = Depends(get_get_booked_trip),
):
    """Legacy plain-Excel BookedTrip import. Distinct from the partner-Excel
    import pipeline at `/imports/partner-excel/*`."""
    from app.contexts.operations.infrastructure.excel import import_booked_trips, parse_booked_trip_excel
    content = await file.read()
    rows = await parse_booked_trip_excel(content)
    if not rows:
        raise HTTPException(
            status_code=400, detail="File Excel trong hoac khong dung dinh dang"
        )
    session = use_case.repo.session  # type: ignore[attr-defined]
    return await import_booked_trips(session, rows, current_user.id)


@router.get("/booked-trips/export")
async def export_booked_trips_excel(
    date_from: date | None = None,
    date_to: date | None = None,
    matched: bool | None = None,
    client_id: int | None = None,
    current_user: User = Depends(require_permission("create", "BookedTrip")),
    use_case: GetBookedTrip = Depends(get_get_booked_trip),
):
    from app.contexts.operations.infrastructure.excel import generate_booked_trips_excel
    session = use_case.repo.session  # type: ignore[attr-defined]
    content, client_name = await generate_booked_trips_excel(
        session,
        date_from=date_from.isoformat() if date_from else None,
        date_to=date_to.isoformat() if date_to else None,
        matched=matched,
        client_id=client_id,
    )
    if client_id and client_name:
        from app.utils.text import slugify_vi
        slug = slugify_vi(client_name)
        filename = f"chuyen_khach_hang_{slug}_{date.today().isoformat()}.xlsx"
    else:
        filename = "booked_trips.xlsx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/booked-trips/distinct-partners")
async def get_distinct_trip_partners(
    date_from: date | None = None,
    date_to: date | None = None,
    current_user: User = Depends(require_permission("read", "BookedTrip")),
    use_case: ListBookedTrips = Depends(get_list_booked_trips),
):
    """Return distinct partners that have trip orders in the given date range.
    Used by the Xuất đối soát dialog to populate the customer dropdown."""
    from sqlalchemy import text
    session = use_case.repo.session  # type: ignore[attr-defined]
    sql = "SELECT DISTINCT p.id, p.name FROM partners p " \
          "JOIN booked_trips t ON t.client_id = p.id " \
          "WHERE p.is_active = true"
    params = {}
    if date_from:
        sql += " AND t.trip_date >= :date_from"
        params["date_from"] = date_from
    if date_to:
        sql += " AND t.trip_date <= :date_to"
        params["date_to"] = date_to
    sql += " ORDER BY p.name"
    rows = await session.execute(text(sql), params)
    return [{"id": r.id, "name": r.name} for r in rows]


@router.get("/booked-trips/export-doi-soat")
async def export_doi_soat_excel(
    client_id: int = Query(..., description="Partner (khách hàng) ID"),
    date_from: date = Query(..., description="From date (YYYY-MM-DD)"),
    date_to: date = Query(..., description="To date (YYYY-MM-DD)"),
    current_user: User = Depends(require_permission("create", "BookedTrip")),
    use_case: GetBookedTrip = Depends(get_get_booked_trip),
):
    from app.contexts.operations.infrastructure.excel import generate_doi_soat_excel
    from app.utils.text import slugify_vi

    session = use_case.repo.session  # type: ignore[attr-defined]
    content, client_name = await generate_doi_soat_excel(
        session, client_id, date_from.isoformat(), date_to.isoformat(),
    )
    slug = slugify_vi(client_name)
    # Format: DoiSoat_<KH>_MM-YYYY  (use date_from's month as the report month)
    month_str = date_from.strftime("%m-%Y")
    filename = f"DoiSoat_{slug}_{month_str}.xlsx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/booked-trips/{booked_trip_id}", response_model=BookedTripOut)
async def get_booked_trip(
    booked_trip_id: int,
    current_user: User = Depends(require_permission("read", "BookedTrip")),
    use_case: GetBookedTrip = Depends(get_get_booked_trip),
):
    try:
        t = await use_case(booked_trip_id)
    except Exception as exc:
        raise translate(exc)
    return await _load_one(use_case.repo.session, t)  # type: ignore[attr-defined]


@router.put("/booked-trips/{booked_trip_id}", response_model=BookedTripOut)
async def update_booked_trip(
    booked_trip_id: int,
    body: BookedTripUpdate,
    request: Request,
    current_user: User = Depends(require_permission("read", "BookedTrip")),
    use_case: UpdateBookedTrip = Depends(get_update_booked_trip),
):
    try:
        t = await use_case(booked_trip_id, BookedTripUpdateInput(
            trip_date=body.trip_date,
            client_id=body.client_id,
            pickup_location_id=body.pickup_location_id,
            dropoff_location_id=body.dropoff_location_id,
            cont_number=body.cont_number,
            cont_type=body.cont_type,
            vessel=body.vessel,
            vehicle_plate=body.vehicle_plate,
            work_type=body.work_type,
            revenue=body.revenue,
            driver_salary=body.driver_salary,
            allowance=body.allowance,
            matched=body.matched,
        ))
    except Exception as exc:
        raise translate(exc)

    return await _load_one(use_case.session, t)


@router.delete("/booked-trips/{booked_trip_id}", status_code=204)
async def delete_booked_trip(
    booked_trip_id: int,
    body: CancelRequest,
    request: Request,
    current_user: User = Depends(require_permission("read", "BookedTrip")),
    use_case: DeleteBookedTrip = Depends(get_delete_booked_trip),
):
    set_audit_reason(body.reason)
    try:
        await use_case(booked_trip_id)
    except Exception as exc:
        raise translate(exc)
    return None
