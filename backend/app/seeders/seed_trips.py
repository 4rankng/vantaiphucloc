import calendar
import json
from datetime import date
from pathlib import Path
from random import Random

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import User
from app.models.domain import (
    BookedTrip,
    Client,
    DeliveredTrip,
    Location,
    Pricing,
    Vehicle,
    VehicleExpense,
    Vendor,
)

_REAL_DATA_PATH = (
    Path(__file__).resolve().parent.parent.parent.parent
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

TIEN_LUAT_DESCRIPTIONS = [
    "Phí đường bộ",
    "Tiền luật giao thông",
    "Phí cầu đường",
    "Phí trọng lượng",
]

_ALL_PRICING_HAIAN = {
    ("NHĐV", "HẢI AN", "F20"): {
        "unit_price": 386100,
        "driver_salary": 150000,
        "allowance": 50000,
    },
    ("NHĐV", "HẢI AN", "F40"): {
        "unit_price": 448500,
        "driver_salary": 180000,
        "allowance": 70000,
    },
    ("HẢI AN", "NHĐV", "F20"): {
        "unit_price": 386100,
        "driver_salary": 150000,
        "allowance": 50000,
    },
    ("HẢI AN", "NHĐV", "F40"): {
        "unit_price": 448500,
        "driver_salary": 180000,
        "allowance": 70000,
    },
    ("NHĐV", "VIP GREEN", "F20"): {
        "unit_price": 400000,
        "driver_salary": 155000,
        "allowance": 50000,
    },
    ("NHĐV", "VIP GREEN", "F40"): {
        "unit_price": 465000,
        "driver_salary": 185000,
        "allowance": 70000,
    },
    ("VIP GREEN", "NHĐV", "F20"): {
        "unit_price": 400000,
        "driver_salary": 155000,
        "allowance": 50000,
    },
    ("VIP GREEN", "NHĐV", "F40"): {
        "unit_price": 465000,
        "driver_salary": 185000,
        "allowance": 70000,
    },
    ("HẢI AN", "GREEN PORT", "F20"): {
        "unit_price": 420000,
        "driver_salary": 160000,
        "allowance": 55000,
    },
    ("HẢI AN", "GREEN PORT", "F40"): {
        "unit_price": 490000,
        "driver_salary": 190000,
        "allowance": 75000,
    },
    ("GREEN PORT", "HẢI AN", "F20"): {
        "unit_price": 420000,
        "driver_salary": 160000,
        "allowance": 55000,
    },
    ("GREEN PORT", "HẢI AN", "F40"): {
        "unit_price": 490000,
        "driver_salary": 190000,
        "allowance": 75000,
    },
    ("NHĐV", "ĐÌNH VŨ", "F20"): {
        "unit_price": 370000,
        "driver_salary": 145000,
        "allowance": 45000,
    },
    ("NHĐV", "ĐÌNH VŨ", "F40"): {
        "unit_price": 430000,
        "driver_salary": 175000,
        "allowance": 65000,
    },
    ("ĐÌNH VŨ", "NHĐV", "F20"): {
        "unit_price": 370000,
        "driver_salary": 145000,
        "allowance": 45000,
    },
    ("ĐÌNH VŨ", "NHĐV", "F40"): {
        "unit_price": 430000,
        "driver_salary": 175000,
        "allowance": 65000,
    },
    ("HẢI AN", "CHU VĂN AN", "F20"): {
        "unit_price": 395000,
        "driver_salary": 152000,
        "allowance": 48000,
    },
    ("HẢI AN", "CHU VĂN AN", "F40"): {
        "unit_price": 458000,
        "driver_salary": 182000,
        "allowance": 68000,
    },
    ("CHU VĂN AN", "HẢI AN", "F20"): {
        "unit_price": 395000,
        "driver_salary": 152000,
        "allowance": 48000,
    },
    ("CHU VĂN AN", "HẢI AN", "F40"): {
        "unit_price": 458000,
        "driver_salary": 182000,
        "allowance": 68000,
    },
    ("NHĐV", "NAM ĐỊNH VỤ", "F20"): {
        "unit_price": 375000,
        "driver_salary": 148000,
        "allowance": 46000,
    },
    ("NHĐV", "NAM ĐỊNH VỤ", "F40"): {
        "unit_price": 435000,
        "driver_salary": 178000,
        "allowance": 66000,
    },
    ("NAM ĐỊNH VỤ", "NHĐV", "F20"): {
        "unit_price": 375000,
        "driver_salary": 148000,
        "allowance": 46000,
    },
    ("NAM ĐỊNH VỤ", "NHĐV", "F40"): {
        "unit_price": 435000,
        "driver_salary": 178000,
        "allowance": 66000,
    },
}

_ALL_PRICING_BY_CLIENT = {
    "HAIAN": _ALL_PRICING_HAIAN,
    "GLORY": {
        ("NHĐV", "HẢI AN", "F20"): {
            "unit_price": 410000,
            "driver_salary": 155000,
            "allowance": 52000,
        },
        ("NHĐV", "HẢI AN", "F40"): {
            "unit_price": 475000,
            "driver_salary": 185000,
            "allowance": 72000,
        },
        ("HẢI AN", "NHĐV", "F20"): {
            "unit_price": 410000,
            "driver_salary": 155000,
            "allowance": 52000,
        },
        ("HẢI AN", "NHĐV", "F40"): {
            "unit_price": 475000,
            "driver_salary": 185000,
            "allowance": 72000,
        },
        ("NHĐV", "VIP GREEN", "F20"): {
            "unit_price": 425000,
            "driver_salary": 160000,
            "allowance": 52000,
        },
        ("NHĐV", "VIP GREEN", "F40"): {
            "unit_price": 495000,
            "driver_salary": 190000,
            "allowance": 72000,
        },
        ("VIP GREEN", "NHĐV", "F20"): {
            "unit_price": 425000,
            "driver_salary": 160000,
            "allowance": 52000,
        },
        ("VIP GREEN", "NHĐV", "F40"): {
            "unit_price": 495000,
            "driver_salary": 190000,
            "allowance": 72000,
        },
        ("HẢI AN", "GREEN PORT", "F20"): {
            "unit_price": 445000,
            "driver_salary": 165000,
            "allowance": 57000,
        },
        ("HẢI AN", "GREEN PORT", "F40"): {
            "unit_price": 518000,
            "driver_salary": 195000,
            "allowance": 77000,
        },
        ("NHĐV", "ĐÌNH VŨ", "F20"): {
            "unit_price": 395000,
            "driver_salary": 150000,
            "allowance": 47000,
        },
        ("NHĐV", "ĐÌNH VŨ", "F40"): {
            "unit_price": 458000,
            "driver_salary": 180000,
            "allowance": 67000,
        },
        ("HẢI AN", "CHU VĂN AN", "F20"): {
            "unit_price": 420000,
            "driver_salary": 157000,
            "allowance": 50000,
        },
        ("HẢI AN", "CHU VĂN AN", "F40"): {
            "unit_price": 485000,
            "driver_salary": 187000,
            "allowance": 70000,
        },
    },
    "CONSCIENCE": {
        ("NHĐV", "HẢI AN", "F20"): {
            "unit_price": 395000,
            "driver_salary": 152000,
            "allowance": 48000,
        },
        ("NHĐV", "HẢI AN", "F40"): {
            "unit_price": 458000,
            "driver_salary": 182000,
            "allowance": 68000,
        },
        ("HẢI AN", "NHĐV", "F20"): {
            "unit_price": 395000,
            "driver_salary": 152000,
            "allowance": 48000,
        },
        ("HẢI AN", "NHĐV", "F40"): {
            "unit_price": 458000,
            "driver_salary": 182000,
            "allowance": 68000,
        },
        ("NHĐV", "VIP GREEN", "F20"): {
            "unit_price": 410000,
            "driver_salary": 157000,
            "allowance": 48000,
        },
        ("NHĐV", "VIP GREEN", "F40"): {
            "unit_price": 478000,
            "driver_salary": 187000,
            "allowance": 68000,
        },
        ("HẢI AN", "GREEN PORT", "F20"): {
            "unit_price": 430000,
            "driver_salary": 162000,
            "allowance": 53000,
        },
        ("HẢI AN", "GREEN PORT", "F40"): {
            "unit_price": 500000,
            "driver_salary": 192000,
            "allowance": 73000,
        },
        ("NHĐV", "ĐÌNH VŨ", "F20"): {
            "unit_price": 380000,
            "driver_salary": 147000,
            "allowance": 44000,
        },
        ("NHĐV", "ĐÌNH VŨ", "F40"): {
            "unit_price": 442000,
            "driver_salary": 177000,
            "allowance": 64000,
        },
    },
}


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
        wt = f"F{size}"
        client_code = rng.choices(CLIENT_KEYS, weights=CLIENT_W)[0]
        pricing_for_client = _ALL_PRICING_BY_CLIENT.get(client_code, {})
        prices = pricing_for_client.get((pickup, dropoff, wt))
        if prices:
            unit_price = prices["unit_price"]
        else:
            fallback = _ALL_PRICING_HAIAN.get((pickup, dropoff, wt))
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


def _load_all_trips(plates: list[str]) -> list[dict]:
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

    for year, month in MONTHS:
        synthetic = _generate_trips_for_month(year, month, plates)
        if year == 2026 and month == 4 and real_april:
            all_trips.extend(real_april)
            print(f"  April: {len(real_april)} real + {len(synthetic)} synthetic")
        all_trips.extend(synthetic)
        print(f"  Generated {len(synthetic)} synthetic trips for {year}-{month:02d}")

    all_trips.sort(key=lambda t: t["trip_date"])
    return all_trips


async def seed_trips(
    db: AsyncSession,
    loc_map: dict[str, Location],
    org_map: dict[str, Client | Vendor],
    pricing_map: dict[tuple, Pricing],
    driver_map: dict[str, User],
    vehicle_map: dict[str, Vehicle],
    ketoan: User,
) -> list[dict]:
    plates_list = sorted(vehicle_map.keys())
    trips = _load_all_trips(plates_list)
    print(f"\nTotal trips to seed: {len(trips)}")

    print("\n=== Creating DeliveredTrips + BookedTrips ===")
    all_wos: list[DeliveredTrip] = []
    all_tos: list[BookedTrip] = []
    skipped = 0

    for trip in trips:
        pickup = trip["pickup"]
        dropoff = trip["dropoff"]
        wt = f"F{trip['size']}"
        plate = trip["plate"]
        client_code = trip.get("client_code", "HAIAN")

        if pickup not in loc_map or dropoff not in loc_map:
            skipped += 1
            continue

        client = org_map[client_code]
        client_pricing = _ALL_PRICING_BY_CLIENT.get(client_code, {})
        prices = client_pricing.get((pickup, dropoff, wt))
        if not prices:
            prices = _ALL_PRICING_HAIAN.get((pickup, dropoff, wt), {})
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
            work_type=wt,
            cont_number=trip["container"],
            cont_type=f"F{trip['size']}",
            revenue=trip["unit_price"],
            driver_salary=prices.get("driver_salary", 150000),
            allowance=prices.get("allowance", 50000),
            trip_date=trip_date,
        )
        db.add(wo)
        all_wos.append(wo)

        to = BookedTrip(
            trip_date=trip_date,
            client_id=client.id,
            pickup_location_id=loc_map[pickup].id,
            dropoff_location_id=loc_map[dropoff].id,
            vessel=trip.get("vessel", ""),
            work_type=wt,
            cont_number=trip["container"],
            cont_type=f"F{trip['size']}",
            revenue=trip["unit_price"],
        )
        db.add(to)
        all_tos.append(to)

    await db.flush()
    if skipped:
        print(f"  Skipped {skipped} trips (missing locations)")
    print(f"  Created {len(all_wos)} work orders + {len(all_tos)} trip orders")

    print("\n=== Creating PENDING trip orders ===")
    pending_count = 0
    for year, month in MONTHS:
        n_pending = rng.randint(8, 18)
        days_in_month = calendar.monthrange(year, month)[1]
        for _ in range(n_pending):
            pickup, dropoff = rng.choice(ROUTES)
            size = rng.choices([20, 40], weights=[75, 25])[0]
            wt = f"F{size}"
            client_code = rng.choices(CLIENT_KEYS, weights=CLIENT_W)[0]
            client = org_map[client_code]
            client_pricing = _ALL_PRICING_BY_CLIENT.get(client_code, {})
            prices = client_pricing.get((pickup, dropoff, wt))
            if not prices:
                prices = _ALL_PRICING_HAIAN.get((pickup, dropoff, wt), {})
            unit_price = prices.get("unit_price", 400000) if prices else 400000
            trip_date = date(year, month, rng.randint(1, days_in_month))

            to = BookedTrip(
                trip_date=trip_date,
                client_id=client.id,
                pickup_location_id=loc_map[pickup].id,
                dropoff_location_id=loc_map[dropoff].id,
                vessel=rng.choice(VESSELS),
                work_type=wt,
                cont_number=_rand_container(),
                cont_type=wt,
                revenue=unit_price,
            )
            db.add(to)
            pending_count += 1
    await db.flush()
    print(f"  Created {pending_count} PENDING trip orders")

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

    return trips
