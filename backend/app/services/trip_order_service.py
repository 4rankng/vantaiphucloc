"""Business logic for creating TripOrders."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import TripOrder, TripOrderContainer, TripOrderWorkOrder, WorkOrder
from app.models.enums import TripOrderStatus, WorkOrderStatus
from app.schemas.domain import TripOrderCreate
from app.validators.container import validate_container_quantity, validate_same_work_type
from app.utils.iso6346 import normalize_container_number as _norm


async def create_trip_order(
    body: TripOrderCreate, db: AsyncSession, *, user_id: int | None = None,
) -> TripOrder:
    """Create a TripOrder with containers and optional WO links.

    Caller owns the transaction; we only flush so IDs are available.

    `body.pickup_location_id` and `body.dropoff_location_id` are required —
    callers resolve location strings through `LocationResolverService`
    before invoking. The original strings, if any, can be preserved by
    the caller via `pickup_raw` / `dropoff_raw` on the model.
    """
    matched_ids = body.matched_work_order_ids
    trip_data = body.model_dump(exclude={"matched_work_order_ids", "containers"})

    if body.containers:
        validate_same_work_type(body.containers)
        work_type_val = body.containers[0].work_type
        validate_container_quantity(work_type_val, len(body.containers))

        from app.contexts.customer_pricing.application.pricing_lookup import (
            find_tiered_pricing,
        )
        container_count = sum(
            1 for c in body.containers if c.work_type == work_type_val
        ) or 1
        tiered = await find_tiered_pricing(
            db,
            client_id=body.client_id,
            work_type=work_type_val,
            quantity=container_count,
            pickup_location_id=body.pickup_location_id,
            dropoff_location_id=body.dropoff_location_id,
        )
        if tiered:
            trip_data["unit_price"] = tiered.unit_price
            trip_data["driver_salary"] = tiered.driver_salary
            trip_data["allowance"] = tiered.allowance
            trip_data["pricing_id"] = tiered.pricing.id

    if not trip_data.get("pricing_id"):
        trip_data["pricing_id"] = None

    has_containers = bool(body.containers)
    has_pricing = trip_data.get("unit_price", 0) > 0 and trip_data.get("driver_salary", 0) > 0
    trip_data["status"] = (
        TripOrderStatus.PENDING if (has_containers and has_pricing)
        else TripOrderStatus.DRAFT
    )

    trip_order = TripOrder(**trip_data)
    db.add(trip_order)
    await db.flush()

    from app.services.code_service import generate_trip_order_code
    trip_order.code = await generate_trip_order_code(db, body.client_id)

    for c in body.containers:
        db.add(TripOrderContainer(
            trip_order_id=trip_order.id,
            container_number=_norm(c.container_number),
            work_type=c.work_type,
            container_size=c.container_size,
            container_type=c.container_type,
            freight_kind=c.freight_kind,
            gross_weight_kg=c.gross_weight_kg,
            seal_no=c.seal_no,
            commodity=c.commodity,
            container_metadata=c.container_metadata,
        ))

    for wo_id in matched_ids:
        db.add(TripOrderWorkOrder(trip_order_id=trip_order.id, work_order_id=wo_id))

    if matched_ids:
        result = await db.execute(select(WorkOrder).where(WorkOrder.id.in_(matched_ids)))
        for wo in result.scalars():
            wo.status = WorkOrderStatus.MATCHED

    return trip_order
