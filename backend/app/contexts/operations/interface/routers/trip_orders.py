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
    current_user: User = Depends(require_permission("create", "TripOrder")),
    use_case: GetTripOrder = Depends(get_get_trip_order),
):
    from app.contexts.operations.infrastructure.excel import generate_trip_orders_excel
    session = use_case.repo.session  # type: ignore[attr-defined]
    content = await generate_trip_orders_excel(
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
        headers={"Content-Disposition": "attachment; filename=trip_orders.xlsx"},
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
