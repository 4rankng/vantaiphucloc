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
from random import Random

from sqlalchemy import select, text

from app.database import async_session
from app.models.base import User
from app.models.domain import (
    DriverSalaryConfig,
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
    VehicleExpense,
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

# Each vehicle can have 1-2 drivers (PRIMARY + optional SECONDARY).
# Some plates share a second driver to demonstrate the 1:N relationship.
DRIVER_VEHICLES = {
    "15C09877": {"full_name": "Nguyễn Văn Tám", "phone": "0901001001", "secondary": None},
    "15C15033": {"full_name": "Trần Minh Đức", "phone": "0902002002", "secondary": "15H07788"},
    "15C17301": {"full_name": "Lê Quang Anh", "phone": "0903003003", "secondary": None},
    "15C17442": {"full_name": "Phạm Văn Hùng", "phone": "0904004004", "secondary": "15H07644"},
    "15C30649": {"full_name": "Hoàng Đức Thắng", "phone": "0905005005", "secondary": None},
    "15H06892": {"full_name": "Vũ Đình Nam", "phone": "0906006006", "secondary": None},
    "15H07135": {"full_name": "Đỗ Quang Hải", "phone": "0907007007", "secondary": None},
    "15H07524": {"full_name": "Bùi Thanh Sơn", "phone": "0908008008", "secondary": "15H08574"},
    "15H07644": {"full_name": "Ngô Minh Tuấn", "phone": "0909009009", "secondary": None},
    "15H07788": {"full_name": "Dương Văn Thành", "phone": "0910101001", "secondary": None},
    "15H08574": {"full_name": "Lý Hoàng Long", "phone": "0911111002", "secondary": None},
    "15H12925": {"full_name": "Trịnh Đức Minh", "phone": "0912122003", "secondary": None},
    "15H15378": {"full_name": "Cao Văn Lượng", "phone": "0913133004", "secondary": None},
    "15H17403": {"full_name": "Đinh Công Phú", "phone": "0914144005", "secondary": None},
    "15H17712": {"full_name": "Mai Văn Bình", "phone": "0915155006", "secondary": None},
    "15H18552": {"full_name": "Tạ Quang Vinh", "phone": "0916166007", "secondary": None},
    "15H18753": {"full_name": "Chu Đức Anh", "phone": "0917177008", "secondary": None},
    "15H20645": {"full_name": "Lâm Thanh Tùng", "phone": "0918188009", "secondary": None},
}

SEED_LOCATIONS = [
    {"name": "HẢI AN", "lat": 20.8515, "lng": 106.7538},
    {"name": "NHĐV", "lat": 20.8425, "lng": 106.7747},
    {"name": "VIP GREEN", "lat": 20.8380, "lng": 106.7630},
    {"name": "NAM ĐỊNH VỤ", "lat": 20.8435, "lng": 106.7760},
    {"name": "ĐÌNH VŨ", "lat": 20.8450, "lng": 106.7800},
    {"name": "GREEN PORT", "lat": 20.8500, "lng": 106.7500},
    {"name": "CHU VĂN AN", "lat": 20.8460, "lng": 106.7700},
]

SEED_PARTNERS = [
    {
        "code": "HAIAN",
        "name": "CÔNG TY TNHH CẢNG HẢI AN",
        "partner_type": "client",
        "phone": "02253979724",
        "tax_code": "0201126468",
        "address": "Tầng 1, Tòa nhà Hải An, Km 2 đường Đình Vũ, P. Đông Hải, TP. Hải Phòng",
        "contact_person": "Phòng Shipside",
    },
    {
        "code": "GLORY",
        "name": "CÔNG TY CP LOGISTICS GLORY",
        "partner_type": "client",
        "phone": "02253576789",
        "tax_code": "0201589012",
        "address": "Khu công nghiệp Đình Vũ, Hải Phòng",
        "contact_person": "Phòng Kế toán",
    },
    {
        "code": "CONSCIENCE",
        "name": "CONSCIENCE SHIPPING",
        "partner_type": "client",
        "phone": "02253678901",
        "tax_code": "0201678901",
        "address": "Số 12 Đường Nguyễn Trãi, Ngô Quyền, Hải Phòng",
        "contact_person": "Phòng Vận tải",
    },
    {
        "code": "XENGOAI01",
        "name": "XE NGOÀI ANH TUẤN",
        "partner_type": "vendor",
        "phone": "0912345678",
        "tax_code": None,
        "address": "Hải Phòng",
        "contact_person": "Tuấn",
    },
    {
        "code": "XENGOAI02",
        "name": "XE NGOÀI MINH QUANG",
        "partner_type": "vendor",
        "phone": "0923456789",
        "tax_code": None,
        "address": "Hải Phòng",
        "contact_person": "Quang",
    },
]

REAL_PRICING = {
    ("NHĐV", "HẢI AN", "F20"): {"unit_price": 386100, "driver_salary": 150000, "allowance": 50000},
    ("NHĐV", "HẢI AN", "F40"): {"unit_price": 448500, "driver_salary": 180000, "allowance": 70000},
    ("HẢI AN", "NHĐV", "F20"): {"unit_price": 386100, "driver_salary": 150000, "allowance": 50000},
    ("HẢI AN", "NHĐV", "F40"): {"unit_price": 448500, "driver_salary": 180000, "allowance": 70000},
    ("NHĐV", "VIP_GREEN", "F20"): {"unit_price": 400000, "driver_salary": 155000, "allowance": 50000},
    ("NHĐV", "VIP_GREEN", "F40"): {"unit_price": 465000, "driver_salary": 185000, "allowance": 70000},
    ("VIP_GREEN", "NHĐV", "F20"): {"unit_price": 400000, "driver_salary": 155000, "allowance": 50000},
    ("VIP_GREEN", "NHĐV", "F40"): {"unit_price": 465000, "driver_salary": 185000, "allowance": 70000},
    ("HẢI AN", "GREEN_PORT", "F20"): {"unit_price": 420000, "driver_salary": 160000, "allowance": 55000},
    ("HẢI AN", "GREEN_PORT", "F40"): {"unit_price": 490000, "driver_salary": 190000, "allowance": 75000},
}

VEHICLE_EXPENSES = {
    "15C09877": [
        {"category": "XANG_DAU", "amount": 4500000, "description": "Xăng dầu T4/2026"},
        {"category": "SUA_CHUA", "amount": 1200000, "description": "Thay lốp xe"},
    ],
    "15C15033": [
        {"category": "XANG_DAU", "amount": 5200000, "description": "Xăng dầu T4/2026"},
    ],
    "15C17301": [
        {"category": "XANG_DAU", "amount": 4100000, "description": "Xăng dầu T4/2026"},
        {"category": "SUA_CHUA", "amount": 3500000, "description": "Sửa chữa phanh"},
    ],
    "15C17442": [
        {"category": "XANG_DAU", "amount": 4800000, "description": "Xăng dầu T4/2026"},
        {"category": "KHAC", "amount": 500000, "description": "Rửa xe, bảo dưỡng nhẹ"},
    ],
    "15C30649": [
        {"category": "XANG_DAU", "amount": 3900000, "description": "Xăng dầu T4/2026"},
    ],
    "15H06892": [
        {"category": "XANG_DAU", "amount": 4600000, "description": "Xăng dầu T4/2026"},
        {"category": "SUA_CHUA", "amount": 2800000, "description": "Thay nhớt + lọc gió"},
    ],
    "15H07135": [
        {"category": "XANG_DAU", "amount": 4300000, "description": "Xăng dầu T4/2026"},
    ],
    "15H07524": [
        {"category": "XANG_DAU", "amount": 5100000, "description": "Xăng dầu T4/2026"},
        {"category": "KHAC", "amount": 300000, "description": "Phí cầu đường"},
    ],
    "15H07644": [
        {"category": "XANG_DAU", "amount": 4400000, "description": "Xăng dầu T4/2026"},
    ],
    "15H07788": [
        {"category": "XANG_DAU", "amount": 4700000, "description": "Xăng dầu T4/2026"},
        {"category": "SUA_CHUA", "amount": 1500000, "description": "Sửa chữa gầm xe"},
    ],
    "15H08574": [
        {"category": "XANG_DAU", "amount": 4200000, "description": "Xăng dầu T4/2026"},
    ],
    "15H12925": [
        {"category": "XANG_DAU", "amount": 4000000, "description": "Xăng dầu T4/2026"},
        {"category": "SUA_CHUA", "amount": 900000, "description": "Thay ắc quy"},
    ],
    "15H15378": [
        {"category": "XANG_DAU", "amount": 4500000, "description": "Xăng dầu T4/2026"},
    ],
    "15H17403": [
        {"category": "XANG_DAU", "amount": 3800000, "description": "Xăng dầu T4/2026"},
    ],
    "15H17712": [
        {"category": "XANG_DAU", "amount": 4900000, "description": "Xăng dầu T4/2026"},
        {"category": "KHAC", "amount": 400000, "description": "Phí kiểm định"},
    ],
    "15H18552": [
        {"category": "XANG_DAU", "amount": 4100000, "description": "Xăng dầu T4/2026"},
    ],
    "15H18753": [
        {"category": "XANG_DAU", "amount": 4600000, "description": "Xăng dầu T4/2026"},
        {"category": "SUA_CHUA", "amount": 2000000, "description": "Thay lốp + cán chỉnh"},
    ],
    "15H20645": [
        {"category": "XANG_DAU", "amount": 4300000, "description": "Xăng dầu T4/2026"},
    ],
}

GENERAL_OVERHEAD = [
    {"category": "CHUNG", "amount": 15000000, "description": "Bảo hiểm xe tháng 4/2026"},
    {"category": "CHUNG", "amount": 8000000, "description": "Phí bãi đậu xe tháng 4/2026"},
    {"category": "CHUNG", "amount": 5000000, "description": "Chi phí quản lý bãi"},
]


def _load_trips() -> list[dict]:
    with open(_REAL_DATA_PATH) as f:
        return json.load(f)


async def seed_dev() -> None:
    trips = _load_trips()
    print(f"Loaded {len(trips)} real trips from {_REAL_DATA_PATH.name}")
    rng = Random(42)

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

        # ── 2. Drivers + vehicles (segregated) ────────────────────────
        print("\n=== Seeding Drivers & Vehicles (segregated) ===")
        driver_map: dict[str, User] = {}
        vehicle_map: dict[str, Vehicle] = {}

        # Create driver users first
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
                print(f"  + driver: {info['full_name']} ({plate})")
            driver_map[plate] = drv

        # Create vehicles WITHOUT driver_id (relationship via VehicleDriver only)
        for plate in DRIVER_VEHICLES:
            result = await db.execute(select(Vehicle).where(Vehicle.plate == plate))
            veh = result.scalars().first()
            if veh is None:
                veh = Vehicle(plate=plate, is_active=True)
                db.add(veh)
                await db.flush()
                print(f"  + vehicle: {plate}")
            vehicle_map[plate] = veh

        await db.commit()

        # ── 3. VehicleDrivers (1:N via junction table) ─────────────────
        print("\n=== Creating VehicleDriver records (1:N) ===")
        vd_count = 0
        for plate, info in DRIVER_VEHICLES.items():
            primary_drv = driver_map[plate]
            veh = vehicle_map[plate]

            existing = (await db.execute(
                select(VehicleDriver).where(
                    VehicleDriver.vehicle_id == veh.id,
                    VehicleDriver.driver_id == primary_drv.id,
                    VehicleDriver.role == "PRIMARY",
                )
            )).scalar_one_or_none()
            if existing is None:
                db.add(VehicleDriver(
                    vehicle_id=veh.id, driver_id=primary_drv.id,
                    role="PRIMARY", effective_from=date(2026, 1, 1), is_active=True,
                ))
                vd_count += 1

            # Add SECONDARY driver if configured
            if info.get("secondary"):
                sec_plate = info["secondary"]
                sec_drv = driver_map[sec_plate]
                existing_sec = (await db.execute(
                    select(VehicleDriver).where(
                        VehicleDriver.vehicle_id == veh.id,
                        VehicleDriver.driver_id == sec_drv.id,
                        VehicleDriver.role == "SECONDARY",
                    )
                )).scalar_one_or_none()
                if existing_sec is None:
                    db.add(VehicleDriver(
                        vehicle_id=veh.id, driver_id=sec_drv.id,
                        role="SECONDARY", effective_from=date(2026, 3, 1), is_active=True,
                    ))
                    vd_count += 1
                    print(f"  + SECONDARY: {sec_drv.full_name} → {plate}")

        await db.flush()
        print(f"  Created {vd_count} vehicle-driver links (some 1:N with SECONDARY)")
        await db.commit()

        # ── 4. Locations ────────────────────────────────────────────────
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

        # ── 5. Partners ────────────────────────────────────────────────
        print("\n=== Seeding Partners ===")
        partner_map: dict[str, Partner] = {}
        for p in SEED_PARTNERS:
            result = await db.execute(select(Partner).where(Partner.code == p["code"]))
            partner = result.scalars().first()
            if partner is None:
                partner = Partner(
                    code=p["code"], name=p["name"],
                    partner_type=p["partner_type"],
                    phone=p["phone"], tax_code=p.get("tax_code"),
                    address=p.get("address"), contact_person=p.get("contact_person"),
                    is_active=True,
                )
                db.add(partner)
                await db.flush()
                print(f"  + {p['code']} ({p['partner_type']}) — {p['name']}")
            partner_map[p["code"]] = partner
        await db.commit()

        # ── 6. Settings ────────────────────────────────────────────────
        print("\n=== Seeding Settings ===")
        for key, value in {"salary_from_day": "21", "salary_to_day": "20"}.items():
            result = await db.execute(select(Setting).where(Setting.key == key))
            if result.scalars().first() is None:
                db.add(Setting(key=key, value=value))
                print(f"  + {key}={value}")
        await db.commit()

        # ── 7. Pricings ────────────────────────────────────────────────
        print("\n=== Seeding Pricings ===")
        client = partner_map["HAIAN"]
        pricing_map: dict[tuple, Pricing] = {}

        for (pickup_name, dropoff_name, work_type), prices in REAL_PRICING.items():
            pickup_loc = loc_map.get(pickup_name)
            dropoff_loc = loc_map.get(dropoff_name)
            if not pickup_loc or not dropoff_loc:
                continue
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
                    client_id=client.id, work_type=work_type,
                    pickup_location_id=pickup_loc.id,
                    dropoff_location_id=dropoff_loc.id,
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

        # ── 8. WorkOrders from real data ────────────────────────────────
        print("\n=== Creating WorkOrders ===")
        ketoan = user_map["ketoan"]

        existing_wo_count = (await db.execute(
            select(WorkOrder).where(WorkOrder.code == f"W{1001:06d}")
        )).scalar_one_or_none()
        if existing_wo_count is not None:
            # Work orders already seeded — load them
            all_wos = list((await db.execute(
                select(WorkOrder).order_by(WorkOrder.id)
            )).scalars().all())
            print(f"  = {len(all_wos)} work orders already exist, skipping")
        else:
            all_wos = []
            for idx, trip in enumerate(trips):
                pickup = trip["pickup"]
                dropoff = trip["dropoff"]
                wt = f"F{trip['size']}"
                plate = trip["plate"]
                prices = REAL_PRICING.get((pickup, dropoff, wt), {})
                pricing = pricing_map.get((pickup, dropoff, wt))
                trip_date = date.fromisoformat(trip["trip_date"]) if trip["trip_date"] else date(2026, 4, 1)

                wo = WorkOrder(
                    client_id=client.id,
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
        existing_to_count = (await db.execute(
            select(TripOrder).where(TripOrder.code == f"T{2001:06d}")
        )).scalar_one_or_none()
        if existing_to_count is not None:
            all_tos = list((await db.execute(
                select(TripOrder).order_by(TripOrder.id)
            )).scalars().all())
            print(f"  = {len(all_tos)} trip orders already exist, skipping")
        else:
            all_tos = []
            for idx, trip in enumerate(trips):
                pickup = trip["pickup"]
                dropoff = trip["dropoff"]
                wt = f"F{trip['size']}"
                prices = REAL_PRICING.get((pickup, dropoff, wt), {})
                pricing = pricing_map.get((pickup, dropoff, wt))
                trip_date = date.fromisoformat(trip["trip_date"]) if trip["trip_date"] else date(2026, 4, 1)

                to = TripOrder(
                    trip_date=trip_date,
                    client_id=client.id,
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
        existing_recon = (await db.execute(text("SELECT count(*) FROM reconciliations"))).scalar()
        if existing_recon > 0:
            print(f"  = {existing_recon} reconciliations already exist, skipping")
        else:
            for i in range(min(len(all_wos), len(all_tos))):
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

        # ── 11. Vehicle Expenses (CP Xe) ───────────────────────────────
        print("\n=== Seeding Vehicle Expenses ===")
        expense_count = 0
        for plate, expenses in VEHICLE_EXPENSES.items():
            veh = vehicle_map[plate]
            for exp in expenses:
                db.add(VehicleExpense(
                    vehicle_id=veh.id,
                    category=exp["category"],
                    amount=exp["amount"],
                    expense_date=date(2026, 4, rng.randint(1, 28)),
                    description=exp["description"],
                    created_by=ketoan.id,
                ))
                expense_count += 1
        for exp in GENERAL_OVERHEAD:
            db.add(VehicleExpense(
                vehicle_id=None,
                category=exp["category"],
                amount=exp["amount"],
                expense_date=date(2026, 4, 15),
                description=exp["description"],
                created_by=ketoan.id,
            ))
            expense_count += 1
        await db.flush()
        print(f"  Created {expense_count} vehicle expense records")
        await db.commit()

        # ── 12. Driver Salary Configs ──────────────────────────────────
        print("\n=== Seeding Driver Salary Configs ===")
        salary_count = 0
        for plate, info in DRIVER_VEHICLES.items():
            drv = driver_map[plate]
            result = await db.execute(
                select(DriverSalaryConfig).where(DriverSalaryConfig.driver_id == drv.id)
            )
            if result.scalars().first() is None:
                base = rng.randint(6, 9) * 1000000  # 6M-9M VND
                db.add(DriverSalaryConfig(
                    driver_id=drv.id,
                    base_salary=base,
                    effective_from=date(2026, 1, 1),
                    note=f"Lương cơ bản {base // 1000000}TR/tháng",
                    created_by=ketoan.id,
                ))
                salary_count += 1
        await db.flush()
        print(f"  Created {salary_count} driver salary config records")
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
            "vehicle_expenses", "driver_salary_configs",
        ]:
            cnt = (await db.execute(text(f"SELECT count(*) FROM {t}"))).scalar()
            print(f"  {t:30s} {cnt:>5d} rows")

        print("\nLogin credentials:")
        print("  admin    / admin123  (superadmin)")
        print("  giamdoc  / admin123  (director)")
        print("  ketoan   / admin123  (accountant)")
        print("  driver_* / admin123  (18 drivers)")
        print("\nVehicle-Driver assignments (1:N):")
        for plate, info in DRIVER_VEHICLES.items():
            sec = f" + SECONDARY ({info['secondary']})" if info.get("secondary") else ""
            print(f"  {plate}: PRIMARY {info['full_name']}{sec}")


if __name__ == "__main__":
    asyncio.run(seed_dev())
