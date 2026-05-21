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
    TripContainerInput,
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
    TripContainerOut,
    
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


def _trip_to_out(t: BookedTrip, partners, locations) -> BookedTripOut:
    return BookedTripOut(
        id=int(t.id),  # type: ignore[arg-type]
        trip_date=t.trip_date,
        client=get_client_summary(partners, t.client_id),
        pickup_location=get_location_summary(locations, t.pickup_location_id),
        dropoff_location=get_location_summary(locations, t.dropoff_location_id),
        containers=[
            TripContainerOut(
                id=int(c.id),  # type: ignore[arg-type]
                container_number=c.container_number,
                cont_type=c.cont_type,
            )
            for c in t.containers
        ],
        vessel=t.vessel,
        operation_type=t.operation_type,
        work_type=t.work_type,
        revenue=t.revenue,
        status=t.status,
        matched_delivered_trip_ids=list(t.matched_delivered_trip_ids),
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


async def _load_one(session, t: BookedTrip) -> BookedTripOut:
    return (await _load_many(session, [t]))[0]


async def _load_many(session, trips: list[BookedTrip]) -> list[BookedTripOut]:
    if not trips:
        return []
    partners = await load_client_summaries(
        session, {t.client_id for t in trips}
    )
    locations = await load_location_summaries(
        session,
        {t.pickup_location_id for t in trips}
        | {t.dropoff_location_id for t in trips},
    )
    return [_trip_to_out(t, partners, locations) for t in trips]


def _container_inputs(items) -> list[TripContainerInput]:
    from app.utils.iso6346 import validate_container_number
    results = []
    for c in (items or []):
        cn = (c.container_number or "").strip()
        if cn:
            valid, err = validate_container_number(cn)
            if not valid:
                raise HTTPException(status_code=422, detail=f"Số container không hợp lệ '{cn}': {err}")
        results.append(TripContainerInput(
            container_number=c.container_number,
            cont_type=c.cont_type,
        ))
    return results


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
            containers=_container_inputs(body.containers),
            revenue=body.revenue,
            matched_delivered_trip_ids=body.matched_delivered_trip_ids,
        ))
    except Exception as exc:
        raise translate(exc)
    return await _load_one(use_case.session, t)


@router.get("/booked-trips/search")
async def search_booked_trips(
    q: str = Query("", description="Search query (container, customer, code, route)"),
    delivered_trip_id: int = Query(..., description="Work order ID for computing match scores"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetBookedTrip = Depends(get_get_booked_trip),
):
    """Manual search for trip orders — bypasses match suggester threshold.

    Searches ALL PENDING/DRAFT trip orders by container number, partner name,
    code, pickup/dropoff location, or date. Returns results with match scores
    computed against the given work order so the accountant can make an
    informed choice regardless of suggestion thresholds.
    """
    from sqlalchemy import select as sa_select, or_ as sa_or, func
    from app.models.domain import (
        DeliveredTrip as DeliveredTripORM,
        BookedTrip as BookedTripORM,
        BookedTripContainer as TOCORM,
        DeliveredTripContainer as WOCORM,
        Reconciliation,
    )
    from app.contexts.operations.infrastructure.match_suggester import (
        _load_alias_groups,
        _locations_match,
        _build_criteria,
        _format_containers,
        _get_wo_date,
        WEIGHTS,
    )
    from app.utils.iso6346 import normalize_container_number
    from app.schemas.domain import (
        CriterionBreakdown,
        MatchSuggestion as MatchSuggestionSchema,
    )

    db = use_case.repo.session  # type: ignore[attr-defined]

    # Load the work order
    wo = (await db.execute(
        sa_select(DeliveredTripORM).where(DeliveredTripORM.id == delivered_trip_id)
    )).scalar_one_or_none()
    if wo is None:
        raise HTTPException(status_code=404, detail="DeliveredTrip not found")

    # Base query: PENDING or DRAFT trip orders
    query = sa_select(BookedTripORM).where(
        BookedTripORM.status.in_(["PENDING", "DRAFT"]),
    )

    # If there's a search query, filter by it
    if q.strip():
        term = f"%{q.strip()}%"
        # Subquery for container number match
        container_subquery = (
            sa_select(TOCORM.booked_trip_id)
            .where(TOCORM.container_number.ilike(term))
        )
        # Subquery for partner name match
        from app.models.domain import Client as PartnerORM
        partner_subquery = (
            sa_select(PartnerORM.id)
            .where(PartnerORM.name.ilike(term))
        )
        query = query.where(
            sa_or(
                BookedTripORM.id.in_(container_subquery),
                BookedTripORM.client_id.in_(partner_subquery),
                # Date search: allow YYYY-MM-DD or DD/MM/YYYY patterns
                BookedTripORM.trip_date.cast(str).ilike(term),
            )
        )

    # Exclude trip orders already linked to this WO
    linked_to_ids = {
        r[0] for r in (await db.execute(
            sa_select(Reconciliation.booked_trip_id).where(
                Reconciliation.delivered_trip_id == delivered_trip_id,
                Reconciliation.is_active == True,  # noqa: E712
            )
        )).all()
    }

    all_trips = list((await db.execute(query)).scalars().all())
    filtered = [t for t in all_trips if t.id not in linked_to_ids]

    # Total for pagination
    total = len(filtered)
    start = (page - 1) * page_size
    page_trips = filtered[start:start + page_size]

    if not page_trips:
        return {
            "items": [],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": 0,
        }

    # Load related data for scoring
    client_ids = {t.client_id for t in page_trips} | {wo.client_id}
    location_ids = (
        {t.pickup_location_id for t in page_trips}
        | {t.dropoff_location_id for t in page_trips}
        | {wo.pickup_location_id, wo.dropoff_location_id}
    )
    partners = await load_client_summaries(db, client_ids)
    locations = await load_location_summaries(db, location_ids)
    alias_groups = await _load_alias_groups(db)

    # Load WO containers for scoring
    wo_cont_rows = (await db.execute(
        sa_select(WOCORM).where(WOCORM.delivered_trip_id == wo.id)
    )).scalars().all()
    wo_container_numbers = {
        normalize_container_number(c.container_number)
        for c in wo_cont_rows if c.container_number
    }
    wo_date = _get_wo_date(wo)
    wo_client_name = get_client_summary(partners, wo.client_id).name
    wo_pickup_name = get_location_summary(locations, wo.pickup_location_id).name
    wo_dropoff_name = get_location_summary(locations, wo.dropoff_location_id).name
    wo_containers_str = _format_containers(wo_cont_rows)
    wo_date_str = wo_date.isoformat() if wo_date else None

    # Load TO containers
    to_ids = [t.id for t in page_trips]
    to_cont_rows = (await db.execute(
        sa_select(TOCORM).where(TOCORM.booked_trip_id.in_(to_ids))
    )).scalars().all()
    to_containers_map: dict[int, list] = {}
    for c in to_cont_rows:
        to_containers_map.setdefault(c.booked_trip_id, []).append(c)

    results = []
    for t in page_trips:
        # Compute match score against WO
        to_client_name = get_client_summary(partners, t.client_id).name
        to_pickup_name = get_location_summary(locations, t.pickup_location_id).name
        to_dropoff_name = get_location_summary(locations, t.dropoff_location_id).name
        to_date_str = t.trip_date.isoformat() if t.trip_date else None

        matched_fields: list[str] = []
        match_score = 0
        max_score = 5

        # Container number check
        to_cns = {
            normalize_container_number(c.container_number)
            for c in to_containers_map.get(t.id, [])
            if c.container_number
        }
        if wo_container_numbers & to_cns:
            matched_fields.append("container_number")
            match_score += 1
        elif any(
            any(partial in wcn for wcn in wo_container_numbers for partial in to_cns if len(partial) >= 4),
            False,
        ):
            matched_fields.append("container_number_partial")
            match_score += 1

        # Date check
        if wo_date and t.trip_date and wo_date == t.trip_date:
            matched_fields.append("date")
            match_score += 1

        # Pickup location check
        if wo.pickup_location_id and t.pickup_location_id:
            if _locations_match(t.pickup_location_id, wo.pickup_location_id, alias_groups):
                matched_fields.append("pickup_location")
                match_score += 1

        # Dropoff location check
        if wo.dropoff_location_id and t.dropoff_location_id:
            if _locations_match(t.dropoff_location_id, wo.dropoff_location_id, alias_groups):
                matched_fields.append("dropoff_location")
                match_score += 1

        # Client check
        if wo.client_id and t.client_id and wo.client_id == t.client_id:
            matched_fields.append("client")
            match_score += 1

        to_out = await _load_one(db, t)
        to_containers_display = _format_containers(to_containers_map.get(t.id, []))

        criteria = _build_criteria(
            matched_fields=matched_fields,
            wo_date_str=wo_date_str,
            to_date_str=to_date_str,
            wo_client=wo_client_name,
            to_client=to_client_name,
            wo_pickup=wo_pickup_name,
            to_pickup=to_pickup_name,
            wo_dropoff=wo_dropoff_name,
            to_dropoff=to_dropoff_name,
            wo_containers=wo_containers_str,
            to_containers=to_containers_display,
        )

        results.append({
            "booked_trip": to_out.model_dump(),
            "container_id": to_containers_map.get(t.id, [None])[0].id if to_containers_map.get(t.id) else 0,
            "confidence": "full" if match_score >= 4 else ("partial" if match_score >= 3 else "none"),
            "matched_fields": matched_fields,
            "score": match_score / max_score,
            "criteria": [c.model_dump() for c in criteria],
            "match_score": match_score,
            "max_score": max_score,
        })

    return {
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total > 0 else 0,
    }


@router.get("/booked-trips", response_model=PaginatedResponse[BookedTripOut])
async def list_booked_trips(
    client_id: int | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    unpriced: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=5000),
    current_user: User = Depends(require_permission("read", "BookedTrip")),
    use_case: ListBookedTrips = Depends(get_list_booked_trips),
):
    items, total = await use_case(BookedTripListFilters(
        page=page, page_size=page_size,
        client_id=client_id, status=status,
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
    status: str | None = None,
    client_id: int | None = None,
    current_user: User = Depends(require_permission("create", "BookedTrip")),
    use_case: GetBookedTrip = Depends(get_get_booked_trip),
):
    from app.contexts.operations.infrastructure.excel import generate_booked_trips_excel
    session = use_case.repo.session  # type: ignore[attr-defined]
    content, partner_name = await generate_booked_trips_excel(
        session,
        date_from=date_from.isoformat() if date_from else None,
        date_to=date_to.isoformat() if date_to else None,
        status=status,
        client_id=client_id,
    )
    if client_id and partner_name:
        from app.utils.text import slugify_vi
        slug = slugify_vi(partner_name)
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
    content, partner_name = await generate_doi_soat_excel(
        session, client_id, date_from.isoformat(), date_to.isoformat(),
    )
    slug = slugify_vi(partner_name)
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
    containers_input = (
        _container_inputs(body.containers) if body.containers is not None
        else None
    )

    try:
        t = await use_case(booked_trip_id, BookedTripUpdateInput(
            trip_date=body.trip_date,
            client_id=body.client_id,
            pickup_location_id=body.pickup_location_id,
            dropoff_location_id=body.dropoff_location_id,
            containers=containers_input,
            revenue=body.revenue,
            status=body.status,
            matched_delivered_trip_ids=body.matched_delivered_trip_ids,
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
