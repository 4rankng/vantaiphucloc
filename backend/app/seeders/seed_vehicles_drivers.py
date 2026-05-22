import unicodedata
from datetime import date
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import User
from app.models.domain import DriverSalaryConfig, Vehicle, VehicleDriver
from app.core.security import hash_password

DRIVER_VEHICLES = {
    "15C09877": {"full_name": "Nguyễn Văn Tám", "phone": "0901001001", "secondary": None, "base_salary": 5000000},
    "15C15033": {"full_name": "Trần Minh Đức", "phone": "0902002002", "secondary": "15H07788", "base_salary": 5500000},
    "15C17301": {"full_name": "Lê Quang Anh", "phone": "0903003003", "secondary": None, "base_salary": 4500000},
    "15C17442": {"full_name": "Phạm Văn Hùng", "phone": "0904004004", "secondary": "15H07644", "base_salary": 5500000},
    "15C30649": {"full_name": "Hoàng Đức Thắng", "phone": "0905005005", "secondary": None, "base_salary": 5000000},
    "15H06892": {"full_name": "Vũ Đình Nam", "phone": "0906006006", "secondary": None, "base_salary": 4500000},
    "15H07135": {"full_name": "Đỗ Quang Hải", "phone": "0907007007", "secondary": None, "base_salary": 5000000},
    "15H07524": {"full_name": "Bùi Thanh Sơn", "phone": "0908008008", "secondary": "15H08574", "base_salary": 5500000},
    "15H07644": {"full_name": "Ngô Minh Tuấn", "phone": "0909009009", "secondary": None, "base_salary": 4500000},
    "15H07788": {"full_name": "Dương Văn Thành", "phone": "0910101001", "secondary": None, "base_salary": 5000000},
    "15H08574": {"full_name": "Lý Hoàng Long", "phone": "0911111002", "secondary": None, "base_salary": 4500000},
    "15H12925": {"full_name": "Trịnh Đức Minh", "phone": "0912122003", "secondary": None, "base_salary": 5000000},
    "15H15378": {"full_name": "Cao Văn Lượng", "phone": "0913133004", "secondary": None, "base_salary": 5000000},
    "15H17403": {"full_name": "Đinh Công Phú", "phone": "0914144005", "secondary": None, "base_salary": 4500000},
    "15H17712": {"full_name": "Mai Văn Bình", "phone": "0915155006", "secondary": None, "base_salary": 5000000},
    "15H18552": {"full_name": "Tạ Quang Vinh", "phone": "0916166007", "secondary": None, "base_salary": 5000000},
    "15H18753": {"full_name": "Chu Đức Anh", "phone": "0917177008", "secondary": None, "base_salary": 5500000},
    "15H20645": {"full_name": "Lâm Thanh Tùng", "phone": "0918188009", "secondary": None, "base_salary": 5000000},
}

EXTRA_DRIVERS = [
    {"username": "taixe", "full_name": "Phùng Tài Xế", "phone": "0920002001", "plate": "15C09877", "base_salary": 4500000},
    {"username": "laixe", "full_name": "Trần Lái Xe", "phone": "0920002002", "plate": "15C15033", "base_salary": 4500000},
]


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


async def seed_vehicles_drivers(
    db: AsyncSession,
    ketoan: User,
) -> tuple[dict[str, User], dict[str, Vehicle]]:
    print("\n=== Seeding Drivers & Vehicles ===")
    driver_map: dict[str, User] = {}
    vehicle_map: dict[str, Vehicle] = {}

    for plate, info in DRIVER_VEHICLES.items():
        uname = _name_to_username(info["full_name"])
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
            print(f"  + driver: {info['full_name']} → {uname} ({plate})")
        else:
            drv.phone = info["phone"]
            drv.full_name = info["full_name"]
            drv.is_active = True
            print(f"  = driver: {uname} ({plate}) — updated")
        driver_map[plate] = drv

    for ed in EXTRA_DRIVERS:
        result = await db.execute(select(User).where(User.username == ed["username"]))
        drv = result.scalars().first()
        if drv is None:
            drv = User(
                phone=ed["phone"], username=ed["username"],
                hashed_password=hash_password("admin123"),
                role="driver", is_active=True, full_name=ed["full_name"],
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

    print("\n=== Creating VehicleDriver records ===")
    await db.execute(delete(VehicleDriver))
    await db.flush()
    vd_count = 0

    for plate, info in DRIVER_VEHICLES.items():
        primary_drv = driver_map[plate]
        veh = vehicle_map[plate]
        db.add(VehicleDriver(
            vehicle_id=veh.id, driver_id=primary_drv.id,
            effective_from=date(2026, 1, 1), is_active=True,
        ))
        vd_count += 1
        if info.get("secondary"):
            sec_drv = driver_map[info["secondary"]]
            db.add(VehicleDriver(
                vehicle_id=veh.id, driver_id=sec_drv.id,
                effective_from=date(2026, 3, 1), is_active=True,
            ))
            vd_count += 1
            print(f"  + SECONDARY: {sec_drv.full_name} → {plate}")

    for ed in EXTRA_DRIVERS:
        veh = vehicle_map[ed["plate"]]
        drv = driver_map[ed["username"]]
        db.add(VehicleDriver(
            vehicle_id=veh.id, driver_id=drv.id,
            effective_from=date(2026, 2, 1), is_active=True,
        ))
        vd_count += 1
        print(f"  + SECONDARY: {drv.full_name} ({ed['username']}) → {ed['plate']}")

    await db.flush()
    print(f"  Created {vd_count} vehicle-driver links")
    await db.commit()

    print("\n=== Seeding Driver Salary Configs ===")
    salary_count = 0
    for plate, info in DRIVER_VEHICLES.items():
        drv = driver_map[plate]
        base = info.get("base_salary", 5000000)
        db.add(DriverSalaryConfig(
            driver_id=drv.id,
            base_salary=base,
            effective_from=date(2026, 1, 1),
            note=f"Lương cơ bản {base // 1000000}TR/tháng",
            created_by=ketoan.id,
        ))
        salary_count += 1

    for ed in EXTRA_DRIVERS:
        drv = driver_map[ed["username"]]
        base = ed.get("base_salary", 4500000)
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

    return driver_map, vehicle_map
