import asyncio
import base64
import io
import math
import logging
from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from app.database import get_db
from app.models.base import User
from app.models.domain import WorkOrder, WorkOrderContainer
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
from app.services.pricing_service import find_pricing
from app.services.ocr_service import MAX_OCR_ATTEMPTS, extract_container_number
from app.services.photo_storage import save_base64_photo
from app.services.audit_service import log_action
from app.core.audit_context import set_audit_reason
from app.core.redis import get_redis

_logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/work-orders/validate-container")
async def validate_container(
    container_number: str = Query(..., description="Container number to validate"),
    current_user: User = Depends(get_current_user),
):
    """Validate a container number against ISO 6346."""
    from app.utils.iso6346 import validate_container_number, normalize_container_number
    valid, error = validate_container_number(container_number)
    return {
        "valid": valid,
        "error": error or None,
        "normalized": normalize_container_number(container_number),
    }


async def _load_work_order_out(db: AsyncSession, work_order: WorkOrder) -> WorkOrderOut:
    """Load a single WorkOrder with its associated WorkOrderContainer rows."""
    containers_result = await db.execute(
        select(WorkOrderContainer).where(
            WorkOrderContainer.work_order_id == work_order.id
        )
    )
    containers = containers_result.scalars().all()
    return WorkOrderOut(
        id=work_order.id,
        client_id=work_order.client_id,
        client_name=work_order.client_name,
        client_code=work_order.client_code,
        code=work_order.code,
        route=work_order.route,
        pickup_location=work_order.pickup_location,
        dropoff_location=work_order.dropoff_location,
        driver_id=work_order.driver_id,
        driver_name=work_order.driver_name,
        tractor_plate=work_order.tractor_plate,
        gps_lat=work_order.gps_lat,
        gps_lng=work_order.gps_lng,
        gps_address=work_order.gps_address,
        unit_price=work_order.unit_price,
        driver_salary=work_order.driver_salary,
        allowance=work_order.allowance,
        earning=work_order.earning,
        pricing_id=work_order.pricing_id,
        status=work_order.status,
        is_locked=getattr(work_order, 'is_locked', False),
        locked_at=getattr(work_order, 'locked_at', None),
        locked_by=getattr(work_order, 'locked_by', None),
        created_at=work_order.created_at,
        updated_at=work_order.updated_at,
        containers=[ContainerOut.model_validate(c) for c in containers],
    )


async def _batch_load_work_order_outs(
    db: AsyncSession, work_orders: list[WorkOrder]
) -> list[WorkOrderOut]:
    """Batch-load containers for multiple work orders at once (N+1 fix)."""
    if not work_orders:
        return []

    wo_ids = [wo.id for wo in work_orders]
    containers_result = await db.execute(
        select(WorkOrderContainer).where(
            WorkOrderContainer.work_order_id.in_(wo_ids)
        )
    )
    all_containers = containers_result.scalars().all()

    # Group containers by work_order_id
    containers_by_wo: dict[int, list[WorkOrderContainer]] = defaultdict(list)
    for c in all_containers:
        containers_by_wo[c.work_order_id].append(c)

    return [
        WorkOrderOut(
            id=wo.id,
            client_id=wo.client_id,
            client_name=wo.client_name,
            client_code=wo.client_code,
            code=wo.code,
            route=wo.route,
            pickup_location=wo.pickup_location,
            dropoff_location=wo.dropoff_location,
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
            is_locked=getattr(wo, 'is_locked', False),
            locked_at=getattr(wo, 'locked_at', None),
            locked_by=getattr(wo, 'locked_by', None),
            created_at=wo.created_at,
            updated_at=wo.updated_at,
            containers=[
                ContainerOut.model_validate(c)
                for c in containers_by_wo.get(wo.id, [])
            ],
        )
        for wo in work_orders
    ]


@router.post("/work-orders", response_model=WorkOrderOut, status_code=201)
async def create_work_order(
    body: WorkOrderCreate,
    current_user: User = Depends(require_permission("create", "WorkOrder")),
    db: AsyncSession = Depends(get_db),
):
    work_order = await _create_work_order_db(body, current_user, db)
    await db.commit()
    await db.refresh(work_order)

    # Fire-and-forget notification
    try:
        from app.workers import enqueue
        await enqueue(
            "send_notification_task",
            user_id=current_user.id,
            title="Phiếu làm việc mới",
            message=f"{work_order.code or work_order.id} đã được tạo bởi tài xế {work_order.driver_name}",
            channel="in_app",
        )
    except RuntimeError:
        _logger.warning("Failed to enqueue notification for WO#%s", work_order.id)

    # Enqueue geocoding tasks (best-effort)
    try:
        from app.workers import enqueue
        if body.gps_lat and body.gps_lng:
            await enqueue("geocode_work_order_task", work_order_id=work_order.id, lat=body.gps_lat, lng=body.gps_lng)
    except RuntimeError:
        pass

    return await _load_work_order_out(db, work_order)


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
    db: AsyncSession = Depends(get_db),
):
    query = select(WorkOrder)
    count_query = select(func.count(WorkOrder.id))

    if driver_id is not None:
        query = query.where(WorkOrder.driver_id == driver_id)
        count_query = count_query.where(WorkOrder.driver_id == driver_id)
    if tractor_plate is not None:
        query = query.where(WorkOrder.tractor_plate == tractor_plate)
        count_query = count_query.where(WorkOrder.tractor_plate == tractor_plate)
    if date_from is not None:
        query = query.where(WorkOrder.created_at >= date_from)
        count_query = count_query.where(WorkOrder.created_at >= date_from)
    if date_to is not None:
        query = query.where(WorkOrder.created_at <= date_to)
        count_query = count_query.where(WorkOrder.created_at <= date_to)
    if status is not None:
        query = query.where(WorkOrder.status == status)
        count_query = count_query.where(WorkOrder.status == status)

    total_q = await db.execute(count_query)
    total = total_q.scalar() or 0

    result = await db.execute(
        query.order_by(WorkOrder.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    work_orders = result.scalars().all()

    # Batch-load containers instead of per-row queries
    items = await _batch_load_work_order_outs(db, work_orders)

    # Hide salary from drivers on PENDING WOs
    if current_user.role == "driver":
        for i, wo in enumerate(work_orders):
            if wo.status == "PENDING":
                items[i].driver_salary = 0
                items[i].allowance = 0
                items[i].earning = 0

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
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WorkOrder).where(WorkOrder.id == work_order_id)
    )
    work_order = result.scalar_one_or_none()
    if work_order is None:
        raise HTTPException(status_code=404, detail="Work order not found")

    wo_out = await _load_work_order_out(db, work_order)

    # Hide salary from driver until matched
    if current_user.role == "driver" and work_order.status == "PENDING":
        wo_out.driver_salary = 0
        wo_out.allowance = 0
        wo_out.earning = 0

    return wo_out


@router.put("/work-orders/{work_order_id:int}", response_model=WorkOrderOut)
async def update_work_order(
    work_order_id: int,
    body: WorkOrderUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WorkOrder).where(WorkOrder.id == work_order_id)
    )
    work_order = result.scalar_one_or_none()
    if work_order is None:
        raise HTTPException(status_code=404, detail="Work order not found")

    # Role-based authorization
    if current_user.role == "driver":
        if work_order.driver_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only update your own work orders")
        if work_order.status != "PENDING":
            raise HTTPException(status_code=400, detail="Only PENDING work orders can be updated")
    elif current_user.role not in ("accountant", "director", "superadmin"):
        raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện thao tác này")

    if getattr(work_order, 'is_locked', False):
        raise HTTPException(status_code=403, detail="Work order is locked. Unmatch first to edit.")

    update_data = body.model_dump(exclude_unset=True)
    new_containers = update_data.pop("containers", None)

    # Drivers cannot change financial fields
    if current_user.role == "driver":
        for field in ("unit_price", "driver_salary", "allowance", "earning", "status"):
            update_data.pop(field, None)

    for field, value in update_data.items():
        setattr(work_order, field, value)

    if new_containers is not None:
        await db.execute(
            delete(WorkOrderContainer).where(
                WorkOrderContainer.work_order_id == work_order.id
            )
        )
        from app.utils.iso6346 import normalize_container_number as _norm
        for container in new_containers:
            photo_url = container.get("photo_url")
            if photo_url and photo_url.startswith("data:"):
                photo_url = await asyncio.to_thread(save_base64_photo, photo_url)
            db.add(WorkOrderContainer(
                work_order_id=work_order.id,
                container_number=_norm(container["container_number"]),
                work_type=container["work_type"],
                photo_url=photo_url,
            ))

    await db.commit()
    await db.refresh(work_order)

    return await _load_work_order_out(db, work_order)


@router.put("/work-orders/{work_order_id:int}/cancel", response_model=WorkOrderOut)
async def cancel_work_order(
    work_order_id: int,
    body: CancelRequest,
    request: Request,
    current_user: User = Depends(require_permission("cancel", "WorkOrder")),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a work order (only PENDING/unmatched). Reason required."""
    result = await db.execute(
        select(WorkOrder).where(WorkOrder.id == work_order_id)
    )
    work_order = result.scalar_one_or_none()
    if work_order is None:
        raise HTTPException(status_code=404, detail="Work order not found")

    if current_user.role == "driver" and work_order.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only cancel your own work orders")
    if work_order.status != "PENDING":
        raise HTTPException(status_code=400, detail="Only PENDING work orders can be cancelled")
    if getattr(work_order, 'is_locked', False):
        raise HTTPException(status_code=403, detail="Cannot cancel a matched work order. Unmatch first.")

    work_order.status = "CANCELLED"
    set_audit_reason(body.reason)

    await db.commit()
    await db.refresh(work_order)

    return await _load_work_order_out(db, work_order)


@router.post("/work-orders/batch", status_code=207)
async def batch_create_work_orders(
    body: BatchWorkOrderCreate,
    current_user: User = Depends(require_permission("create", "WorkOrder")),
    db: AsyncSession = Depends(get_db),
):
    results: list[BatchWorkOrderResult] = []
    async with db.begin():
        for i, item in enumerate(body.items):
            async with db.begin_nested():
                try:
                    wo = await _create_work_order_db(item, current_user, db)
                    results.append(BatchWorkOrderResult(index=i, id=wo.id, success=True))
                except Exception as exc:
                    _logger.warning("Batch item %d failed: %s", i, exc)
                    results.append(BatchWorkOrderResult(index=i, success=False, error=str(exc)))

    # Enqueue geocoding for successful items (best-effort, outside transaction)
    try:
        from app.workers import enqueue
        for r in results:
            if r.success and r.id and body.items[r.index].gps_lat and body.items[r.index].gps_lng:
                await enqueue(
                    "geocode_work_order_task",
                    work_order_id=r.id,
                    lat=body.items[r.index].gps_lat,
                    lng=body.items[r.index].gps_lng,
                )
    except RuntimeError:
        pass

    return results


async def _create_work_order_db(
    body: WorkOrderCreate, current_user: User, db: AsyncSession
) -> WorkOrder:
    """Create WorkOrder + containers in the DB. Flushes but does NOT commit
    — the caller is responsible for committing (or letting the context manager do it)."""
    from app.utils.iso6346 import validate_container_number, normalize_container_number

    containers_data = body.containers

    for container in containers_data:
        valid, error = validate_container_number(container.container_number)
        if not valid:
            raise HTTPException(
                status_code=422,
                detail=f"Số container không hợp lệ: {container.container_number} — {error}",
            )

    first_container = containers_data[0] if containers_data else None
    work_type = first_container.work_type if first_container else ""

    # Drivers always create work orders under their own identity
    driver_id = current_user.id if current_user.role == "driver" else body.driver_id
    driver_name = current_user.username if current_user.role == "driver" else body.driver_name

    # All financials default to 0 — pricing is used for TO, not WO
    unit_price = 0
    driver_salary = 0
    allowance = 0
    earning = 0

    # Status only tracks if pricing was found for reference, not for financials
    # New states: PENDING (no match), MATCHED (match but no pricing), COMPLETED (match + pricing)
    status = "PENDING"

    pricing = await find_pricing(
        db,
        client_id=body.client_id,
        work_type=work_type,
        route=body.route,
        pickup_location=body.pickup_location,
        dropoff_location=body.dropoff_location,
    )

    # Store pricing_id for reference, but don't use it for financials
    pricing_id = pricing.id if pricing else None

    # Fetch client code for denormalized storage
    from app.models.domain import Client
    client_result = await db.execute(select(Client.code).where(Client.id == body.client_id))
    client_code = client_result.scalar_one_or_none()

    # Resolve GPS address: mark as "Không xác định" if no valid coords
    gps_address = None
    has_valid_gps = body.gps_lat and body.gps_lng
    if not has_valid_gps:
        gps_address = "Không xác định"

    work_order = WorkOrder(
        client_id=body.client_id,
        client_name=body.client_name,
        client_code=client_code,
        route=body.route,
        pickup_location=body.pickup_location,
        dropoff_location=body.dropoff_location,
        driver_id=driver_id,
        driver_name=driver_name,
        tractor_plate=body.tractor_plate,
        gps_lat=body.gps_lat,
        gps_lng=body.gps_lng,
        gps_address=gps_address,
        unit_price=unit_price,
        driver_salary=driver_salary,
        allowance=allowance,
        earning=earning,
        pricing_id=pricing_id,
        status=status,
    )
    db.add(work_order)
    await db.flush()

    # Generate human-readable code (e.g. ABC0001)
    from app.services.code_service import generate_work_order_code
    work_order.code = await generate_work_order_code(db, body.client_id)

    for container in containers_data:
        photo_url = container.photo_url
        if photo_url and photo_url.startswith("data:"):
            photo_url = await asyncio.to_thread(save_base64_photo, photo_url)

        db.add(WorkOrderContainer(
            work_order_id=work_order.id,
            container_number=normalize_container_number(container.container_number),
            work_type=container.work_type,
            photo_url=photo_url,
            photo_lat=container.photo_lat,
            photo_lng=container.photo_lng,
            photo_timestamp=container.photo_timestamp,
        ))

    await db.flush()
    return work_order


# Redis-backed OCR attempt tracking
_OCR_ATTEMPT_TTL = 600  # 10 minutes


async def _get_ocr_attempts_remaining(redis, user_id: int, container_index: int) -> int:
    key = f"ocr_attempts:{user_id}:{container_index}"
    val = await redis.get(key)
    attempts = int(val) if val else 0
    return max(0, MAX_OCR_ATTEMPTS - attempts)


@router.post("/work-orders/ocr-container", response_model=ContainerOCRResponse)
async def ocr_container_number(
    body: ContainerOCRRequest,
    current_user: User = Depends(get_current_user),
    redis=Depends(get_redis),
):
    """Extract container number from image using Gemini AI OCR.

    Driver workflow:
    1. Upload image (base64-encoded)
    2. AI attempts OCR (max MAX_OCR_ATTEMPTS attempts per container)
    3. If all fail → driver enters manually
    4. Backend validates against ISO 6346
    """
    user_id = current_user.id
    rkey = f"ocr_attempts:{user_id}:{body.container_index}"

    # Check remaining attempts via Redis
    attempts_remaining = await _get_ocr_attempts_remaining(redis, user_id, body.container_index)
    if attempts_remaining <= 0:
        _logger.warning("WO_OCR_ATTEMPTS_EXHAUSTED user=%s idx=%s", user_id, body.container_index)
        return ContainerOCRResponse(
            success=False,
            container_number=None,
            error="Đã hết số lần quét OCR. Vui lòng nhập số container thủ công.",
            attempts_remaining=0,
        )

    # Decode base64 image
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

    # Record this attempt in Redis
    pipe = redis.pipeline()
    pipe.incr(rkey)
    pipe.expire(rkey, _OCR_ATTEMPT_TTL)
    await pipe.execute()

    # Call OCR service (no longer takes attempt tracker — pure AI extraction)
    result = await extract_container_number(
        image_bytes=image_bytes,
        mime_type=body.mime_type,
    )

    # Compute remaining after this attempt
    attempts_remaining = await _get_ocr_attempts_remaining(redis, user_id, body.container_index)
    result["attempts_remaining"] = attempts_remaining

    return ContainerOCRResponse(**result)


@router.get("/work-orders/export")
async def export_work_orders_excel(
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    current_user: User = Depends(require_permission("export", "WorkOrder")),
    db: AsyncSession = Depends(get_db),
):
    """Export work orders to Excel."""
    from app.services.excel_service import generate_work_orders_excel

    content = await generate_work_orders_excel(
        db, date_from=date_from.isoformat() if date_from else None,
        date_to=date_to.isoformat() if date_to else None, status=status,
    )
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=work_orders.xlsx"},
    )
