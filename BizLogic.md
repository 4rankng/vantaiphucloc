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
| CRUD vendors | ✅ | Read only | ✅ (no delete) | — |
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
| outstanding_debt | int (VND) | Amount owed to Phúc Lộc |

**Business Rules:**
- Cannot delete a client that has associated work orders or trip orders.
- `outstanding_debt` is a running total (currently not auto-updated — future: update when trip orders are invoiced).

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
| unit_price | int (VND) | Auto-filled from Pricing if match found, else 0 |
| driver_salary | int (VND) | Auto-filled from Pricing if match found, else 0 |
| allowance | int (VND) | Auto-filled from Pricing if match found, else 0 |
| earning | int (VND) | = driver_salary + allowance |
| pricing_id | int (FK)? | Link to the Pricing record that matched |
| status | `PENDING` → `PRICED` → `MATCHED` | Lifecycle status |

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
Driver creates WO → PENDING (no pricing match) or PRICED (pricing match found)
                          ↓
Accountant reconciles WO with a TripOrder → MATCHED
```

**Business Rules:**
- **Auto-pricing:** On creation, the system looks up `Pricing` by `(client_id, work_type, route)`. If found → status = `PRICED`, fills unit_price/driver_salary/allowance. If not found → status = `PENDING`, all financials = 0.
- **GPS capture:** Driver's GPS coordinates are captured at creation time. Background worker reverse-geocodes the address.
- **Offline support:** Drivers can create work orders offline. They are queued locally and synced when back online via `offlineQueue`. Batch creation supports up to 50 WOs at once.
- **One work order can have multiple containers** (e.g., a truck carrying 2 containers on one trip).
- When matched to a trip order, earning is recalculated from the trip order's `driver_salary + allowance`.

### 3.6 Trip Order (Lệnh điều hành)

Created by **accountants**. Represents the commercial/financial record of a trip — what the client is charged.

| Field | Type | Description |
|-------|------|-------------|
| trip_date | date | Date of the trip |
| client_id | int (FK) | Client being charged |
| client_name | string | Denormalized |
| work_type | WorkType | Container type |
| route | string | Route |
| tractor_plate | string | Truck plate |
| driver_id | int (FK) | Driver who drove |
| driver_name | string | Denormalized |
| container_number | string | Single container (one trip order = one container) |
| pricing_id | int (FK)? | Pricing used |
| unit_price | int (VND) | Revenue from client |
| driver_salary | int (VND) | Driver base pay |
| allowance | int (VND) | Driver allowance |
| revenue | int (VND) | = unit_price (client-facing revenue) |
| matched_work_order_ids | int[] | Work orders linked to this trip |
| status | `DRAFT` → `CONFIRMED` → `INVOICED` or `CANCELLED` | Lifecycle |

**Trip Order Lifecycle:**
```
Accountant creates TO → DRAFT
                          ↓ (confirm)
                     CONFIRMED
                          ↓ (issue invoice)
                     INVOICED

At any point → CANCELLED
```

**Business Rules:**
- A trip order represents **one container** movement (`container_number` is singular).
- A trip order can match **multiple work orders** (via `TripOrderWorkOrder` join table).
- When work orders are matched, their status is set to `MATCHED`.
- Salary recalculation is auto-triggered when trip order is created or when matched work orders change.

### 3.7 Reconciliation (Đối soát)

The process of matching Work Orders (physical reality from drivers) with Trip Orders (commercial records from accountants).

**Flow:**
1. Accountant selects a Work Order and a Trip Order
2. System links them via `TripOrderWorkOrder` join table
3. Work Order status → `MATCHED`
4. Work Order earning = Trip Order's `driver_salary + allowance`
5. Salary recalculation is auto-queued for the driver

**Rules:**
- A work order can only be matched once (status must not already be `MATCHED`).
- One trip order can match multiple work orders.
- Only accountants and superadmins can reconcile.

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
   - Total revenue, total expense, trip count
   - Outstanding debt (công nợ)
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
| trip_count | COUNT of all trip orders |
| active_trips | COUNT of trip orders with status DRAFT or CONFIRMED |
| outstanding_debt | SUM of Client.outstanding_debt |
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

### Outstanding debt (công nợ)
- `Client.outstanding_debt` — manual field, not auto-updated currently

---

## 10. Not Yet Implemented (Future)

These features are referenced in code comments or frontend TODOs but not yet built:

- [ ] **Auto-update outstanding_debt** — when trip order status → INVOICED, add to client's outstanding_debt
- [ ] **Deductions** — `total_deduction` in salary is always 0. Future: fuel, fines, advances
- [ ] **Invoice generation** — Trip Order → INVOICED status exists but no PDF/export
- [ ] **Push notifications** — Backend infrastructure ready (VAPID, subscriptions), frontend not wired
- [ ] **Vehicle management** — Tractor/trailer registry (currently just `tractor_plate` string on user)
- [ ] **Partner management** — Referenced in TODO comments
- [ ] **Expense tracking** — Referenced in TODO comments
- [ ] **Ledger/accounting** — Referenced in TODO comments
- [ ] **Monthly revenue chart** — `monthlyRevenue` field in dashboard API exists but returns empty array
- [ ] **Report generation** — Worker task `generate_monthly_report_task` exists but no UI trigger

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
