"""One-time script to backfill trip_date on work orders that have trip_date = null.

Assigns realistic dates spread across the last 30 days (relative to today)
based on work order ID order — oldest ID gets the oldest date.
Safe to re-run — skips work orders that already have a trip_date set.

Usage:
    python -m app.fix_trip_dates
"""

import asyncio
from datetime import date, timedelta

from sqlalchemy import select

from app.database import async_session
from app.models.domain import WorkOrder


async def fix_trip_dates() -> None:
    async with async_session() as db:
        # Load all work orders with null trip_date, ordered by id
        result = await db.execute(
            select(WorkOrder)
            .where(WorkOrder.trip_date.is_(None))
            .order_by(WorkOrder.id.asc())
        )
        orders = result.scalars().all()

        if not orders:
            print("No work orders with null trip_date — nothing to do.")
            return

        today = date.today()
        total = len(orders)
        print(f"Found {total} work order(s) with null trip_date — backfilling...")

        for i, wo in enumerate(orders):
            # Spread dates: oldest order gets 30 days ago, newest gets 1 day ago.
            # Use at least 1 day ago so nothing accidentally shows as "Hôm nay".
            days_ago = max(1, 30 - round(i * 29 / max(total - 1, 1)))
            wo.trip_date = today - timedelta(days=days_ago)

        await db.commit()
        print(f"Backfilled trip_date for {total} work order(s).")
        for wo in orders:
            print(f"  WorkOrder #{wo.id} → trip_date={wo.trip_date}")


if __name__ == "__main__":
    asyncio.run(fix_trip_dates())
