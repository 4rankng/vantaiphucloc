"""WorkOrder HTTP endpoints."""

from __future__ import annotations

import base64
import io
import logging
import math
from datetime import date

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse

from app.contexts.operations.application import (
    BatchCreateWorkOrders,
    CreateWorkOrder,
    CurrentUserContext,
    GetWorkOrder,
    ListWorkOrders,
    UpdateWorkOrder,
)
from app.contexts.operations.application.dto import (
    WorkOrderContainerInput,
    WorkOrderCreateInput,
    WorkOrderListFilters,
    WorkOrderUpdateInput,
)
from app.contexts.operations.domain.entities import WorkOrder
from app.contexts.operations.domain.value_objects import WorkOrderStatus
from app.contexts.operations.interface.dependencies import (
    get_batch_create_work_orders,
    get_create_work_order,
    get_get_work_order,
    get_list_work_orders,
    get_update_work_order,
)
from app.contexts.operations.interface.error_translation import translate
from app.core.audit_context import set_audit_reason
from app.core.deps import get_current_user, require_permission
from app.core.redis import get_redis
from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.schemas.domain import (
    BatchWorkOrderCreate,
    BatchWorkOrderResult,
    ContainerOCRRequest,
    ContainerOCRResponse,
    ContainerOut,
    WorkOrderCreate,
    WorkOrderOut,
    WorkOrderUpdate,
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


def _wo_to_out(w: WorkOrder, partners, drivers, locations, matched_trip_count: int = 0) -> WorkOrderOut:
    return WorkOrderOut(
        id=int(w.id),  # type: ignore[arg-type]
        partner=get_partner_summary(partners, w.partner_id),
        code=w.code,
        pickup_location=get_location_summary(locations, w.pickup_location_id),
        dropoff_location=get_location_summary(locations, w.dropoff_location_id),
        driver=get_driver_summary(drivers, w.driver_id),
        gps_lat=w.gps_lat,
        gps_lng=w.gps_lng,
        gps_address=w.gps_address,
        unit_price=w.unit_price,
        driver_salary=w.driver_salary,
        allowance=w.allowance,
        pricing_id=w.pricing_id,
        trip_date=w.trip_date,
        status=w.status,
        containers=[
            ContainerOut(
                id=int(c.id),  # type: ignore[arg-type]
                container_number=c.container_number,
                work_type=c.work_type,
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


async def _load_one(session, w: WorkOrder) -> WorkOrderOut:
    return (await _load_many(session, [w]))[0]


async def _load_many(session, wos: list[WorkOrder]) -> list[WorkOrderOut]:
    if not wos:
        return []
    partners = await load_partner_summaries(session, {w.partner_id for w in wos})
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
            sa_select(Reconciliation.work_order_id, func.count())
            .where(
                Reconciliation.work_order_id.in_(wo_ids),
                Reconciliation.is_active == True,  # noqa: E712
            )
            .group_by(Reconciliation.work_order_id)
        )).all()
        link_counts = {r[0]: r[1] for r in rows}

    return [
        _wo_to_out(w, partners, drivers, locations, link_counts.get(int(w.id), 0))  # type: ignore[arg-type]
        for w in wos
    ]


def _hide_salary_fields(wo_out: WorkOrderOut) -> None:
    wo_out.driver_salary = 0
    wo_out.allowance = 0


def _container_inputs(items) -> list[WorkOrderContainerInput]:
    return [
        WorkOrderContainerInput(
            container_number=c.container_number,
            work_type=c.work_type,
            photo_url=c.photo_url,
            photo_lat=c.photo_lat,
            photo_lng=c.photo_lng,
            photo_timestamp=c.photo_timestamp,
        )
        for c in (items or [])
    ]


def _user_ctx(u: User) -> CurrentUserContext:
    return CurrentUserContext(id=u.id, role=u.role)


async def _enqueue_geocode(work_order_id: int, lat: float, lng: float) -> None:
    try:
        from app.workers import enqueue
        await enqueue(
            "geocode_work_order_task",
            work_order_id=work_order_id, lat=lat, lng=lng,
        )
    except Exception:
        _logger.warning("Failed to enqueue geocode for WO#%s", work_order_id)


async def _enqueue_notification(w: WorkOrder) -> None:
    try:
        from app.workers import enqueue
        await enqueue(
            "send_notification_task",
            user_id=None,
            title="Phieu lam viec moi",
            message=f"{w.code or w.id} da duoc tao (driver_id={w.driver_id})",
            channel="in_app",
        )
    except Exception:
        _logger.warning("Failed to enqueue notification for WO#%s", w.id)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/work-orders/validate-container")
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


@router.post("/work-orders", response_model=WorkOrderOut, status_code=201)
async def create_work_order_endpoint(
    body: WorkOrderCreate,
    current_user: User = Depends(require_permission("create", "WorkOrder")),
    use_case: CreateWorkOrder = Depends(get_create_work_order),
):
    try:
        w = await use_case(
            WorkOrderCreateInput(
                partner_id=body.partner_id,
                pickup_location_id=body.pickup_location_id,
                dropoff_location_id=body.dropoff_location_id,
                driver_id=body.driver_id,
                vehicle_id=body.vehicle_id,
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


@router.get("/work-orders", response_model=PaginatedResponse[WorkOrderOut])
async def list_work_orders(
    driver_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    use_case: ListWorkOrders = Depends(get_list_work_orders),
):
    if current_user.role == "driver":
        driver_id = current_user.id

    items, total = await use_case(WorkOrderListFilters(
        page=page, page_size=page_size,
        driver_id=driver_id,
        date_from=date_from, date_to=date_to, status=status,
    ))
    out = await _load_many(use_case.repo.session, items)  # type: ignore[attr-defined]

    if current_user.role == "driver":
        for i, w in enumerate(items):
            if w.status == WorkOrderStatus.PENDING:
                _hide_salary_fields(out[i])

    return PaginatedResponse[WorkOrderOut](
        items=out, total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/work-orders/export")
async def export_work_orders_excel(
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    current_user: User = Depends(require_permission("export", "WorkOrder")),
    use_case: GetWorkOrder = Depends(get_get_work_order),
):
    from app.contexts.operations.infrastructure.excel import generate_work_orders_excel
    session = use_case.repo.session  # type: ignore[attr-defined]
    content = await generate_work_orders_excel(
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
        headers={"Content-Disposition": "attachment; filename=work_orders.xlsx"},
    )


@router.post("/work-orders/batch", status_code=207)
async def batch_create_work_orders(
    body: BatchWorkOrderCreate,
    current_user: User = Depends(require_permission("create", "WorkOrder")),
    use_case: BatchCreateWorkOrders = Depends(get_batch_create_work_orders),
):
    items_input = [
        WorkOrderCreateInput(
            partner_id=item.partner_id,
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
        BatchWorkOrderResult(
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


@router.post("/work-orders/ocr-container", response_model=ContainerOCRResponse)
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


@router.get("/work-orders/{work_order_id:int}", response_model=WorkOrderOut)
async def get_work_order(
    work_order_id: int,
    current_user: User = Depends(get_current_user),
    use_case: GetWorkOrder = Depends(get_get_work_order),
):
    try:
        w = await use_case(work_order_id)
    except Exception as exc:
        raise translate(exc)
    # Drivers can only access their own work orders; mask others as 404
    # to avoid leaking existence to a horizontally-scoped caller.
    if current_user.role == "driver" and w.driver_id != current_user.id:
        from app.contexts.operations.domain.exceptions import NotFound
        raise translate(NotFound("WorkOrder", work_order_id))
    out = await _load_one(use_case.repo.session, w)  # type: ignore[attr-defined]
    if current_user.role == "driver" and w.status == WorkOrderStatus.PENDING:
        _hide_salary_fields(out)
    return out


@router.put("/work-orders/{work_order_id:int}", response_model=WorkOrderOut)
async def update_work_order(
    work_order_id: int,
    body: WorkOrderUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    use_case: UpdateWorkOrder = Depends(get_update_work_order),
):
    containers_input = (
        _container_inputs(body.containers) if body.containers is not None
        else None
    )
    try:
        w = await use_case(
            work_order_id,
            WorkOrderUpdateInput(
                partner_id=body.partner_id,
                pickup_location_id=body.pickup_location_id,
                dropoff_location_id=body.dropoff_location_id,
                driver_id=body.driver_id,
                vehicle_id=body.vehicle_id,
                containers=containers_input,
                gps_lat=body.gps_lat,
                gps_lng=body.gps_lng,
                unit_price=body.unit_price,
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
        _logger.exception("Failed to load WO#%s after update", work_order_id)
        raise translate(exc)
