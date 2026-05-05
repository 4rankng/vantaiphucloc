"""FastAPI dependency wiring for the Customer & Pricing context."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.application import (
    CreateCustomer,
    CreateLocation,
    CreatePricing,
    CreateRoute,
    CreateVendor,
    DeleteCustomer,
    DeleteLocation,
    DeletePricing,
    DeleteRoute,
    DeleteVendor,
    GetCustomer,
    GetLocation,
    GetPricing,
    GetRoute,
    GetVendor,
    ListAllActiveLocations,
    ListCustomers,
    ListLocations,
    ListPricings,
    ListRoutes,
    ListVendors,
    PinDriverLocation,
    UpdateCustomer,
    UpdateLocation,
    UpdatePricing,
    UpdateRoute,
    UpdateVendor,
)
from app.contexts.customer_pricing.domain.repositories import (
    ClientRepository,
    LocationRepository,
    PricingRepository,
    RouteRepository,
    VendorRepository,
)
from app.contexts.customer_pricing.infrastructure.repositories import (
    SqlClientRepository,
    SqlLocationRepository,
    SqlPricingRepository,
    SqlRouteRepository,
    SqlVendorRepository,
)
from app.database import get_db


# ── repositories ────────────────────────────────────────────────


def get_client_repository(
    db: AsyncSession = Depends(get_db),
) -> ClientRepository:
    return SqlClientRepository(db)


def get_vendor_repository(
    db: AsyncSession = Depends(get_db),
) -> VendorRepository:
    return SqlVendorRepository(db)


def get_location_repository(
    db: AsyncSession = Depends(get_db),
) -> LocationRepository:
    return SqlLocationRepository(db)


def get_route_repository(
    db: AsyncSession = Depends(get_db),
) -> RouteRepository:
    return SqlRouteRepository(db)


def get_pricing_repository(
    db: AsyncSession = Depends(get_db),
) -> PricingRepository:
    return SqlPricingRepository(db)


# ── customer use cases ──────────────────────────────────────────


def get_list_customers(
    repo: ClientRepository = Depends(get_client_repository),
) -> ListCustomers:
    return ListCustomers(repo)


def get_create_customer(
    repo: ClientRepository = Depends(get_client_repository),
    db: AsyncSession = Depends(get_db),
) -> CreateCustomer:
    return CreateCustomer(repo, db)


def get_update_customer(
    repo: ClientRepository = Depends(get_client_repository),
    db: AsyncSession = Depends(get_db),
) -> UpdateCustomer:
    return UpdateCustomer(repo, db)


def get_delete_customer(
    repo: ClientRepository = Depends(get_client_repository),
    db: AsyncSession = Depends(get_db),
) -> DeleteCustomer:
    return DeleteCustomer(repo, db)


def get_get_customer(
    repo: ClientRepository = Depends(get_client_repository),
) -> GetCustomer:
    return GetCustomer(repo)


# ── vendor use cases ────────────────────────────────────────────


def get_list_vendors(
    repo: VendorRepository = Depends(get_vendor_repository),
) -> ListVendors:
    return ListVendors(repo)


def get_create_vendor(
    repo: VendorRepository = Depends(get_vendor_repository),
    db: AsyncSession = Depends(get_db),
) -> CreateVendor:
    return CreateVendor(repo, db)


def get_update_vendor(
    repo: VendorRepository = Depends(get_vendor_repository),
    db: AsyncSession = Depends(get_db),
) -> UpdateVendor:
    return UpdateVendor(repo, db)


def get_delete_vendor(
    repo: VendorRepository = Depends(get_vendor_repository),
    db: AsyncSession = Depends(get_db),
) -> DeleteVendor:
    return DeleteVendor(repo, db)


def get_get_vendor(
    repo: VendorRepository = Depends(get_vendor_repository),
) -> GetVendor:
    return GetVendor(repo)


# ── location use cases ──────────────────────────────────────────


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


# ── route use cases ─────────────────────────────────────────────


def get_list_routes(
    repo: RouteRepository = Depends(get_route_repository),
) -> ListRoutes:
    return ListRoutes(repo)


def get_create_route(
    repo: RouteRepository = Depends(get_route_repository),
    db: AsyncSession = Depends(get_db),
) -> CreateRoute:
    return CreateRoute(repo, db)


def get_update_route(
    repo: RouteRepository = Depends(get_route_repository),
    db: AsyncSession = Depends(get_db),
) -> UpdateRoute:
    return UpdateRoute(repo, db)


def get_delete_route(
    repo: RouteRepository = Depends(get_route_repository),
    db: AsyncSession = Depends(get_db),
) -> DeleteRoute:
    return DeleteRoute(repo, db)


def get_get_route(
    repo: RouteRepository = Depends(get_route_repository),
) -> GetRoute:
    return GetRoute(repo)


# ── pricing use cases ───────────────────────────────────────────


def get_list_pricings(
    repo: PricingRepository = Depends(get_pricing_repository),
) -> ListPricings:
    return ListPricings(repo)


def get_create_pricing(
    repo: PricingRepository = Depends(get_pricing_repository),
    db: AsyncSession = Depends(get_db),
) -> CreatePricing:
    return CreatePricing(repo, db)


def get_update_pricing(
    repo: PricingRepository = Depends(get_pricing_repository),
    db: AsyncSession = Depends(get_db),
) -> UpdatePricing:
    return UpdatePricing(repo, db)


def get_delete_pricing(
    repo: PricingRepository = Depends(get_pricing_repository),
    db: AsyncSession = Depends(get_db),
) -> DeletePricing:
    return DeletePricing(repo, db)


def get_get_pricing(
    repo: PricingRepository = Depends(get_pricing_repository),
) -> GetPricing:
    return GetPricing(repo)
