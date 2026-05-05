"""Compatibility shim.

The Client (now: Customer) router lives in the Customer & Pricing
bounded context at
`app.contexts.customer_pricing.interface.routers.clients`. This module
re-exports the router so any code still doing
`from app.api.v1.clients import router` keeps working.
"""

from app.contexts.customer_pricing.interface.routers.clients import (
    router as router,
)

__all__ = ["router"]
