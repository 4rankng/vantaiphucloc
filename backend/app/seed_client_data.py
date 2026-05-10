"""Backfill client records with realistic SĐT, MST, Địa chỉ, Người liên hệ.

All existing clients with empty/null phone, tax_code, or address get updated.

Usage:
    python -m app.seed_client_data
"""

import asyncio

from sqlalchemy import select, update

from app.database import async_session
from app.models.domain import Client

CLIENT_DATA: list[dict] = [
    {
        "name_contains": "HAP",
        "phone": "02838256677",
        "tax_code": "0304749215",
        "address": "Số 6, Đường số 3, KCN Hiệp Phước, H. Nhà Bè, TP.HCM",
        "contact_person": "Nguyễn Thị Hồng",
    },
    {
        "name_contains": "PAN HẢI AN",
        "phone": "02838221188",
        "tax_code": "0302784512",
        "address": "Lô B, KCN Hiệp Phước, X. Hiệp Phước, H. Nhà Bè, TP.HCM",
        "contact_person": "Trần Văn Hải",
    },
    {
        "name_contains": "CÁI MÉP",
        "phone": "02543825555",
        "tax_code": "3700892341",
        "address": "KCN Cái Mép, X. Tân Hòa, H. Tân Thành, BR-VT",
        "contact_person": "Phạm Minh Tuấn",
    },
    {
        "name_contains": "GẦM VỊNH",
        "phone": "02543826789",
        "tax_code": "3700765128",
        "address": "Khu cảng Gầm Vĩnh, P. Phước Nguyên, TP. Vũng Tàu",
        "contact_person": "Lê Thanh Bình",
    },
    {
        "name_contains": "TANDA",
        "phone": "02839756888",
        "tax_code": "0313425678",
        "address": "282 Nguyễn Văn Linh, Q. 7, TP.HCM",
        "contact_person": "Võ Đình An",
    },
    {
        "name_contains": "SITV",
        "phone": "02543891234",
        "tax_code": "3700934567",
        "address": "Khu cảngSTS, P. Rạch Dừa, TP. Vũng Tàu",
        "contact_person": "Ngô Quang Vinh",
    },
    {
        "name_contains": "VISSAI",
        "phone": "02253825678",
        "tax_code": "2001087654",
        "address": "KCN Đình Vũ, P. Cát Hải, Q. Hải An, HP",
        "contact_person": "Đỗ Trọng Khánh",
    },
    {
        "name_contains": "VINAMARINE",
        "phone": "02438256789",
        "tax_code": "0109876543",
        "address": "18 Ngô Quyền, Q. Hoàn Kiếm, Hà Nội",
        "contact_person": "Bùi Thị Mai",
    },
    {
        "name_contains": "HOÀNG GIA",
        "phone": "02838761234",
        "tax_code": "0306781234",
        "address": "123 Nguyễn Cửu Phú, Q. Bình Tân, TP.HCM",
        "contact_person": "Lý Hoàng Gia",
    },
    {
        "name_contains": "LOGIFAR",
        "phone": "02837245678",
        "tax_code": "0311987654",
        "address": "Số 8, Đường số 12, KCN Tân Tập, Cần Giuộc, Long An",
        "contact_person": "Huỳnh Văn Lợi",
    },
]

DEFAULT_DATA = {
    "phone": "02800000000",
    "tax_code": "0300000000",
    "address": "TP.HCM",
    "contact_person": None,
}


async def seed_client_data() -> None:
    async with async_session() as db:
        result = await db.execute(
            select(Client).where(Client.is_active == True)  # noqa: E712
        )
        clients = result.scalars().all()

        if not clients:
            print("No active clients found.")
            return

        updated = 0
        for client in clients:
            match = next(
                (d for d in CLIENT_DATA if d["name_contains"].upper() in client.name.upper()),
                None,
            )
            data = match or DEFAULT_DATA

            changes: dict = {}
            if not client.phone or client.phone.strip() in ("", "—", "-"):
                changes["phone"] = data["phone"]
            if not client.tax_code or client.tax_code.strip() in ("", "—", "-"):
                changes["tax_code"] = data["tax_code"]
            if not client.address or client.address.strip() in ("", "—", "-"):
                changes["address"] = data["address"]
            if not client.contact_person or client.contact_person.strip() in ("", "—", "-"):
                changes["contact_person"] = data["contact_person"]

            if changes:
                for k, v in changes.items():
                    setattr(client, k, v)
                updated += 1
                print(f"  Updated {client.name}: {list(changes.keys())}")
            else:
                print(f"  OK {client.name}")

        await db.commit()
        print(f"\nUpdated {updated}/{len(clients)} clients.")


if __name__ == "__main__":
    asyncio.run(seed_client_data())
