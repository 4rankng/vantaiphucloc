"""FastAPI dependency wiring for the Operations context."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.application import (
    BatchCreateDeliveredTrips,
    CreateBookedTrip,
    CreateBookedTripFromImport,
    CreateDeliveredTrip,
    DeleteBookedTrip,
    DeleteDeliveredTrip,
    GetBookedTrip,
    GetDeliveredTrip,
    ListBookedTrips,
    ListDeliveredTrips,
    UpdateBookedTrip,
    UpdateDeliveredTrip,
)
from app.contexts.operations.domain.repositories import (
    BookedTripRepository,
    DeliveredTripRepository,
)
from app.contexts.operations.infrastructure.repositories import (
    SqlBookedTripRepository,
    SqlDeliveredTripRepository,
    MappingProfileRepository,
)
from app.database import get_db


# ── repositories ────────────────────────────────────────────────


def get_booked_trip_repository(
    db: AsyncSession = Depends(get_db),
) -> BookedTripRepository:
    return SqlBookedTripRepository(db)


def get_delivered_trip_repository(
    db: AsyncSession = Depends(get_db),
) -> DeliveredTripRepository:
    return SqlDeliveredTripRepository(db)


def get_mapping_profile_repository(
    db: AsyncSession = Depends(get_db),
) -> MappingProfileRepository:
    return MappingProfileRepository(db)


# ── booked_trip use cases ────────────────────────────────────────


def get_get_booked_trip(
    repo: BookedTripRepository = Depends(get_booked_trip_repository),
) -> GetBookedTrip:
    return GetBookedTrip(repo)


def get_list_booked_trips(
    repo: BookedTripRepository = Depends(get_booked_trip_repository),
) -> ListBookedTrips:
    return ListBookedTrips(repo)


def get_create_booked_trip(
    repo: BookedTripRepository = Depends(get_booked_trip_repository),
    db: AsyncSession = Depends(get_db),
) -> CreateBookedTrip:
    return CreateBookedTrip(repo, db)


def get_update_booked_trip(
    repo: BookedTripRepository = Depends(get_booked_trip_repository),
    db: AsyncSession = Depends(get_db),
) -> UpdateBookedTrip:
    return UpdateBookedTrip(repo, db)


def get_delete_booked_trip(
    repo: BookedTripRepository = Depends(get_booked_trip_repository),
    db: AsyncSession = Depends(get_db),
) -> DeleteBookedTrip:
    return DeleteBookedTrip(repo, db)


def get_create_booked_trip_from_import(
    repo: BookedTripRepository = Depends(get_booked_trip_repository),
    db: AsyncSession = Depends(get_db),
) -> CreateBookedTripFromImport:
    return CreateBookedTripFromImport(repo, db)


# ── delivered_trip use cases ────────────────────────────────────────


def get_get_delivered_trip(
    repo: DeliveredTripRepository = Depends(get_delivered_trip_repository),
) -> GetDeliveredTrip:
    return GetDeliveredTrip(repo)


def get_list_delivered_trips(
    repo: DeliveredTripRepository = Depends(get_delivered_trip_repository),
) -> ListDeliveredTrips:
    return ListDeliveredTrips(repo)


def get_create_delivered_trip(
    repo: DeliveredTripRepository = Depends(get_delivered_trip_repository),
    db: AsyncSession = Depends(get_db),
) -> CreateDeliveredTrip:
    return CreateDeliveredTrip(repo, db)


def get_update_delivered_trip(
    repo: DeliveredTripRepository = Depends(get_delivered_trip_repository),
    db: AsyncSession = Depends(get_db),
) -> UpdateDeliveredTrip:
    return UpdateDeliveredTrip(repo, db)


def get_delete_delivered_trip(
    repo: DeliveredTripRepository = Depends(get_delivered_trip_repository),
    db: AsyncSession = Depends(get_db),
) -> DeleteDeliveredTrip:
    return DeleteDeliveredTrip(repo, db)


def get_batch_create_delivered_trips(
    repo: DeliveredTripRepository = Depends(get_delivered_trip_repository),
    db: AsyncSession = Depends(get_db),
) -> BatchCreateDeliveredTrips:
    return BatchCreateDeliveredTrips(repo, db)
