"""FastAPI dependency wiring for the Operations context."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.application import (
    ApplyPricingToTrips,
    BatchCreateDeliveredTrips,
    CreateBookedTrip,
    CreateBookedTripFromImport,
    CreateDeliveredTrip,
    DeleteBookedTrip,
    GetBookedTrip,
    GetDeliveredTrip,
    ListBookedTrips,
    ListDeliveredTrips,
    MatchTripToDeliveredTrip,
    UnmatchTripFromDeliveredTrip,
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
    delivered_trip_repo: DeliveredTripRepository = Depends(get_delivered_trip_repository),
    db: AsyncSession = Depends(get_db),
) -> CreateBookedTrip:
    return CreateBookedTrip(repo, delivered_trip_repo, db)


def get_update_booked_trip(
    repo: BookedTripRepository = Depends(get_booked_trip_repository),
    delivered_trip_repo: DeliveredTripRepository = Depends(get_delivered_trip_repository),
    db: AsyncSession = Depends(get_db),
) -> UpdateBookedTrip:
    return UpdateBookedTrip(repo, delivered_trip_repo, db)


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


def get_apply_pricing_to_trips(
    db: AsyncSession = Depends(get_db),
) -> ApplyPricingToTrips:
    return ApplyPricingToTrips(db)


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


def get_batch_create_delivered_trips(
    repo: DeliveredTripRepository = Depends(get_delivered_trip_repository),
    db: AsyncSession = Depends(get_db),
) -> BatchCreateDeliveredTrips:
    return BatchCreateDeliveredTrips(repo, db)


# ── reconciliation use cases ────────────────────────────────────


def get_match_booked_to_delivered_trip(
    booked_trip_repo: BookedTripRepository = Depends(get_booked_trip_repository),
    delivered_trip_repo: DeliveredTripRepository = Depends(get_delivered_trip_repository),
    db: AsyncSession = Depends(get_db),
) -> MatchTripToDeliveredTrip:
    return MatchTripToDeliveredTrip(booked_trip_repo, delivered_trip_repo, db)


def get_unmatch_booked_from_delivered_trip(
    booked_trip_repo: BookedTripRepository = Depends(get_booked_trip_repository),
    delivered_trip_repo: DeliveredTripRepository = Depends(get_delivered_trip_repository),
    db: AsyncSession = Depends(get_db),
) -> UnmatchTripFromDeliveredTrip:
    return UnmatchTripFromDeliveredTrip(booked_trip_repo, delivered_trip_repo, db)
