"""Dev seed using real operational data from Phuc Loc's April 2026 Shipside billing.

Usage:
    cd backend && python -m app.seed_dev

Reads ``docs/real-life-data/trips_shipside_t4_26.json`` (414 real container
trips) and populates every table with production-like data.

Run ``alembic upgrade head`` first on a fresh database.
"""

import asyncio
import json
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy import select, text

from app.database import async_session
from app.models.base import User
from app.models.domain import (
    Location,
    Partner,
    Pricing,
    PricingLine,
    Reconciliation,
    Setting,
    TripOrder,
    TripOrderContainer,
    Vehicle,
    VehicleDriver,
    WorkOrder,
    WorkOrderContainer,
)
from app.core.security import hash_password

_REAL_DATA_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "docs" / "real-life-data" / "trips_shipside_t4_26.json"
)

SEED_USERS = [
    {"phone": "0000000000", "username": "admin", "password": "admin123", "role": "superadmin", "full_name": "Super Admin"},
    {"phone": "0000000001", "username": "giamdoc", "password": "admin123", "role": "director", "full_name": "Giám Đốc Test"},
    {"phone": "0000000002", "username": "ketoan", "password": "admin123", "role": "accountant", "full_name": "Kế Toán Test"},
]

DRIVER_VEHICLES = {
    "15C09877": {"full_name": "Nguyễn Văn Tám", "phone": "0901001001"},
    "15C15033": {"full_name": "Trần Minh Đức", "phone": "0902002002"},
    "15C17301": {"full_name": "Lê Quang Anh", "phone": "0903003003"},
    "15C17442": {"full_name": "Phạm Văn Hùng", "phone": "0904004004"},
    "15C30649": {"full_name": "Hoàng Đức Thắng", "phone": "0905005005"},
    "15H06892": {"full_name": "Vũ Đình Nam", "phone": "0906006006"},
    "15H07135": {"full_name": "Đỗ Quang Hải", "phone": "0907007007"},
    "15H07524": {"full_name": "Bùi Thanh Sơn", "phone": "0908008008"},
    "15H07644": {"full_name": "Ngô Minh Tuấn", "phone": "0909009009"},
    "15H07788": {"full_name": "Dương Văn Thành", "phone": "0910101001"},
    "15H08574": {"full_name": "Lý Hoàng Long", "phone": "0911111002"},
    "15H12925": {"full_name": "Trịnh Đức Minh", "phone": "0912122003"},
    "15H15378": {"full_name": "Cao Văn Lượng", "phone": "0913133004"},
    "15H17403": {"full_name": "Đinh Công Phú", "phone": "0914144005"},
    "15H17712": {"full_name": "Mai Văn Bình", "phone": "0915155006"},
    "15H18552": {"full_name": "Tạ Quang Vinh", "phone": "0916166007"},
    "15H18753": {"full_name": "Chu Đức Anh", "phone": "0917177008"},
    "15H20645": {"full_name": "Lâm Thanh Tùng", "phone": "0918188009"},
}

SEED_LOCATIONS = [
    {"name": "HẢI AN", "lat": 20.8515, "lng": 106.7538},
    {"name": "NHĐV", "lat": 20.8425, "lng": 106.7747},
]

SEED_PARTNERS = [
    {
        "code": "HAIAN",
        "name": "CÔNG TY TNHH CẢNG HẢI AN",
        "partner_type": "client",
        "partner_role": "shipping_line",
        "phone": "02253979724",
        "tax_code": "0201126468",
        "address": "Tầng 1, Tòa nhà Hải An, Km 2 đường Đình Vũ, P. Đông Hải, TP. Hải Phòng",
        "contact_person": "Phòng Shipside",
    },
    {
        "code": "PHUCLOC",
        "name": "CÔNG TY TNHH AMT PHÚC LỘC",
        "partner_type": "vendor",
        "partner_role": "transport",
        "phone": "02253825555",
        "tax_code": "0201965047",
        "address": "Số 56B/97 đường Đoàn Kết, Phường Hải An, Thành Phố Hải Phòng",
        "contact_person": "Nguyễn Văn Phúc",
    },
]

REAL_PRICING = {
    ("NHĐV", "HẢI AN", "F20"): {"unit_price": 386100, "driver_salary": 150000, "allowance": 50000},
    ("NHĐV", "HẢI AN", "F40"): {"unit_price": 448500, "driver_salary": 180000, "allowance": 70000},
    ("HẢI AN", "NHĐV", "F20"): {"unit_price": 386100, "driver_salary": 150000, "allowance": 50000},
    ("HẢI AN", "NHĐV", "F40"): {"unit_price": 448500, "driver_salary": 180000, "allowance": 70000},
}


def _load_trips() -> list[dict]:
    with open(_REAL_DATA_PATH) as f:
        return json.load(f)


async def seed_dev() -> None:
    trips = _load_trips()
    print(f"Loaded {len(trips)} real trips from {_REAL_DATA_PATH.name}")

    async with async_session() as db:
        # ── 1. Staff users ──────────────────────────────────────────────
        print("\n=== Seeding Staff Users ===")
        user_map: dict[str, User] = {}
        for u in SEED_USERS:
            result = await db.execute(select(User).where(User.username == u["username"]))
            existing = result.scalars().first()
            if existing is None:
                existing = User(
                    phone=u["phone"], username=u["username"],
                    hashed_password=hash_password(u["password"]),
                    role=u["role"], is_active=True, full_name=u.get("full_name"),
                )
                db.add(existing)
                await db.flush()
                print(f"  + {u['role']} ({u['username']})")
            else:
                print(f"  = {u['username']}")
            user_map[u["username"]] = existing

        # ── 2. Drivers + vehicles ───────────────────────────────────────
        print("\n=== Seeding Drivers & Vehicles ===")
        driver_map: dict[str, User] = {}
        vehicle_map: dict[str, Vehicle] = {}

        for plate, info in DRIVER_VEHICLES.items():
            uname = f"driver_{plate.replace('-', '').lower()}"
            result = await db.execute(select(User).where(User.username == uname))
            drv = result.scalars().first()
            if drv is None:
                drv = User(
                    phone=info["phone"], username=uname,
                    hashed_password=hash_password("admin123"),
                    role="driver", is_active=True, full_name=info["full_name"],
                )
                db.add(drv)
                await db.flush()
                print(f"  + {info['full_name']} ({plate})")
            driver_map[plate] = drv

            result = await db.execute(select(Vehicle).where(Vehicle.plate == plate))
            veh = result.scalars().first()
            if veh is None:
                veh = Vehicle(plate=plate, driver_id=drv.id, is_active=True)
                db.add(veh)
                await db.flush()
            vehicle_map[plate] = veh

        await db.commit()

        # ── 3. Locations ────────────────────────────────────────────────
        print("\n=== Seeding Locations ===")
        loc_map: dict[str, Location] = {}
        for loc_data in SEED_LOCATIONS:
            result = await db.execute(select(Location).where(Location.name == loc_data["name"]))
            loc = result.scalars().first()
            if loc is None:
                loc = Location(
                    name=loc_data["name"], is_active=True,
                    lat=loc_data.get("lat"), lng=loc_data.get("lng"),
                    pending_geocode=False, created_via="real_seed",
                    location_review_needed=False,
                )
                db.add(loc)
                await db.flush()
                print(f"  + {loc_data['name']} (id={loc.id})")
            loc_map[loc_data["name"]] = loc
        await db.commit()

        # ── 4. Partners ────────────────────────────────────────────────
        print("\n=== Seeding Partners ===")
        partner_map: dict[str, Partner] = {}
        for p in SEED_PARTNERS:
            result = await db.execute(select(Partner).where(Partner.code == p["code"]))
            partner = result.scalars().first()
            if partner is None:
                partner = Partner(
                    code=p["code"], name=p["name"],
                    partner_type=p["partner_type"], partner_role=p.get("partner_role"),
                    phone=p["phone"], tax_code=p["tax_code"],
                    address=p["address"], contact_person=p["contact_person"],
                    is_active=True,
                )
                db.add(partner)
                await db.flush()
                print(f"  + {p['code']} — {p['name']}")
            partner_map[p["code"]] = partner
        await db.commit()

        # ── 5. Settings ────────────────────────────────────────────────
        print("\n=== Seeding Settings ===")
        for key, value in {"salary_from_day": "21", "salary_to_day": "20"}.items():
            result = await db.execute(select(Setting).where(Setting.key == key))
            if result.scalars().first() is None:
                db.add(Setting(key=key, value=value))
                print(f"  + {key}={value}")
        await db.commit()

        # ── 6. Pricings ────────────────────────────────────────────────
        print("\n=== Seeding Pricings ===")
        client = partner_map["HAIAN"]
        pricing_map: dict[tuple, Pricing] = {}

        for (pickup_name, dropoff_name, work_type), prices in REAL_PRICING.items():
            result = await db.execute(
                select(Pricing).where(
                    Pricing.partner_id == client.id,
                    Pricing.work_type == work_type,
                    Pricing.pickup_location_id == loc_map[pickup_name].id,
                    Pricing.dropoff_location_id == loc_map[dropoff_name].id,
                )
            )
            pricing = result.scalars().first()
            if pricing is None:
                pricing = Pricing(
                    partner_id=client.id, work_type=work_type,
                    pickup_location_id=loc_map[pickup_name].id,
                    dropoff_location_id=loc_map[dropoff_name].id,
                    is_active=True,
                )
                db.add(pricing)
                await db.flush()
                db.add(PricingLine(
                    pricing_id=pricing.id, quantity=1,
                    unit_price=prices["unit_price"],
                    driver_salary=prices["driver_salary"],
                    allowance=prices["allowance"],
                ))
                await db.flush()
                print(f"  + {pickup_name}→{dropoff_name} {work_type}: {prices['unit_price']:,}")
            pricing_map[(pickup_name, dropoff_name, work_type)] = pricing
        await db.commit()

        # ── 7. VehicleDrivers ──────────────────────────────────────────
        print("\n=== Creating VehicleDriver records ===")
        for plate, veh in vehicle_map.items():
            db.add(VehicleDriver(
                vehicle_id=veh.id, driver_id=driver_map[plate].id,
                role="PRIMARY", effective_from=date(2026, 1, 1), is_active=True,
            ))
        await db.flush()
        print(f"  Created {len(vehicle_map)} vehicle-driver links")
        await db.commit()

        # ── 8. WorkOrders from real data ────────────────────────────────
        print("\n=== Creating WorkOrders ===")
        ketoan = user_map["ketoan"]
        all_wos: list[WorkOrder] = []

        for idx, trip in enumerate(trips):
            pickup = trip["pickup"]
            dropoff = trip["dropoff"]
            wt = f"F{trip['size']}"
            plate = trip["plate"]
            prices = REAL_PRICING.get((pickup, dropoff, wt), {})
            pricing = pricing_map.get((pickup, dropoff, wt))
            trip_date = date.fromisoformat(trip["trip_date"]) if trip["trip_date"] else date(2026, 4, 1)

            wo = WorkOrder(
                partner_id=client.id,
                code=f"W{1001 + idx:06d}",
                pickup_location_id=loc_map[pickup].id,
                dropoff_location_id=loc_map[dropoff].id,
                driver_id=driver_map[plate].id,
                vehicle_id=vehicle_map[plate].id,
                vessel=f"{trip.get('vessel', '')} {trip.get('voyage', '')}".strip() or None,
                unit_price=trip["unit_price"],
                driver_salary=prices.get("driver_salary", 150000),
                allowance=prices.get("allowance", 50000),
                pricing_id=pricing.id if pricing else None,
                status="MATCHED",
                trip_date=trip_date,
            )
            db.add(wo)
            all_wos.append(wo)

        await db.flush()
        print(f"  Created {len(all_wos)} work orders")

        for i, wo in enumerate(all_wos):
            db.add(WorkOrderContainer(
                work_order_id=wo.id,
                container_number=trips[i]["container"],
                work_type=f"F{trips[i]['size']}",
            ))
        await db.flush()
        print(f"  Created {len(all_wos)} work order containers")

        # ── 9. TripOrders (client-side mirror) ─────────────────────────
        print("\n=== Creating TripOrders ===")
        all_tos: list[TripOrder] = []

        for idx, trip in enumerate(trips):
            pickup = trip["pickup"]
            dropoff = trip["dropoff"]
            wt = f"F{trip['size']}"
            prices = REAL_PRICING.get((pickup, dropoff, wt), {})
            pricing = pricing_map.get((pickup, dropoff, wt))
            trip_date = date.fromisoformat(trip["trip_date"]) if trip["trip_date"] else date(2026, 4, 1)

            to = TripOrder(
                trip_date=trip_date,
                partner_id=client.id,
                code=f"T{2001 + idx:06d}",
                pickup_location_id=loc_map[pickup].id,
                dropoff_location_id=loc_map[dropoff].id,
                pricing_id=pricing.id if pricing else None,
                unit_price=trip["unit_price"],
                driver_salary=prices.get("driver_salary", 150000),
                allowance=prices.get("allowance", 50000),
                status="MATCHED",
                pickup_raw=pickup, dropoff_raw=dropoff,
                location_review_needed=False,
            )
            db.add(to)
            all_tos.append(to)

        await db.flush()
        print(f"  Created {len(all_tos)} trip orders")

        for idx, to in enumerate(all_tos):
            db.add(TripOrderContainer(
                trip_order_id=to.id,
                container_number=trips[idx]["container"],
                work_type=f"F{trips[idx]['size']}",
                container_size=str(trips[idx]["size"]),
                freight_kind="F",
            ))
        await db.flush()
        print(f"  Created {len(all_tos)} trip order containers")

        # ── 10. Reconciliations ────────────────────────────────────────
        print("\n=== Creating Reconciliations ===")
        for i in range(len(all_wos)):
            db.add(Reconciliation(
                trip_order_id=all_tos[i].id,
                work_order_id=all_wos[i].id,
                match_score=1.0,
                matched_by=ketoan.id,
                matched_at=datetime(2026, 4, 30, tzinfo=timezone.utc),
                is_active=True,
            ))
        await db.flush()
        print(f"  Created {len(all_wos)} reconciliation links")

        await db.commit()

        # ── Summary ─────────────────────────────────────────────────────
        print("\n" + "=" * 50)
        print("SEED COMPLETE — Real operational data (April 2026)")
        print("=" * 50)
        for t in [
            "users", "vehicles", "vehicle_drivers", "locations", "partners",
            "settings", "pricings", "pricing_lines",
            "work_orders", "work_order_containers",
            "trip_orders", "trip_order_containers", "reconciliations",
        ]:
            cnt = (await db.execute(text(f"SELECT count(*) FROM {t}"))).scalar()
            print(f"  {t:30s} {cnt:>5d} rows")

        print("\nLogin credentials:")
        print("  admin    / admin123  (superadmin)")
        print("  giamdoc  / admin123  (director)")
        print("  ketoan   / admin123  (accountant)")
        print("  driver_* / admin123  (18 drivers)")


if __name__ == "__main__":
    asyncio.run(seed_dev())
