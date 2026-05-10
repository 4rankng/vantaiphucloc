"""Customer & Pricing interface layer (FastAPI routers + Pydantic schemas)."""

from app.contexts.customer_pricing.interface.routers.clients import (
    router as clients_router,
)
from app.contexts.customer_pricing.interface.routers.location_aliases import (
    router as location_aliases_router,
)
from app.contexts.customer_pricing.interface.routers.locations import (
    router as locations_router,
)
from app.contexts.customer_pricing.interface.routers.pricings import (
    router as pricings_router,
)
from app.contexts.customer_pricing.interface.routers.routes import (
    router as routes_router,
)
from app.contexts.customer_pricing.interface.routers.vendors import (
    router as vendors_router,
)

__all__ = [
    "clients_router",
    "location_aliases_router",
    "locations_router",
    "pricings_router",
    "routes_router",
    "vendors_router",
]
