"""Route Pricing interface layer (FastAPI routers + Pydantic schemas)."""

from app.contexts.route_pricing.interface.router import (
    router as route_pricings_router,
)

__all__ = ["route_pricings_router"]
