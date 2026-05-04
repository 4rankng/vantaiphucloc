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

    Does NOT commit — caller owns the transaction.
    Only flushes so IDs are available for child inserts.

    Side effects on locations: pickup_location / dropoff_location strings
    on `body` are resolved through `LocationResolverService` (auto-create,
    alias matching, fuzzy suggestions). The original strings are
    preserved on `trip_order.pickup_raw` / `dropoff_raw` for traceability,
    and the canonical name + FK are stored on `pickup_location` / `_id`.
    """
    from app.services.location_resolver import (
        LocationResolverService, ResolverSource,
    )

    matched_ids = body.matched_work_order_ids
    trip_data = body.model_dump(exclude={"matched_work_order_ids", "containers"})

    # Capture raw strings BEFORE the resolver overwrites the canonical
    # fields. Used for `pickup_raw` / `dropoff_raw`.
    raw_pickup = trip_data.get("pickup_location")
    raw_dropoff = trip_data.get("dropoff_location")

    resolver = LocationResolverService(db)
    review_needed = False
    if raw_pickup:
        p = await resolver.resolve_or_create(
            raw_pickup, source=ResolverSource.CUSTOMER_ORDER, user_id=user_id,
        )
        if p.location is not None:
            trip_data["pickup_location"] = p.location.name
            trip_data["pickup_location_id"] = p.location.id
        if p.review_needed:
            review_needed = True
    if raw_dropoff:
        d = await resolver.resolve_or_create(
            raw_dropoff, source=ResolverSource.CUSTOMER_ORDER, user_id=user_id,
        )
        if d.location is not None:
            trip_data["dropoff_location"] = d.location.name
            trip_data["dropoff_location_id"] = d.location.id
        if d.review_needed:
            review_needed = True
    trip_data["pickup_raw"] = raw_pickup
    trip_data["dropoff_raw"] = raw_dropoff
    trip_data["location_review_needed"] = review_needed

    if body.containers:
        validate_same_work_type(body.containers)
        work_type_val = body.containers[0].work_type
        validate_container_quantity(work_type_val, len(body.containers))
        trip_data["container_number"] = _norm(body.containers[0].container_number)
        trip_data["work_type"] = work_type_val

    work_type = trip_data.get("work_type")
    if body.containers and work_type:
        from app.services.pricing_service import find_tiered_pricing
        container_count = sum(1 for c in body.containers if c.work_type == work_type) or 1
        tiered = await find_tiered_pricing(
            db,
            client_id=body.client_id,
            work_type=work_type,
            quantity=container_count,
            route=body.route,
            pickup_location=body.pickup_location,
            dropoff_location=body.dropoff_location,
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
    trip_data["status"] = TripOrderStatus.PENDING if (has_containers and has_pricing) else TripOrderStatus.DRAFT

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
        ))

    for wo_id in matched_ids:
        db.add(TripOrderWorkOrder(trip_order_id=trip_order.id, work_order_id=wo_id))

    if matched_ids:
        result = await db.execute(select(WorkOrder).where(WorkOrder.id.in_(matched_ids)))
        for wo in result.scalars():
            wo.status = WorkOrderStatus.MATCHED

    return trip_order
