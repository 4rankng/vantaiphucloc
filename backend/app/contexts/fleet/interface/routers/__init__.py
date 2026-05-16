from app.contexts.fleet.interface.routers.drivers import router as drivers_router
from app.contexts.fleet.interface.routers.vehicle_expenses import router as vehicle_expenses_router
from app.contexts.fleet.interface.routers.vehicle_drivers import router as vehicle_drivers_router
from app.contexts.fleet.interface.routers.vehicles import router as vehicles_router

__all__ = ["drivers_router", "vehicle_expenses_router", "vehicle_drivers_router", "vehicles_router"]
