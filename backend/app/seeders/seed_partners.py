from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Client, Location, Pricing, PricingLine, Setting, Vendor

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
    },
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


async def seed_partners(
    db: AsyncSession,
    loc_map: dict[str, Location],
) -> tuple[dict[str, Client | Vendor], dict[tuple, Pricing]]:
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

    print("\n=== Seeding Settings ===")
    for key, value in {"salary_from_day": "21", "salary_to_day": "20"}.items():
        result = await db.execute(select(Setting).where(Setting.key == key))
        if result.scalars().first() is None:
            db.add(Setting(key=key, value=value))
            print(f"  + {key}={value}")
    await db.commit()

    print("\n=== Seeding Pricings ===")
    pricing_map: dict[tuple, Pricing] = {}
    for client_code, routes in ALL_PRICING.items():
        client = org_map[client_code]
        for (pickup_name, dropoff_name, work_type), prices in routes.items():
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
                    client_id=client.id,
                    work_type=work_type,
                    pickup_location_id=pickup_loc.id,
                    dropoff_location_id=dropoff_loc.id,
                    is_active=True,
                )
                db.add(pricing)
                await db.flush()
                db.add(
                    PricingLine(
                        pricing_id=pricing.id,
                        quantity=1,
                        unit_price=prices["unit_price"],
                        driver_salary=prices["driver_salary"],
                        allowance=prices["allowance"],
                    )
                )
                await db.flush()
                print(
                    f"  + {client_code}: {pickup_name}→{dropoff_name} {work_type}: {prices['unit_price']:,}"
                )
            pricing_map[(client_code, pickup_name, dropoff_name, work_type)] = pricing
    await db.commit()

    return org_map, pricing_map
