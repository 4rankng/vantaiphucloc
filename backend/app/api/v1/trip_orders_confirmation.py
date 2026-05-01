"""Confirmation toggle endpoint for trip orders (to be added to trip_orders.py)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.models.domain import TripOrder
from app.schemas.domain import TripOrderOut
from app.core.deps import require_roles
from app.api.v1.trip_orders import _load_trip_order_out

import logging

_logger = logging.getLogger(__name__)

# Add this to the existing trip_orders router


@router.put("/trip-orders/{trip_order_id}/confirm", response_model=TripOrderOut)
async def toggle_trip_order_confirmation(
    trip_order_id: int,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Toggle is_confirmed status for a trip order.

    Only accountants and superadmins can call this.
    """
    result = await db.execute(
        select(TripOrder).where(TripOrder.id == trip_order_id)
    )
    trip_order = result.scalar_one_or_none()

    if trip_order is None:
        raise HTTPException(status_code=404, detail="Trip order not found")

    # Toggle confirmation
    trip_order.is_confirmed = not trip_order.is_confirmed

    if trip_order.is_confirmed:
        # Set who confirmed and when
        trip_order.confirmed_by = current_user.id
        trip_order.confirmed_at = datetime.now(timezone.utc)
        _logger.info(f"TripOrder #{trip_order_id} confirmed by user #{current_user.id}")
    else:
        # Clear confirmation
        trip_order.confirmed_by = None
        trip_order.confirmed_at = None
        _logger.info(f"TripOrder #{trip_order_id} unconfirmed by user #{current_user.id}")

    await db.commit()
    await db.refresh(trip_order)

    return await _load_trip_order_out(db, trip_order)


# Note: Add this import at the top of trip_orders.py:
# from datetime import datetime, timezone
