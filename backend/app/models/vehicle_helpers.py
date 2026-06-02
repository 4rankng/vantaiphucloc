"""Shared helpers for vehicle plate resolution and vehicle find-or-create.

Lives in app.models (shared ORM layer) so that fleet, identity, and operations
contexts can import it without crossing bounded-context boundaries.
All helpers operate on the shared Vehicle / VehicleDriver ORM models.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Vehicle, VehicleDriver


async def resolve_driver_plate(
    session: AsyncSession, driver_id: int
) -> str | None:
    """Look up the driver's currently active vehicle plate.

    Returns the most recent plate if multiple active assignments exist.
    """
    row = (await session.execute(
        select(Vehicle.plate)
        .join(VehicleDriver, Vehicle.id == VehicleDriver.vehicle_id)
        .where(
            VehicleDriver.driver_id == driver_id,
            VehicleDriver.is_active == True,  # noqa: E712
            Vehicle.is_active == True,  # noqa: E712
        )
        .order_by(VehicleDriver.effective_from.desc())
        .limit(1)
    )).scalar_one_or_none()
    return row


async def resolve_driver_plates_batch(
    session: AsyncSession, driver_ids: list[int]
) -> dict[int, str]:
    """Batch-resolve vehicle plates for multiple drivers.

    Returns a dict mapping driver_id -> plate for drivers with active
    assignments. Drivers without an assignment are absent from the dict.
    """
    if not driver_ids:
        return {}
    rows = (await session.execute(
        select(VehicleDriver.driver_id, Vehicle.plate)
        .join(Vehicle, Vehicle.id == VehicleDriver.vehicle_id)
        .where(
            VehicleDriver.driver_id.in_(driver_ids),
            VehicleDriver.is_active == True,  # noqa: E712
            Vehicle.is_active == True,  # noqa: E712
        )
        .order_by(VehicleDriver.effective_from.desc())
    )).all()
    plate_map: dict[int, str] = {}
    for did, plate in rows:
        # First occurrence wins (most recent due to ORDER BY DESC)
        if did not in plate_map:
            plate_map[did] = plate
    return plate_map


async def ensure_vehicle(
    session: AsyncSession, plate: str
) -> Vehicle:
    """Find or create an active Vehicle by plate.

    Normalizes the plate to uppercase. Flushes the session if a new Vehicle
    is created so that `vehicle.id` is assigned.
    """
    vehicle = (await session.execute(
        select(Vehicle).where(
            Vehicle.plate == plate, Vehicle.is_active == True  # noqa: E712
        )
    )).scalar_one_or_none()
    if vehicle is None:
        vehicle = Vehicle(plate=plate, is_active=True)
        session.add(vehicle)
        await session.flush()
    return vehicle


async def deactivate_existing_assignments(
    session: AsyncSession, driver_id: int
) -> None:
    """Soft-deactivate all active VehicleDriver rows for a driver."""
    existing = (await session.execute(
        select(VehicleDriver).where(
            VehicleDriver.driver_id == driver_id,
            VehicleDriver.is_active == True,  # noqa: E712
        )
    )).scalars().all()
    today = date.today()
    for vd in existing:
        vd.is_active = False
        vd.effective_to = today
        if vd.vehicle_id is not None:
            await session.execute(
                update(Vehicle).where(Vehicle.id == vd.vehicle_id, Vehicle.driver_id == driver_id).values(driver_id=None)
            )
