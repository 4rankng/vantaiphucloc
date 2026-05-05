"""Customer & Pricing interface layer (FastAPI routers + Pydantic schemas)."""

from app.contexts.customer_pricing.interface.routers.clients import (
    router as clients_router,
)

__all__ = ["clients_router"]
