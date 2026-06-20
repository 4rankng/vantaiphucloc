from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Location

SEED_LOCATIONS = [
    {"name": "HẢI AN", "lat": 20.8515, "lng": 106.7538},
    {"name": "NHĐV", "lat": 20.8425, "lng": 106.7747},
    {"name": "VIP GREEN", "lat": 20.8380, "lng": 106.7630},
    {"name": "NAM ĐỊNH VỤ", "lat": 20.8435, "lng": 106.7760},
    {"name": "ĐÌNH VŨ", "lat": 20.8450, "lng": 106.7800},
    {"name": "GREEN PORT", "lat": 20.8500, "lng": 106.7500},
    {"name": "CHU VĂN AN", "lat": 20.8460, "lng": 106.7700},
]


async def seed_locations(db: AsyncSession) -> dict[str, Location]:
    print("\n=== Seeding Locations ===")
    loc_map: dict[str, Location] = {}
    for loc_data in SEED_LOCATIONS:
        result = await db.execute(
            select(Location).where(Location.name == loc_data["name"])
        )
        loc = result.scalars().first()
        if loc is None:
            loc = Location(
                name=loc_data["name"],
                is_active=True,
                lat=loc_data.get("lat"),
                lng=loc_data.get("lng"),
                pending_geocode=False,
                created_via="real_seed",
                location_review_needed=False,
            )
            db.add(loc)
            await db.flush()
            print(f"  + {loc_data['name']} (id={loc.id})")
        loc_map[loc_data["name"]] = loc
    await db.commit()
    return loc_map
