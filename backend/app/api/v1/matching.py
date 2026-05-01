"""
Trip matching API endpoints for auto-assigning drivers to trip orders.
"""

import logging
from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.base import User
from app.models.domain import TripOrder
from app.core.deps import require_roles
from app.services.trip_matching import (
    auto_assign_driver,
    get_driver_rankings,
)

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/matching", tags=["matching"])


class DriverAssignmentRequest(BaseModel):
    """Request for manual driver assignment."""

    driver_id: int = Field(..., description="Driver ID to assign")
    trip_order_id: int = Field(..., description="Trip order ID")


class AutoAssignRequest(BaseModel):
    """Request for auto driver assignment."""

    trip_order_id: int = Field(..., description="Trip order ID")
    pickup_lat: Optional[float] = Field(None, ge=-90, le=90, description="Pickup latitude")
    pickup_lng: Optional[float] = Field(None, ge=-180, le=180, description="Pickup longitude")
    min_score: float = Field(0.5, ge=0, le=1, description="Minimum score threshold")


class DriverRankingOut(BaseModel):
    """Output for driver ranking."""

    driver_id: int
    driver_name: str
    tractor_plate: str
    score: float
    reasons: List[str]
    distance_km: Optional[float]


class AutoAssignResponse(BaseModel):
    """Response for auto-assign."""

    success: bool
    driver: Optional[dict] = None
    message: Optional[str] = None
    rankings: Optional[List[DriverRankingOut]] = None


@router.get("/drivers/available/{trip_date}")
async def list_available_drivers(
    trip_date: date,
    work_type: Optional[str] = Query(None, description="Filter by work type (E20, E40, F20, F40)"),
    current_user: User = Depends(require_roles("dispatcher", "admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Get list of available drivers for a given date.

    A driver is available if they don't have:
    - Any COMPLETED trip orders on the same day
    - Any PENDING trip orders (currently assigned)
    """
    from app.services.trip_matching import get_available_drivers

    drivers = await get_available_drivers(db, trip_date, work_type)
    return {"available_drivers": drivers, "count": len(drivers)}


@router.get("/rankings/{trip_order_id}", response_model=List[DriverRankingOut])
async def get_driver_match_rankings(
    trip_order_id: int,
    pickup_lat: Optional[float] = Query(None, ge=-90, le=90),
    pickup_lng: Optional[float] = Query(None, ge=-180, le=180),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_roles("dispatcher", "admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Get ranked list of available drivers for a trip order.

    Drivers are scored based on availability, location, and performance.
    """
    # Get trip order
    result = await db.execute(
        select(TripOrder).where(TripOrder.id == trip_order_id)
    )
    trip_order = result.scalar_one_or_none()

    if trip_order is None:
        raise HTTPException(status_code=404, detail="Trip order not found")

    # Get pickup location if provided
    pickup_location = None
    if pickup_lat is not None and pickup_lng is not None:
        pickup_location = (pickup_lat, pickup_lng)

    # Get driver rankings
    rankings = await get_driver_rankings(
        db,
        trip_order,
        pickup_location=pickup_location,
        limit=limit,
    )

    return rankings


@router.post("/auto-assign", response_model=AutoAssignResponse)
async def auto_assign_driver_endpoint(
    request: AutoAssignRequest,
    current_user: User = Depends(require_roles("dispatcher", "admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Automatically assign the best available driver to a trip order.

    The driver is selected based on:
    - Availability
    - Location proximity (if GPS data available)
    - Historical performance

    Returns the assigned driver or None if no suitable driver found.
    """
    # Get trip order
    result = await db.execute(
        select(TripOrder).where(TripOrder.id == request.trip_order_id)
    )
    trip_order = result.scalar_one_or_none()

    if trip_order is None:
        raise HTTPException(status_code=404, detail="Trip order not found")

    # Get pickup location if provided
    pickup_location = None
    if request.pickup_lat is not None and request.pickup_lng is not None:
        pickup_location = (request.pickup_lat, request.pickup_lng)

    # Auto-assign driver
    assigned_driver = await auto_assign_driver(
        db,
        trip_order,
        pickup_location=pickup_location,
        min_score=request.min_score,
    )

    if assigned_driver is None:
        # Get rankings to show why auto-assign failed
        rankings = await get_driver_rankings(
            db,
            trip_order,
            pickup_location=pickup_location,
            limit=5,
        )

        return AutoAssignResponse(
            success=False,
            message=f"No driver met minimum score threshold of {request.min_score}",
            rankings=rankings,
        )

    # Update trip order with assigned driver
    trip_order.driver_id = assigned_driver["driver_id"]
    trip_order.driver_name = assigned_driver["driver_name"]
    await db.commit()
    await db.refresh(trip_order)

    _logger.info(
        "Auto-assigned driver %s to trip %s",
        assigned_driver["driver_name"],
        trip_order.id,
    )

    return AutoAssignResponse(
        success=True,
        driver=assigned_driver,
        message=f"Successfully assigned {assigned_driver['driver_name']} to trip",
    )


@router.post("/manual-assign")
async def manual_assign_driver(
    request: DriverAssignmentRequest,
    current_user: User = Depends(require_roles("dispatcher", "admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually assign a driver to a trip order.

    Override auto-assignment by specifying a driver directly.
    """
    # Get trip order
    result = await db.execute(
        select(TripOrder).where(TripOrder.id == request.trip_order_id)
    )
    trip_order = result.scalar_one_or_none()

    if trip_order is None:
        raise HTTPException(status_code=404, detail="Trip order not found")

    # Get driver info
    from app.models.base import User
    driver_result = await db.execute(
        select(User).where(User.id == request.driver_id)
    )
    driver = driver_result.scalar_one_or_none()

    if driver is None:
        raise HTTPException(status_code=404, detail="Driver not found")

    if driver.role != "driver":
        raise HTTPException(status_code=400, detail="User is not a driver")

    # Update trip order
    trip_order.driver_id = driver.id
    trip_order.driver_name = driver.full_name or driver.username

    # Get tractor plate from user profile if available
    if hasattr(driver, 'tractor_plate'):
        trip_order.tractor_plate = driver.tractor_plate

    await db.commit()
    await db.refresh(trip_order)

    _logger.info(
        "Manually assigned driver %s to trip %s by %s",
        driver.full_name or driver.username,
        trip_order.id,
        current_user.username,
    )

    return {
        "success": True,
        "message": f"Successfully assigned {driver.full_name or driver.username} to trip",
        "trip_order_id": trip_order.id,
        "driver_id": driver.id,
        "driver_name": driver.full_name or driver.username,
    }
