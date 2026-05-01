# BizLogic.md — Phúc Lộc Transport Business Operations

> **Source of Truth** for all business logic in the vantaiphucloc system.
> Derived from backend (`app/models`, `app/api`, `app/services`, `app/workers`) and frontend (`src/data/domain`, `src/pages`, `src/hooks`).
> When discussing business operations with the client, reference this file. Update it when requirements change.

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
| **director** | Giám đốc | Read dashboards, view reports, manage users (create/edit/deactivate), view clients/routes/pricings/salary | Cannot create/edit/delete clients, routes, pricings, trip orders, work orders, salary config |
| **accountant** | Kế toán | Create/edit clients, routes, pricings, trip orders, reconcile, calculate salary, manage salary config, manage vendors, manage drivers | Cannot manage users, cannot delete vendors |
| **driver** | Tài xế | Create work orders (single + batch), view own work orders, view own salary | Cannot access any other entity |

### Detailed Permission Matrix

| Action | superadmin | director | accountant | driver |
|--------|:----------:|:--------:|:----------:|:------:|
| View dashboard/summary | ✅ | ✅ | ✅ | — |
| CRUD clients | ✅ | Read only | ✅ | — |
| CRUD routes | ✅ | Read only | ✅ | — |
| CRUD pricings | ✅ | Read only | ✅ | — |
| Create work orders | — | — | — | ✅ |
| Edit work orders | ✅ | — | ✅ | — |
| View work orders | ✅ | ✅ | ✅ | Own only |
| CRUD trip orders | ✅ | Read only | ✅ | — |
| Reconcile (match WO→TO) | ✅ | — | ✅ | — |
| Calculate salary | ✅ | — | ✅ | — |
| View salary periods | ✅ | ✅ | ✅ | — |
| Configure salary periods | ✅ | — | ✅ | — |
| CRUD users | ✅ | ✅ | — | — |
| Delete users (deactivate) | ✅ | — | — | — |
| CRUD vendors | ✅ | Read only | ✅ | — |
| CRUD drivers | ✅ | — | ✅ | — |

---

## 3. Core Entities

### 3.1 Client (Khách hàng)

The companies or individuals that hire Phúc Lộc to transport containers.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Client name |
| type | `company` \| `individual` | Business type |
| phone | string | Contact phone |
| tax_code | string? | Tax code (mã số thuế) |
| address | string? | Address |
| contact_person | string? | Contact person name |



### 3.2 Vendor (Nhà thầu)

External companies that provide drivers to Phúc Lộc. Internal drivers belong to "Phúc Lộc".

| Field | Type | Description |
|-------|------|-------------|
| name | string (unique) | Vendor company name |

**Business Rules:**
- Cannot delete a vendor that has associated drivers.
- Default vendor for internal drivers: "Phúc Lộc".

### 3.3 Route (Tuyến đường)

Predefined transport routes with reference pricing by container size.

| Field | Type | Description |
|-------|------|-------------|
| route | string | Route name/description (e.g., "Cát Lái - Bình Dương") |
| type_20ft | int (VND) | Reference price for 20ft container |
| type_40ft | int (VND) | Reference price for 40ft container |
| is_two_way | boolean | Whether the route is round-trip |

**Business Rules:**
- Route reference prices are **guidelines only**. Actual prices come from the Pricing table per client.

### 3.4 Pricing (Bảng giá)

Per-client pricing agreement. Defines how much a specific client pays for a specific work type on a specific route, and how much the driver earns.

| Field | Type | Description |
|-------|------|-------------|
| client_id | int (FK) | Which client this price applies to |
| client_name | string | Denormalized for display |
| work_type | `E20` \| `E40` \| `F20` \| `F40` | Container type + load type |
| route | string | Route description |
| unit_price | int (VND) | Amount the client pays Phúc Lộc |
| driver_salary | int (VND) | Base driver pay per job |
| allowance | int (VND) | Additional driver allowance per job |
| lines | PricingLine[] | Sub-items with work_type + quantity |

**Work Types:**
| Code | Meaning |
|------|---------|
| E20 | Container rỗng (empty) 20ft |
| E40 | Container rỗng (empty) 40ft |
| F20 | Container hàng (full/loaded) 20ft |
| F40 | Container hàng (full/loaded) 40ft |

**Business Rules:**
- Pricing is matched by `(client_id, work_type, route)`. When a driver creates a work order, the system auto-looks up the pricing.
- `unit_price` = revenue from client. `driver_salary` + `allowance` = driver cost. Profit = `unit_price - (driver_salary + allowance)`.
- PricingLines allow quantity breakdown (e.g., 2× E20 + 1× F40 in one pricing record).

### 3.5 Work Order (Phiếu làm việc)

Created by **drivers** in the field. Records the physical work done: which containers were moved, from/to where, GPS location.

| Field | Type | Description |
|-------|------|-------------|
| containers | ContainerItem[] | List of containers in this work order |
| client_id | int (FK, nullable) | Client (may be null for driver-created WOs — filled later by accountant) |
| client_name | string | Denormalized |
| route | string | Route description |
| driver_id | int (FK) | Driver who did the work |
| driver_name | string | Denormalized |
| tractor_plate | string | Truck plate number |
| gps_lat, gps_lng | float? | GPS coordinates at creation time |
| gps_address | string? | Reverse-geocoded address (async via worker) |
| unit_price | int (VND) | Always 0 on creation (revenue tracked in TO only) |
| driver_salary | int (VND) | 0 on creation, synced from TO when matched |
| allowance | int (VND) | 0 on creation, synced from TO when matched |
| earning | int (VND) | 0 on creation, = TO.driver_salary + TO.allowance when matched |
| pricing_id | int (FK)? | Link to Pricing record found at creation (for reference only) |
| status | `PENDING` → `MATCHED` → `COMPLETED` | Lifecycle status |

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
                          ↓ (match found, no pricing)
Accountant reconciles WO with a TripOrder → MATCHED (chờ giá)
                          ↓ (pricing provided)
                     COMPLETED (hoàn thành)

Or directly:
Driver creates WO → PENDING
                          ↓ (match found + pricing provided)
                     COMPLETED
```

**Business Rules:**
- **No auto-pricing on creation:** WO financials (`unit_price`, `driver_salary`, `allowance`, `earning`) always default to 0 on creation. Pricing is used for TO, not WO.
- **Status only tracks match state:** PENDING (no match), MATCHED (match found but no pricing), COMPLETED (match found + pricing).
- **GPS capture:** Driver's GPS coordinates are captured at creation time. Background worker reverse-geocodes the address.
- **Offline support:** Drivers can create work orders offline. They are queued locally and synced when back online via `offlineQueue`. Batch creation supports up to 50 WOs at once.
- **Multi-container support:** One work order can have 1, 2, or more containers (via `WorkOrderContainer` child table).
- **When matched to TO:** WO's `driver_salary`, `allowance`, `earning` are synced from TO. `WO.unit_price` stays 0 (revenue tracked in TO only).
- **Container OCR:** Drivers can upload photo of container for AI OCR extraction. AI has max 2 attempts. If both fail, driver enters manually. Backend validates against ISO 6346.

### 3.6 Trip Order (Lệnh điều hành)

Created by **accountants**. Represents the commercial/financial record of a trip — what the client is charged.

| Field | Type | Description |
|-------|------|-------------|
| trip_date | date | Date of the trip |
| client_id | int (FK) | Client being charged |
| client_name | string | Denormalized |
| work_type | WorkType | Container type (legacy field, nullable — use containers table) |
| route | string | Route |
| tractor_plate | string | Truck plate |
| driver_id | int (FK) | Driver who drove |
| driver_name | string | Denormalized |
| container_number | string | Container ID (legacy field, nullable — use containers table) |
| containers | TripOrderContainer[] | Child table with multiple containers (container_number, work_type) |
| pricing_id | int (FK)? | Pricing used |
| unit_price | int (VND) | Revenue from client |
| driver_salary | int (VND) | Driver base pay |
| allowance | int (VND) | Driver allowance |
| revenue | int (VND) | = unit_price (client-facing revenue) |
| matched_work_order_ids | int[] | Work orders linked to this trip |
| status | `DRAFT` → `CONFIRMED` → `INVOICED` or `CANCELLED` | Lifecycle |

**Trip Order Lifecycle:**
```
Accountant creates TO → DRAFT (missing required info: containers, client, route, or pricing)
                          ↓ (all info provided)
                     PENDING (ready for matching)
                          ↓ (match found with WO)
                     COMPLETED

DRAFT/PENDING → CANCELLED (cannot cancel COMPLETED)
```

**Business Rules:**
- **Multi-container support:** TripOrder has a child table `trip_order_containers` (trip_order_id, container_number, work_type). One TO can have 1, 2, or more containers.
- **Legacy fields:** `container_number` and `work_type` on TripOrder are nullable for backwards compatibility. New code should use the `containers` child table.
- A trip order can match **multiple work orders** (via `TripOrderWorkOrder` join table).
- **Auto-pricing on create:** When creating a TO, the system auto-looks up pricing from `Pricing` table by `(client_id, work_type, route)`. If found, `unit_price`, `driver_salary`, `allowance` are auto-filled. If not found, accountant must enter manually or create new bang gia.
- **Status determination:** On TO create, status = `DRAFT` if missing required info (containers, client, route, or pricing), else `PENDING`.
- **When matched to WO:** TO status → `COMPLETED`.
- **Can cancel:** TO can only be cancelled while in `DRAFT` or `PENDING`. Cannot cancel `COMPLETED` TOs.
- Salary recalculation is auto-triggered when trip order is created or when matched work orders change.

### 3.6.1 TripOrderContainer (Container trong Lệnh điều hành)

Child table of TripOrder, storing multiple containers per trip order. Mirrors the WorkOrderContainer pattern.

| Field | Type | Description |
|-------|------|-------------|
| id | int | Primary key |
| trip_order_id | int (FK) | Parent TripOrder (CASCADE delete) |
| container_number | string | Container ID |
| work_type | WorkType | E20/E40/F20/F40 |

**Business Rules:**
- Cascade delete: Deleting a TripOrder deletes all its TripOrderContainer records.
- At least one container is required per TripOrder (enforced by application logic).
- Container numbers should be unique within a single TripOrder (enforced by application logic).

### 3.7 Reconciliation (Đối soát)

The process of matching Work Orders (physical reality from drivers) with Trip Orders (commercial records from accountants).

**Match Suggestion System:**
- System provides **suggestions** based on weighted scoring algorithm
- **Confidence levels:**
  - `full` (score = 1.0): All fields match — highest confidence, auto-confirm or minimal review
  - `partial` (score ≥ 0.3): Some fields match — Accountant decides whether to confirm or reject
  - `none` (score < 0.3): No meaningful match — treat as "no suggestion"
- **Matching fields & weights:**
  | Field | Weight | Description |
  |-------|--------|------------|
  | driver | 0.3 | Same driver |
  | client | 0.3 | Same client |
  | route | 0.2 | Same route |
  | containers | 0.2 | At least one overlapping container number |
- **Candidates filtering:** Only shows TOs/WOs that match on at least ONE of: driver, client, OR container overlap
- **No partial match?** → Show all TOs as candidates + allow Accountant to create a new TO

**Flow:**
1. System analyzes unmatched WOs and TOs, generates match suggestions with confidence scores
2. Accountant reviews suggestions sorted by score (highest first)
3. Accountant confirms or rejects each suggestion
4. If no good match exists, Accountant selects any TO as candidate or creates new TO
5. System links WO and TO via `TripOrderWorkOrder` join table
6. **Determine WO status:**
   - If TO has pricing data (`unit_price > 0`, `driver_salary > 0`) → WO status = `COMPLETED`
   - Else → WO status = `MATCHED`
7. **Sync financials:** WO's `driver_salary`, `allowance`, `earning` = TO's values. `WO.unit_price` stays 0.
8. **Determine TO status:** TO status → `COMPLETED`
9. Salary recalculation is auto-queued for the driver

**Rules:**
- A work order can only be matched once (status must not already be `MATCHED` or `COMPLETED`).
- One trip order can match multiple work orders.
- Both WOs and TOs can have 1, 2, or more containers (via child tables).
- Only accountants and superadmins can reconcile.
- This is a **human-in-the-loop** system — the software suggests, the Accountant decides.
- **Categories for UI:**
  - `matched` — WO and TO matched with complete pricing data
  - `matched_but_required_price_data` — matched but missing pricing (WO status = MATCHED, TO status = PENDING or DRAFT)
  - `not_match` — WO and TO don't match on criteria

### 3.7.1 TripOrderWorkOrder (Liên kết WO—TO)

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

### 3.8 Salary (Lương tài xế)

#### Salary Period Config (Cấu hình kỳ lương)
Singleton config defining salary period boundaries.

| Field | Type | Description |
|-------|------|-------------|
| from_day | int (1–28) | Start day of each period |
| to_day | int (1–28) | End day of each period |

**Default:** 1st → 28th of each month.

**Cross-month periods:** If `from_day > to_day` (e.g., 26th → 25th), the period crosses month boundary. The system automatically computes the correct start/end dates.

#### Salary Period (Kỳ lương)
Calculated salary for a driver over a period.

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
| total_deduction | int (VND) | Deductions (currently always 0 — future feature) |
| net_pay | int (VND) | = total_salary + total_allowance - total_deduction |
| status | `OPEN` → `CALCULATED` → `PAID` | Lifecycle |

**Salary Lifecycle:**
```
OPEN → CALCULATED (auto-computed by worker) → PAID (accountant marks as paid)
```

**Business Rules:**
- Salary calculation is **async** (background worker via arq/Redis).
- Calculation counts only **MATCHED** work orders within the date range.
- Calculation is **upsert** — if a salary period already exists for (driver_id, start_date, end_date), it's recalculated.
- Auto-triggered when: trip order created, work orders matched to trip, or accountant manually requests calculation.
- `price_per_order = total_salary / work_order_count` (integer division).
- **Deductions not yet implemented** (total_deduction always 0) — future: fuel, fines, advances.

---

## 4. Workflows

### 4.1 Driver's Daily Workflow

```
1. Driver logs in → sees own dashboard with today's work orders
2. Driver taps "Create Work Order" → fills in:
   - Select client (or leave blank if unknown)
   - Enter route
   - Add container(s): number + type (E20/E40/F20/F40) + optional photo
   - GPS captured automatically
3. System auto-matches pricing if (client, work_type, route) found in Pricing table
4. Work order saved (offline-capable — queued if no network)
5. Driver can view own work history
```

### 4.2 Accountant's Daily Workflow

```
1. Accountant logs in → sees dashboard with stats
2. Manage clients, routes, pricings as needed
3. Create Trip Orders (commercial records):
   - Select client, driver, route, container, work type
   - Enter pricing (unit_price, driver_salary, allowance)
   - Optionally match with existing work orders
4. Reconcile unmatched work orders with trip orders
5. Calculate salary for drivers (manual trigger or auto)
6. Mark salary periods as PAID when driver is paid
```

### 4.3 Director's View

```
1. Director logs in → sees overview dashboard:
   - Per-driver salary breakdown
   - Per-client revenue breakdown
   - Unmatched work order count (needs reconciliation)
   - Pending trip count
2. View detailed client jobs (per-client history)
3. View detailed driver jobs (per-driver history)
4. Manage user accounts (create, edit, deactivate)
5. View notifications
```

### 4.4 SuperAdmin's View

```
1. Same as director + accountant combined
2. Can delete vendors, deactivate users
3. Full access to salary configuration
4. User management with role assignment
```

---

## 5. Dashboard Metrics

The `/dashboard/summary` endpoint computes:

| Metric | Computation |
|--------|-------------|
| total_revenue | SUM of all TripOrder.revenue |
| total_expense | SUM of all WorkOrder.earning |
| trip_count | COUNT of all trip orders
| driver_salary_summary | For each driver: count of MATCHED work orders + total earnings |
| unmatched_work_order_count | COUNT of work orders NOT in TripOrderWorkOrder join table |
| pending_trip_count | COUNT of trip orders with status DRAFT |

---

## 6. Background Workers (arq)

| Task | Trigger | Description |
|------|---------|-------------|
| `calculate_salary_task` | Trip order created, reconciliation, manual | Computes salary for a driver over a date range |
| `send_notification_task` | Work order created | Pushes in-app notification via Redis |
| `geocode_work_order_task` | Work order created with GPS | Reverse-geocodes GPS → address |
| `geocode_container_task` | Container photo with GPS | Reverse-geocodes photo GPS → address |
| `generate_monthly_report_task` | Manual | Generates monthly revenue/expense report |

### Cron Jobs

| Schedule | Task | Description |
|----------|------|-------------|
| Daily 03:00 | `cleanup_expired_sessions` | Removes old sessions |
| Daily 03:30 | `cleanup_old_audit_logs` | Removes old audit logs |
| Daily 08:00 | `remind_salary_period_end` | Reminds about unpaid salary periods |
| Daily 01:00 | `recalculate_open_periods` | Recalculates salary periods still in OPEN/CALCULATED |

---

## 7. Notifications

- Stored in Redis sorted set per user: `notifications:user:{user_id}`
- Latest 50 notifications returned (newest first)
- Push notification infrastructure exists (VAPID keys, subscription management) but **not yet wired to frontend**
- Current: in-app notifications only (polled via API)

---

## 8. Data Model Summary

```
Vendor (nhà thầu)
  └── User/driver (tài xế) — driver.vendor = Vendor.name

Client (khách hàng)
  ├── Pricing (bảng giá) — per client + work_type + route
  │   └── PricingLine — sub-items (work_type + quantity)
  ├── WorkOrder (phiếu làm việc) — created by driver
  │   └── WorkOrderContainer — containers in the work order
  └── TripOrder (lệnh điều hành) — created by accountant
      └── TripOrderWorkOrder — join table (reconciliation)

Route (tuyến đường) — reference prices only
SalaryPeriodConfig (singleton) — period boundaries
SalaryPeriod (kỳ lương) — calculated per driver per period
```

---

## 9. Key Business Calculations

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

## 10. State Machine & Validation

### 10.1 Work Order State Machine

Implemented using `python-statemachine` library. State is persisted in database (WO.status), machine re-initializes on restart.

**States:**
- `PENDING` — No match found yet
- `MATCHED` — Match found with TO, but missing pricing data (driver_salary + allowance)
- `COMPLETED` — Match found with TO, pricing data complete

**Valid Transitions:**
- `PENDING → COMPLETED` (match found + pricing data provided at same time)
- `PENDING → MATCHED` (match found, no pricing data)
- `MATCHED → COMPLETED` (pricing data provided later via TO update or new bang gia)

**Triggers:**
- `PENDING → COMPLETED` or `PENDING → MATCHED` — when WO is matched to TO via reconcile endpoint
- `MATCHED → COMPLETED` — when linked TO is updated with pricing data or new bang gia is created (auto-recalc)

### 10.2 Trip Order State Machine

**States:**
- `DRAFT` — Missing required info (containers, client, route, or pricing)
- `PENDING` — All info provided, ready for matching
- `COMPLETED` — Match found with WO
- `CANCELLED` — Cancelled (final state)

**Valid Transitions:**
- `DRAFT → PENDING` — when all required fields are provided (containers, client, route, pricing)
- `PENDING → COMPLETED` — when match found with WO
- `DRAFT → CANCELLED` — while still in draft
- `PENDING → CANCELLED` — before matching

**Triggers:**
- Initial status is auto-determined on create: `DRAFT` if missing any required field, else `PENDING`
- `PENDING → COMPLETED` — when WO is matched to TO
- `DRAFT/PENDING → CANCELLED` — when accountant cancels the TO
- Cannot cancel `COMPLETED` TOs

### 10.3 ISO 6346 Container Number Validation

Backend validates all container numbers against ISO 6346 standard.

**Format:** `XXXX-NNNNNN-N`
- XXXX: 4 letters (owner code)
- NNNNNN: 6 digits (serial number)
- N: 1 digit (check digit)

**Validation:**
- Strict check: format + check digit calculation
- Check digit calculation: sum of (character_value × 2^position) % 11, with 10 → 0
- Implemented in `app/utils/iso6346.py`

**OCR Workflow:**
1. Driver uploads photo of container
2. AI (Gemini) attempts OCR extraction (max 2 attempts per user)
3. Backend validates extracted number against ISO 6346
4. If valid → auto-fill container number
5. If invalid → show error, allow retry or manual entry
6. After 2 failed attempts → require manual entry

**AI Service:**
- Provider: Google Gemini (`gemini-2.5-flash`)
- Prompt: Extract container number, return "NONE" if not found
- Response: Raw container number (11 characters)
- Timeout: 30 seconds
- Implemented in `app/services/ocr_service.py`

---


## 11. API Endpoints Reference

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
| POST | `/clients` | accountant, superadmin | Create |
| PUT | `/clients/{id}` | accountant, superadmin | Update |
| DELETE | `/clients/{id}` | accountant, superadmin | Delete (guarded) |

### Routes
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/routes` | accountant, director, superadmin | List (paginated) |
| POST | `/routes` | accountant, superadmin | Create |
| PUT | `/routes/{id}` | accountant, superadmin | Update |
| DELETE | `/routes/{id}` | accountant, superadmin | Delete |

### Pricings
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/pricings` | accountant, director, superadmin | List (paginated, filterable) |
| POST | `/pricings` | accountant, superadmin | Create |
| PUT | `/pricings/{id}` | accountant, superadmin | Update |
| DELETE | `/pricings/{id}` | accountant, superadmin | Delete |

### Work Orders
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/work-orders` | Any authenticated | List (filterable, driver sees own) |
| GET | `/work-orders/{id}` | Any authenticated | Get single |
| POST | `/work-orders` | driver | Create (auto-pricing lookup) |
| POST | `/work-orders/batch` | driver | Batch create (up to 50) |
| PUT | `/work-orders/{id}` | accountant, superadmin | Update |

### Trip Orders
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/trip-orders` | accountant, director, superadmin | List (filterable, paginated) |
| GET | `/trip-orders/{id}` | accountant, director, superadmin | Get single |
| POST | `/trip-orders` | accountant, superadmin | Create |
| PUT | `/trip-orders/{id}` | accountant, superadmin | Update |

### Reconciliation
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/reconcile` | accountant, superadmin | Match WO → TO |

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
| POST | `/vendors` | accountant, superadmin | Create |
| PUT | `/vendors/{id}` | accountant, superadmin | Update |
| DELETE | `/vendors/{id}` | superadmin | Delete (guarded) |

### Users
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/users` | director, superadmin | List (filterable by role) |
| POST | `/users` | director, superadmin | Create |
| PUT | `/users/{id}` | director, superadmin | Update |
| DELETE | `/users/{id}` | superadmin | Deactivate (soft delete) |

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
| 2026-04-30 | Initial creation — extracted from codebase audit |
