# BizLogic.md — Phúc Lộc Transport Business Operations (Updated 2026-05-02)

> **Source of Truth** for all business logic in the vantaiphucloc system.
> This update includes: pricing by quantity, strict container type rules, locking after confirmation, audit log, and deletion policies.

---

## 1. Company Overview

- **Company:** Phúc Lộc (Phúc Lộc Transport)
- **Business:** Container trucking / freight transport (vận tải hàng hóa)
- **Single-tenant app** — no multi-company support. All data belongs to Phúc Lộc.
- **Currency:** Vietnamese Dong (VND), stored as integers (no decimals).
- **Language:** All user-facing UI in Vietnamese.

---

## 2. Roles & Permissions

| Role | Vietnamese | Can Do | Cannot Do |
|------|-----------|--------|-----------|
| **superadmin** | SuperAdmin | Everything — full CRUD on all entities, manage users, delete vendors, configure salary | — |
| **director** | Giám đốc | View dashboard, full CRUD on users, clients, vendors, routes, pricings, trip orders | Cannot reconcile, cannot create work orders, cannot configure salary |
| **accountant** | Kế toán | Create/edit clients, routes, pricings, trip orders, reconcile, calculate salary, manage salary config, manage vendors, manage drivers | Cannot manage users |
| **driver** | Tài xế | Create work orders (single + batch), view own work orders, view own salary | Cannot access any other entity |

---

## 3. Core Entities

### 3.1 Client (Khách hàng)

| Field | Type | Description |
|-------|------|-------------|
| code | string? (unique) | Mã khách hàng — for drivers to identify quickly |
| name | string | Client full name |
| type | `company` \| `individual` | Business type |
| phone | string | Contact phone |
| tax_code | string? | Tax code (mã số thuế) |
| address | string? | Address |
| contact_person | string? | Contact person name |
| is_active | boolean | Soft delete flag — default true |

**Business Rules:**
- Drivers see client **code** instead of full name.
- When client has existing TO or WO, cannot hard delete — only set `is_active = false`.

### 3.2 Vendor (Nhà thầu)

| Field | Type | Description |
|-------|------|-------------|
| name | string (unique) | Vendor company name |
| is_active | boolean | Soft delete flag |

**Business Rules:**
- Cannot delete vendor with associated drivers — soft delete only.
- Default vendor for internal drivers: "Phúc Lộc".

### 3.3 Route (Tuyến đường)

| Field | Type | Description |
|-------|------|-------------|
| route | string | Route name/description |
| pickup_location | string? | Điểm lấy (pickup point) |
| dropoff_location | string? | Điểm trả (dropoff point) |
| type_20ft | int (VND) | Reference price for 20ft container |
| type_40ft | int (VND) | Reference price for 40ft container |
| is_two_way | boolean | Whether the route is round-trip |
| is_active | boolean | Soft delete flag |

**Business Rules:**
- Pickup + dropoff = route. No mixed routes in one Trip Order.
- If route has existing Pricing, TO, or WO, soft delete only.

### 3.4 Pricing (Bảng giá) — UPDATED

Per-client pricing agreement **BY QUANTITY** (số lượng container).
Each quantity tier defines `unit_price`, `driver_salary`, `allowance`.

**Pricing (parent):**

| Field | Type | Description |
|-------|------|-------------|
| client_id | int (FK) | Which client this price applies to |
| client_name | string | Denormalized |
| route | string | Route description |
| work_type | `E20` \| `E40` \| `F20` \| `F40` | Container type + load type |
| is_active | boolean | Soft delete flag |

**PricingLine (child table):**

| Field | Type | Description |
|-------|------|-------------|
| quantity | int | Number of containers (1 or 2 for 20ft; only 1 for 40ft) |
| unit_price | int (VND) | Amount the client pays Phúc Lộc for this quantity |
| driver_salary | int (VND) | Base driver pay for this quantity |
| allowance | int (VND) | Additional driver allowance for this quantity |

**Business Rules:**
- Pricing is matched by `(client_id, work_type, route, quantity)`.
- For 40ft containers, only `quantity=1` is allowed. For 20ft, quantity can be 1 or 2.
- When creating Trip Order with N containers, system looks up pricing for exact quantity.
- If not found, accountant must enter all values manually.
- No automatic multiplication from `quantity=1` to higher quantities.
- If pricing has existing TO references, soft delete only (`is_active=false`).

**Example:**

| Client | Route | Work Type | Quantity | unit_price | driver_salary | allowance |
|--------|-------|-----------|----------|------------|---------------|-----------|
| Công ty A | Cát Lái - Sóng Thần | F20 | 1 | 2.000.000 | 100.000 | 0 |
| Công ty A | Cát Lái - Sóng Thần | F20 | 2 | 3.500.000 | 200.000 | 50.000 |

### 3.5 Work Order (Phiếu làm việc) — UPDATED

| Field | Type | Description |
|-------|------|-------------|
| containers | ContainerItem[] | List of containers in this work order |
| client_id | int (FK, nullable) | Client |
| client_name | string | Denormalized |
| client_code | string? | Denormalized client code |
| route | string | Route description |
| driver_id | int (FK) | Driver who did the work |
| driver_name | string | Denormalized |
| tractor_plate | string | Truck plate number |
| gps_lat, gps_lng | float? | GPS coordinates at creation time |
| gps_address | string? | Reverse-geocoded address |
| unit_price | int (VND) | Always 0 on creation (revenue tracked in TO only) |
| driver_salary | int (VND) | Synced from TO when matched |
| allowance | int (VND) | Synced from TO when matched |
| earning | int (VND) | = driver_salary + allowance when matched |
| pricing_id | int (FK)? | Link to Pricing record (for reference) |
| status | `PENDING` → `MATCHED` → `COMPLETED` | Lifecycle status |
| is_locked | boolean | Locked when linked TO is confirmed. Default false. |
| locked_at | datetime? | When locked |
| locked_by | int (FK: user)? | Who locked |

**Container Item:**

| Field | Type | Description |
|-------|------|-------------|
| container_number | string | Container ID (e.g., "MSKU-1234567") |
| work_type | WorkType | E20/E40/F20/F40 |
| photo_url | string? | Photo of the container |
| photo_lat, photo_lng | float? | GPS where photo was taken |
| photo_timestamp | datetime? | When photo was taken |

**Work Order Lifecycle:**
```
Driver creates WO → PENDING (no match)
                          ↓ (match found, TO in PENDING)
                     MATCHED (linked to TO, earning synced from TO)
                          ↓ (TO becomes CONFIRMED)
                     COMPLETED + LOCKED (cannot change)
```

**Business Rules:**
- `earning` is always 0 on creation. Only updated when matched to a Trip Order.
- A Work Order can only be matched to a Trip Order that is in `PENDING` state (not `DRAFT`).
- After matching, if Trip Order's `driver_salary` or `allowance` changes AND Trip Order is not yet confirmed (`is_confirmed=false`), the Work Order's `earning`, `driver_salary`, `allowance` are **automatically** updated and salary recalculation triggered.
- Once linked Trip Order is confirmed (`is_confirmed=true`), Work Order becomes `is_locked=true`. No further changes allowed.
- Accountant can edit `client_id` on Work Order during reconciliation (audit log recorded).
- Driver can delete/edit Work Order when `status = PENDING`. Accountant can also delete/edit `PENDING` Work Orders.
- Once `MATCHED` or `COMPLETED`, Work Order cannot be deleted.

### 3.6 Trip Order (Lệnh điều hành) — UPDATED

| Field | Type | Description |
|-------|------|-------------|
| trip_date | date | Date of the trip |
| client_id | int (FK) | Client being charged |
| client_name | string | Denormalized |
| work_type | WorkType | Legacy (nullable) — use containers table |
| route | string | Route |
| tractor_plate | string | Truck plate |
| driver_id | int (FK) | Driver who drove |
| driver_name | string | Denormalized |
| container_number | string | Legacy (nullable) — use containers table |
| containers | TripOrderContainer[] | Child table with multiple containers |
| pricing_id | int (FK)? | Pricing used |
| unit_price | int (VND) | Revenue from client |
| driver_salary | int (VND) | Driver base pay |
| allowance | int (VND) | Driver allowance |
| revenue | int (VND) | = unit_price |
| matched_work_order_ids | int[] | Work orders linked to this trip |
| is_confirmed | boolean | "Đã chốt" with client — once true, locks this TO and all linked WOs |
| confirmed_by | int (FK)? | User who confirmed |
| confirmed_at | datetime? | When confirmed |
| status | `DRAFT` → `PENDING` → `COMPLETED` → `CANCELLED` | Lifecycle |

**TripOrderContainer (child table):**

| Field | Type | Description |
|-------|------|-------------|
| id | int | Primary key |
| trip_order_id | int (FK) | Parent TripOrder (CASCADE delete) |
| container_number | string | Container ID |
| work_type | WorkType | E20/E40/F20/F40 |

**Trip Order Lifecycle:**
```
Accountant creates TO → DRAFT (missing info)
                          ↓ (all info provided)
                     PENDING (ready for matching)
                          ↓ (match found with WO)
                     COMPLETED (match exists)
                          ↓ (accountant clicks "Confirm with client")
                     CONFIRMED (locked, is_confirmed=true)
```

**Business Rules:**
- **NO MIXED CONTAINER TYPES:** All containers in TripOrderContainer must have the **same work_type** (e.g., all F20 or all E40). System enforces this on create/edit.
- **Pricing lookup:** When creating TO, system looks up Pricing by `(client, route, work_type, quantity = number of containers)`. If found, auto-fills `unit_price`, `driver_salary`, `allowance` from matching PricingLine. If not found, accountant must enter manually.
- **Matching:** Only TOs in `PENDING` state are candidates for matching with Work Orders.
- **Confirmation (`is_confirmed = true`):** Locks the Trip Order AND all linked Work Orders (sets `is_locked=true` on each linked WO). After confirmation:
  - No edits to TO or linked WOs
  - No unmatching
  - No changes to salary calculations for those WOs
- **Deletion rules:**
  - Can delete TO in `DRAFT` or `PENDING`
  - Cannot delete TO with `is_confirmed=true`
  - Cannot delete TO that is `COMPLETED` (has match)

### 3.6.1 TripOrderWorkOrder (Liên kết WO—TO)

Join table linking Work Orders to Trip Orders for reconciliation.

| Field | Type | Description |
|-------|------|-------------|
| trip_order_id | int (FK) | TripOrder (CASCADE delete) |
| work_order_id | int (FK) | WorkOrder (CASCADE delete) |

**Business Rules:**
- Composite primary key: `(trip_order_id, work_order_id)`.
- CASCADE delete on both sides — deleting a TO or WO removes the link.
- One WO can only be linked to one TO (enforced by WO status = MATCHED).
- One TO can be linked to multiple WOs.

### 3.7 Reconciliation (Đối soát WO—TO) — UPDATED

Match Suggestion System with weighted scoring:

| Field | Weight | Description |
|-------|--------|-------------|
| driver | 0.3 | Same driver |
| client | 0.3 | Same client |
| route | 0.2 | Same route |
| containers | 0.2 | At least one overlapping container number |

**Confidence levels:**
- `full` (score = 1.0): Auto-confirm or minimal review
- `partial` (score ≥ 0.3): Accountant decides
- `none` (score < 0.3): No suggestion

**Flow:**
1. System analyzes unmatched WOs and TOs (only TOs with `status=PENDING`)
2. Accountant reviews suggestions, can edit client on WO if needed
3. Accountant confirms or rejects match
4. System links WO and TO via join table
5. TO status becomes `COMPLETED`
6. WO `earning`, `driver_salary`, `allowance` synced from TO
7. If TO has pricing data, WO gets `MATCHED` status (later `COMPLETED` when TO confirmed)
8. Salary recalculation auto-queued

**Business Rules:**
- Only TOs with `status = PENDING` are considered for matching.
- Accountant can edit `client_id` on Work Order during reconciliation (audit log recorded).
- A work order can only be matched once.
- One trip order can match multiple work orders.
- Both WOs and TOs can have multiple containers (enforced same work_type within TO).

### 3.8 Client Reconciliation (Đối soát với khách hàng)

**Flow:**
1. Client sends Excel file listing their container numbers for billing period
2. Accountant uploads Excel to system
3. System compares client's container numbers against system records (TOs and WOs)
4. System identifies matching containers (exact or partial match)
5. Accountant reviews and marks each Trip Order as "Đã chốt" (`is_confirmed = true`)
6. This locks the TO and all linked WOs

**Business Rules:**
- Only accountants and superadmins can perform client reconciliation.
- Confirmation ("Đã chốt") is tracked per Trip Order.
- After confirmation, no further changes allowed.

### 3.9 Salary (Lương tài xế) — UPDATED

#### Salary Period Config (Cấu hình kỳ lương) — Singleton

| Field | Type | Description |
|-------|------|-------------|
| from_day | int (1–28) | Start day of each period |
| to_day | int (1–28) | End day of each period |

**Default:** 26th of current month → 25th of next month (`from_day=26`, `to_day=25`).

#### Salary Period (Kỳ lương)

| Field | Type | Description |
|-------|------|-------------|
| driver_id | int (FK) | Driver |
| driver_name | string | Denormalized |
| start_date | date | Period start |
| end_date | date | Period end |
| work_order_count | int | Number of MATCHED work orders in period |
| price_per_order | int (VND) | Average salary per order |
| total_salary | int (VND) | Sum of driver_salary from matched WOs |
| total_allowance | int (VND) | Sum of allowance from matched WOs |
| total_deduction | int (VND) | Deductions (future feature) |
| net_pay | int (VND) | = total_salary + total_allowance - total_deduction |
| status | `OPEN` → `CALCULATED` → `PAID` | Lifecycle |

**Salary Lifecycle:**
```
OPEN → CALCULATED (auto-computed) → PAID (accountant marks as paid)
```

**Business Rules:**
- Salary calculation counts only **MATCHED** work orders within date range.
- Calculation is **upsert** (recalculates if exists).
- Auto-triggered when: trip order created/updated (if not confirmed), work orders matched, or manual request.
- **Vendor drivers (external)** also have salary calculated via SalaryPeriod.
- **AFTER `status = PAID`:** NO changes allowed to any data affecting that salary period (TOs, WOs, matches, pricing for those periods). System must enforce this lock.
- Deductions not yet implemented (`total_deduction` always 0).

---

## 4. Audit Log (NEW)

System **MUST** have audit log that auto-records any action that changes data.

**Audit Log fields:**

| Field | Type | Description |
|-------|------|-------------|
| id | int | Primary key |
| user_id | int (FK) | Who performed action |
| action | string | `CREATE`, `UPDATE`, `DELETE`, `CONFIRM`, `LOCK`, `MATCH`, `UNMATCH` |
| table_name | string | Table affected (e.g., "work_orders", "trip_orders", "pricing") |
| record_id | int | Record ID affected |
| old_value | JSON? | Previous state |
| new_value | JSON? | New state |
| ip_address | string? | Request IP |
| user_agent | string? | Request user agent |
| created_at | datetime | When it happened |

**Business Rules:**
- All modifications, including edits during reconciliation, confirmation, locking, and salary changes, must be logged.

---

## 5. Deletion & Soft Delete Rules

| Entity | Hard Delete Allowed? | Soft Delete (`is_active=false`) |
|--------|---------------------|-------------------------------|
| Trip Order | Only if `DRAFT` or `PENDING` | N/A (hard delete only) |
| Work Order | Only if `PENDING` (driver or accountant) | N/A |
| Client | NO if has TO or WO | YES — set `is_active=false` |
| Route | NO if used in Pricing, TO, or WO | YES — set `is_active=false` |
| Pricing | NO if used in TO | YES — set `is_active=false` |
| Vendor | NO if has associated drivers | YES — set `is_active=false` |

- **After SalaryPeriod is `PAID`:** No deletion or modification of any related data.

---

## 6. Background Workers & Cron Jobs

| Task | Trigger | Description |
|------|---------|-------------|
| `calculate_salary_task` | TO created/updated (if not confirmed), WO matched, manual | Computes salary for driver over period |
| `sync_wo_earning_on_to_update` | TO updated (`driver_salary`/`allowance` changed) | Auto-updates linked WO's earning if TO not confirmed |
| `send_notification_task` | Work order created | Pushes in-app notification |
| `geocode_work_order_task` | Work order created with GPS | Reverse-geocodes GPS → address |
| `geocode_container_task` | Container photo with GPS | Reverse-geocodes photo GPS → address |
| `generate_monthly_report_task` | Manual | Generates monthly report |

### Cron Jobs

| Schedule | Task | Description |
|----------|------|-------------|
| Daily 03:00 | `cleanup_expired_sessions` | Removes old sessions |
| Daily 03:30 | `cleanup_old_audit_logs` | Removes audit logs older than 1 year |
| Daily 08:00 | `remind_salary_period_end` | Reminds about unpaid salary periods |
| Daily 01:00 | `recalculate_open_periods` | Recalculates salary periods still in OPEN/CALCULATED |

---

## 7. Offline Support for Drivers

- Driver app must preload clients (active only), routes (active only), work_types when online and cache locally.
- App periodically syncs cached data to avoid stale data.
- When offline Work Order is synced and references a client/route that was edited/deleted:
  - System does **NOT** auto-reject or auto-fix.
  - Work Order is synced with a flag `needs_review = true`.
  - Accountant sees it on web and manually corrects (audit log records correction).
- Batch creation supports up to 50 WOs at once.

---

## 8. Dashboard Metrics

| Metric | Computation |
|--------|-------------|
| total_revenue | SUM of all TripOrder.revenue |
| total_expense | SUM of all WorkOrder.earning (where not locked) |
| trip_count | COUNT of all trip orders |
| driver_salary_summary | For each driver: count MATCHED work orders + earnings |
| unmatched_work_order_count | COUNT of work orders NOT matched to any trip order |
| pending_trip_count | COUNT of trip orders with status `PENDING` |

---

## 9. State Machines (Summary)

### Work Order
```
PENDING → (match with TO in PENDING) → MATCHED
MATCHED → (TO becomes confirmed) → COMPLETED + LOCKED
```

### Trip Order
```
DRAFT → (all info provided) → PENDING
PENDING → (match with WO) → COMPLETED
COMPLETED → (accountant confirms with client) → CONFIRMED (locked)
DRAFT or PENDING → CANCELLED
```

### Salary Period
```
OPEN → (calculation triggered) → CALCULATED
CALCULATED → (accountant marks paid) → PAID (no further changes allowed)
```

---

## 10. Data Model Summary

```
Vendor (nhà thầu) — is_active
  └── User/driver (tài xế) — driver.vendor = Vendor.name

Client (khách hàng) — is_active
  ├── Pricing (bảng giá) — per client + work_type + route, is_active
  │   └── PricingLine — quantity-based pricing (unit_price, driver_salary, allowance)
  ├── WorkOrder (phiếu làm việc) — created by driver, is_locked, needs_review
  │   └── WorkOrderContainer — containers in the work order
  └── TripOrder (lệnh điều hành) — created by accountant, is_confirmed
      ├── TripOrderContainer — containers (same work_type enforced)
      └── TripOrderWorkOrder — join table (reconciliation)

Route (tuyến đường) — is_active, with pickup/dropoff points
SalaryPeriodConfig (singleton) — period boundaries
SalaryPeriod (kỳ lương) — calculated per driver per period
AuditLog (nhật ký hệ thống) — auto-records all data changes
```

---

## 11. Key Business Calculations

### Revenue = Client pays Phúc Lộc
- `TripOrder.unit_price` (= `TripOrder.revenue`)

### Expense = Phúc Lộc pays driver
- `WorkOrder.driver_salary + WorkOrder.allowance` (= `WorkOrder.earning`)

### Profit per trip
- `TripOrder.unit_price - (WorkOrder.driver_salary + WorkOrder.allowance)`

### Driver salary for a period
- Sum of `WorkOrder.earning` for all MATCHED work orders within `[start_date, end_date]`
- `net_pay = total_salary + total_allowance - total_deduction`

---

## 12. ISO 6346 Container Number Validation

**Format:** `XXXX-NNNNNN-N`
- XXXX: 4 letters (owner code)
- NNNNNN: 6 digits (serial number)
- N: 1 digit (check digit)

**Validation:**
- Strict check: format + check digit calculation
- Check digit calculation: sum of (character_value × 2^position) % 11, with 10 → 0

**OCR Workflow:**
1. Driver uploads photo of container
2. AI attempts OCR extraction (max 5 attempts per user)
3. System validates extracted number against ISO 6346
4. If valid → auto-fill container number
5. If invalid → show error, allow retry or manual entry
6. After 2 failed attempts → require manual entry

---

## 13. API Endpoints Reference

### Auth
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/auth/login` | Public | Login (username/phone/email + password) |
| POST | `/auth/refresh` | Any | Refresh access token |
| POST | `/auth/logout` | Any | Logout |
| POST | `/auth/change-password` | Any | Change own password |

### Clients
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/clients` | accountant, director, superadmin | List (paginated) |
| POST | `/clients` | accountant, director, superadmin | Create |
| PUT | `/clients/{id}` | accountant, director, superadmin | Update |
| DELETE | `/clients/{id}` | accountant, director, superadmin | Soft delete (is_active=false) |

### Routes
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/routes` | accountant, director, superadmin | List (paginated) |
| POST | `/routes` | accountant, director, superadmin | Create |
| PUT | `/routes/{id}` | accountant, director, superadmin | Update |
| DELETE | `/routes/{id}` | accountant, director, superadmin | Soft delete (is_active=false) |

### Pricings
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/pricings` | accountant, director, superadmin | List (paginated, filterable) |
| POST | `/pricings` | accountant, director, superadmin | Create |
| PUT | `/pricings/{id}` | accountant, director, superadmin | Update |
| DELETE | `/pricings/{id}` | accountant, director, superadmin | Soft delete (is_active=false) |

### Work Orders
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/work-orders` | Any authenticated | List (filterable by plate, time, driver) |
| GET | `/work-orders/{id}` | Any authenticated | Get single |
| POST | `/work-orders` | driver | Create |
| POST | `/work-orders/batch` | driver | Batch create (up to 50) |
| PUT | `/work-orders/{id}` | accountant, superadmin | Update (if not locked) |
| DELETE | `/work-orders/{id}` | driver (own, PENDING), accountant, superadmin (PENDING) | Delete |

### Trip Orders
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/trip-orders` | accountant, director, superadmin | List (filterable, paginated) |
| GET | `/trip-orders/{id}` | accountant, director, superadmin | Get single |
| POST | `/trip-orders` | accountant, superadmin | Create |
| POST | `/trip-orders/import` | accountant, superadmin | Batch import from Excel |
| PUT | `/trip-orders/{id}` | accountant, superadmin | Update (if not confirmed) |
| DELETE | `/trip-orders/{id}` | accountant, superadmin | Delete (DRAFT/PENDING only) |
| PUT | `/trip-orders/{id}/confirm` | accountant, superadmin | Toggle "Đã chốt" (locks TO + linked WOs) |

### Reconciliation
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/reconcile` | accountant, superadmin | Match WO → TO |
| POST | `/reconcile/upload-excel` | accountant, superadmin | Upload client Excel for reconciliation |
| POST | `/reconcile/export-excel` | accountant, superadmin | Export reconciliation results |

### Salary
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/salary` | accountant, director, superadmin | List periods |
| POST | `/salary/calculate` | accountant, superadmin | Trigger async calculation |
| PUT | `/salary/{id}` | accountant, superadmin | Update period (mark PAID) |
| GET | `/salary-config` | accountant, superadmin | Get period config |
| PUT | `/salary-config` | accountant, superadmin | Update period config |

### Drivers
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/drivers` | Any authenticated | List drivers (paginated) |
| POST | `/drivers` | accountant, superadmin | Create driver (auto-password = phone) |

### Vendors
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/vendors` | accountant, director, superadmin | List (paginated) |
| POST | `/vendors` | accountant, director, superadmin | Create |
| PUT | `/vendors/{id}` | accountant, director, superadmin | Update |
| DELETE | `/vendors/{id}` | accountant, director, superadmin | Soft delete (is_active=false) |

### Users
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/users` | director, superadmin | List (filterable by role) |
| POST | `/users` | director, superadmin | Create |
| PUT | `/users/{id}` | director, superadmin | Update |
| DELETE | `/users/{id}` | director, superadmin | Deactivate (soft delete) |

### Dashboard
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/dashboard/summary` | Any authenticated | Aggregated stats |
| GET | `/dashboard/notifications` | Any authenticated | Latest 50 notifications |

### Push Notifications
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/push/vapid-public-key` | Public | VAPID public key |
| POST | `/push/subscriptions` | Any authenticated | Register push subscription |
| DELETE | `/push/subscriptions` | Any authenticated | Unregister |

### System
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/health` | Public | Health check |
| GET | `/health/worker` | Public | Worker status |
| GET | `/jobs/{job_id}` | Any authenticated | Async job status polling |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-02 | Major update: pricing by quantity tier, locking on confirm, audit log, deletion/soft-delete rules, offline sync handling, no mixed container types in TO, earning sync on TO update, vendor driver salary via SalaryPeriod |
| 2026-05-02 | Added: client code, route pickup/dropoff, trip order confirmation, client reconciliation via Excel, Excel import/export, work order filtering by plate/time |
| 2026-04-30 | Initial creation — extracted from codebase audit |
