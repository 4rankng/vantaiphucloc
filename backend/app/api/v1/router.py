from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.clients import router as clients_router
from app.api.v1.routes import router as routes_router
from app.api.v1.pricings import router as pricings_router
from app.api.v1.work_orders import router as work_orders_router
from app.api.v1.trip_orders import router as trip_orders_router
from app.api.v1.reconcile import router as reconcile_router
from app.api.v1.salary import router as salary_router
from app.api.v1.salary_config import router as salary_config_router
from app.api.v1.drivers import router as drivers_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(clients_router)
router.include_router(routes_router)
router.include_router(pricings_router)
router.include_router(work_orders_router)
router.include_router(trip_orders_router)
router.include_router(reconcile_router)
router.include_router(salary_router)
router.include_router(salary_config_router)
router.include_router(drivers_router)


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "vantaihanghoa"}
