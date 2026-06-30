"""Dev seed with realistic operational data for Feb–May 2026.

Usage:
    cd backend && python -m app.seed_dev

Generates production-like data spanning 4 months with realistic P&L:
  - ~70-90 trips/vehicle/month (2-3 container moves/day)
  - 3 clients: HAIAN (main), GLORY, CONSCIENCE
  - 12 routes across 7 port/depot locations
  - Per-trip driver salary + allowance + monthly base salary
  - Vehicle expenses: fuel, repairs, law/permits, other

Run ``alembic upgrade head`` first on a fresh database.
"""

import asyncio
import calendar
import json
import unicodedata
from datetime import date
from pathlib import Path
from random import Random

from sqlalchemy import delete, select, text

from app.database import async_session
from app.models.base import User
from app.models.domain import (
    Client,
    DriverSalaryConfig,
    Location,
    RoutePricing,
    Setting,
    BookedTrip,
    Vehicle,
    Vendor,
    VehicleDriver,
    VehicleExpense,
    DeliveredTrip,
    OcrRequest,
)
from app.core.security import hash_password

_REAL_DATA_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "docs"
    / "real-life-data"
    / "trips_shipside_t4_26.json"
)

MONTHS = [
    (2026, 2),
    (2026, 3),
    (2026, 4),
    (2026, 5),
]

rng = Random(42)


def _remove_diacritics(s: str) -> str:
    s = s.replace("đ", "d").replace("Đ", "D")
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def _name_to_username(full_name: str) -> str:
    parts = _remove_diacritics(full_name).lower().split()
    if len(parts) >= 3:
        return parts[-1] + parts[0][0] + parts[1][0]
    elif len(parts) == 2:
        return parts[-1] + parts[0][0]
    return parts[0]


SEED_USERS = [
    {
        "phone": "0000000000",
        "username": "admin",
        "password": "admin123",
        "role": "superadmin",
        "full_name": "Super Admin",
    },
    {
        "phone": "0000000001",
        "username": "giamdoc",
        "password": "admin123",
        "role": "director",
        "full_name": "Giám Đốc Test",
    },
    {
        "phone": "0000000002",
        "username": "ketoan",
        "password": "admin123",
        "role": "accountant",
        "full_name": "Kế Toán Test",
    },
]

DRIVER_VEHICLES = {
    "15C09877": {
        "full_name": "Nguyễn Văn Tám",
        "phone": "0901001001",
        "secondary": None,
        "base_salary": 5000000,
    },
    "15C15033": {
        "full_name": "Trần Minh Đức",
        "phone": "0902002002",
        "secondary": "15H07788",
        "base_salary": 5500000,
    },
    "15C17301": {
        "full_name": "Lê Quang Anh",
        "phone": "0903003003",
        "secondary": None,
        "base_salary": 4500000,
    },
    "15C17442": {
        "full_name": "Phạm Văn Hùng",
        "phone": "0904004004",
        "secondary": "15H07644",
        "base_salary": 5500000,
    },
    "15C30649": {
        "full_name": "Hoàng Đức Thắng",
        "phone": "0905005005",
        "secondary": None,
        "base_salary": 5000000,
    },
    "15H06892": {
        "full_name": "Vũ Đình Nam",
        "phone": "0906006006",
        "secondary": None,
        "base_salary": 4500000,
    },
    "15H07135": {
        "full_name": "Đỗ Quang Hải",
        "phone": "0907007007",
        "secondary": None,
        "base_salary": 5000000,
    },
    "15H07524": {
        "full_name": "Bùi Thanh Sơn",
        "phone": "0908008008",
        "secondary": "15H08574",
        "base_salary": 5500000,
    },
    "15H07644": {
        "full_name": "Ngô Minh Tuấn",
        "phone": "0909009009",
        "secondary": None,
        "base_salary": 4500000,
    },
    "15H07788": {
        "full_name": "Dương Văn Thành",
        "phone": "0910101001",
        "secondary": None,
        "base_salary": 5000000,
    },
    "15H08574": {
        "full_name": "Lý Hoàng Long",
        "phone": "0911111002",
        "secondary": None,
        "base_salary": 4500000,
    },
    "15H12925": {
        "full_name": "Trịnh Đức Minh",
        "phone": "0912122003",
        "secondary": None,
        "base_salary": 5000000,
    },
    "15H15378": {
        "full_name": "Cao Văn Lượng",
        "phone": "0913133004",
        "secondary": None,
        "base_salary": 5000000,
    },
    "15H17403": {
        "full_name": "Đinh Công Phú",
        "phone": "0914144005",
        "secondary": None,
        "base_salary": 4500000,
    },
    "15H17712": {
        "full_name": "Mai Văn Bình",
        "phone": "0915155006",
        "secondary": None,
        "base_salary": 5000000,
    },
    "15H18552": {
        "full_name": "Tạ Quang Vinh",
        "phone": "0916166007",
        "secondary": None,
        "base_salary": 5000000,
    },
    "15H18753": {
        "full_name": "Chu Đức Anh",
        "phone": "0917177008",
        "secondary": None,
        "base_salary": 5500000,
    },
    "15H20645": {
        "full_name": "Lâm Thanh Tùng",
        "phone": "0918188009",
        "secondary": None,
        "base_salary": 5000000,
    },
}

EXTRA_DRIVERS = [
    {
        "username": "taixe",
        "full_name": "Phùng Tài Xế",
        "phone": "0920002001",
        "plate": "15C09877",
        "base_salary": 4500000,
    },
    {
        "username": "laixe",
        "full_name": "Trần Lái Xe",
        "phone": "0920002002",
        "plate": "15C15033",
        "base_salary": 4500000,
    },
]

SEED_LOCATIONS = [
    {"name": "HẢI AN", "lat": 20.8515, "lng": 106.7538},
    {"name": "NHĐV", "lat": 20.8425, "lng": 106.7747},
    {"name": "VIP GREEN", "lat": 20.8380, "lng": 106.7630},
    {"name": "NAM ĐỊNH VỤ", "lat": 20.8435, "lng": 106.7760},
    {"name": "ĐÌNH VŨ", "lat": 20.8450, "lng": 106.7800},
    {"name": "GREEN PORT", "lat": 20.8500, "lng": 106.7500},
    {"name": "CHU VĂN AN", "lat": 20.8460, "lng": 106.7700},
]

SEED_LOCATION_ALIASES = [
    {"location_name": "NHĐV", "alias": "NDV", "source": "seed"},
]

SEED_CLIENTS = [
    {
        "code": "HAIAN",
        "name": "CÔNG TY TNHH CẢNG HẢI AN",
        "phone": "02253979724",
        "tax_code": "0201126468",
        "address": "Tầng 1, Tòa nhà Hải An, Km 2 đường Đình Vũ, P. Đông Hải, TP. Hải Phòng",
        "contact_person": "Phòng Shipside",
    },
    {
        "code": "GLORY",
        "name": "CÔNG TY CP LOGISTICS GLORY",
        "phone": "02253576789",
        "tax_code": "0201589012",
        "address": "Khu công nghiệp Đình Vũ, Hải Phòng",
        "contact_person": "Phòng Kế toán",
    },
    {
        "code": "CONSCIENCE",
        "name": "CONSCIENCE SHIPPING",
        "phone": "02253678901",
        "tax_code": "0201678901",
        "address": "Số 12 Đường Nguyễn Trãi, Ngô Quyền, Hải Phòng",
        "contact_person": "Phòng Vận tải",
    },
]

SEED_VENDORS = [
    {
        "code": "XENGOAI01",
        "name": "XE NGOÀI ANH TUẤN",
        "phone": "0912345678",
        "tax_code": None,
        "address": "Hải Phòng",
        "contact_person": "Tuấn",
    },
    {
        "code": "XENGOAI02",
        "name": "XE NGOÀI MINH QUANG",
        "phone": "0923456789",
        "tax_code": None,
        "address": "Hải Phòng",
        "contact_person": "Quang",
    },
]

ALL_PRICING = {
    "HAIAN": {
        ("NHĐV", "HẢI AN"): {
            "unit_price": 448500,
            "driver_salary": 180000,
            "allowance": 70000,
        },
        ("HẢI AN", "NHĐV"): {
            "unit_price": 448500,
            "driver_salary": 180000,
            "allowance": 70000,
        },
        ("NHĐV", "VIP GREEN"): {
            "unit_price": 465000,
            "driver_salary": 185000,
            "allowance": 70000,
        },
        ("VIP GREEN", "NHĐV"): {
            "unit_price": 465000,
            "driver_salary": 185000,
            "allowance": 70000,
        },
        ("HẢI AN", "GREEN PORT"): {
            "unit_price": 490000,
            "driver_salary": 190000,
            "allowance": 75000,
        },
        ("GREEN PORT", "HẢI AN"): {
            "unit_price": 490000,
            "driver_salary": 190000,
            "allowance": 75000,
        },
        ("NHĐV", "ĐÌNH VŨ"): {
            "unit_price": 430000,
            "driver_salary": 175000,
            "allowance": 65000,
        },
        ("ĐÌNH VŨ", "NHĐV"): {
            "unit_price": 430000,
            "driver_salary": 175000,
            "allowance": 65000,
        },
        ("HẢI AN", "CHU VĂN AN"): {
            "unit_price": 458000,
            "driver_salary": 182000,
            "allowance": 68000,
        },
        ("CHU VĂN AN", "HẢI AN"): {
            "unit_price": 458000,
            "driver_salary": 182000,
            "allowance": 68000,
        },
        ("NHĐV", "NAM ĐỊNH VỤ"): {
            "unit_price": 435000,
            "driver_salary": 178000,
            "allowance": 66000,
        },
        ("NAM ĐỊNH VỤ", "NHĐV"): {
            "unit_price": 435000,
            "driver_salary": 178000,
            "allowance": 66000,
        },
    },
    "GLORY": {
        ("NHĐV", "HẢI AN"): {
            "unit_price": 475000,
            "driver_salary": 185000,
            "allowance": 72000,
        },
        ("HẢI AN", "NHĐV"): {
            "unit_price": 475000,
            "driver_salary": 185000,
            "allowance": 72000,
        },
        ("NHĐV", "VIP GREEN"): {
            "unit_price": 495000,
            "driver_salary": 190000,
            "allowance": 72000,
        },
        ("VIP GREEN", "NHĐV"): {
            "unit_price": 495000,
            "driver_salary": 190000,
            "allowance": 72000,
        },
        ("HẢI AN", "GREEN PORT"): {
            "unit_price": 518000,
            "driver_salary": 195000,
            "allowance": 77000,
        },
        ("NHĐV", "ĐÌNH VŨ"): {
            "unit_price": 458000,
            "driver_salary": 180000,
            "allowance": 67000,
        },
        ("HẢI AN", "CHU VĂN AN"): {
            "unit_price": 485000,
            "driver_salary": 187000,
            "allowance": 70000,
        },
    },
    "CONSCIENCE": {
        ("NHĐV", "HẢI AN"): {
            "unit_price": 458000,
            "driver_salary": 182000,
            "allowance": 68000,
        },
        ("HẢI AN", "NHĐV"): {
            "unit_price": 458000,
            "driver_salary": 182000,
            "allowance": 68000,
        },
        ("NHĐV", "VIP GREEN"): {
            "unit_price": 478000,
            "driver_salary": 187000,
            "allowance": 68000,
        },
        ("HẢI AN", "GREEN PORT"): {
            "unit_price": 500000,
            "driver_salary": 192000,
            "allowance": 73000,
        },
        ("NHĐV", "ĐÌNH VŨ"): {
            "unit_price": 442000,
            "driver_salary": 177000,
            "allowance": 64000,
        },
    },
}

ROUTES = [
    ("NHĐV", "HẢI AN"),
    ("HẢI AN", "NHĐV"),
    ("NHĐV", "VIP GREEN"),
    ("VIP GREEN", "NHĐV"),
    ("HẢI AN", "GREEN PORT"),
    ("GREEN PORT", "HẢI AN"),
    ("NHĐV", "ĐÌNH VŨ"),
    ("ĐÌNH VŨ", "NHĐV"),
    ("HẢI AN", "CHU VĂN AN"),
    ("CHU VĂN AN", "HẢI AN"),
    ("NHĐV", "NAM ĐỊNH VỤ"),
    ("NAM ĐỊNH VỤ", "NHĐV"),
]

CLIENT_WEIGHTS = {"HAIAN": 65, "GLORY": 22, "CONSCIENCE": 13}
CLIENT_KEYS = list(CLIENT_WEIGHTS.keys())
CLIENT_W = list(CLIENT_WEIGHTS.values())


VESSELS = [
    "HAIAN ALFA 073N",
    "HAIAN LINK V.138S",
    "HAIAN BETA 062S",
    "HAIAN EXPRESS 251N",
    "HAIAN GLOBAL 045S",
    "HAIAN PIONEER 112N",
    "GLORY SHANGHAI 2612N",
    "CONSCIENCE 2615N",
    "HAIAN ALPHA 085S",
    "HAIAN NEPTUNE 201N",
    "GLORY PACIFIC 310S",
]

_CONTAINER_PREFIXES = [
    "HACU",
    "NSSU",
    "FBLU",
    "MSCU",
    "CSLU",
    "TCLU",
    "EISU",
    "OOLU",
    "NYKU",
    "KKTU",
    "YMMU",
    "APLU",
    "CMAU",
    "HLXU",
    "ONEU",
]


def _rand_container() -> str:
    return f"{rng.choice(_CONTAINER_PREFIXES)}{rng.randint(1000000, 9999999)}"


def _generate_trips_for_month(year: int, month: int, plates: list[str]) -> list[dict]:
    days_in_month = calendar.monthrange(year, month)[1]
    num_vehicles = len(plates)
    total_trips = num_vehicles * rng.randint(72, 88)
    trips = []
    for _ in range(total_trips):
        day = rng.randint(1, days_in_month)
        pickup, dropoff = rng.choice(ROUTES)
        size = rng.choices([20, 40], weights=[75, 25])[0]
        client_code = rng.choices(CLIENT_KEYS, weights=CLIENT_W)[0]
        pricing_for_client = ALL_PRICING.get(client_code, {})
        prices = pricing_for_client.get((pickup, dropoff))
        if prices:
            unit_price = prices["unit_price"]
        else:
            fallback = ALL_PRICING["HAIAN"].get((pickup, dropoff))
            unit_price = fallback["unit_price"] if fallback else 400000
        trips.append(
            {
                "container": _rand_container(),
                "size": size,
                "vessel": rng.choice(VESSELS),
                "pickup": pickup,
                "dropoff": dropoff,
                "plate": rng.choice(plates),
                "unit_price": unit_price,
                "trip_date": f"{year}-{month:02d}-{day:02d}",
                "client_code": client_code,
            }
        )
    return trips


def _load_all_trips() -> list[dict]:
    all_trips: list[dict] = []
    real_april: list[dict] = []
    if _REAL_DATA_PATH.exists():
        with open(_REAL_DATA_PATH) as f:
            real_april = json.load(f)
        for t in real_april:
            t["client_code"] = "HAIAN"
        print(
            f"  Loaded {len(real_april)} real April trips from {_REAL_DATA_PATH.name}"
        )

    plates = sorted(DRIVER_VEHICLES.keys())

    for year, month in MONTHS:
        synthetic = _generate_trips_for_month(year, month, plates)
        if year == 2026 and month == 4 and real_april:
            all_trips.extend(real_april)
            print(f"  April: {len(real_april)} real + {len(synthetic)} synthetic")
        all_trips.extend(synthetic)
        print(f"  Generated {len(synthetic)} synthetic trips for {year}-{month:02d}")

    all_trips.sort(key=lambda t: t["trip_date"])
    return all_trips


TIEN_LUAT_DESCRIPTIONS = [
    "Phí đường bộ",
    "Tiền luật giao thông",
    "Phí cầu đường",
    "Phí trọng lượng",
]


async def _clear_operational_data(db) -> None:
    print("\n=== Clearing existing operational data ===")
    for table in [
        "delivered_trips",
        "booked_trips",
        "vehicle_expenses",
        "driver_salary_configs",
        "route_pricings",
        "ocr_requests",
    ]:
        result = await db.execute(text(f"DELETE FROM {table}"))
        if result.rowcount:
            print(f"  Cleared {result.rowcount} rows from {table}")
    await db.flush()


async def seed_dev() -> None:
    trips = _load_all_trips()
    print(f"\nTotal trips to seed: {len(trips)}")

    async with async_session() as db:
        await _clear_operational_data(db)

        # ── 1. Staff users ──────────────────────────────────────────────
        print("\n=== Seeding Staff Users ===")
        user_map: dict[str, User] = {}
        for u in SEED_USERS:
            result = await db.execute(
                select(User).where(User.username == u["username"])
            )
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
                existing.phone = u["phone"]
                existing.full_name = u.get("full_name")
                existing.hashed_password = hash_password(u["password"])
                existing.role = u["role"]
                existing.is_active = True
                print(f"  = {u['username']} (updated)")
            user_map[u["username"]] = existing

        # ── 2. Drivers + vehicles ──────────────────────────────────────
        print("\n=== Seeding Drivers & Vehicles ===")
        driver_map: dict[str, User] = {}
        vehicle_map: dict[str, Vehicle] = {}

        for plate, info in DRIVER_VEHICLES.items():
            uname = _name_to_username(info["full_name"])
            result = await db.execute(select(User).where(User.username == uname))
            drv = result.scalars().first()
            if drv is None:
                drv = User(
                    phone=info["phone"],
                    username=uname,
                    hashed_password=hash_password("admin123"),
                    role="driver",
                    is_active=True,
                    full_name=info["full_name"],
                )
                db.add(drv)
                await db.flush()
                print(f"  + driver: {info['full_name']} → {uname} ({plate})")
            else:
                drv.phone = info["phone"]
                drv.full_name = info["full_name"]
                drv.is_active = True
                print(f"  = driver: {uname} ({plate}) — updated")
            driver_map[plate] = drv

        for ed in EXTRA_DRIVERS:
            result = await db.execute(
                select(User).where(User.username == ed["username"])
            )
            drv = result.scalars().first()
            if drv is None:
                drv = User(
                    phone=ed["phone"],
                    username=ed["username"],
                    hashed_password=hash_password("admin123"),
                    role="driver",
                    is_active=True,
                    full_name=ed["full_name"],
                )
                db.add(drv)
                await db.flush()
                print(f"  + driver: {ed['full_name']} → {ed['username']}")
            else:
                drv.phone = ed["phone"]
                drv.full_name = ed["full_name"]
                drv.is_active = True
                print(f"  = driver: {ed['username']} — updated")
            driver_map[ed["username"]] = drv

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

        # ── 3. VehicleDrivers ──────────────────────────────────────────
        print("\n=== Creating VehicleDriver records ===")
        await db.execute(delete(VehicleDriver))
        await db.flush()
        vd_count = 0

        for plate, info in DRIVER_VEHICLES.items():
            primary_drv = driver_map[plate]
            veh = vehicle_map[plate]
            db.add(
                VehicleDriver(
                    vehicle_id=veh.id,
                    driver_id=primary_drv.id,
                    effective_from=date(2026, 1, 1),
                    is_active=True,
                )
            )
            vd_count += 1
            if info.get("secondary"):
                sec_drv = driver_map[info["secondary"]]
                db.add(
                    VehicleDriver(
                        vehicle_id=veh.id,
                        driver_id=sec_drv.id,
                        effective_from=date(2026, 3, 1),
                        is_active=True,
                    )
                )
                vd_count += 1
                print(f"  + SECONDARY: {sec_drv.full_name} → {plate}")

        for ed in EXTRA_DRIVERS:
            veh = vehicle_map[ed["plate"]]
            drv = driver_map[ed["username"]]
            db.add(
                VehicleDriver(
                    vehicle_id=veh.id,
                    driver_id=drv.id,
                    effective_from=date(2026, 2, 1),
                    is_active=True,
                )
            )
            vd_count += 1
            print(f"  + SECONDARY: {drv.full_name} ({ed['username']}) → {ed['plate']}")

        await db.flush()
        print(f"  Created {vd_count} vehicle-driver links")
        await db.commit()

        # ── 4. Locations ────────────────────────────────────────────────
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

        # ── 5. Clients & Vendors ─────────────────────────────────────────
        print("\n=== Seeding Clients ===")
        org_map: dict[str, Client | Vendor] = {}
        for p in SEED_CLIENTS:
            result = await db.execute(select(Client).where(Client.code == p["code"]))
            client = result.scalars().first()
            if client is None:
                client = Client(
                    code=p["code"],
                    name=p["name"],
                    phone=p["phone"],
                    tax_code=p.get("tax_code"),
                    address=p.get("address"),
                    contact_person=p.get("contact_person"),
                    is_active=True,
                )
                db.add(client)
                await db.flush()
                print(f"  + {p['code']} (client) — {p['name']}")
            org_map[p["code"]] = client

        print("\n=== Seeding Vendors ===")
        for p in SEED_VENDORS:
            result = await db.execute(select(Vendor).where(Vendor.code == p["code"]))
            vendor = result.scalars().first()
            if vendor is None:
                vendor = Vendor(
                    code=p["code"],
                    name=p["name"],
                    phone=p["phone"],
                    tax_code=p.get("tax_code"),
                    address=p.get("address"),
                    contact_person=p.get("contact_person"),
                    is_active=True,
                )
                db.add(vendor)
                await db.flush()
                print(f"  + {p['code']} (vendor) — {p['name']}")
            org_map[p["code"]] = vendor
        await db.commit()

        # ── 6. Settings ────────────────────────────────────────────────
        print("\n=== Seeding Settings ===")
        for key, value in {"salary_from_day": "21", "salary_to_day": "20"}.items():
            result = await db.execute(select(Setting).where(Setting.key == key))
            if result.scalars().first() is None:
                db.add(Setting(key=key, value=value))
                print(f"  + {key}={value}")
        await db.commit()

        # ── 7. RoutePricings (flat per-lane with driver salary) ──────────
        print("\n=== Seeding RoutePricings ===")
        rp_count = 0
        for work_type in ["CHUYỂN BÃI", "XUẤT/NHẬP TÀU"]:
            for client_code, routes in ALL_PRICING.items():
                client = org_map[client_code]
                for (pickup_name, dropoff_name), prices in routes.items():
                    pickup_loc = loc_map.get(pickup_name)
                    dropoff_loc = loc_map.get(dropoff_name)
                    if not pickup_loc or not dropoff_loc:
                        continue
                    unit = prices["unit_price"]
                    drv_sal = prices["driver_salary"]
                    db.add(
                        RoutePricing(
                            client_id=client.id,
                            pickup_location_id=pickup_loc.id,
                            dropoff_location_id=dropoff_loc.id,
                            work_type=work_type,
                            f20_price=unit,
                            f40_price=int(unit * 1.4),
                            e20_price=int(unit * 0.6),
                            e40_price=int(unit * 0.85),
                            f20_driver_salary=drv_sal,
                            f40_driver_salary=int(drv_sal * 1.3),
                            e20_driver_salary=int(drv_sal * 0.7),
                            e40_driver_salary=int(drv_sal * 0.9),
                            is_active=True,
                        )
                    )
                    rp_count += 1
        await db.flush()
        print(f"  Created {rp_count} route pricing records")
        await db.commit()

        # ── 8. DeliveredTrips + BookedTrips ───────────────────────────────
        print("\n=== Creating DeliveredTrips + BookedTrips ===")
        ketoan = user_map["ketoan"]
        all_wos: list[DeliveredTrip] = []
        all_tos: list[BookedTrip] = []
        wo_code_idx = 1001
        to_code_idx = 2001
        plates_list = sorted(DRIVER_VEHICLES.keys())
        skipped = 0

        for trip in trips:
            pickup = trip["pickup"]
            dropoff = trip["dropoff"]
            plate = trip["plate"]
            client_code = trip.get("client_code", "HAIAN")

            if pickup not in loc_map or dropoff not in loc_map:
                skipped += 1
                continue

            client = org_map[client_code]
            client_pricing = ALL_PRICING.get(client_code, {})
            prices = client_pricing.get((pickup, dropoff))
            if not prices:
                prices = ALL_PRICING["HAIAN"].get((pickup, dropoff), {})
            trip_date = (
                date.fromisoformat(trip["trip_date"])
                if trip["trip_date"]
                else date(2026, 4, 1)
            )

            drv_plate = plate if plate in driver_map else rng.choice(plates_list)
            drv = driver_map.get(drv_plate)
            if drv is None:
                drv = driver_map[rng.choice(plates_list)]

            wo = DeliveredTrip(
                client_id=client.id,
                pickup_location_id=loc_map[pickup].id,
                dropoff_location_id=loc_map[dropoff].id,
                driver_id=drv.id,
                vehicle_plate=plate,
                vessel=trip.get("vessel", ""),
                work_type="CHUYỂN BÃI",
                cont_number=trip["container"],
                cont_type=f"F{trip['size']}",
                revenue=trip["unit_price"],
                driver_salary=prices.get("driver_salary", 150000),
                trip_date=trip_date,
            )
            db.add(wo)
            all_wos.append(wo)
            wo_code_idx += 1

            to = BookedTrip(
                trip_date=trip_date,
                client_id=client.id,
                pickup_location_id=loc_map[pickup].id,
                dropoff_location_id=loc_map[dropoff].id,
                vessel=trip.get("vessel", ""),
                work_type="CHUYỂN BÃI",
                cont_number=trip["container"],
                cont_type=f"F{trip['size']}",
            )
            db.add(to)
            all_tos.append(to)
            to_code_idx += 1

        await db.flush()
        if skipped:
            print(f"  Skipped {skipped} trips (missing locations)")
        print(f"  Created {len(all_wos)} work orders + {len(all_tos)} trip orders")

        # ── 8b. PENDING trip orders (unmatched, for dashboard "Chờ phân bổ") ──
        print("\n=== Creating PENDING trip orders ===")
        pending_count = 0
        for year, month in MONTHS:
            n_pending = rng.randint(8, 18)
            import calendar

            days_in_month = calendar.monthrange(year, month)[1]
            for _ in range(n_pending):
                pickup, dropoff = rng.choice(ROUTES)
                size = rng.choices([20, 40], weights=[75, 25])[0]
                client_code = rng.choices(CLIENT_KEYS, weights=CLIENT_W)[0]
                client = org_map[client_code]
                trip_date = date(year, month, rng.randint(1, days_in_month))

                to = BookedTrip(
                    trip_date=trip_date,
                    client_id=client.id,
                    pickup_location_id=loc_map[pickup].id,
                    dropoff_location_id=loc_map[dropoff].id,
                    vessel=rng.choice(VESSELS),
                    work_type="CHUYỂN BÃI",
                    cont_number=_rand_container(),
                    cont_type=f"F{size}",
                )
                db.add(to)
                to_code_idx += 1
                pending_count += 1
        await db.flush()
        print(f"  Created {pending_count} PENDING trip orders")

        # ── 9. Vehicle Expenses (all 4 months) ─────────────────────────
        print("\n=== Seeding Vehicle Expenses (Feb–May) ===")
        expense_count = 0
        for year, month in MONTHS:
            for plate, veh in vehicle_map.items():
                fuel = rng.randint(3500000, 5000000)
                db.add(
                    VehicleExpense(
                        vehicle_id=veh.id,
                        category="XANG_DAU",
                        amount=fuel,
                        expense_date=date(year, month, rng.randint(1, 28)),
                        description=f"Xăng dầu T{month}/{year}",
                        created_by=ketoan.id,
                    )
                )
                expense_count += 1

                if rng.random() < 0.25:
                    repair = rng.randint(500000, 2500000)
                    db.add(
                        VehicleExpense(
                            vehicle_id=veh.id,
                            category="SUA_CHUA",
                            amount=repair,
                            expense_date=date(year, month, rng.randint(1, 28)),
                            description=rng.choice(
                                [
                                    "Thay lốp xe",
                                    "Sửa chữa phanh",
                                    "Thay nhớt + lọc gió",
                                    "Sửa chữa gầm xe",
                                    "Thay ắc quy",
                                    "Cán chỉnh lốp",
                                ]
                            ),
                            created_by=ketoan.id,
                        )
                    )
                    expense_count += 1

                if rng.random() < 0.3:
                    law = rng.randint(300000, 1500000)
                    db.add(
                        VehicleExpense(
                            vehicle_id=veh.id,
                            category="TIEN_LUAT",
                            amount=law,
                            expense_date=date(year, month, rng.randint(1, 28)),
                            description=rng.choice(TIEN_LUAT_DESCRIPTIONS)
                            + f" T{month}/{year}",
                            created_by=ketoan.id,
                        )
                    )
                    expense_count += 1

        await db.flush()
        print(f"  Created {expense_count} vehicle expense records")
        await db.commit()

        # ── 10. Driver Salary Configs ──────────────────────────────────
        print("\n=== Seeding Driver Salary Configs ===")
        salary_count = 0
        for plate, info in DRIVER_VEHICLES.items():
            drv = driver_map[plate]
            base = info.get("base_salary", 5000000)
            db.add(
                DriverSalaryConfig(
                    driver_id=drv.id,
                    base_salary=base,
                    effective_from=date(2026, 1, 1),
                    note=f"Lương cơ bản {base // 1000000}TR/tháng",
                    created_by=ketoan.id,
                )
            )
            salary_count += 1

        for ed in EXTRA_DRIVERS:
            drv = driver_map[ed["username"]]
            base = ed.get("base_salary", 4500000)
            db.add(
                DriverSalaryConfig(
                    driver_id=drv.id,
                    base_salary=base,
                    effective_from=date(2026, 1, 1),
                    note=f"Lương cơ bản {base // 1000000}TR/tháng",
                    created_by=ketoan.id,
                )
            )
            salary_count += 1

        await db.flush()
        print(f"  Created {salary_count} driver salary config records")
        await db.commit()

        # ── 11. OCR Requests ───────────────────────────────────────────
        print("\n=== Seeding OCR Requests ===")
        from datetime import datetime, timedelta, timezone

        ocr_count = 0
        now = datetime.now(timezone.utc)
        for days_ago in range(35):
            day_date = now - timedelta(days=days_ago)
            n_reqs = rng.randint(15, 35)
            for _ in range(n_reqs):
                provider = rng.choices(["openrouter", "gemini"], weights=[85, 15])[0]
                model = (
                    "qwen/qwen3-vl-32b-instruct" if provider == "openrouter" else "gemini-1.5-flash"
                )
                success = rng.random() < 0.94
                container_numbers_found = rng.choice([1, 2]) if success else 0
                latency = (
                    rng.randint(300, 1500)
                    if provider == "openrouter"
                    else rng.randint(800, 2500)
                )
                error = (
                    None
                    if success
                    else rng.choice(
                        ["No container number detected", "Timeout", "Vision API error"]
                    )
                )
                drv = rng.choice(list(driver_map.values()))

                req = OcrRequest(
                    created_at=day_date
                    - timedelta(hours=rng.randint(0, 23), minutes=rng.randint(0, 59)),
                    provider=provider,
                    model=model,
                    success=success,
                    container_numbers_found=container_numbers_found,
                    latency_ms=latency,
                    error=error,
                    user_id=drv.id,
                )
                db.add(req)
                ocr_count += 1
        await db.flush()
        print(f"  Created {ocr_count} OCR request records")
        await db.commit()

        # ── Summary ─────────────────────────────────────────────────────
        print("\n" + "=" * 60)
        print("SEED COMPLETE — Realistic P&L data (Feb–May 2026)")
        print("=" * 60)
        for t in [
            "users",
            "vehicles",
            "vehicle_drivers",
            "locations",
            "clients",
            "vendors",
            "settings",
            "route_pricings",
            "delivered_trips",
            "booked_trips",
            "vehicle_expenses",
            "driver_salary_configs",
            "ocr_requests",
        ]:
            cnt = (await db.execute(text(f"SELECT count(*) FROM {t}"))).scalar()
            print(f"  {t:30s} {cnt:>5d} rows")

        trip_date_counts: dict[str, int] = {}
        for trip in trips:
            ym = trip["trip_date"][:7]
            trip_date_counts[ym] = trip_date_counts.get(ym, 0) + 1
        print("\nTrips by month:")
        for ym in sorted(trip_date_counts):
            avg = trip_date_counts[ym] // len(DRIVER_VEHICLES)
            print(f"  {ym}: {trip_date_counts[ym]} trips (~{avg}/vehicle)")

        client_counts: dict[str, int] = {}
        for trip in trips:
            cc = trip.get("client_code", "HAIAN")
            client_counts[cc] = client_counts.get(cc, 0) + 1
        print("\nTrips by client:")
        for cc in sorted(client_counts):
            print(
                f"  {cc}: {client_counts[cc]} trips ({client_counts[cc] * 100 // len(trips)}%)"
            )

        print("\nLogin credentials:")
        print("  admin    / admin123  (superadmin)")
        print("  giamdoc  / admin123  (director)")
        print("  ketoan   / admin123  (accountant)")
        print("  taixe    / admin123  (driver)")
        print("  laixe    / admin123  (driver)")
        print("\nDriver usernames (name → username):")
        for plate, info in DRIVER_VEHICLES.items():
            uname = _name_to_username(info["full_name"])
            sec = " +2nd" if info.get("secondary") else ""
            print(
                f"  {info['full_name']:25s} → {uname:10s} ({info.get('base_salary', 5000000) // 1000000}TR{sec})"
            )
        for ed in EXTRA_DRIVERS:
            print(f"  {ed['full_name']:25s} → {ed['username']}")


if __name__ == "__main__":
    asyncio.run(seed_dev())
