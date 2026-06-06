"""FastAPI dependency wiring for the Customer & Pricing context."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.application import (
    CreateLocation,
    CreatePartner,
    DeleteLocation,
    DeletePartner,
    GetLocation,
    GetPartner,
    ListAllActiveLocations,
    ListLocations,
    ListPartners,
    PinDriverLocation,
    UpdateLocation,
    UpdatePartner,
)
from app.contexts.customer_pricing.domain.repositories import (
    LocationRepository,
    PartnerRepository,
)
from app.contexts.customer_pricing.infrastructure.repositories import (
    SqlLocationRepository,
    SqlClientRepository,
)
from app.database import get_db


# -- repositories ---------------------------------------------------


def get_partner_repository(
    db: AsyncSession = Depends(get_db),
) -> PartnerRepository:
    return SqlClientRepository(db)


def get_location_repository(
    db: AsyncSession = Depends(get_db),
) -> LocationRepository:
    return SqlLocationRepository(db)


# -- partner use cases -----------------------------------------------


def get_list_partners(
    repo: PartnerRepository = Depends(get_partner_repository),
) -> ListPartners:
    return ListPartners(repo)


def get_create_partner(
    repo: PartnerRepository = Depends(get_partner_repository),
    db: AsyncSession = Depends(get_db),
) -> CreatePartner:
    return CreatePartner(repo, db)


def get_update_partner(
    repo: PartnerRepository = Depends(get_partner_repository),
    db: AsyncSession = Depends(get_db),
) -> UpdatePartner:
    return UpdatePartner(repo, db)


def get_delete_partner(
    repo: PartnerRepository = Depends(get_partner_repository),
    db: AsyncSession = Depends(get_db),
) -> DeletePartner:
    return DeletePartner(repo, db)


def get_get_partner(
    repo: PartnerRepository = Depends(get_partner_repository),
) -> GetPartner:
    return GetPartner(repo)


# -- location use cases ----------------------------------------------


def get_list_locations(
    repo: LocationRepository = Depends(get_location_repository),
) -> ListLocations:
    return ListLocations(repo)


def get_list_all_active_locations(
    repo: LocationRepository = Depends(get_location_repository),
) -> ListAllActiveLocations:
    return ListAllActiveLocations(repo)


def get_create_location(
    repo: LocationRepository = Depends(get_location_repository),
    db: AsyncSession = Depends(get_db),
) -> CreateLocation:
    return CreateLocation(repo, db)


def get_update_location(
    repo: LocationRepository = Depends(get_location_repository),
    db: AsyncSession = Depends(get_db),
) -> UpdateLocation:
    return UpdateLocation(repo, db)


def get_delete_location(
    repo: LocationRepository = Depends(get_location_repository),
    db: AsyncSession = Depends(get_db),
) -> DeleteLocation:
    return DeleteLocation(repo, db)


def get_pin_driver_location(
    repo: LocationRepository = Depends(get_location_repository),
    db: AsyncSession = Depends(get_db),
) -> PinDriverLocation:
    return PinDriverLocation(repo, db)


def get_get_location(
    repo: LocationRepository = Depends(get_location_repository),
) -> GetLocation:
    return GetLocation(repo)
