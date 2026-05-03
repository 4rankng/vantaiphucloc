import asyncio
import base64
import io
import math
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select, delete, func

from app.models.base import User
from app.models.domain import WorkOrder, WorkOrderContainer
from app.models.enums import WorkOrderStatus
from app.schemas.base import PaginatedResponse
from app.schemas.domain import (
    WorkOrderCreate,
    WorkOrderUpdate,
    WorkOrderOut,
    ContainerOut,
    BatchWorkOrderCreate,
    BatchWorkOrderResult,
    ContainerOCRRequest,
    ContainerOCRResponse,
    CancelRequest,
)
from app.core.deps import get_current_user, require_permission
from app.services.ocr_service import MAX_OCR_ATTEMPTS, extract_container_number
from app.services.photo_storage import save_base64_photo
from app.services.work_order_service import create_work_order
from app.core.audit_context import set_audit_reason
from app.core.redis import get_redis
from app.repositories.work_order_repo import WorkOrderRepository
from app.repositories.deps import get_work_order_repo
from app.utils.iso6346 import normalize_container_number as _norm

_logger = logging.getLogger(__name__)

router = APIRouter()

_OCR_ATTEMPT_TTL = 600


# ---------------------------------------------------------------------------
# Schema mapping helpers
# ---------------------------------------------------------------------------

def _to_schema(wo: WorkOrder, containers: list[WorkOrderContainer]) -> WorkOrderOut:
    return WorkOrderOut(
        id=wo.id,
        client_id=wo.client_id,
        client_name=wo.client_name,
        client_code=wo.client_code,
        code=wo.code,
        route=wo.route,
        pickup_location=wo.pickup_location,
        dropoff_location=wo.dropoff_location,
        pickup_location_id=wo.pickup_location_id,
        dropoff_location_id=wo.dropoff_location_id,
        driver_id=wo.driver_id,
        driver_name=wo.driver_name,
        tractor_plate=wo.tractor_plate,
        gps_lat=wo.gps_lat,
        gps_lng=wo.gps_lng,
        gps_address=wo.gps_address,
        unit_price=wo.unit_price,
        driver_salary=wo.driver_salary,
        allowance=wo.allowance,
        earning=wo.earning,
        pricing_id=wo.pricing_id,
        status=wo.status,
        is_locked=wo.is_locked,
        locked_at=wo.locked_at,
        locked_by=wo.locked_by,
        created_at=wo.created_at,
        updated_at=wo.updated_at,
        containers=[ContainerOut.model_validate(c) for c in containers],
    )


async def _load_one(repo: WorkOrderRepository, wo: WorkOrder) -> WorkOrderOut:
    containers = await repo.get_containers(wo.id)
    return _to_schema(wo, containers)


async def _load_many(
    repo: WorkOrderRepository, work_orders: list[WorkOrder]
) -> list[WorkOrderOut]:
    if not work_orders:
        return []
    containers_by_id = await repo.batch_load_containers([wo.id for wo in work_orders])
    return [_to_schema(wo, containers_by_id.get(wo.id, [])) for wo in work_orders]


def _hide_salary_fields(wo_out: WorkOrderOut) -> None:
    wo_out.driver_salary = 0
    wo_out.allowance = 0
    wo_out.earning = 0


async def _enqueue_notification(work_order: WorkOrder) -> None:
    try:
        from app.workers import enqueue
        await enqueue(
            "send_notification_task",
            user_id=None,
            title="Phiếu làm việc mới",
            message=f"{work_order.code or work_order.id} đã được tạo bởi tài xế {work_order.driver_name}",
            channel="in_app",
        )
    except Exception:
        _logger.warning("Failed to enqueue notification for WO#%s", work_order.id)


async def _enqueue_geocode(work_order_id: int, lat: float, lng: float) -> None:
    try:
        from app.workers import enqueue
        await enqueue("geocode_work_order_task", work_order_id=work_order_id, lat=lat, lng=lng)
    except Exception:
        _logger.warning("Failed to enqueue geocode for WO#%s", work_order_id)


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
    repo: WorkOrderRepository = Depends(get_work_order_repo),
):
    db = repo.session
    wo = await create_work_order(body, current_user, db)
    await db.commit()
    await db.refresh(wo)

    await _enqueue_notification(wo)
    if body.gps_lat and body.gps_lng:
        await _enqueue_geocode(wo.id, body.gps_lat, body.gps_lng)

    return await _load_one(repo, wo)


@router.get("/work-orders", response_model=PaginatedResponse[WorkOrderOut])
async def list_work_orders(
    driver_id: int | None = None,
    tractor_plate: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    repo: WorkOrderRepository = Depends(get_work_order_repo),
):
    db = repo.session
    query = select(WorkOrder)
    count_query = select(func.count(WorkOrder.id))

    filters = []
    if driver_id is not None:
        filters.append(WorkOrder.driver_id == driver_id)
    if tractor_plate is not None:
        filters.append(WorkOrder.tractor_plate == tractor_plate)
    if date_from is not None:
        filters.append(WorkOrder.created_at >= date_from)
    if date_to is not None:
        filters.append(WorkOrder.created_at <= date_to)
    if status is not None:
        filters.append(WorkOrder.status == status)

    for f in filters:
        query = query.where(f)
        count_query = count_query.where(f)

    total = (await db.execute(count_query)).scalar() or 0
    rows = list(
        (
            await db.execute(
                query.order_by(WorkOrder.id.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).scalars().all()
    )

    items = await _load_many(repo, rows)

    if current_user.role == "driver":
        for i, wo in enumerate(rows):
            if wo.status == WorkOrderStatus.PENDING:
                _hide_salary_fields(items[i])

    return PaginatedResponse[WorkOrderOut](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/work-orders/{work_order_id:int}", response_model=WorkOrderOut)
async def get_work_order(
    work_order_id: int,
    current_user: User = Depends(get_current_user),
    repo: WorkOrderRepository = Depends(get_work_order_repo),
):
    wo = await repo.get_by_id_or_404(work_order_id)
    wo_out = await _load_one(repo, wo)

    if current_user.role == "driver" and wo.status == WorkOrderStatus.PENDING:
        _hide_salary_fields(wo_out)

    return wo_out


@router.put("/work-orders/{work_order_id:int}", response_model=WorkOrderOut)
async def update_work_order(
    work_order_id: int,
    body: WorkOrderUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    repo: WorkOrderRepository = Depends(get_work_order_repo),
):
    db = repo.session
    wo = await repo.get_by_id_or_404(work_order_id)

    if current_user.role == "driver":
        if wo.driver_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only update your own work orders")
        if wo.status != WorkOrderStatus.PENDING:
            raise HTTPException(status_code=400, detail="Only PENDING work orders can be updated")
    elif current_user.role not in ("accountant", "director", "superadmin"):
        raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện thao tác này")

    if wo.is_locked:
        raise HTTPException(status_code=403, detail="Work order is locked. Unmatch first to edit.")

    update_data = body.model_dump(exclude_unset=True)
    new_containers = update_data.pop("containers", None)

    if current_user.role == "driver":
        for field in ("unit_price", "driver_salary", "allowance", "earning", "status"):
            update_data.pop(field, None)

    await repo.update(wo, **update_data)

    if new_containers is not None:
        await db.execute(
            delete(WorkOrderContainer).where(WorkOrderContainer.work_order_id == wo.id)
        )
        for container in new_containers:
            photo_url = container.get("photo_url")
            if photo_url and photo_url.startswith("data:"):
                photo_url = await asyncio.to_thread(save_base64_photo, photo_url)
            db.add(WorkOrderContainer(
                work_order_id=wo.id,
                container_number=_norm(container["container_number"]),
                work_type=container["work_type"],
                photo_url=photo_url,
            ))

    await db.commit()
    await db.refresh(wo)
    return await _load_one(repo, wo)


@router.put("/work-orders/{work_order_id:int}/cancel", response_model=WorkOrderOut)
async def cancel_work_order(
    work_order_id: int,
    body: CancelRequest,
    request: Request,
    current_user: User = Depends(require_permission("cancel", "WorkOrder")),
    repo: WorkOrderRepository = Depends(get_work_order_repo),
):
    wo = await repo.get_by_id_or_404(work_order_id)

    if current_user.role == "driver" and wo.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only cancel your own work orders")
    if wo.status != WorkOrderStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only PENDING work orders can be cancelled")
    if wo.is_locked:
        raise HTTPException(status_code=403, detail="Cannot cancel a matched work order. Unmatch first.")

    wo.status = WorkOrderStatus.CANCELLED
    set_audit_reason(body.reason)

    await repo.session.commit()
    await repo.session.refresh(wo)
    return await _load_one(repo, wo)


@router.post("/work-orders/batch", status_code=207)
async def batch_create_work_orders(
    body: BatchWorkOrderCreate,
    current_user: User = Depends(require_permission("create", "WorkOrder")),
    repo: WorkOrderRepository = Depends(get_work_order_repo),
):
    db = repo.session
    results: list[BatchWorkOrderResult] = []
    async with db.begin():
        for i, item in enumerate(body.items):
            async with db.begin_nested():
                try:
                    wo = await create_work_order(item, current_user, db)
                    results.append(BatchWorkOrderResult(index=i, id=wo.id, success=True))
                except Exception as exc:
                    _logger.warning("Batch item %d failed: %s", i, exc, exc_info=True)
                    results.append(BatchWorkOrderResult(index=i, success=False, error=str(exc)))

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
    user_id = current_user.id
    rkey = f"ocr_attempts:{user_id}:{body.container_index}"

    attempts_remaining = await _get_ocr_attempts_remaining(redis, user_id, body.container_index)
    if attempts_remaining <= 0:
        _logger.warning("WO_OCR_ATTEMPTS_EXHAUSTED user=%s idx=%s", user_id, body.container_index)
        return ContainerOCRResponse(
            success=False,
            container_number=None,
            error="Đã hết số lần quét OCR. Vui lòng nhập số container thủ công.",
            attempts_remaining=0,
        )

    try:
        image_bytes = base64.b64decode(body.image_data)
    except Exception as e:
        _logger.error("WO_OCR_BASE64_DECODE_FAILED: %s", e)
        return ContainerOCRResponse(
            success=False,
            container_number=None,
            error="Dữ liệu hình ảnh không hợp lệ",
            attempts_remaining=attempts_remaining,
        )

    pipe = redis.pipeline()
    pipe.incr(rkey)
    pipe.expire(rkey, _OCR_ATTEMPT_TTL)
    await pipe.execute()

    result = await extract_container_number(image_bytes=image_bytes, mime_type=body.mime_type)
    result["attempts_remaining"] = await _get_ocr_attempts_remaining(redis, user_id, body.container_index)
    return ContainerOCRResponse(**result)


@router.get("/work-orders/export")
async def export_work_orders_excel(
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    current_user: User = Depends(require_permission("export", "WorkOrder")),
    repo: WorkOrderRepository = Depends(get_work_order_repo),
):
    from app.services.excel_service import generate_work_orders_excel
    content = await generate_work_orders_excel(
        repo.session,
        date_from=date_from.isoformat() if date_from else None,
        date_to=date_to.isoformat() if date_to else None,
        status=status,
    )
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=work_orders.xlsx"},
    )


async def _get_ocr_attempts_remaining(redis, user_id: int, container_index: int) -> int:
    key = f"ocr_attempts:{user_id}:{container_index}"
    val = await redis.get(key)
    attempts = int(val) if val else 0
    return max(0, MAX_OCR_ATTEMPTS - attempts)
