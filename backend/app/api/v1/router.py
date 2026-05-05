from fastapi import APIRouter, Depends
from arq import ArqRedis
from arq.jobs import Job, JobStatus

from app.contexts.identity.interface import (
    auth_router,
    push_router,
    users_router,
)
from app.contexts.customer_pricing.interface import clients_router
from app.database import engine
from app.api.v1.locations import router as locations_router
from app.api.v1.routes import router as routes_router
from app.api.v1.pricings import router as pricings_router
from app.api.v1.work_orders import router as work_orders_router
from app.api.v1.trip_orders import router as trip_orders_router
from app.api.v1.reconcile import router as reconcile_router
from app.api.v1.salary import router as salary_router
from app.api.v1.salary_config import router as salary_config_router
from app.api.v1.drivers import router as drivers_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.vendors import router as vendors_router
from app.api.v1.audit import router as audit_router
from app.api.v1.reports import router as reports_router
from app.api.v1.imports import router as imports_router
from app.core.deps import get_current_user, get_worker_pool
from app.models.base import User
from app.schemas.domain import JobStatusResponse

router = APIRouter()

router.include_router(auth_router)
router.include_router(clients_router)
router.include_router(locations_router)
router.include_router(routes_router)
router.include_router(pricings_router)
router.include_router(work_orders_router)
router.include_router(trip_orders_router)
router.include_router(reconcile_router)
router.include_router(salary_router)
router.include_router(salary_config_router)
router.include_router(drivers_router)
router.include_router(push_router)
router.include_router(users_router)
router.include_router(dashboard_router)
router.include_router(vendors_router)
router.include_router(audit_router)
router.include_router(reports_router)
router.include_router(imports_router)


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "vantaihanghoa"}


@router.get("/health/worker")
async def worker_health(pool: ArqRedis = Depends(get_worker_pool)):
    """Check arq worker connectivity and return queue info."""
    await pool.ping()
    info = await pool.info()
    return {
        "status": "ok",
        "workers": info.get("workers", []),
        "queued": info.get("queued", 0),
    }


@router.get("/health/db")
async def db_health():
    pool = engine.pool
    return {
        "status": "ok",
        "pool_size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
    }


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str,
    _current_user: User = Depends(get_current_user),
):
    pool = get_worker_pool()
    job = Job(job_id, redis=pool)
    status = await job.status()

    if status == JobStatus.not_found:
        return JobStatusResponse(job_id=job_id, status="not_found")

    info = await job.info()
    result = None
    if info and hasattr(info, "result") and info.result is not None:
        result = info.result if isinstance(info.result, dict) else {"value": str(info.result)}

    return JobStatusResponse(
        job_id=job_id,
        status=status.value,
        result=result,
    )
