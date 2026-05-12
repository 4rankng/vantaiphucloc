"""ORM <-> domain entity mappers for the Operations context."""

from __future__ import annotations

from app.contexts.operations.domain.entities import (
    TripContainerPhoto,
    TripOrder,
    TripOrderContainer,
    WorkOrder,
    WorkOrderContainer,
)
from app.contexts.operations.domain.value_objects import (
    TripContainerPhotoId,
    TripOrderContainerId,
    TripOrderId,
    WorkOrderContainerId,
    WorkOrderId,
)
from app.contexts.operations.infrastructure.orm import (
    TripContainerPhotoORM,
    TripOrderContainerORM,
    TripOrderORM,
    WorkOrderContainerORM,
    WorkOrderORM,
)


# ── Trip Container Photo ─────────────────────────────────────────


def trip_photo_to_domain(orm: TripContainerPhotoORM) -> TripContainerPhoto:
    return TripContainerPhoto(
        id=TripContainerPhotoId(orm.id) if orm.id is not None else None,
        trip_container_id=TripOrderContainerId(orm.trip_container_id),
        kind=orm.kind,
        file_url=orm.file_url,
        caption=orm.caption,
        uploaded_at=orm.uploaded_at,
        uploaded_by=orm.uploaded_by,
        created_at=orm.created_at,
    )


def trip_photo_to_orm(
    p: TripContainerPhoto, orm: TripContainerPhotoORM | None = None
) -> TripContainerPhotoORM:
    if orm is None:
        orm = TripContainerPhotoORM()
    if p.id is not None:
        orm.id = int(p.id)
    orm.trip_container_id = int(p.trip_container_id)
    orm.kind = p.kind
    orm.file_url = p.file_url
    orm.caption = p.caption
    if p.uploaded_at is not None:
        orm.uploaded_at = p.uploaded_at
    orm.uploaded_by = p.uploaded_by
    return orm


# ── Trip Container ───────────────────────────────────────────────


def trip_container_to_domain(
    orm: TripOrderContainerORM,
    photos: list[TripContainerPhotoORM] | None = None,
) -> TripOrderContainer:
    return TripOrderContainer(
        id=TripOrderContainerId(orm.id) if orm.id is not None else None,
        trip_order_id=TripOrderId(orm.trip_order_id),
        container_number=orm.container_number,
        work_type=orm.work_type,
        container_size=orm.container_size,
        container_type=orm.container_type,
        freight_kind=orm.freight_kind,
        gross_weight_kg=orm.gross_weight_kg,
        seal_no=orm.seal_no,
        commodity=orm.commodity,
        container_metadata=orm.container_metadata,
        photos=[trip_photo_to_domain(p) for p in (photos or [])],
    )


def trip_container_to_orm(
    c: TripOrderContainer, orm: TripOrderContainerORM | None = None
) -> TripOrderContainerORM:
    if orm is None:
        orm = TripOrderContainerORM()
    if c.id is not None:
        orm.id = int(c.id)
    if c.trip_order_id is not None:
        orm.trip_order_id = int(c.trip_order_id)
    orm.container_number = c.container_number
    orm.work_type = c.work_type
    orm.container_size = c.container_size
    orm.container_type = c.container_type
    orm.freight_kind = c.freight_kind
    orm.gross_weight_kg = c.gross_weight_kg
    orm.seal_no = c.seal_no
    orm.commodity = c.commodity
    orm.container_metadata = c.container_metadata
    return orm


# ── TripOrder ────────────────────────────────────────────────────


def trip_order_to_domain(
    orm: TripOrderORM,
    containers: list[TripOrderContainerORM] | None = None,
    photos_by_container: dict[int, list[TripContainerPhotoORM]] | None = None,
    matched_work_order_ids: list[int] | None = None,
    matched_by: int = 0,
) -> TripOrder:
    container_entities: list[TripOrderContainer] = []
    for c_orm in containers or []:
        ph = (photos_by_container or {}).get(c_orm.id, [])
        container_entities.append(trip_container_to_domain(c_orm, ph))
    return TripOrder(
        id=TripOrderId(orm.id) if orm.id is not None else None,
        trip_date=orm.trip_date,
        partner_id=orm.partner_id,
        code=orm.code,
        pickup_location_id=orm.pickup_location_id,
        dropoff_location_id=orm.dropoff_location_id,
        pricing_id=orm.pricing_id,
        unit_price=int(orm.unit_price or 0),
        driver_salary=int(orm.driver_salary or 0),
        allowance=int(orm.allowance or 0),
        status=orm.status,
        pickup_raw=orm.pickup_raw,
        dropoff_raw=orm.dropoff_raw,
        location_review_needed=bool(orm.location_review_needed),
        created_at=orm.created_at,
        updated_at=orm.updated_at,
        containers=container_entities,
        matched_work_order_ids=list(matched_work_order_ids or []),
        matched_by=matched_by,
    )


def trip_order_to_orm(
    t: TripOrder, orm: TripOrderORM | None = None
) -> TripOrderORM:
    if orm is None:
        orm = TripOrderORM()
    if t.id is not None:
        orm.id = int(t.id)
    orm.trip_date = t.trip_date
    orm.partner_id = int(t.partner_id)
    orm.code = t.code
    orm.pickup_location_id = int(t.pickup_location_id)
    orm.dropoff_location_id = int(t.dropoff_location_id)
    orm.pricing_id = t.pricing_id
    orm.unit_price = int(t.unit_price)
    orm.driver_salary = int(t.driver_salary)
    orm.allowance = int(t.allowance)
    orm.status = str(t.status)
    orm.pickup_raw = t.pickup_raw
    orm.dropoff_raw = t.dropoff_raw
    orm.location_review_needed = bool(t.location_review_needed)
    return orm


# ── WorkOrderContainer ───────────────────────────────────────────


def work_container_to_domain(orm: WorkOrderContainerORM) -> WorkOrderContainer:
    return WorkOrderContainer(
        id=WorkOrderContainerId(orm.id) if orm.id is not None else None,
        work_order_id=WorkOrderId(orm.work_order_id),
        container_number=orm.container_number,
        work_type=orm.work_type,
        photo_url=orm.photo_url,
        photo_lat=orm.photo_lat,
        photo_lng=orm.photo_lng,
        photo_timestamp=orm.photo_timestamp,
        photo_address=orm.photo_address,
    )


def work_container_to_orm(
    c: WorkOrderContainer, orm: WorkOrderContainerORM | None = None
) -> WorkOrderContainerORM:
    if orm is None:
        orm = WorkOrderContainerORM()
    if c.id is not None:
        orm.id = int(c.id)
    if c.work_order_id is not None:
        orm.work_order_id = int(c.work_order_id)
    orm.container_number = c.container_number
    orm.work_type = c.work_type
    orm.photo_url = c.photo_url
    orm.photo_lat = c.photo_lat
    orm.photo_lng = c.photo_lng
    orm.photo_timestamp = c.photo_timestamp
    orm.photo_address = c.photo_address
    return orm


# ── WorkOrder ────────────────────────────────────────────────────


def work_order_to_domain(
    orm: WorkOrderORM, containers: list[WorkOrderContainerORM] | None = None
) -> WorkOrder:
    return WorkOrder(
        id=WorkOrderId(orm.id) if orm.id is not None else None,
        partner_id=orm.partner_id,
        code=orm.code,
        pickup_location_id=orm.pickup_location_id,
        dropoff_location_id=orm.dropoff_location_id,
        driver_id=orm.driver_id,
        vehicle_id=orm.vehicle_id,
        gps_lat=orm.gps_lat,
        gps_lng=orm.gps_lng,
        gps_address=orm.gps_address,
        unit_price=int(orm.unit_price or 0),
        driver_salary=int(orm.driver_salary or 0),
        allowance=int(orm.allowance or 0),
        pricing_id=orm.pricing_id,
        trip_date=orm.trip_date,
        status=orm.status,
        created_at=orm.created_at,
        updated_at=orm.updated_at,
        containers=[work_container_to_domain(c) for c in (containers or [])],
    )


def work_order_to_orm(
    w: WorkOrder, orm: WorkOrderORM | None = None
) -> WorkOrderORM:
    if orm is None:
        orm = WorkOrderORM()
    if w.id is not None:
        orm.id = int(w.id)
    orm.partner_id = int(w.partner_id)
    orm.code = w.code
    orm.pickup_location_id = int(w.pickup_location_id)
    orm.dropoff_location_id = int(w.dropoff_location_id)
    orm.driver_id = int(w.driver_id)
    orm.vehicle_id = w.vehicle_id
    orm.gps_lat = w.gps_lat
    orm.gps_lng = w.gps_lng
    orm.gps_address = w.gps_address
    orm.unit_price = int(w.unit_price)
    orm.driver_salary = int(w.driver_salary)
    orm.allowance = int(w.allowance)
    orm.pricing_id = w.pricing_id
    orm.trip_date = w.trip_date
    orm.status = str(w.status)
    return orm
