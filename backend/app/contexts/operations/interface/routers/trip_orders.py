"""TripOrder HTTP endpoints.

Wires use cases to the same `/trip-orders` URL paths the legacy router
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
    CreateTripOrder,
    DeleteTripOrder,
    GetTripOrder,
    ListTripOrders,
    UpdateTripOrder,
)
from app.contexts.operations.application.dto import (
    TripContainerInput,
    TripOrderCreateInput,
    TripOrderListFilters,
    TripOrderUpdateInput,
)
from app.contexts.operations.domain.entities import TripOrder
from app.contexts.operations.interface.dependencies import (
    get_create_trip_order,
    get_delete_trip_order,
    get_get_trip_order,
    get_get_work_order,
    get_list_trip_orders,
    get_update_trip_order,
)
from app.contexts.operations.interface.error_translation import translate
from app.core.audit_context import set_audit_reason
from app.core.deps import require_permission
from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.schemas.domain import (
    CancelRequest,
    TripContainerOut,
    TripContainerPhotoOut,
    TripOrderCreate,
    TripOrderOut,
    TripOrderUpdate,
)
from app.core.summaries import (
    get_partner_summary,
    get_location_summary,
    load_partner_summaries,
    load_location_summaries,
)

_logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Response shaping
# ---------------------------------------------------------------------------


def _trip_to_out(t: TripOrder, partners, locations) -> TripOrderOut:
    return TripOrderOut(
        id=int(t.id),  # type: ignore[arg-type]
        trip_date=t.trip_date,
        partner=get_partner_summary(partners, t.partner_id),
        code=t.code,
        pickup_location=get_location_summary(locations, t.pickup_location_id),
        dropoff_location=get_location_summary(locations, t.dropoff_location_id),
        containers=[
            TripContainerOut(
                id=int(c.id),  # type: ignore[arg-type]
                container_number=c.container_number,
                work_type=c.work_type,
                container_size=c.container_size,
                container_type=c.container_type,
                freight_kind=c.freight_kind,
                gross_weight_kg=c.gross_weight_kg,
                seal_no=c.seal_no,
                commodity=c.commodity,
                container_metadata=c.container_metadata,
                photos=[
                    TripContainerPhotoOut(
                        id=int(p.id),  # type: ignore[arg-type]
                        kind=p.kind,
                        file_url=p.file_url,
                        caption=p.caption,
                        uploaded_at=p.uploaded_at,
                        uploaded_by=p.uploaded_by,
                    )
                    for p in c.photos
                ],
            )
            for c in t.containers
        ],
        pricing_id=t.pricing_id,
        unit_price=t.unit_price,
        driver_salary=t.driver_salary,
        allowance=t.allowance,
        status=t.status,
        matched_work_order_ids=list(t.matched_work_order_ids),
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


async def _load_one(session, t: TripOrder) -> TripOrderOut:
    return (await _load_many(session, [t]))[0]


async def _load_many(session, trips: list[TripOrder]) -> list[TripOrderOut]:
    if not trips:
        return []
    partners = await load_partner_summaries(
        session, {t.partner_id for t in trips}
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
            work_type=c.work_type,
            container_size=c.container_size,
            container_type=c.container_type,
            freight_kind=c.freight_kind,
            gross_weight_kg=c.gross_weight_kg,
            seal_no=c.seal_no,
            commodity=c.commodity,
            container_metadata=c.container_metadata,
        ))
    return results


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/trip-orders", response_model=TripOrderOut, status_code=201)
async def create_trip_order(
    body: TripOrderCreate,
    request: Request,
    current_user: User = Depends(require_permission("read", "TripOrder")),
    use_case: CreateTripOrder = Depends(get_create_trip_order),
):
    try:
        t = await use_case(TripOrderCreateInput(
            trip_date=body.trip_date,
            partner_id=body.partner_id,
            pickup_location_id=body.pickup_location_id,
            dropoff_location_id=body.dropoff_location_id,
            containers=_container_inputs(body.containers),
            pricing_id=body.pricing_id,
            unit_price=body.unit_price,
            driver_salary=body.driver_salary,
            allowance=body.allowance,
            matched_work_order_ids=body.matched_work_order_ids,
        ))
    except Exception as exc:
        raise translate(exc)
    return await _load_one(use_case.session, t)


@router.get("/trip-orders/search")
async def search_trip_orders(
    q: str = Query("", description="Search query (container, customer, code, route)"),
    work_order_id: int = Query(..., description="Work order ID for computing match scores"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetWorkOrder = Depends(get_get_work_order),
):
    """Manual search for trip orders — bypasses match suggester threshold.

    Searches ALL PENDING/DRAFT trip orders by container number, partner name,
    code, pickup/dropoff location, or date. Returns results with match scores
    computed against the given work order so the accountant can make an
    informed choice regardless of suggestion thresholds.
    """
    from sqlalchemy import select as sa_select, or_ as sa_or, func
    from app.models.domain import (
        WorkOrder as WorkOrderORM,
        TripOrder as TripOrderORM,
        TripOrderContainer as TOCORM,
        WorkOrderContainer as WOCORM,
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
        sa_select(WorkOrderORM).where(WorkOrderORM.id == work_order_id)
    )).scalar_one_or_none()
    if wo is None:
        raise HTTPException(status_code=404, detail="WorkOrder not found")

    # Base query: PENDING or DRAFT trip orders
    query = sa_select(TripOrderORM).where(
        TripOrderORM.status.in_(["PENDING", "DRAFT"]),
    )

    # If there's a search query, filter by it
    if q.strip():
        term = f"%{q.strip()}%"
        # Subquery for container number match
        container_subquery = (
            sa_select(TOCORM.trip_order_id)
            .where(TOCORM.container_number.ilike(term))
        )
        # Subquery for partner name match
        from app.models.domain import Partner as PartnerORM
        partner_subquery = (
            sa_select(PartnerORM.id)
            .where(PartnerORM.name.ilike(term))
        )
        query = query.where(
            sa_or(
                TripOrderORM.code.ilike(term),
                TripOrderORM.id.in_(container_subquery),
                TripOrderORM.partner_id.in_(partner_subquery),
                # Date search: allow YYYY-MM-DD or DD/MM/YYYY patterns
                TripOrderORM.trip_date.cast(str).ilike(term),
            )
        )

    # Exclude trip orders already linked to this WO
    linked_to_ids = {
        r[0] for r in (await db.execute(
            sa_select(Reconciliation.trip_order_id).where(
                Reconciliation.work_order_id == work_order_id,
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
    partner_ids = {t.partner_id for t in page_trips} | {wo.partner_id}
    location_ids = (
        {t.pickup_location_id for t in page_trips}
        | {t.dropoff_location_id for t in page_trips}
        | {wo.pickup_location_id, wo.dropoff_location_id}
    )
    partners = await load_partner_summaries(db, partner_ids)
    locations = await load_location_summaries(db, location_ids)
    alias_groups = await _load_alias_groups(db)

    # Load WO containers for scoring
    wo_cont_rows = (await db.execute(
        sa_select(WOCORM).where(WOCORM.work_order_id == wo.id)
    )).scalars().all()
    wo_container_numbers = {
        normalize_container_number(c.container_number)
        for c in wo_cont_rows if c.container_number
    }
    wo_date = _get_wo_date(wo)
    wo_client_name = get_partner_summary(partners, wo.partner_id).name
    wo_pickup_name = get_location_summary(locations, wo.pickup_location_id).name
    wo_dropoff_name = get_location_summary(locations, wo.dropoff_location_id).name
    wo_containers_str = _format_containers(wo_cont_rows)
    wo_date_str = wo_date.isoformat() if wo_date else None

    # Load TO containers
    to_ids = [t.id for t in page_trips]
    to_cont_rows = (await db.execute(
        sa_select(TOCORM).where(TOCORM.trip_order_id.in_(to_ids))
    )).scalars().all()
    to_containers_map: dict[int, list] = {}
    for c in to_cont_rows:
        to_containers_map.setdefault(c.trip_order_id, []).append(c)

    results = []
    for t in page_trips:
        # Compute match score against WO
        to_client_name = get_partner_summary(partners, t.partner_id).name
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
        if wo.partner_id and t.partner_id and wo.partner_id == t.partner_id:
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
            "trip_order": to_out.model_dump(),
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


@router.get("/trip-orders", response_model=PaginatedResponse[TripOrderOut])
async def list_trip_orders(
    partner_id: int | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    unpriced: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read", "TripOrder")),
    use_case: ListTripOrders = Depends(get_list_trip_orders),
):
    items, total = await use_case(TripOrderListFilters(
        page=page, page_size=page_size,
        partner_id=partner_id, status=status,
        date_from=date_from, date_to=date_to,
        unpriced=unpriced,
    ))
    out = await _load_many(use_case.repo.session, items)  # type: ignore[attr-defined]
    return PaginatedResponse[TripOrderOut](
        items=out, total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/trip-orders/template")
async def download_trip_order_template(
    current_user: User = Depends(require_permission("create", "TripOrder")),
):
    from app.contexts.operations.infrastructure.excel import generate_trip_order_template
    content = generate_trip_order_template()
    return StreamingResponse(
        io.BytesIO(content),
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": "attachment; filename=trip_order_template.xlsx"
        },
    )


@router.post("/trip-orders/import", status_code=200)
async def import_trip_orders_excel(
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("create", "TripOrder")),
    use_case: GetTripOrder = Depends(get_get_trip_order),
):
    """Legacy plain-Excel TripOrder import. Distinct from the partner-Excel
    import pipeline at `/imports/partner-excel/*`."""
    from app.contexts.operations.infrastructure.excel import import_trip_orders, parse_trip_order_excel
    content = await file.read()
    rows = await parse_trip_order_excel(content)
    if not rows:
        raise HTTPException(
            status_code=400, detail="File Excel trong hoac khong dung dinh dang"
        )
    session = use_case.repo.session  # type: ignore[attr-defined]
    return await import_trip_orders(session, rows, current_user.id)


@router.get("/trip-orders/export")
async def export_trip_orders_excel(
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    partner_id: int | None = None,
    current_user: User = Depends(require_permission("create", "TripOrder")),
    use_case: GetTripOrder = Depends(get_get_trip_order),
):
    from app.contexts.operations.infrastructure.excel import generate_trip_orders_excel
    session = use_case.repo.session  # type: ignore[attr-defined]
    content, partner_name = await generate_trip_orders_excel(
        session,
        date_from=date_from.isoformat() if date_from else None,
        date_to=date_to.isoformat() if date_to else None,
        status=status,
        partner_id=partner_id,
    )
    if partner_id and partner_name:
        from app.utils.text import slugify_vi
        slug = slugify_vi(partner_name)
        filename = f"chuyen_khach_hang_{slug}_{date.today().isoformat()}.xlsx"
    else:
        filename = "trip_orders.xlsx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/trip-orders/distinct-partners")
async def get_distinct_trip_partners(
    date_from: date | None = None,
    date_to: date | None = None,
    current_user: User = Depends(require_permission("read", "TripOrder")),
    use_case: ListTripOrders = Depends(get_list_trip_orders),
):
    """Return distinct partners that have trip orders in the given date range.
    Used by the Xuất đối soát dialog to populate the customer dropdown."""
    from sqlalchemy import text
    session = use_case.repo.session  # type: ignore[attr-defined]
    sql = "SELECT DISTINCT p.id, p.name FROM partners p " \
          "JOIN trip_orders t ON t.partner_id = p.id " \
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


@router.get("/trip-orders/export-doi-soat")
async def export_doi_soat_excel(
    partner_id: int = Query(..., description="Partner (khách hàng) ID"),
    date_from: date = Query(..., description="From date (YYYY-MM-DD)"),
    date_to: date = Query(..., description="To date (YYYY-MM-DD)"),
    current_user: User = Depends(require_permission("create", "TripOrder")),
    use_case: GetTripOrder = Depends(get_get_trip_order),
):
    from app.contexts.operations.infrastructure.excel import generate_doi_soat_excel
    from app.utils.text import slugify_vi

    session = use_case.repo.session  # type: ignore[attr-defined]
    content, partner_name = await generate_doi_soat_excel(
        session, partner_id, date_from.isoformat(), date_to.isoformat(),
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


@router.get("/trip-orders/{trip_order_id}", response_model=TripOrderOut)
async def get_trip_order(
    trip_order_id: int,
    current_user: User = Depends(require_permission("read", "TripOrder")),
    use_case: GetTripOrder = Depends(get_get_trip_order),
):
    try:
        t = await use_case(trip_order_id)
    except Exception as exc:
        raise translate(exc)
    return await _load_one(use_case.repo.session, t)  # type: ignore[attr-defined]


@router.put("/trip-orders/{trip_order_id}", response_model=TripOrderOut)
async def update_trip_order(
    trip_order_id: int,
    body: TripOrderUpdate,
    request: Request,
    current_user: User = Depends(require_permission("read", "TripOrder")),
    use_case: UpdateTripOrder = Depends(get_update_trip_order),
):
    containers_input = (
        _container_inputs(body.containers) if body.containers is not None
        else None
    )

    try:
        t = await use_case(trip_order_id, TripOrderUpdateInput(
            trip_date=body.trip_date,
            partner_id=body.partner_id,
            pickup_location_id=body.pickup_location_id,
            dropoff_location_id=body.dropoff_location_id,
            containers=containers_input,
            pricing_id=body.pricing_id,
            unit_price=body.unit_price,
            driver_salary=body.driver_salary,
            allowance=body.allowance,
            status=body.status,
            matched_work_order_ids=body.matched_work_order_ids,
        ))
    except Exception as exc:
        raise translate(exc)

    return await _load_one(use_case.session, t)


@router.delete("/trip-orders/{trip_order_id}", status_code=204)
async def delete_trip_order(
    trip_order_id: int,
    body: CancelRequest,
    request: Request,
    current_user: User = Depends(require_permission("read", "TripOrder")),
    use_case: DeleteTripOrder = Depends(get_delete_trip_order),
):
    set_audit_reason(body.reason)
    try:
        await use_case(trip_order_id)
    except Exception as exc:
        raise translate(exc)
    return None
