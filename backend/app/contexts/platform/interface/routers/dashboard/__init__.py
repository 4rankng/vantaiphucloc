"""Dashboard API — aggregated summary using SQL, not client-side computation.

Public surface: this package exports ``router`` (an :class:`APIRouter` with the
``/dashboard`` prefix) composed from cohesive sub-routers. Existing imports of
``from ....routers.dashboard import router`` resolve unchanged.
"""

from fastapi import APIRouter

from . import (
    director,
    kpi_trends,
    notifications,
    ocr_stats,
    summary,
    trips,
    vehicle_pnl,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Each sub-router defines its endpoints with their final path segment only
# (e.g. "/summary", "/director/drilldown"). Mounting them under this parent
# router prepends the "/dashboard" prefix so the combined path is identical to
# the pre-refactor single-file layout. Tags are forwarded so OpenAPI grouping
# is unchanged.
router.include_router(summary.router, tags=["dashboard"])
router.include_router(kpi_trends.router, tags=["dashboard"])
router.include_router(vehicle_pnl.router, tags=["dashboard"])
router.include_router(trips.router, tags=["dashboard"])
router.include_router(director.router, tags=["dashboard"])
router.include_router(notifications.router, tags=["dashboard"])
router.include_router(ocr_stats.router, tags=["dashboard"])

__all__ = ["router"]
