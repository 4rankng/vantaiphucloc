"""Customer & Pricing interface layer (FastAPI routers + Pydantic schemas)."""

from app.contexts.customer_pricing.interface.routers.location_aliases import (
    router as location_aliases_router,
)
from app.contexts.customer_pricing.interface.routers.locations import (
    router as locations_router,
)
from app.contexts.customer_pricing.interface.routers.partners import (
    router as partners_router,
)
from app.contexts.customer_pricing.interface.routers.pricings import (
    router as pricings_router,
)

__all__ = [
    "location_aliases_router",
    "locations_router",
    "partners_router",
    "pricings_router",
]
