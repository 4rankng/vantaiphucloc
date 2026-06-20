import asyncio
from app.database import get_session
from app.core.pricing_lookup import sync_all_trip_pricing


async def main():
    async with get_session() as db:
        updated = await sync_all_trip_pricing(db)
        print(f"Updated {updated} trips")


if __name__ == "__main__":
    asyncio.run(main())
