"""One-shot dev seed: reference data + demo operational data.

Usage:
    cd backend && python -m app.seed_dev

Creates:
  - Users (superadmin, director, accountant, drivers)
  - Locations (common VN ports & industrial zones)
  - Clients (HAIAN, PAN, HAP, NEWWAY)
  - Vendor (Vận Tải Phúc Lộc)
  - Routes (pickup → dropoff pairs)
  - Pricings + PricingLines (realistic VND rates)
  - Work orders (40, varied statuses)
  - Trip orders (35, varied statuses)
  - Containers for each order
  - Trip ↔ Work order links

Idempotent: clears operational data on re-run, keeps reference data.
"""

import asyncio
import random
from datetime import date, timedelta

from sqlalchemy import select, text, delete

from app.database import async_session
from app.models.base import User
from app.models.domain import (
    Client,
    Location,
    LocationAlias,
    Pricing,
    PricingLine,
    Route,
    TripOrder,
    TripOrderContainer,
    TripOrderWorkOrder,
    Vendor,
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
     "full_name": "Nguyễn Văn Tài", "tractor_plate": "29C-12345", "vendor": "Vận Tải Phúc Lộc"},
    {"phone": "0902345678", "username": "taixe1",  "password": "admin123", "role": "driver",
     "full_name": "Trần Minh Đức", "tractor_plate": "29C-23456", "vendor": "Vận Tải Phúc Lộc"},
    {"phone": "0903456789", "username": "taixe2",  "password": "admin123", "role": "driver",
     "full_name": "Lê Quang Anh", "tractor_plate": "29C-34567", "vendor": "Vận Tải Phúc Lộc"},
]

LOCATION_NAMES = [
    "Cát Lái", "Bình Dương", "Đồng Nai", "Vũng Tàu",
    "Cái Mép", "Hiệp Phước", "Tân Cảng", "Bình Tân",
    "Long Bình", "Nhà Bè", "Cần Giuộc", "Tân Tập",
    "SGN Terminal", "Lotus Terminal", "Gem Terminal",
    "TCT Terminal", "SSIT", "Tân Thuận",
]

SEED_CLIENTS = [
    {"code": "HAIAN",  "name": "Công ty TNHH HẢI AN",
     "phone": "02838221188", "tax_code": "0302784512",
     "address": "Lô B, KCN Hiệp Phước, X. Hiệp Phước, H. Nhà Bè, TP.HCM",
     "contact_person": "Trần Văn Hải"},
    {"code": "PAN",    "name": "Công ty TNHH PAN HẢI AN",
     "phone": "02838256677", "tax_code": "0304749215",
     "address": "Lô B1, KCN Hiệp Phước, H. Nhà Bè, TP.HCM",
     "contact_person": "Nguyễn Thị Hồng"},
    {"code": "HAP",    "name": "Công ty TNHH HAP",
     "phone": "02838256789", "tax_code": "0304749216",
     "address": "Số 6, Đường số 3, KCN Hiệp Phước, H. Nhà Bè, TP.HCM",
     "contact_person": "Phạm Minh Tuấn"},
    {"code": "NEWWAY", "name": "Công ty TNHH NEWWAY",
     "phone": "02839756888", "tax_code": "0313425678",
     "address": "282 Nguyễn Văn Linh, Q. 7, TP.HCM",
     "contact_person": "Võ Đình An"},
]

# Realistic VND prices per (work_type, approximate distance)
# unit_price = what client pays, driver_salary + allowance = what driver earns
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
        for u in SEED_USERS:
            result = await db.execute(select(User).where(User.username == u["username"]))
            existing = result.scalars().first()
            if existing is None:
                db.add(User(
                    phone=u["phone"],
                    username=u["username"],
                    hashed_password=hash_password(u["password"]),
                    role=u["role"],
                    is_active=True,
                    full_name=u.get("full_name"),
                    tractor_plate=u.get("tractor_plate"),
                    vendor=u.get("vendor"),
                ))
                print(f"  + {u['role']} ({u['username']})")
            else:
                changed = False
                for field in ("full_name", "tractor_plate", "vendor", "phone"):
                    if u.get(field) and not getattr(existing, field, None):
                        setattr(existing, field, u[field])
                        changed = True
                if changed:
                    print(f"  ~ updated {u['username']}")
                else:
                    print(f"  = {u['username']} exists")
        await db.commit()

        # ── 2. Locations ────────────────────────────────────────────────
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

        # ── 3. Vendor ──────────────────────────────────────────────────
        print("\n=== Seeding Vendor ===")
        vname = "Vận Tải Phúc Lộc"
        result = await db.execute(select(Vendor).where(Vendor.name == vname))
        vendor = result.scalars().first()
        if vendor is None:
            vendor = Vendor(name=vname, type="company", phone="02838255555",
                            tax_code="0300000001",
                            address="KCN Hiệp Phước, H. Nhà Bè, TP.HCM",
                            contact_person="Nguyễn Văn Phúc", is_active=True)
            db.add(vendor)
            await db.flush()
            print(f"  + {vname} (id={vendor.id})")
        else:
            print(f"  = {vname} (id={vendor.id})")
        await db.commit()

        # ── 4. Clients ─────────────────────────────────────────────────
        print("\n=== Seeding Clients ===")
        client_map: dict[str, Client] = {}
        for c in SEED_CLIENTS:
            result = await db.execute(select(Client).where(Client.code == c["code"]))
            client = result.scalars().first()
            if client is None:
                client = Client(
                    code=c["code"], name=c["name"], type="company",
                    phone=c["phone"], tax_code=c["tax_code"],
                    address=c["address"], contact_person=c["contact_person"],
                    outstanding_debt=0, is_active=True,
                )
                db.add(client)
                await db.flush()
                print(f"  + {c['code']} — {c['name']} (id={client.id})")
            else:
                # Backfill missing fields
                for field in ("phone", "tax_code", "address", "contact_person"):
                    if c.get(field) and not getattr(client, field, None):
                        setattr(client, field, c[field])
                print(f"  = {c['code']} (id={client.id})")
            client_map[c["code"]] = client
        await db.commit()

        # ── 5. Routes ──────────────────────────────────────────────────
        print("\n=== Seeding Routes ===")
        route_map: dict[tuple[int, int], Route] = {}
        for pickup_idx, dropoff_idx in ROUTE_PAIRS:
            pickup_name = LOCATION_NAMES[pickup_idx]
            dropoff_name = LOCATION_NAMES[dropoff_idx]
            pickup_loc = loc_map[pickup_name]
            dropoff_loc = loc_map[dropoff_name]

            result = await db.execute(
                select(Route).where(
                    Route.pickup_location_id == pickup_loc.id,
                    Route.dropoff_location_id == dropoff_loc.id,
                )
            )
            route = result.scalars().first()
            if route is None:
                route = Route(
                    route=f"{pickup_name} → {dropoff_name}",
                    pickup_location_id=pickup_loc.id,
                    dropoff_location_id=dropoff_loc.id,
                    is_active=True,
                )
                db.add(route)
                await db.flush()
                print(f"  + {pickup_name} → {dropoff_name} (id={route.id})")
            else:
                print(f"  = {pickup_name} → {dropoff_name} (id={route.id})")
            route_map[(pickup_loc.id, dropoff_loc.id)] = route
        await db.commit()

        # ── 6. Pricings + PricingLines ─────────────────────────────────
        print("\n=== Seeding Pricings ===")
        pricing_map: dict[tuple[str, int, int, str], Pricing] = {}

        for client_code in SEED_CLIENTS:
            client = client_map[client_code]
            for (pickup_idx, dropoff_idx) in ROUTE_PAIRS:
                pickup_loc = loc_map[LOCATION_NAMES[pickup_idx]]
                dropoff_loc = loc_map[LOCATION_NAMES[dropoff_idx]]

                for work_type, unit_price, driver_salary, allowance in PRICING_DATA:
                    key = (client_code, pickup_loc.id, dropoff_loc.id, work_type)
                    result = await db.execute(
                        select(Pricing).where(
                            Pricing.client_id == client.id,
                            Pricing.work_type == work_type,
                            Pricing.pickup_location_id == pickup_loc.id,
                            Pricing.dropoff_location_id == dropoff_loc.id,
                        )
                    )
                    pricing = result.scalars().first()
                    if pricing is None:
                        pricing = Pricing(
                            client_id=client.id,
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
        print(f"  Created {len(pricing_map)} pricing entries (4 clients × 20 routes × 4 types)")

        # ── 7. Clear existing operational data ──────────────────────────
        print("\n=== Clearing existing operational data ===")
        for table in [
            "trip_order_work_orders", "trip_order_containers", "trip_orders",
            "work_order_containers", "work_orders",
        ]:
            await db.execute(text(f"DELETE FROM {table}"))
        await db.commit()
        print("  Cleared work_orders, trip_orders, and related tables")

        # ── 8. Gather references for operational data ───────────────────
        drivers = (await db.execute(
            text("SELECT id FROM users WHERE role = 'driver'")
        )).scalars().all()

        # Build a list of (pricing, pricing_line, route_str) tuples
        result = await db.execute(text("""
            SELECT pr.id, pr.client_id, pr.work_type,
                   pr.pickup_location_id, pr.dropoff_location_id,
                   pl.unit_price, pl.driver_salary, pl.allowance
            FROM pricings pr
            JOIN pricing_lines pl ON pr.id = pl.pricing_id
        """))
        pricing_rows = result.fetchall()

        # Route strings for display
        result = await db.execute(text("""
            SELECT r.pickup_location_id, r.dropoff_location_id,
                   p.name AS pickup, d.name AS dropoff
            FROM routes r
            JOIN locations p ON r.pickup_location_id = p.id
            JOIN locations d ON r.dropoff_location_id = d.id
        """))
        route_str_map = {
            (r.pickup_location_id, r.dropoff_location_id): f"{r.pickup} → {r.dropoff}"
            for r in result.fetchall()
        }

        # ── 9. Work Orders ─────────────────────────────────────────────
        print("\n=== Creating Work Orders ===")
        wo_count = 40
        work_orders = []
        for i in range(wo_count):
            pr = random.choice(pricing_rows)
            driver_id = random.choice(drivers)
            route_str = route_str_map.get(
                (pr.pickup_location_id, pr.dropoff_location_id), "Unknown"
            )

            r = random.random()
            if r < 0.4:
                status = "PENDING"
            elif r < 0.8:
                status = "MATCHED"
            else:
                status = "COMPLETED"

            wo = WorkOrder(
                client_id=pr.client_id,
                code=f"W{1001 + i:06d}",
                route=route_str,
                pickup_location_id=pr.pickup_location_id,
                dropoff_location_id=pr.dropoff_location_id,
                driver_id=driver_id,
                tractor_plate=random.choice(PLATES),
                unit_price=pr.unit_price,
                driver_salary=pr.driver_salary,
                allowance=pr.allowance,
                earning=pr.driver_salary + pr.allowance,
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
            route_str = route_str_map.get(
                (pr.pickup_location_id, pr.dropoff_location_id), "Unknown"
            )
            trip_date = _rand_date()

            r = random.random()
            if r < 0.3:
                status = "DRAFT"
            elif r < 0.6:
                status = "PENDING"
            elif r < 0.9:
                status = "COMPLETED"
                is_confirmed = random.random() < 0.7
            else:
                status = "CANCELLED"

            to = TripOrder(
                trip_date=trip_date,
                client_id=pr.client_id,
                code=f"T{2001 + i:06d}",
                route=route_str,
                pickup_location_id=pr.pickup_location_id,
                dropoff_location_id=pr.dropoff_location_id,
                pricing_id=pr.id,
                unit_price=pr.unit_price,
                driver_salary=pr.driver_salary,
                allowance=pr.allowance,
                revenue=pr.unit_price,
                status=status,
                is_confirmed=is_confirmed if status == "COMPLETED" else False,
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

        # ── 11. Link matched trips ↔ work orders ───────────────────────
        matched_tos = [to for to in trip_orders if to.status == "COMPLETED"]
        matched_wos = [wo for wo in work_orders if wo.status in ("MATCHED", "COMPLETED")]

        link_count = 0
        for to in matched_tos:
            n_links = min(random.randint(1, 2), len(matched_wos))
            chosen = random.sample(matched_wos, n_links)
            for wo in chosen:
                db.add(TripOrderWorkOrder(
                    trip_order_id=to.id,
                    work_order_id=wo.id,
                ))
                link_count += 1

        await db.flush()
        print(f"  Created {link_count} trip ↔ work order links")

        await db.commit()

        # ── Summary ─────────────────────────────────────────────────────
        print("\n" + "=" * 50)
        print("SEED COMPLETE")
        print("=" * 50)
        tables = [
            "users", "locations", "clients", "vendors", "routes",
            "pricings", "pricing_lines",
            "work_orders", "work_order_containers",
            "trip_orders", "trip_order_containers",
            "trip_order_work_orders",
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
