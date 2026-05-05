"""Customer & Pricing domain layer.

Pure Python. No SQLAlchemy / FastAPI / Pydantic / openpyxl.
"""

from app.contexts.customer_pricing.domain.entities import (
    Customer,
    Location,
    LocationAlias,
    Pricing,
    PricingLine,
    Route,
    Vendor,
)
from app.contexts.customer_pricing.domain.exceptions import (
    AlreadyExists,
    LocationInUse,
    NotFound,
    PricingNotMatched,
)
from app.contexts.customer_pricing.domain.repositories import (
    ClientRepository,
    LocationRepository,
    PricingRepository,
    RouteRepository,
    VendorRepository,
)
from app.contexts.customer_pricing.domain.value_objects import (
    ClientId,
    LocationId,
    PricingId,
    RouteId,
    VendorId,
    WorkType,
    GeocodeSource,
    Money,
)

__all__ = [
    "Customer",
    "Location",
    "LocationAlias",
    "Pricing",
    "PricingLine",
    "Route",
    "Vendor",
    "AlreadyExists",
    "LocationInUse",
    "NotFound",
    "PricingNotMatched",
    "ClientRepository",
    "LocationRepository",
    "PricingRepository",
    "RouteRepository",
    "VendorRepository",
    "ClientId",
    "LocationId",
    "PricingId",
    "RouteId",
    "VendorId",
    "WorkType",
    "GeocodeSource",
    "Money",
]
