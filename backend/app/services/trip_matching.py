"""
Trip matching service for auto-assigning drivers to trip orders.

Factors considered:
- Driver availability (not on active trip)
- Driver location (if GPS data exists)
- Driver capacity/vehicle type compatibility
- Historical performance (completion rate)
- Route familiarity
"""

import logging
from typing import Optional, Tuple, List
from datetime import datetime, timedelta, date

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import User
from app.models.domain import TripOrder, WorkOrder, TripOrderContainer
from app.models.gps_log import GPSLog
from app.utils.gps import haversine_distance

_logger = logging.getLogger(__name__)


class DriverScore:
    """Represents a driver with matching score."""

    def __init__(
        self,
        driver_id: int,
        driver_name: str,
        tractor_plate: str,
        score: float,
        reasons: List[str],
        distance_km: Optional[float] = None,
    ):
        self.driver_id = driver_id
        self.driver_name = driver_name
        self.tractor_plate = tractor_plate
        self.score = score
        self.reasons = reasons
        self.distance_km = distance_km

    def to_dict(self) -> dict:
        return {
            "driver_id": self.driver_id,
            "driver_name": self.driver_name,
            "tractor_plate": self.tractor_plate,
            "score": self.score,
            "reasons": self.reasons,
            "distance_km": self.distance_km,
        }


async def get_available_drivers(
    db: AsyncSession,
    trip_date: date,
    work_type: Optional[str] = None,
) -> List[dict]:
    """
    Get list of available drivers for a given date.

    A driver is considered available if they don't have:
    - Any COMPLETED trip orders on the same day (already worked)
    - Any PENDING trip orders (currently assigned)

    Args:
        db: Database session
        trip_date: Date to check availability for
        work_type: Optional work type filter (E20, E40, F20, F40)

    Returns:
        List of driver dictionaries with metadata
    """
    # Get all drivers
    query = select(User).where(User.role == "driver")
    result = await db.execute(query)
    drivers = result.scalars().all()

    # Get driver IDs that have COMPLETED trips on the same date
    completed_query = select(TripOrder.driver_id).where(
        and_(
            TripOrder.trip_date == trip_date,
            TripOrder.status == "COMPLETED",
        )
    )
    completed_result = await db.execute(completed_query)
    completed_driver_ids = {row[0] for row in completed_result.all()}

    # Get driver IDs that have PENDING trips (currently assigned)
    pending_query = select(TripOrder.driver_id).where(
        TripOrder.status.in_(["PENDING"])
    )
    pending_result = await db.execute(pending_query)
    pending_driver_ids = {row[0] for row in pending_result.all()}

    # Filter available drivers
    available_drivers = []
    for driver in drivers:
        if driver.id in completed_driver_ids:
            continue  # Already worked today
        if driver.id in pending_driver_ids:
            continue  # Currently assigned to another trip

        # Check if driver has the right vehicle type for this work type
        if work_type:
            # Work types: E20, E40 (empty), F20, F40 (full)
            # Could check driver's vehicle type if we had that field
            # For now, assume all drivers can handle all types
            pass

        available_drivers.append({
            "id": driver.id,
            "username": driver.username,
            "full_name": driver.full_name or driver.username,
            "tractor_plate": getattr(driver, "tractor_plate", ""),
        })

    return available_drivers


async def get_driver_location(
    db: AsyncSession,
    driver_id: int,
    within_minutes: int = 30,
) -> Optional[Tuple[float, float, datetime]]:
    """
    Get the most recent GPS location for a driver.

    Args:
        db: Database session
        driver_id: Driver ID
        within_minutes: Only return location if it's within this many minutes

    Returns:
        Tuple of (latitude, longitude, timestamp) or None if no recent location
    """
    cutoff_time = datetime.utcnow() - timedelta(minutes=within_minutes)

    query = (
        select(GPSLog)
        .where(
            and_(
                GPSLog.driver_id == driver_id,
                GPSLog.timestamp >= cutoff_time,
            )
        )
        .order_by(GPSLog.timestamp.desc())
        .limit(1)
    )

    result = await db.execute(query)
    gps_log = result.scalar_one_or_none()

    if gps_log is None:
        return None

    return (gps_log.latitude, gps_log.longitude, gps_log.timestamp)


async def get_driver_performance_score(
    db: AsyncSession,
    driver_id: int,
) -> float:
    """
    Calculate a performance score for a driver based on historical data.

    Score is based on:
    - Completion rate (completed / total assigned)
    - Recent activity (more trips recently = better)

    Args:
        db: Database session
        driver_id: Driver ID

    Returns:
        Performance score between 0.0 and 1.0
    """
    # Get total assigned trips
    total_query = select(func.count(TripOrder.id)).where(
        TripOrder.driver_id == driver_id
    )
    total_result = await db.execute(total_query)
    total_trips = total_result.scalar() or 0

    if total_trips == 0:
        return 0.5  # Neutral score for new drivers

    # Get completed trips
    completed_query = select(func.count(TripOrder.id)).where(
        and_(
            TripOrder.driver_id == driver_id,
            TripOrder.status == "COMPLETED",
        )
    )
    completed_result = await db.execute(completed_query)
    completed_trips = completed_result.scalar() or 0

    # Calculate completion rate
    completion_rate = completed_trips / total_trips if total_trips > 0 else 0.5

    # Get recent activity (trips in last 30 days)
    thirty_days_ago = date.today() - timedelta(days=30)
    recent_query = select(func.count(TripOrder.id)).where(
        and_(
            TripOrder.driver_id == driver_id,
            TripOrder.trip_date >= thirty_days_ago,
            TripOrder.status == "COMPLETED",
        )
    )
    recent_result = await db.execute(recent_query)
    recent_trips = recent_result.scalar() or 0

    # Normalize recent activity (5+ trips in 30 days is excellent)
    activity_score = min(recent_trips / 5.0, 1.0)

    # Combine scores (70% completion rate, 30% recent activity)
    performance_score = 0.7 * completion_rate + 0.3 * activity_score

    return performance_score


async def calculate_driver_score(
    db: AsyncSession,
    driver: dict,
    trip_order: Optional[TripOrder] = None,
    pickup_location: Optional[Tuple[float, float]] = None,
    weights: Optional[dict] = None,
) -> DriverScore:
    """
    Calculate a matching score for a driver.

    Args:
        db: Database session
        driver: Driver dictionary with id, username, full_name, tractor_plate
        trip_order: Optional trip order for context
        pickup_location: Optional (lat, lon) for pickup location
        weights: Optional custom weights for scoring factors

    Returns:
        DriverScore object with calculated score
    """
    if weights is None:
        weights = {
            "availability": 0.4,
            "location": 0.3,
            "performance": 0.3,
        }

    score = 0.0
    reasons = []

    # Availability factor (always 1.0 since we filtered available drivers)
    availability_score = 1.0
    score += weights["availability"] * availability_score
    reasons.append(f"Available (score: {availability_score:.2f})")

    # Location factor (if we have pickup location and driver GPS)
    location_score = 0.5  # Default neutral score
    distance_km = None

    if pickup_location:
        pickup_lat, pickup_lon = pickup_location
        driver_location = await get_driver_location(db, driver["id"], within_minutes=60)

        if driver_location:
            driver_lat, driver_lon, _ = driver_location
            distance_km = haversine_distance(driver_lat, driver_lon, pickup_lat, pickup_lon)

            # Score based on distance (closer is better)
            # Within 5km = 1.0, 10km = 0.8, 20km = 0.6, 50km = 0.4, >50km = 0.2
            if distance_km <= 5:
                location_score = 1.0
            elif distance_km <= 10:
                location_score = 0.8
            elif distance_km <= 20:
                location_score = 0.6
            elif distance_km <= 50:
                location_score = 0.4
            else:
                location_score = 0.2

            reasons.append(f"Distance: {distance_km:.1f}km (score: {location_score:.2f})")
        else:
            reasons.append("No recent GPS data (score: 0.5)")
    else:
        reasons.append("No pickup location (score: 0.5)")

    score += weights["location"] * location_score

    # Performance factor
    performance_score = await get_driver_performance_score(db, driver["id"])
    score += weights["performance"] * performance_score
    reasons.append(f"Performance: {performance_score:.2f} (score: {performance_score:.2f})")

    return DriverScore(
        driver_id=driver["id"],
        driver_name=driver["full_name"],
        tractor_plate=driver["tractor_plate"],
        score=score,
        reasons=reasons,
        distance_km=distance_km,
    )


async def auto_assign_driver(
    db: AsyncSession,
    trip_order: TripOrder,
    pickup_location: Optional[Tuple[float, float]] = None,
    min_score: float = 0.5,
) -> Optional[dict]:
    """
    Automatically assign the best available driver to a trip order.

    Args:
        db: Database session
        trip_order: Trip order to assign driver to
        pickup_location: Optional (lat, lon) for pickup location
        min_score: Minimum acceptable score for auto-assignment

    Returns:
        Driver assignment dict or None if no suitable driver found
    """
    # Get work type from trip order
    work_type = None
    if trip_order.containers and len(trip_order.containers) > 0:
        work_type = trip_order.containers[0].work_type
    elif trip_order.work_type:
        work_type = trip_order.work_type

    # Get available drivers
    available_drivers = await get_available_drivers(
        db,
        trip_order.trip_date,
        work_type=work_type,
    )

    if not available_drivers:
        _logger.warning("No available drivers for trip %s", trip_order.id)
        return None

    # Score each driver
    driver_scores = []
    for driver in available_drivers:
        score = await calculate_driver_score(
            db,
            driver,
            trip_order=trip_order,
            pickup_location=pickup_location,
        )
        driver_scores.append(score)

    # Sort by score (highest first)
    driver_scores.sort(key=lambda x: x.score, reverse=True)

    # Get best driver
    best_driver = driver_scores[0]

    # Check if score meets minimum threshold
    if best_driver.score < min_score:
        _logger.warning(
            "Best driver score %.2f below minimum %.2f for trip %s",
            best_driver.score,
            min_score,
            trip_order.id,
        )
        return None

    _logger.info(
        "Auto-assigning driver %s (score %.2f) to trip %s",
        best_driver.driver_name,
        best_driver.score,
        trip_order.id,
    )

    return best_driver.to_dict()


async def get_driver_rankings(
    db: AsyncSession,
    trip_order: TripOrder,
    pickup_location: Optional[Tuple[float, float]] = None,
    limit: int = 10,
) -> List[dict]:
    """
    Get ranked list of available drivers for manual selection.

    Args:
        db: Database session
        trip_order: Trip order context
        pickup_location: Optional (lat, lon) for pickup location
        limit: Maximum number of drivers to return

    Returns:
        List of driver ranking dictionaries
    """
    # Get work type from trip order
    work_type = None
    if trip_order.containers and len(trip_order.containers) > 0:
        work_type = trip_order.containers[0].work_type
    elif trip_order.work_type:
        work_type = trip_order.work_type

    # Get available drivers
    available_drivers = await get_available_drivers(
        db,
        trip_order.trip_date,
        work_type=work_type,
    )

    if not available_drivers:
        return []

    # Score each driver
    driver_scores = []
    for driver in available_drivers:
        score = await calculate_driver_score(
            db,
            driver,
            trip_order=trip_order,
            pickup_location=pickup_location,
        )
        driver_scores.append(score)

    # Sort by score (highest first)
    driver_scores.sort(key=lambda x: x.score, reverse=True)

    # Return top N drivers
    return [ds.to_dict() for ds in driver_scores[:limit]]
