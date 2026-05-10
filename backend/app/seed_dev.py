"""One-shot dev seed: reference data + demo operational data.

Usage:
    cd backend && python -m app.seed_dev

Creates:
  - Users (superadmin, director, accountant, drivers)
  - Vehicles (tractor plates linked to drivers)
  - Locations (common VN ports & industrial zones)
  - Partners (HAIAN, PAN, HAP, NEWWAY as clients; Phuc Loc as vendor)
  - Pricings + PricingLines (realistic VND rates)
  - Work orders (40, PENDING or MATCHED)
  - Trip orders (35, PENDING or MATCHED)
  - Containers for each order

Idempotent: clears operational data on re-run, keeps reference data.
"""

import asyncio
import random
from datetime import date, timedelta

from sqlalchemy import select, text

from app.database import async_session
from app.models.base import User
from app.models.domain import (
    Location,
    Partner,
    Pricing,
    PricingLine,
    Setting,
    TripOrder,
    TripOrderContainer,
    Vehicle,
    WorkOrder,
    WorkOrderContainer,
)
from app.core.security import hash_password

# ── Reference data ──────────────────────────────────────────────────────

SEED_USERS = [
    {"phone": "0000000000", "username": "admin",  "password": "admin123", "role": "superadmin", "full_name": "Super Admin"},
    {"phone": "0000000001", "username": "giamdoc", "password": "admin123", "role": "director",   "full_name": "Giám Đốc Test"},
    {"phone": "0000000002", "username": "ketoan",  "password": "admin123", "role": "accountant", "full_name": "Kế Toán Test"},
    {"phone": "0901234567", "username": "taixe",   "password": "admin123", "role": "driver",
     "full_name": "Nguyễn Văn Tài"},
    {"phone": "0902345678", "username": "taixe1",  "password": "admin123", "role": "driver",
     "full_name": "Trần Minh Đức"},
    {"phone": "0903456789", "username": "taixe2",  "password": "admin123", "role": "driver",
     "full_name": "Lê Quang Anh"},
]

# Vehicle plates linked to drivers by username
SEED_VEHICLES = [
    {"plate": "29C-12345", "driver_username": "taixe"},
    {"plate": "29C-23456", "driver_username": "taixe1"},
    {"plate": "29C-34567", "driver_username": "taixe2"},
]

LOCATION_NAMES = [
    "Cát Lái", "Bình Dương", "Đồng Nai", "Vũng Tàu",
    "Cái Mép", "Hiệp Phước", "Tân Cảng", "Bình Tân",
    "Long Bình", "Nhà Bè", "Cần Giuộc", "Tân Tập",
    "SGN Terminal", "Lotus Terminal", "Gem Terminal",
    "TCT Terminal", "SSIT", "Tân Thuận",
]

SEED_PARTNERS = [
    # Clients
    {"code": "HAIAN",  "name": "Công ty TNHH HẢI AN",
     "partner_type": "client", "partner_role": "shipping_line",
     "phone": "02838221188", "tax_code": "0302784512",
     "address": "Lô B, KCN Hiệp Phước, X. Hiệp Phước, H. Nhà Bè, TP.HCM",
     "contact_person": "Trần Văn Hải"},
    {"code": "PAN",    "name": "Công ty TNHH PAN HẢI AN",
     "partner_type": "client", "partner_role": "shipping_line",
     "phone": "02838256677", "tax_code": "0304749215",
     "address": "Lô B1, KCN Hiệp Phước, H. Nhà Bè, TP.HCM",
     "contact_person": "Nguyễn Thị Hồng"},
    {"code": "HAP",    "name": "Công ty TNHH HAP",
     "partner_type": "client", "partner_role": "factory",
     "phone": "02838256789", "tax_code": "0304749216",
     "address": "Số 6, Đường số 3, KCN Hiệp Phước, H. Nhà Bè, TP.HCM",
     "contact_person": "Phạm Minh Tuấn"},
    {"code": "NEWWAY", "name": "Công ty TNHH NEWWAY",
     "partner_type": "client", "partner_role": "shipping_line",
     "phone": "02839756888", "tax_code": "0313425678",
     "address": "282 Nguyễn Văn Linh, Q. 7, TP.HCM",
     "contact_person": "Võ Đình An"},
    # Vendor (our company)
    {"code": "PHUCLOC", "name": "Vận Tải Phúc Lộc",
     "partner_type": "vendor", "partner_role": "transport",
     "phone": "02838255555", "tax_code": "0300000001",
     "address": "KCN Hiệp Phước, H. Nhà Bè, TP.HCM",
     "contact_person": "Nguyễn Văn Phúc"},
]

# Realistic VND prices per work_type
PRICING_DATA = [
    # work_type, unit_price, driver_salary, allowance
    ("E20", 550_000,  200_000,  50_000),
    ("E40", 750_000,  280_000,  70_000),
    ("F20", 650_000,  250_000,  50_000),
    ("F40", 900_000,  350_000,  70_000),
]

# Route pairs — (pickup_index, dropoff_index) into LOCATION_NAMES
ROUTE_PAIRS = [
    (0, 1),   # Cát Lái → Bình Dương
    (0, 2),   # Cát Lái → Đồng Nai
    (0, 3),   # Cát Lái → Vũng Tàu
    (0, 4),   # Cát Lái → Cái Mép
    (0, 5),   # Cát Lái → Hiệp Phước
    (1, 0),   # Bình Dương → Cát Lái
    (1, 2),   # Bình Dương → Đồng Nai
    (2, 0),   # Đồng Nai → Cát Lái
    (2, 1),   # Đồng Nai → Bình Dương
    (3, 0),   # Vũng Tàu → Cát Lái
    (4, 0),   # Cái Mép → Cát Lái
    (5, 0),   # Hiệp Phước → Cát Lái
    (6, 1),   # Tân Cảng → Bình Dương
    (6, 5),   # Tân Cảng → Hiệp Phước
    (7, 0),   # Bình Tân → Cát Lái
    (1, 4),   # Bình Dương → Cái Mép
    (3, 1),   # Vũng Tàu → Bình Dương
    (0, 7),   # Cát Lái → Bình Tân
    (6, 2),   # Tân Cảng → Đồng Nai
    (4, 1),   # Cái Mép → Bình Dương
]

PLATES = ["29C-12345", "29C-23456", "29C-34567", "29C-45678", "29C-56789"]
CONTAINER_PREFIXES = ["MSCU", "TCNU", "CMAU", "OOLU", "HLXU", "TGHU", "BMOU", "EISU"]
WORK_TYPES = ["E20", "E40", "F20", "F40"]


def _rand_container() -> str:
    return f"{random.choice(CONTAINER_PREFIXES)}{random.randint(1000000, 9999999)}"


def _rand_date(days_back: int = 20) -> date:
    base = date(2026, 5, 10)
    return base - timedelta(days=random.randint(0, days_back))


async def seed_dev() -> None:
    random.seed(42)
    async with async_session() as db:
        # ── 1. Users ────────────────────────────────────────────────────
        print("=== Seeding Users ===")
        user_map: dict[str, User] = {}
        for u in SEED_USERS:
            result = await db.execute(select(User).where(User.username == u["username"]))
            existing = result.scalars().first()
            if existing is None:
                existing = User(
                    phone=u["phone"],
                    username=u["username"],
                    hashed_password=hash_password(u["password"]),
                    role=u["role"],
                    is_active=True,
                    full_name=u.get("full_name"),
                )
                db.add(existing)
                await db.flush()
                print(f"  + {u['role']} ({u['username']})")
            else:
                changed = False
                if not existing.full_name and u.get("full_name"):
                    existing.full_name = u["full_name"]
                    changed = True
                if u.get("phone") and existing.phone in (None, "", "0000000003"):
                    existing.phone = u["phone"]
                    changed = True
                if changed:
                    print(f"  ~ updated {u['username']}")
                else:
                    print(f"  = {u['username']} exists")
            user_map[u["username"]] = existing
        await db.commit()

        # ── 2. Vehicles ────────────────────────────────────────────────
        print("\n=== Seeding Vehicles ===")
        vehicle_map: dict[str, Vehicle] = {}
        for v in SEED_VEHICLES:
            result = await db.execute(select(Vehicle).where(Vehicle.plate == v["plate"]))
            existing = result.scalars().first()
            driver = user_map.get(v["driver_username"])
            if driver is None:
                print(f"  ! Driver {v['driver_username']} not found, skipping vehicle {v['plate']}")
                continue
            if existing is None:
                existing = Vehicle(
                    plate=v["plate"],
                    driver_id=driver.id,
                    is_active=True,
                )
                db.add(existing)
                await db.flush()
                print(f"  + {v['plate']} → {v['driver_username']}")
            else:
                print(f"  = {v['plate']}")
            vehicle_map[v["plate"]] = existing
        await db.commit()

        # ── 3. Locations ────────────────────────────────────────────────
        print("\n=== Seeding Locations ===")
        loc_map: dict[str, Location] = {}
        for name in LOCATION_NAMES:
            result = await db.execute(select(Location).where(Location.name == name))
            loc = result.scalars().first()
            if loc is None:
                loc = Location(name=name, is_active=True, pending_geocode=False,
                               created_via="dev_seed", location_review_needed=False)
                db.add(loc)
                await db.flush()
                print(f"  + {name} (id={loc.id})")
            else:
                print(f"  = {name} (id={loc.id})")
            loc_map[name] = loc
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
                    partner_type=p["partner_type"],
                    partner_role=p.get("partner_role"),
                    phone=p["phone"], tax_code=p["tax_code"],
                    address=p["address"], contact_person=p["contact_person"],
                    is_active=True,
                )
                db.add(partner)
                await db.flush()
                print(f"  + {p['code']} — {p['name']} (id={partner.id})")
            else:
                # Backfill missing fields
                for field in ("phone", "tax_code", "address", "contact_person"):
                    if p.get(field) and not getattr(partner, field, None):
                        setattr(partner, field, p[field])
                print(f"  = {p['code']} (id={partner.id})")
            partner_map[p["code"]] = partner
        await db.commit()

        # ── 5. Salary config (Setting table) ────────────────────────────
        print("\n=== Seeding Salary Config ===")
        salary_defaults = {
            "salary_from_day": "21",
            "salary_to_day": "20",
        }
        for key, value in salary_defaults.items():
            result = await db.execute(
                select(Setting).where(Setting.key == key)
            )
            setting = result.scalars().first()
            if setting is None:
                db.add(Setting(key=key, value=value))
                print(f"  + {key}={value}")
            else:
                print(f"  = {key} exists")
        await db.commit()

        # ── 6. Pricings + PricingLines ─────────────────────────────────
        print("\n=== Seeding Pricings ===")
        pricing_map: dict[tuple[str, int, int, str], Pricing] = {}
        # Only create pricings for client-type partners
        client_codes = [p["code"] for p in SEED_PARTNERS if p["partner_type"] in ("client", "both")]

        for client_code in client_codes:
            partner = partner_map[client_code]
            for (pickup_idx, dropoff_idx) in ROUTE_PAIRS:
                pickup_loc = loc_map[LOCATION_NAMES[pickup_idx]]
                dropoff_loc = loc_map[LOCATION_NAMES[dropoff_idx]]

                for work_type, unit_price, driver_salary, allowance in PRICING_DATA:
                    key = (client_code, pickup_loc.id, dropoff_loc.id, work_type)
                    result = await db.execute(
                        select(Pricing).where(
                            Pricing.partner_id == partner.id,
                            Pricing.work_type == work_type,
                            Pricing.pickup_location_id == pickup_loc.id,
                            Pricing.dropoff_location_id == dropoff_loc.id,
                        )
                    )
                    pricing = result.scalars().first()
                    if pricing is None:
                        pricing = Pricing(
                            partner_id=partner.id,
                            work_type=work_type,
                            pickup_location_id=pickup_loc.id,
                            dropoff_location_id=dropoff_loc.id,
                            is_active=True,
                        )
                        db.add(pricing)
                        await db.flush()

                        db.add(PricingLine(
                            pricing_id=pricing.id,
                            quantity=1,
                            unit_price=unit_price,
                            driver_salary=driver_salary,
                            allowance=allowance,
                        ))
                        await db.flush()
                    pricing_map[key] = pricing

        await db.commit()
        print(f"  Created {len(pricing_map)} pricing entries ({len(client_codes)} clients x {len(ROUTE_PAIRS)} routes x {len(PRICING_DATA)} types)")

        # ── 7. Clear existing operational data ──────────────────────────
        print("\n=== Clearing existing operational data ===")
        for table in [
            "reconciliations",
            "trip_order_containers", "trip_orders",
            "work_order_containers", "work_orders",
        ]:
            await db.execute(text(f"DELETE FROM {table}"))
        await db.commit()
        print("  Cleared work_orders, trip_orders, reconciliations, and related tables")

        # ── 8. Gather references for operational data ───────────────────
        drivers = (await db.execute(
            text("SELECT id FROM users WHERE role = 'driver'")
        )).scalars().all()

        vehicles = (await db.execute(
            text("SELECT id, driver_id FROM vehicles WHERE is_active = true")
        )).fetchall()
        vehicle_by_driver: dict[int, int] = {v.driver_id: v.id for v in vehicles}

        # Build a list of (pricing, pricing_line) tuples
        result = await db.execute(text("""
            SELECT pr.id, pr.partner_id, pr.work_type,
                   pr.pickup_location_id, pr.dropoff_location_id,
                   pl.unit_price, pl.driver_salary, pl.allowance
            FROM pricings pr
            JOIN pricing_lines pl ON pr.id = pl.pricing_id
        """))
        pricing_rows = result.fetchall()

        # ── 9. Work Orders ─────────────────────────────────────────────
        print("\n=== Creating Work Orders ===")
        wo_count = 40
        work_orders = []
        for i in range(wo_count):
            pr = random.choice(pricing_rows)
            driver_id = random.choice(drivers)
            vehicle_id = vehicle_by_driver.get(driver_id)

            r = random.random()
            if r < 0.5:
                status = "PENDING"
            else:
                status = "MATCHED"

            wo = WorkOrder(
                partner_id=pr.partner_id,
                code=f"W{1001 + i:06d}",
                pickup_location_id=pr.pickup_location_id,
                dropoff_location_id=pr.dropoff_location_id,
                driver_id=driver_id,
                vehicle_id=vehicle_id,
                unit_price=pr.unit_price,
                driver_salary=pr.driver_salary,
                allowance=pr.allowance,
                pricing_id=pr.id,
                status=status,
            )
            db.add(wo)
            work_orders.append(wo)

        await db.flush()
        print(f"  Created {wo_count} work orders")

        # Work order containers
        for wo in work_orders:
            await db.refresh(wo)
            pr_row = next(p for p in pricing_rows if p.id == wo.pricing_id)
            for _ in range(random.randint(1, 2)):
                db.add(WorkOrderContainer(
                    work_order_id=wo.id,
                    container_number=_rand_container(),
                    work_type=pr_row.work_type,
                ))
        await db.flush()
        print("  Created work order containers")

        # ── 10. Trip Orders ────────────────────────────────────────────
        print("\n=== Creating Trip Orders ===")
        to_count = 35
        trip_orders = []
        for i in range(to_count):
            pr = random.choice(pricing_rows)
            trip_date = _rand_date()

            r = random.random()
            if r < 0.5:
                status = "PENDING"
            else:
                status = "MATCHED"

            to = TripOrder(
                trip_date=trip_date,
                partner_id=pr.partner_id,
                code=f"T{2001 + i:06d}",
                pickup_location_id=pr.pickup_location_id,
                dropoff_location_id=pr.dropoff_location_id,
                pricing_id=pr.id,
                unit_price=pr.unit_price,
                driver_salary=pr.driver_salary,
                allowance=pr.allowance,
                status=status,
            )
            db.add(to)
            trip_orders.append(to)

        await db.flush()
        print(f"  Created {to_count} trip orders")

        # Trip order containers
        for to in trip_orders:
            await db.refresh(to)
            pr_row = next(p for p in pricing_rows if p.id == to.pricing_id)
            for _ in range(random.randint(1, 2)):
                db.add(TripOrderContainer(
                    trip_order_id=to.id,
                    container_number=_rand_container(),
                    work_type=pr_row.work_type,
                    container_size=pr_row.work_type[1:],
                    freight_kind=pr_row.work_type[0],
                ))
        await db.flush()
        print("  Created trip order containers")

        await db.commit()

        # ── Summary ─────────────────────────────────────────────────────
        print("\n" + "=" * 50)
        print("SEED COMPLETE")
        print("=" * 50)
        tables = [
            "users", "vehicles", "locations", "partners",
            "settings",
            "pricings", "pricing_lines",
            "work_orders", "work_order_containers",
            "trip_orders", "trip_order_containers",
        ]
        for t in tables:
            cnt = (await db.execute(text(f"SELECT count(*) FROM {t}"))).scalar()
            print(f"  {t:30s} {cnt:>5d} rows")

        print("\nLogin credentials:")
        print("  admin    / admin123  (superadmin)")
        print("  giamdoc  / admin123  (director)")
        print("  ketoan   / admin123  (accountant)")
        print("  taixe    / admin123  (driver)")
        print("  taixe1   / admin123  (driver)")
        print("  taixe2   / admin123  (driver)")


if __name__ == "__main__":
    asyncio.run(seed_dev())
