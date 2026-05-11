"""One-time script to backfill unit_price for trip orders that have unit_price = 0.

Reads existing pricing rules and applies them to unpriced trip orders.
Safe to re-run — skips already-priced trips.

Usage:
    python -m app.fix_trip_pricing
"""

import asyncio

from app.database import async_session
from app.contexts.operations.application.trip_orders import ApplyPricingToTrips


async def fix_pricing() -> None:
    async with async_session() as db:
        use_case = ApplyPricingToTrips(db)
        priced, unpriced_ids = await use_case(
            partner_id=None,
            trip_ids=None,
            skip_already_priced=True,
        )
        print(f"Applied pricing: {priced} trips priced, {len(unpriced_ids)} could not be priced")
        if unpriced_ids:
            print(f"Unpriced trip IDs (no matching pricing rule): {unpriced_ids[:20]}")


if __name__ == "__main__":
    asyncio.run(fix_pricing())
