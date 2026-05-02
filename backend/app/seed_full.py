"""Full database seed using raw SQL (matches actual DB schema with company_id).

Usage:
    python -m app.seed_full

All users get password: admin123
"""

import asyncio
from datetime import date, datetime, timezone, timedelta

from sqlalchemy import text
from app.database import async_session
from app.core.security import hash_password

PASSWORD = hash_password("admin123")


async def seed() -> None:
    async with async_session() as db:
        now = datetime.now(timezone.utc)
        today = date.today()

        # ── 1. Company ────────────────────────────────────────────────
        result = await db.execute(text("SELECT id FROM companies LIMIT 1"))
        row = result.first()
        if row:
            company_id = row[0]
            print(f"Company exists: id={company_id}")
        else:
            result = await db.execute(
                text("INSERT INTO companies (name, created_at) VALUES (:name, :now) RETURNING id"),
                {"name": "Phúc Lộc", "now": now},
            )
            company_id = result.scalar()
            print(f"Created company: id={company_id}")

        # ── 2. Users ──────────────────────────────────────────────────
        users_data = [
            ("admin", "0000000000", "Admin", "superadmin", None, None),
            ("ketoan", "01234555555", "Nguyễn Thị Hoa", "accountant", None, None),
            ("giamdoc", "0988777666", "Trần Văn Minh", "director", None, None),
            ("taixe1", "09123344123", "Lê Văn Hùng", "driver", "Phúc Lộc", "60C-123.45"),
            ("taixe2", "09123344124", "Phạm Văn Tài", "driver", "Phúc Lộc", "60C-678.90"),
            ("taixe3", "09123344125", "Ngô Quốc Bình", "driver", "Phúc Lộc", "60C-111.22"),
            ("taixe4", "09123344126", "Đỗ Minh Tuấn", "driver", "Hoàng Mai", "60C-333.44"),
        ]

        user_ids: dict[str, int] = {}
        user_info: dict[str, tuple] = {}  # username -> (full_name, plate)
        for username, phone, full_name, role, vendor, plate in users_data:
            result = await db.execute(text("SELECT id FROM users WHERE username = :u"), {"u": username})
            row = result.first()
            if row:
                user_ids[username] = row[0]
                user_info[username] = (full_name, plate)
                print(f"  User exists: {username} (id={row[0]})")
            else:
                # Check phone uniqueness
                result = await db.execute(text("SELECT id FROM users WHERE phone = :p"), {"p": phone})
                row = result.first()
                if row:
                    user_ids[username] = row[0]
                    user_info[username] = (full_name, plate)
                    # Update existing user to match our seed data
                    await db.execute(
                        text("""UPDATE users SET full_name = :fn, tractor_plate = :tp, vendor = :v, company_id = :cid
                            WHERE id = :id"""),
                        {"fn": full_name, "tp": plate, "v": vendor, "cid": company_id, "id": row[0]},
                    )
                    print(f"  User exists (by phone): {username} (id={row[0]}) — updated info")
                    continue
                result = await db.execute(
                    text("""INSERT INTO users
                        (username, phone, full_name, hashed_password, role, company_id, vendor, tractor_plate, is_active, created_at, updated_at)
                        VALUES (:u, :p, :fn, :pw, :r, :cid, :v, :tp, true, :now, :now)
                        RETURNING id"""),
                    {"u": username, "p": phone, "fn": full_name, "pw": PASSWORD, "r": role,
                     "cid": company_id, "v": vendor, "tp": plate, "now": now},
                )
                user_ids[username] = result.scalar()
                user_info[username] = (full_name, plate)
                print(f"  Created user: {username} ({role}) id={user_ids[username]}")

        driver_usernames = [u[0] for u in users_data if u[3] == "driver"]
        driver_ids = [user_ids[u] for u in driver_usernames]

        # ── 3. Vendors ────────────────────────────────────────────────
        vendors_data = [
            ("Phúc Lộc", "company", "028-9999888", "Bình Dương", "Anh Lộc"),
            ("Hoàng Mai", "company", "028-7777666", "Đồng Nai", "Chị Mai"),
        ]
        for name, vtype, phone, addr, contact in vendors_data:
            result = await db.execute(text("SELECT id FROM vendors WHERE name = :n"), {"n": name})
            if not result.first():
                await db.execute(
                    text("""INSERT INTO vendors (name, type, phone, address, contact_person, is_active, created_at, updated_at)
                        VALUES (:n, :t, :p, :a, :c, true, :now, :now)"""),
                    {"n": name, "t": vtype, "p": phone, "a": addr, "c": contact, "now": now},
                )
                print(f"  Created vendor: {name}")
            else:
                print(f"  Vendor exists: {name}")

        # ── 4. Clients ────────────────────────────────────────────────
        clients_data = [
            ("GCC", "Công ty CP GCC Việt Nam", "company", "028-1234567", "0301234567", "KCN Tân Bình, Q. Tân Bình, TP.HCM", "Anh Minh"),
            ("MAERSK", "Công ty TNHH Maersk Việt Nam", "company", "028-2345678", "0302345678", "479 Nguyễn Thị Định, Q. 2, TP.HCM", "Chị Lan"),
            ("CMA", "CMA CGM Việt Nam", "company", "028-3456789", "0303456789", "123 Nguyễn Hữu Cảnh, Q. Bình Thạnh, TP.HCM", "Anh Tuấn"),
            ("MSC", "MSC Việt Nam", "company", "028-4567890", "0304567890", "KCN Cát Lái, Q. 2, TP.HCM", "Chị Hương"),
            ("HAPAG", "Hapag-Lloyd Việt Nam", "company", "028-5678901", "0305678901", "25 Ngô Đức Kế, Q. 1, TP.HCM", "Anh Đức"),
        ]

        client_ids: list[int] = []
        for code, name, ctype, phone, tax, addr, contact in clients_data:
            result = await db.execute(text("SELECT id FROM clients WHERE code = :c"), {"c": code})
            row = result.first()
            if row:
                client_ids.append(row[0])
                print(f"  Client exists: {code}")
            else:
                result = await db.execute(
                    text("""INSERT INTO clients (company_id, code, name, type, phone, tax_code, address, contact_person, outstanding_debt, is_active, created_at, updated_at)
                        VALUES (:cid, :code, :name, :type, :phone, :tax, :addr, :contact, 0, true, :now, :now)
                        RETURNING id"""),
                    {"cid": company_id, "code": code, "name": name, "type": ctype, "phone": phone,
                     "tax": tax, "addr": addr, "contact": contact, "now": now},
                )
                client_ids.append(result.scalar())
                print(f"  Created client: {code} — {name}")

        # ── 5. Routes ─────────────────────────────────────────────────
        result = await db.execute(text("SELECT count(*) FROM routes"))
        route_count = result.scalar() or 0

        routes_data: list[dict] = []
        if route_count == 0:
            routes_raw = [
                ("Cát Lái → Bình Dương", "ICD Cát Lái", "KCN Mỹ Phước, Bình Dương", 900000, 1200000, False),
                ("Cát Lái → Đồng Nai", "ICD Cát Lái", "KCN Biên Hòa, Đồng Nai", 850000, 1100000, False),
                ("Cát Lái → Long Thành", "ICD Cát Lái", "Sân bay Long Thành", 950000, 1300000, False),
                ("Cát Lái → Q.12", "ICD Cát Lái", "KCN Lê Minh Xuân, Q.12", 750000, 950000, False),
                ("Cát Lái → Tây Ninh", "ICD Cát Lái", "KCN Phước Đông, Tây Ninh", 1400000, 1800000, False),
                ("Bình Dương → Cát Lái", "KCN Mỹ Phước", "ICD Cát Lái", 900000, 1200000, True),
                ("Đồng Nai → Cát Lái", "KCN Biên Hòa", "ICD Cát Lái", 850000, 1100000, True),
            ]
            for r in routes_raw:
                result = await db.execute(
                    text("""INSERT INTO routes (company_id, route, pickup_location, dropoff_location, type_20ft, type_40ft, is_two_way, is_active, created_at, updated_at)
                        VALUES (:cid, :route, :pickup, :dropoff, :t20, :t40, :tw, true, :now, :now)
                        RETURNING id"""),
                    {"cid": company_id, "route": r[0], "pickup": r[1], "dropoff": r[2],
                     "t20": r[3], "t40": r[4], "tw": r[5], "now": now},
                )
                routes_data.append({"id": result.scalar(), "route": r[0], "pickup": r[1],
                                    "dropoff": r[2], "type_20ft": r[3], "type_40ft": r[4]})
            print(f"  Created {len(routes_raw)} routes")
        else:
            result = await db.execute(text("SELECT id, route, pickup_location, dropoff_location, type_20ft, type_40ft FROM routes"))
            for r in result:
                routes_data.append({"id": r[0], "route": r[1], "pickup": r[2],
                                    "dropoff": r[3], "type_20ft": r[4], "type_40ft": r[5]})
            print(f"  Routes: {route_count} already exist")

        # ── 6. Pricings ───────────────────────────────────────────────
        result = await db.execute(text("SELECT count(*) FROM pricings"))
        pricing_count = result.scalar() or 0

        if pricing_count == 0:
            pricing_ids: list[int] = []
            for client_idx, client_id in enumerate(client_ids):
                client_name = clients_data[client_idx][1]
                for route in routes_data[:4]:
                    for wt in ["E20", "E40", "F20", "F40"]:
                        is_20 = wt.endswith("20")
                        is_empty = wt.startswith("E")
                        base = route["type_20ft"] if is_20 else route["type_40ft"]
                        if is_empty:
                            unit_price = base
                            driver_salary = 350000 if is_20 else 400000
                            allowance = 100000
                        else:
                            unit_price = int(base * 0.85)
                            driver_salary = 300000 if is_20 else 350000
                            allowance = 80000

                        result = await db.execute(
                            text("""INSERT INTO pricings (company_id, client_id, client_name, work_type, route,
                                pickup_location, dropoff_location, unit_price, driver_salary, allowance, is_active, created_at, updated_at)
                                VALUES (:cid, :clid, :clname, :wt, :route, :pickup, :dropoff, :up, :ds, :alw, true, :now, :now)
                                RETURNING id"""),
                            {"cid": company_id, "clid": client_id, "clname": client_name, "wt": wt,
                             "route": route["route"], "pickup": route["pickup"], "dropoff": route["dropoff"],
                             "up": unit_price, "ds": driver_salary, "alw": allowance, "now": now},
                        )
                        pricing_ids.append(result.scalar())
            print(f"  Created {len(pricing_ids)} pricings")
        else:
            print(f"  Pricings: {pricing_count} already exist")

        # ── 7. Work Orders + Containers ───────────────────────────────
        result = await db.execute(text("SELECT count(*) FROM work_orders"))
        wo_count = result.scalar() or 0

        if wo_count == 0:
            statuses = ["PENDING", "PENDING", "MATCHED", "MATCHED", "MATCHED", "COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED"]
            container_prefixes = ["TCNU", "MSKU", "CMAU", "MSCU", "HLCU", "TGHU", "FCIU", "TRHU"]
            wo_index = 0

            for day_offset in range(-25, 3):
                wo_date = today + timedelta(days=day_offset)
                created_at = datetime(wo_date.year, wo_date.month, wo_date.day, 8, 0, 0, tzinfo=timezone.utc)

                for _ in range(2 + (wo_index % 3)):
                    driver_username = driver_usernames[wo_index % len(driver_usernames)]
                    driver_id = user_ids[driver_username]
                    driver_name, plate = user_info[driver_username]

                    client_idx = wo_index % len(client_ids)
                    client_id = client_ids[client_idx]
                    client_name = clients_data[client_idx][1]
                    client_code = clients_data[client_idx][0]

                    route = routes_data[wo_index % len(routes_data)]
                    wt = ["E20", "E40", "F20", "F40"][wo_index % 4]
                    is_20 = wt.endswith("20")
                    is_empty = wt.startswith("E")
                    base = route["type_20ft"] if is_20 else route["type_40ft"]
                    unit_price = base if is_empty else int(base * 0.85)
                    driver_salary = 350000 if is_20 else 400000
                    allowance = 100000
                    status = statuses[wo_index % len(statuses)]

                    prefix = container_prefixes[wo_index % len(container_prefixes)]
                    container_num = f"{prefix}{1000000 + wo_index * 7:07d}"

                    result = await db.execute(
                        text("""INSERT INTO work_orders (company_id, client_id, client_name, client_code, route,
                            pickup_location, dropoff_location, driver_id, driver_name, tractor_plate,
                            unit_price, driver_salary, allowance, earning, status,
                            created_at, updated_at)
                            VALUES (:cid, :clid, :clname, :clcode, :route, :pickup, :dropoff,
                            :did, :dname, :plate, :up, :ds, :alw, :earning, :status, :cat, :uat)
                            RETURNING id"""),
                        {"cid": company_id, "clid": client_id, "clname": client_name, "clcode": client_code,
                         "route": route["route"], "pickup": route["pickup"], "dropoff": route["dropoff"],
                         "did": driver_id, "dname": driver_name, "plate": plate,
                         "up": unit_price, "ds": driver_salary, "alw": allowance,
                         "earning": driver_salary + allowance, "status": status,
                         "cat": created_at, "uat": created_at},
                    )
                    wo_id = result.scalar()

                    await db.execute(
                        text("""INSERT INTO work_order_containers (work_order_id, container_number, work_type)
                            VALUES (:woid, :cnum, :wt)"""),
                        {"woid": wo_id, "cnum": container_num, "wt": wt},
                    )
                    wo_index += 1

            print(f"  Created {wo_index} work orders with containers")
        else:
            print(f"  Work Orders: {wo_count} already exist")

        # ── 8. Trip Orders ────────────────────────────────────────────
        result = await db.execute(text("SELECT count(*) FROM trip_orders"))
        to_count = result.scalar() or 0

        if to_count == 0:
            result = await db.execute(
                text("""SELECT wo.id, wo.client_id, wo.client_name, wo.route, wo.pickup_location,
                    wo.dropoff_location, wo.tractor_plate, wo.driver_id, wo.driver_name,
                    wo.unit_price, wo.driver_salary, wo.allowance, wo.status, wo.created_at
                    FROM work_orders wo WHERE wo.status IN ('MATCHED', 'COMPLETED') ORDER BY wo.created_at""")
            )
            matched_wos = result.fetchall()
            trip_count = 0

            for wo in matched_wos:
                wo_id, cl_id, cl_name, route, pickup, dropoff, plate, drv_id, drv_name, up, ds, alw, status, cat = wo
                trip_date = cat.date() if cat else today
                trip_status = "COMPLETED" if status == "COMPLETED" else "PENDING"
                is_confirmed = status == "COMPLETED"

                result2 = await db.execute(
                    text("""INSERT INTO trip_orders (company_id, trip_date, client_id, client_name, route,
                        pickup_location, dropoff_location, tractor_plate, driver_id, driver_name,
                        unit_price, driver_salary, allowance, revenue, status, is_confirmed, created_at, updated_at)
                        VALUES (:cid, :td, :clid, :clname, :route, :pickup, :dropoff, :plate,
                        :did, :dname, :up, :ds, :alw, :rev, :status, :confirmed, :cat, :cat)
                        RETURNING id"""),
                    {"cid": company_id, "td": trip_date, "clid": cl_id, "clname": cl_name, "route": route,
                     "pickup": pickup, "dropoff": dropoff, "plate": plate,
                     "did": drv_id, "dname": drv_name, "up": up, "ds": ds, "alw": alw,
                     "rev": up, "status": trip_status, "confirmed": is_confirmed, "cat": cat},
                )
                trip_id = result2.scalar()

                # Copy containers
                result3 = await db.execute(
                    text("SELECT container_number, work_type FROM work_order_containers WHERE work_order_id = :woid"),
                    {"woid": wo_id},
                )
                for c in result3:
                    await db.execute(
                        text("""INSERT INTO trip_order_containers (trip_order_id, container_number, work_type)
                            VALUES (:tid, :cnum, :wt)"""),
                        {"tid": trip_id, "cnum": c[0], "wt": c[1]},
                    )

                trip_count += 1

            print(f"  Created {trip_count} trip orders")
        else:
            print(f"  Trip Orders: {to_count} already exist")

        # ── 9. Salary Periods ─────────────────────────────────────────
        result = await db.execute(text("SELECT count(*) FROM salary_periods"))
        sp_count = result.scalar() or 0

        if sp_count == 0:
            start = today.replace(day=1)
            for drv_username in driver_usernames:
                drv_id = user_ids[drv_username]
                drv_name, _ = user_info[drv_username]

                result2 = await db.execute(
                    text("SELECT count(*), COALESCE(SUM(driver_salary), 0), COALESCE(SUM(allowance), 0) FROM work_orders WHERE driver_id = :did"),
                    {"did": drv_id},
                )
                row = result2.one()
                wo_cnt, total_salary, total_allowance = row[0], row[1], row[2]
                net_pay = total_salary + total_allowance

                await db.execute(
                    text("""INSERT INTO salary_periods (company_id, driver_id, driver_name, start_date, end_date,
                        work_order_count, price_per_order, total_salary, total_allowance, total_deduction, net_pay, status, created_at, updated_at)
                        VALUES (:cid, :did, :dname, :sd, :ed, :woc, :ppo, :ts, :ta, 0, :np, 'OPEN', :now, :now)"""),
                    {"cid": company_id, "did": drv_id, "dname": drv_name, "sd": start, "ed": today,
                     "woc": wo_cnt, "ppo": wo_cnt > 0 and (total_salary // wo_cnt) or 0,
                     "ts": total_salary, "ta": total_allowance, "np": net_pay, "now": now},
                )
            print(f"  Created {len(driver_usernames)} salary periods")
        else:
            print(f"  Salary Periods: {sp_count} already exist")

        await db.commit()
        print("\nDone! All seed data committed.")


if __name__ == "__main__":
    asyncio.run(seed())
