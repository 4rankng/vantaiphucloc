"""FastAPI dependency wiring for the Route Pricing context."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.route_pricing.application.use_cases import (
    CreateRoutePricing,
    DeleteRoutePricing,
    ListRoutePricings,
    UpdateRoutePricing,
)
from app.contexts.route_pricing.domain.repositories import RoutePricingRepository
from app.contexts.route_pricing.infrastructure.repositories import (
    SqlRoutePricingRepository,
)
from app.database import get_db


def get_route_pricing_repository(
    db: AsyncSession = Depends(get_db),
) -> RoutePricingRepository:
    return SqlRoutePricingRepository(db)


def get_list_route_pricings(
    repo: RoutePricingRepository = Depends(get_route_pricing_repository),
) -> ListRoutePricings:
    return ListRoutePricings(repo)


def get_create_route_pricing(
    repo: RoutePricingRepository = Depends(get_route_pricing_repository),
    db: AsyncSession = Depends(get_db),
) -> CreateRoutePricing:
    return CreateRoutePricing(repo, db)


def get_update_route_pricing(
    repo: RoutePricingRepository = Depends(get_route_pricing_repository),
    db: AsyncSession = Depends(get_db),
) -> UpdateRoutePricing:
    return UpdateRoutePricing(repo, db)


def get_delete_route_pricing(
    repo: RoutePricingRepository = Depends(get_route_pricing_repository),
    db: AsyncSession = Depends(get_db),
) -> DeleteRoutePricing:
    return DeleteRoutePricing(repo, db)
