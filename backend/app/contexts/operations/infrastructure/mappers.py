"""ORM <-> domain entity mappers for the Operations context."""

from __future__ import annotations

from app.contexts.operations.domain.entities import (
    BookedTrip,
    DeliveredTrip,
)
from app.contexts.operations.domain.value_objects import (
    BookedTripId,
    DeliveredTripId,
)
from app.contexts.operations.infrastructure.orm import (
    BookedTripORM,
    DeliveredTripORM,
)


# ── BookedTrip ────────────────────────────────────────────────────


def booked_trip_to_domain(orm: BookedTripORM) -> BookedTrip:
    return BookedTrip(
        id=BookedTripId(orm.id) if orm.id is not None else None,
        trip_date=orm.trip_date,
        client_id=orm.client_id,
        pickup_location_id=orm.pickup_location_id,
        dropoff_location_id=orm.dropoff_location_id,
        work_type=orm.work_type,
        cont_number=orm.cont_number,
        cont_type=orm.cont_type,
        matched=orm.matched,
        vessel=orm.vessel,
        vehicle_plate=orm.vehicle_plate,
        created_at=orm.created_at,
        updated_at=orm.updated_at,
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
    orm.work_type = t.work_type
    orm.cont_number = t.cont_number
    orm.cont_type = t.cont_type
    orm.matched = t.matched
    orm.vessel = t.vessel
    orm.vehicle_plate = t.vehicle_plate
    return orm


# ── DeliveredTrip ────────────────────────────────────────────────────


def delivered_trip_to_domain(orm: DeliveredTripORM) -> DeliveredTrip:
    return DeliveredTrip(
        id=DeliveredTripId(orm.id) if orm.id is not None else None,
        client_id=orm.client_id,
        pickup_location_id=orm.pickup_location_id,
        dropoff_location_id=orm.dropoff_location_id,
        driver_id=orm.driver_id,
        vendor_id=orm.vendor_id,
        vessel=orm.vessel,
        work_type=orm.work_type,
        cont_number=orm.cont_number,
        cont_type=orm.cont_type,
        vehicle_plate=orm.vehicle_plate,
        matched=orm.matched,
        revenue=int(orm.revenue or 0),
        driver_salary=int(orm.driver_salary or 0),
        allowance=int(orm.allowance or 0),
        trip_date=orm.trip_date,
        created_at=orm.created_at,
        updated_at=orm.updated_at,
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
    orm.vendor_id = w.vendor_id
    orm.vessel = w.vessel
    orm.work_type = w.work_type
    orm.cont_number = w.cont_number
    orm.cont_type = w.cont_type
    orm.vehicle_plate = w.vehicle_plate
    orm.matched = w.matched
    orm.revenue = int(w.revenue)
    orm.driver_salary = int(w.driver_salary)
    orm.allowance = int(w.allowance)
    orm.trip_date = w.trip_date
    return orm
