"""ORM <-> domain entity mappers for the Operations context."""

from __future__ import annotations

from app.contexts.operations.domain.entities import (
    BookedTrip,
    BookedTripContainer,
    DeliveredTrip,
    DeliveredTripContainer,
)
from app.contexts.operations.domain.value_objects import (
    BookedTripContainerId,
    BookedTripId,
    DeliveredTripContainerId,
    DeliveredTripId,
)
from app.contexts.operations.infrastructure.orm import (
    BookedTripContainerORM,
    BookedTripORM,
    DeliveredTripContainerORM,
    DeliveredTripORM,
)


# ── BookedTripContainer ──────────────────────────────────────────


def booked_container_to_domain(orm: BookedTripContainerORM) -> BookedTripContainer:
    return BookedTripContainer(
        id=BookedTripContainerId(orm.id) if orm.id is not None else None,
        booked_trip_id=BookedTripId(orm.booked_trip_id),
        container_number=orm.container_number,
        cont_type=orm.cont_type,
    )


def booked_container_to_orm(
    c: BookedTripContainer, orm: BookedTripContainerORM | None = None
) -> BookedTripContainerORM:
    if orm is None:
        orm = BookedTripContainerORM()
    if c.id is not None:
        orm.id = int(c.id)
    if c.booked_trip_id is not None:
        orm.booked_trip_id = int(c.booked_trip_id)
    orm.container_number = c.container_number
    orm.cont_type = c.cont_type
    return orm


# ── BookedTrip ────────────────────────────────────────────────────


def booked_trip_to_domain(
    orm: BookedTripORM,
    containers: list[BookedTripContainerORM] | None = None,
    matched_delivered_trip_ids: list[int] | None = None,
    matched_by: int = 0,
) -> BookedTrip:
    container_entities: list[BookedTripContainer] = [
        booked_container_to_domain(c_orm) for c_orm in containers or []
    ]
    return BookedTrip(
        id=BookedTripId(orm.id) if orm.id is not None else None,
        trip_date=orm.trip_date,
        client_id=orm.client_id,
        pickup_location_id=orm.pickup_location_id,
        dropoff_location_id=orm.dropoff_location_id,
        operation_type=orm.operation_type,
        work_type=orm.work_type,
        revenue=int(orm.revenue or 0),
        status=orm.status,
        vessel=orm.vessel,
        vehicle_plate=orm.vehicle_plate,
        created_at=orm.created_at,
        updated_at=orm.updated_at,
        containers=container_entities,
        matched_delivered_trip_ids=list(matched_delivered_trip_ids or []),
        matched_by=matched_by,
    )


def booked_trip_to_orm(
    t: BookedTrip, orm: BookedTripORM | None = None
) -> BookedTripORM:
    if orm is None:
        orm = BookedTripORM()
    if t.id is not None:
        orm.id = int(t.id)
    orm.trip_date = t.trip_date
    orm.client_id = int(t.client_id)
    orm.pickup_location_id = int(t.pickup_location_id)
    orm.dropoff_location_id = int(t.dropoff_location_id)
    orm.operation_type = t.operation_type
    orm.work_type = t.work_type
    orm.revenue = int(t.revenue)
    orm.status = str(t.status)
    orm.vessel = t.vessel
    orm.vehicle_plate = t.vehicle_plate
    return orm


# ── DeliveredTripContainer ────────────────────────────────────────


def delivered_container_to_domain(orm: DeliveredTripContainerORM) -> DeliveredTripContainer:
    return DeliveredTripContainer(
        id=DeliveredTripContainerId(orm.id) if orm.id is not None else None,
        delivered_trip_id=DeliveredTripId(orm.delivered_trip_id),
        container_number=orm.container_number,
        cont_type=orm.cont_type,
        photo_url=orm.photo_url,
        photo_lat=orm.photo_lat,
        photo_lng=orm.photo_lng,
        photo_timestamp=orm.photo_timestamp,
        photo_address=orm.photo_address,
    )


def delivered_container_to_orm(
    c: DeliveredTripContainer, orm: DeliveredTripContainerORM | None = None
) -> DeliveredTripContainerORM:
    if orm is None:
        orm = DeliveredTripContainerORM()
    if c.id is not None:
        orm.id = int(c.id)
    if c.delivered_trip_id is not None:
        orm.delivered_trip_id = int(c.delivered_trip_id)
    orm.container_number = c.container_number
    orm.cont_type = c.cont_type
    orm.photo_url = c.photo_url
    orm.photo_lat = c.photo_lat
    orm.photo_lng = c.photo_lng
    orm.photo_timestamp = c.photo_timestamp
    orm.photo_address = c.photo_address
    return orm


# ── DeliveredTrip ────────────────────────────────────────────────────


def delivered_trip_to_domain(
    orm: DeliveredTripORM, containers: list[DeliveredTripContainerORM] | None = None
) -> DeliveredTrip:
    return DeliveredTrip(
        id=DeliveredTripId(orm.id) if orm.id is not None else None,
        client_id=orm.client_id,
        pickup_location_id=orm.pickup_location_id,
        dropoff_location_id=orm.dropoff_location_id,
        driver_id=orm.driver_id,
        vehicle_id=orm.vehicle_id,
        vendor_id=orm.vendor_id,
        vessel=orm.vessel,
        operation_type=orm.operation_type,
        work_type=orm.work_type,
        gps_lat=orm.gps_lat,
        gps_lng=orm.gps_lng,
        gps_address=orm.gps_address,
        revenue=int(orm.revenue or 0),
        driver_salary=int(orm.driver_salary or 0),
        allowance=int(orm.allowance or 0),
        trip_date=orm.trip_date,
        status=orm.status,
        created_at=orm.created_at,
        updated_at=orm.updated_at,
        containers=[delivered_container_to_domain(c) for c in (containers or [])],
    )


def delivered_trip_to_orm(
    w: DeliveredTrip, orm: DeliveredTripORM | None = None
) -> DeliveredTripORM:
    if orm is None:
        orm = DeliveredTripORM()
    if w.id is not None:
        orm.id = int(w.id)
    orm.client_id = int(w.client_id)
    orm.pickup_location_id = int(w.pickup_location_id)
    orm.dropoff_location_id = int(w.dropoff_location_id)
    orm.driver_id = w.driver_id
    orm.vehicle_id = w.vehicle_id
    orm.vendor_id = w.vendor_id
    orm.vessel = w.vessel
    orm.operation_type = w.operation_type
    orm.work_type = w.work_type
    orm.gps_lat = w.gps_lat
    orm.gps_lng = w.gps_lng
    orm.gps_address = w.gps_address
    orm.revenue = int(w.revenue)
    orm.driver_salary = int(w.driver_salary)
    orm.allowance = int(w.allowance)
    orm.trip_date = w.trip_date
    orm.status = str(w.status)
    return orm
