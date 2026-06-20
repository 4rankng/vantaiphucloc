"""FastAPI dependency wiring for the Vendor Route Pricing context."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.vendor_route_pricing.application.use_cases import (
    CreateVendorRoutePricing,
    DeleteVendorRoutePricing,
    ListVendorRoutePricings,
    UpdateVendorRoutePricing,
)
from app.contexts.vendor_route_pricing.domain.repositories import (
    VendorRoutePricingRepository,
)
from app.contexts.vendor_route_pricing.infrastructure.repositories import (
    SqlVendorRoutePricingRepository,
)
from app.database import get_db


def get_vendor_route_pricing_repository(
    db: AsyncSession = Depends(get_db),
) -> VendorRoutePricingRepository:
    return SqlVendorRoutePricingRepository(db)


def get_list_vendor_route_pricings(
    repo: VendorRoutePricingRepository = Depends(get_vendor_route_pricing_repository),
) -> ListVendorRoutePricings:
    return ListVendorRoutePricings(repo)


def get_create_vendor_route_pricing(
    repo: VendorRoutePricingRepository = Depends(get_vendor_route_pricing_repository),
    db: AsyncSession = Depends(get_db),
) -> CreateVendorRoutePricing:
    return CreateVendorRoutePricing(repo, db)


def get_update_vendor_route_pricing(
    repo: VendorRoutePricingRepository = Depends(get_vendor_route_pricing_repository),
    db: AsyncSession = Depends(get_db),
) -> UpdateVendorRoutePricing:
    return UpdateVendorRoutePricing(repo, db)


def get_delete_vendor_route_pricing(
    repo: VendorRoutePricingRepository = Depends(get_vendor_route_pricing_repository),
    db: AsyncSession = Depends(get_db),
) -> DeleteVendorRoutePricing:
    return DeleteVendorRoutePricing(repo, db)
