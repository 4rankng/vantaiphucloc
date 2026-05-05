"""Customer & Pricing application layer.

Use cases that orchestrate domain entities and repositories. They know
about transactions but contain no business rules — those live on
aggregates in the domain layer.

CRUD use cases for all five aggregates (Customer, Vendor, Location,
Pricing, Route) live here. Two read-only helpers used by Operations
(C3) — `pricing_lookup` and `location_resolver` — also live in this
context since they are domain-specific knowledge of how lanes and
location strings resolve.
"""

from app.contexts.customer_pricing.application.customers import (
    CreateCustomer,
    DeleteCustomer,
    GetCustomer,
    ListCustomers,
    UpdateCustomer,
)
from app.contexts.customer_pricing.application.locations import (
    CreateLocation,
    DeleteLocation,
    GetLocation,
    ListAllActiveLocations,
    ListLocations,
    PinDriverLocation,
    UpdateLocation,
)
from app.contexts.customer_pricing.application.pricings import (
    CreatePricing,
    DeletePricing,
    GetPricing,
    ListPricings,
    UpdatePricing,
)
from app.contexts.customer_pricing.application.routes import (
    CreateRoute,
    DeleteRoute,
    GetRoute,
    ListRoutes,
    UpdateRoute,
)
from app.contexts.customer_pricing.application.vendors import (
    CreateVendor,
    DeleteVendor,
    GetVendor,
    ListVendors,
    UpdateVendor,
)

__all__ = [
    # Customer
    "CreateCustomer",
    "DeleteCustomer",
    "GetCustomer",
    "ListCustomers",
    "UpdateCustomer",
    # Vendor
    "CreateVendor",
    "DeleteVendor",
    "GetVendor",
    "ListVendors",
    "UpdateVendor",
    # Location
    "CreateLocation",
    "DeleteLocation",
    "GetLocation",
    "ListAllActiveLocations",
    "ListLocations",
    "PinDriverLocation",
    "UpdateLocation",
    # Pricing
    "CreatePricing",
    "DeletePricing",
    "GetPricing",
    "ListPricings",
    "UpdatePricing",
    # Route
    "CreateRoute",
    "DeleteRoute",
    "GetRoute",
    "ListRoutes",
    "UpdateRoute",
]
