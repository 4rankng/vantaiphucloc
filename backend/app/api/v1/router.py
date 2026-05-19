from fastapi import APIRouter, Depends
from fastapi.responses import Response
from arq import ArqRedis
from arq.jobs import Job, JobStatus

from app.contexts.identity.interface import (
    auth_router,
    push_router,
    users_router,
)
from app.contexts.customer_pricing.interface import (
    location_aliases_router,
    locations_router,
    partners_router,
    pricings_router,
)
from app.contexts.operations.interface import (
    imports_router,
    reconcile_router,
    suggested_routes_router,
    booked_trips_router,
    vendors_router,
    delivered_trips_router,
    vendor_reconciliation_router,
)
from app.contexts.fleet.interface import drivers_router, vehicle_expenses_router, vehicle_drivers_router, vehicles_router
from app.contexts.billing.interface import reports_router
from app.contexts.payroll.interface import (
    customer_reconciliation_router,
    salary_config_router,
    salary_router,
)
from app.database import engine
from app.contexts.platform.interface.routers.dashboard import router as dashboard_router
from app.contexts.platform.interface.routers.audit import router as audit_router
from app.core.deps import get_current_user, get_worker_pool
from app.models.base import User
from app.schemas.domain import JobStatusResponse

router = APIRouter()

router.include_router(auth_router)
router.include_router(partners_router)
router.include_router(locations_router)
router.include_router(location_aliases_router)
router.include_router(pricings_router)
router.include_router(delivered_trips_router)
router.include_router(suggested_routes_router)
router.include_router(booked_trips_router)
router.include_router(reconcile_router)
router.include_router(salary_router)
router.include_router(salary_config_router)
router.include_router(customer_reconciliation_router)
router.include_router(drivers_router)
router.include_router(vehicles_router)
router.include_router(vehicle_expenses_router)
router.include_router(vehicle_drivers_router)
router.include_router(push_router)
router.include_router(users_router)
router.include_router(dashboard_router)
router.include_router(audit_router)
router.include_router(reports_router)
router.include_router(imports_router)
router.include_router(vendor_reconciliation_router)
router.include_router(vendors_router)


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "vantaihanghoa"}


# Stub for clients running stale bundles that still poll the long-removed
# SSE notification stream. Returns 204 to silence 404 log noise. Do NOT
# build new clients against this -- notifications now ride on push + arq.
@router.get("/sse/notifications", include_in_schema=False)
async def _sse_notifications_stub() -> Response:
    return Response(status_code=204)


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
