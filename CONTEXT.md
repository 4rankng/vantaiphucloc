# Context — Vantai Phuc Loc

B2B container freight trucking platform for Phuc Loc Trading & Transport Co., operating in Hai Phong port zone. Moves shipping containers (20ft/40ft, empty and laden) between ports, warehouses, and depots on behalf of shipping clients.

## Business Type

Port logistics — first-mile/last-mile container transport between port terminals, depots, and warehouses. NOT parcel delivery, NOT passenger transport.

## Canonical Terms

These are the authoritative English names used in code and database. UI labels are separate.

### Core Entities

| Canonical (code) | Vietnamese UI (operator-facing) | Meaning |
|---|---|---|
| **BookedTrip** | Yêu cầu điều xe | What the client ordered/intended. Imported from client Excel or created manually. |
| **DeliveredTrip** | Chuyến xe hoàn thành | What the driver actually executed. Created by driver app or bulk import. |
| **Reconciliation** | Đối soát | The act of matching a BookedTrip to a DeliveredTrip to confirm alignment. |
| **Container** | Container | A shipping container identified by ISO 6346 number (e.g., HACU1234567), or by a short special painted code when no ISO number is present (e.g., HCWT0006). |
| **Client** | Chủ hàng | A shipping company that books container transport (e.g., Hai An Port, Glory Logistics). |
| **Vendor** | Xe ngoài | An external truck operator that hauls containers on Phuc Loc's behalf. |

### Container Types

| Code | Meaning |
|---|---|
| E20 | Empty 20-foot container |
| E40 | Empty 40-foot container |
| F20 | Full/laden 20-foot container |
| F40 | Full/laden 40-foot container |

### Operation Types

| Code | Vietnamese | Meaning |
|---|---|---|
| XUAT_NHAP_TAU | Xuất/Nhập tàu | Export/import vessel operations |
| CHUYEN_BAI | Chuyển bãi | Yard transfer |
| LAY_VO_HA_HANG | Lấy vỏ hạ hàng | Pick empty, deliver laden |
| CHAY_SA_LAN | Chạy sà lan | Barge operations |
| DONG_KHO | Đóng kho | Warehouse stuffing |

### Roles

| Canonical | Vietnamese | Scope |
|---|---|---|
| Driver | Tài xế | Mobile-first. Creates DeliveredTrips, views own history. |
| Accountant | Kế toán | Manages BookedTrips, reconciliation, pricing, expenses, salary, reports. |
| Director | Giám đốc | Oversees users, partners, pricing, trip review, P&L. |
| SuperAdmin | SuperAdmin | System administration, audit logs. |

### Financial Terms

| Canonical | Vietnamese | Meaning |
|---|---|---|
| Revenue | Doanh thu | Amount charged to client per trip (VND). |
| Driver Salary | Lương tài xế | Per-trip productivity pay to driver (VND). |
| Allowance | Phụ cấp | Per-trip allowance to driver (VND). |
| Base Salary | Lương cơ bản | Monthly fixed salary for driver, tracked with effective date history. |
| Vehicle Expense | Chi phí xe | Fleet costs: fuel, repairs, law/permits, other. |
| P&L | Kết quả kinh doanh | Profit & Loss = Revenue - all costs. |

## Business Rules

- **Single-tenant**: Phuc Loc is the only operator. No multi-company support.
- **Currency**: All amounts in Vietnamese Dong (VND), stored as integers.
- **Matching model**: 1:1 by container. Each BookedTrip and each DeliveredTrip has exactly one container (`cont_number` + `cont_type` directly on the row, no join tables). A BookedTrip matches at most one DeliveredTrip and vice versa. If a truck carries 2 containers, that's 2 separate DeliveredTrip rows.
- **Match state**: `matched` boolean on both BookedTrip and DeliveredTrip. No lifecycle statuses (no PENDING/MATCHED/CONFIRMED/COMPLETED/CANCELLED/DRAFT). A trip is either matched or not.
- **Fraud detection**: A BookedTrip must match at most one DeliveredTrip. If a vendor claims a trip already matched to our own driver (or another vendor), this is fraud — flag and highlight for review, do not auto-match.
- **Revenue flow**: DeliveredTrip.revenue defaults to 0 at creation. Gets populated from the matched BookedTrip's revenue during reconciliation. Driver never enters financial data.
- **Financial fields are manual (Phase 1)**: Revenue, driver_salary, allowance on both BookedTrip and DeliveredTrip are entered by the accountant. No auto-population from pricing during matching. Simplify now, automate later if customer asks.

## Reconciliation Workflow (Unified)

All reconciliation follows the same pattern — the **client's file is the source of truth**.

1. Drivers create DeliveredTrips throughout the month
2. Phuc Loc exports completed trips → sends Excel to client
3. Client compares against their own records, sends back their file:
   - **Matched containers**: confirmed delivery
   - **Wrong containers**: DeliveredTrip doesn't match their order (container number error, wrong trip)
   - **Missing containers**: client ordered but Phuc Loc didn't deliver
4. Accountant imports client's response → creates/updates BookedTrips
5. System matches BookedTrips against DeliveredTrips by container number
6. Discrepancies flagged for review (driver provides photos/port receipts as proof)

**Variation**: Some clients send their file FIRST (before Phuc Loc sends anything). The process is the same — import client file → match against DeliveredTrips → resolve discrepancies.

**Client files are per-vessel**: each Excel file represents one vessel. Multiple vessels per month per client.

## Client Export Format

Excel gửi khách hàng gồm các cột:

| Cột | Việt | Source |
|-----|------|--------|
| Vessel | Số tàu | DeliveredTrip.vessel |
| Vehicle plate | Số xe | DeliveredTrip → Vehicle.plate |
| Container number | Số Cont | DeliveredTripContainer.container_number |
| Container type | Loại Công | DeliveredTripContainer.cont_type |
| Trip date | Ngày tháng | DeliveredTrip.trip_date |
| Pickup | Điểm đi | DeliveredTrip → Location (pickup) |
| Dropoff | Điểm đến | DeliveredTrip → Location (dropoff) |
| Operation type | Tác nghiệp | DeliveredTrip.operation_type |

**Mỗi dòng = 1 container.** Chuyến xe có 2 cont → 2 dòng (cùng thông tin chuyến, khác số cont). Không có cột giá — chỉ là dữ liệu vận hành để khách hàng xác nhận.

- **AI-powered parsing** for client Excel files (arbitrary formats). No hardcoded file format detection.
- AI parsing is slow — must be **async**: submit file → return job ID → frontend polls status endpoint → get results.
- Flow: Upload → AI parse (async) → Preview rows → Accountant reviews → Commit → BookedTrips created.
- Pricing is applied separately after commit (manual or from pricing table).
- When stable file formats emerge, replace AI with deterministic parsers.
- **Salary period**: Configurable, default 21st to 20th of month.
- **Vehicle expenses**: Entered per-receipt (not per trip). All expenses are per-vehicle: fuel (XANG_DAU), repairs (SUA_CHUA), law/permits (TIEN_LUAT), other (KHAC). Only for internal Phuc Loc vehicles — vendor vehicles have no expense entries (costs bundled into driver_salary + allowance).
- **Vendor workflow**: Vendors (xe ngoài) do NOT use the app. At month-end, vendors send Excel files listing trips they completed. The accountant uploads vendor Excel into the system, which creates DeliveredTrips (with vendor_id set) and auto-matches against BookedTrips.
- **Vendor vehicles**: Vendor trips have `vehicle_plate` as text (from Excel). No `vehicle_id` FK — vendor vehicles are not tracked in the `vehicles` table. `driver_id` is NULL for vendor trips.
- **Vendor pay**: Vendors have no driver account. Per-trip cost (driver_salary field on DeliveredTrip) is set from vendor Excel import. No allowance or base salary for vendors. Revenue stays 0 for vendor trips — vendor pricing model TBD.
- **Driver knows vessel**: Vessel number is entered by the driver in the field. Accountant does not know it at dispatch time.
- **Vessel is per file**: When client sends Excel files, each file represents one vessel. Multiple vessels per month per client.
- **Driver location search**: Drivers need fuzzy search — type a few characters, system shows suggestions. Locations are a managed list maintained by accountant.
- **One vehicle, two drivers**: Supported. A vehicle can have a primary and secondary driver with effective date ranges.

## Pricing Rules

- **Same route, different client = different price**: Pricing is keyed by (client, pickup, dropoff, container type). The accountant may not know which client a route belongs to — must ask team leader or director.
- **Reverse routes can differ by operation type**: Some routes are reversible at the same price, but others have a different operation type (e.g., XUAT_NHAP_TAU vs CHUYEN_BAI) and different pricing when run in reverse.

## P&L Formula

```
Profit = Revenue - Expenses
Expenses = Vehicle Costs + Lương sản lượng + Lương cơ bản
Vehicle Costs = Xăng dầu (fuel) + Sửa chữa (repairs) + Tiền luật (law/permits) + Khác (other)
```

Revenue is calculated per vehicle per month.
