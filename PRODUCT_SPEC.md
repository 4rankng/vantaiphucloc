# Vantai Phuc Loc — Product Specification

> Container transport management platform for Phuc Loc Trading & Transport Co., Hai Phong, Vietnam.

## 1. Product Overview

**Vantai Phuc Loc** is a full-stack web application that manages container trucking operations: from booking orders through dispatch, delivery, reconciliation, and financial reporting. It serves four user roles across a React SPA frontend and a Python/FastAPI backend.

### Business Context

Phuc Loc operates a fleet of ~18 container trucks servicing port/depot locations in the Hai Phong area. The company hauls containers (20ft and 40ft, empty and laden) on behalf of shipping clients (Hai An Port, Glory Logistics, Conscience Shipping) between ports, warehouses, and depots.

### Core Workflow

```
Client sends booking → Accountant imports booked trips → Driver delivers trip
     → Accountant reconciles booked vs delivered → Director reviews P&L
```

---

## 2. User Roles

| Role | Vietnamese | Description |
|------|-----------|-------------|
| **Driver** | Tài xế | Mobile-first interface. Creates delivered trips, views history, manages profile. |
| **Accountant** | Kế toán | Manages bookings, reconciliation, pricing, clients/vendors, expenses, salary, and reports. |
| **Director** | Giám đốc | Oversees operations: user management, partners, pricing, trip review, P&L. |
| **SuperAdmin** | SuperAdmin | System administration, audit logs, platform settings. |

---

## 3. Domain Concepts

### 3.1 Partners

The system manages two categories of business partners:

- **Clients** (Chủ hàng) — Companies that book container transport. Each client has a unique code (e.g., `HAIAN`, `GLORY`, `CONSCIENCE`), tax code, address, and contact info.
- **Vendors** (Xe ngoài) — External truck operators that haul containers on Phuc Loc's behalf. Tracked separately for reconciliation and payment.

### 3.2 Trips (Two-Sided Model)

The system maintains two parallel trip records that get reconciled:

#### Booked Trip (Trip Order / Lệnh điều xe)
- Represents what the **client ordered** — imported from client Excel files or created manually.
- Contains: trip date, client, pickup/dropoff locations, container numbers, container type (E20/E40/F20/F40), revenue amount.
- Status flow: `DRAFT → PENDING → MATCHED → CONFIRMED → COMPLETED` (or `CANCELLED`).

#### Delivered Trip (Work Order / Phiếu giao xe)
- Represents what the **driver actually did** — created by driver from the mobile app or bulk-imported.
- Contains: trip date, client, pickup/dropoff locations, driver, vehicle plate, vendor (if external), vessel, container numbers with photos, GPS coordinates, revenue, driver salary, allowance.
- Status flow: `PENDING → MATCHED → COMPLETED` (or `CANCELLED`).

### 3.3 Reconciliation (Matching / Đối soát)

The core operational challenge: matching what was booked against what was delivered.

- A **BookedTrip** matches at most one **DeliveredTrip** (a container is on one truck).
- A **DeliveredTrip** can match multiple **BookedTrips** (a truck carries 1–2 containers).
- Each BookedTrip = 1 container from the client's Excel.
- Matching criteria scored 0–5: container number, trip date, pickup location, dropoff location, client.
- Supports: manual match, AI-assisted suggestions, bulk auto-match (full score only), unmatch with reason.

### 3.4 Container Types

| Code | Description |
|------|-------------|
| E20 | Empty 20-foot container |
| E40 | Empty 40-foot container |
| F20 | Full/Laden 20-foot container |
| F40 | Full/Laden 40-foot container |

### 3.5 Operation Types

| Code | Vietnamese | Description |
|------|-----------|-------------|
| XUAT_NHAP_TAU | Xuất/Nhập tàu | Export/import vessel operations |
| CHUYEN_BAI | Chuyển bãi | Yard transfer |
| LAY_VO_HA_HANG | Lấy vỏ hạ hàng | Pick empty, deliver laden |
| CHAY_SA_LAN | Chạy sà lan | Barge operations |
| DONG_KHO | Đóng kho | Warehouse stuffing |

### 3.6 Locations & Routes

- **Locations** are named places (ports, depots, warehouses) with optional GPS coordinates.
- **Location Aliases** allow fuzzy matching (e.g., "HAI AN" and "CANG HAI AN" map to the same location).
- **Routes** are implicit pickup→dropoff location pairs with associated pricing.
- GPS-aware location picker for drivers, with pinned locations from trip history.

### 3.7 Pricing

Pricing is per **client × route × container type**:

```
Pricing → [PricingLine]
  client_id
  pickup_location_id
  dropoff_location_id
  work_type (E20/E40/F20/F40)

PricingLine:
  quantity (tier)
  unit_price (VND)
  driver_salary (VND)
  allowance (VND)
```

Pricing is auto-applied when importing booked trips.

### 3.8 Vehicles & Driver Assignments

- **Vehicles** identified by license plate (e.g., `15C09877`).
- **VehicleDriver** tracks time-period assignments (a vehicle can have multiple drivers over time, with effective dates).
- Primary and secondary driver support per vehicle.

### 3.9 Financial

#### Driver Salary
- **Base salary**: Monthly fixed amount, append-only history with effective dates.
- **Productivity pay**: Per-trip driver_salary + allowance from pricing.
- **Salary period**: Configurable (default 21st to 20th of month).
- Total earnings = base salary (pro-rated) + sum of (driver_salary + allowance) per delivered trip.

#### Vehicle Expenses
- Categories: Fuel (XANG_DAU), Repairs (SUA_CHUA), Law/Permits (TIEN_LUAT), Other (KHAC).
- All expenses are per-vehicle.

#### P&L (Profit & Loss)
Per vehicle per month:
```
Profit = Revenue - (driver_salary + allowance + base_salary + fuel + repairs + law_permits + other)
```

---

## 4. Feature Inventory

### 4.1 Driver Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Home Dashboard** | Shows today's trips, pending count, recent activity | Built |
| **Create Delivered Trip** | Form with client, route, containers, photos, GPS | Built |
| **Edit Delivered Trip** | Modify pending trips only | Built |
| **OCR Container Scanner** | Camera-based container number recognition | Built |
| **Trip History** | Paginated list of all past trips | Built |
| **Trip Detail** | Full trip info with match status | Built |
| **GPS Route Suggestions** | Location suggestions based on GPS + frequency | Built |
| **Profile** | View/edit own profile | Built |
| **Push Notifications** | Web push subscription for trip alerts | Built |

### 4.2 Accountant Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Dashboard** | Revenue, expenses, trip counts, alerts, KPI trends | Built |
| **Client Management** | CRUD for clients (chủ hàng) | Built |
| **Vendor Management** | CRUD for vendors (xe ngoài) | Built |
| **Driver Management** | List drivers, create new drivers | Built |
| **Vehicle/Transporter Management** | List vehicles, assign drivers | Built |
| **Import Booked Trips** | Excel upload with AI column detection | Built |
| **Reconciliation (Đối soát)** | Manual + auto matching of booked vs delivered | Built |
| **Export Reports** | Excel export for reconciliation, salary | Built |
| **Vehicle Expenses** | CRUD for fuel, repairs, law/permits, other | Built |
| **Salary Dashboard** | All-driver salary summary, base salary config | Built |
| **P&L Report** | Monthly profit/loss by vehicle | Built |
| **Settings** | Salary period config (from_day/to_day) | Built |
| **Customer Settlement** | Generate billing Excel for clients | Built |

### 4.3 Director Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Dashboard** | Operational overview with KPIs | Built |
| **User Management** | Create/edit/delete users, role assignment | Built |
| **Partner Management** | CRUD for clients and vendors | Built |
| **Pricing Management** | CRUD for pricing tables by client × route | Built |
| **Trip Review** | View all trips, drill down by client/driver | Built |
| **Notifications** | View system notifications | Built |

### 4.4 SuperAdmin Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Dashboard** | System overview | Built |
| **Audit Logs** | Track all data changes | Built |

### 4.5 Cross-Cutting Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Authentication** | JWT login with username/phone/email, bcrypt passwords | Built |
| **Role-Based Access** | 4-role system with permission checks | Built |
| **Excel Import/Export** | Flexible column detection, AI-assisted parsing | Built |
| **Location Aliases** | Fuzzy matching with merge/promote | Built |
| **Geocoding** | Auto-geocode locations, driver GPS pins | Built |
| **AI Parsing** | Gemini-powered Excel structure detection | Built |
| **Offline Support** | Service worker caching for key data | Built |
| **Rate Limiting** | Login attempt throttling | Built |
| **Audit Trail** | Automatic change tracking on key entities | Built |

---

## 5. API Surface

### Base URL: `/api/v1`

| Context | Prefix | Endpoints |
|---------|--------|-----------|
| Auth | `/auth` | login, refresh, logout |
| Users | `/users` | CRUD, profile, change-password |
| Push | `/push` | subscribe, unsubscribe, vapid-key |
| Delivered Trips | `/delivered-trips` | CRUD, OCR, bulk-import, AI-parse, export |
| Booked Trips | `/booked-trips` | CRUD, import, export, search, apply-pricing |
| Reconciliation | `/reconcile` | match, unmatch, suggest, auto-match, bulk-match, export |
| Imports | `/imports` | customer-excel preview/commit, customer-pricing preview/commit |
| Vendor Recon | `/vendor-reconciliation` | upload, list, apply, export |
| Customer Recon | `/reconcile/customer-files` | preview, commit, upload-response |
| Clients | `/clients` | CRUD |
| Vendors | `/vendors` | CRUD |
| Locations | `/locations` | CRUD, nearby, pin |
| Location Aliases | `/location-aliases` | CRUD, promote, merge |
| Pricings | `/pricings` | CRUD |
| Drivers | `/drivers` | list, create, update, assign-vehicle |
| Vehicles | `/vehicles` | list, create |
| Vehicle Drivers | `/vehicle-drivers` | list, create, delete |
| Vehicle Expenses | `/vehicle-expenses` | CRUD |
| Salary | `/salary` | dashboard, earnings, export, base-salary, P&L |
| Salary Config | `/salary/config` | get, update period |
| Reports | `/reports` | customer-settlement export |
| Dashboard | `/dashboard` | summary, KPI trends, vehicle-P&L, trip-stats, notifications |
| Audit | `/audit-logs` | list |
| Health | `/health` | system, worker, database |
| Jobs | `/jobs/{id}` | async job status |

---

## 6. Data Model

### Entity Relationship Diagram (simplified)

```
Client ←──── BookedTrip ←── Reconciliation ──→ DeliveredTrip ────→ Client
    │              │                                    │
    │         BookedTripContainer              DeliveredTripContainer
    │                                                   │
    └─── Pricing → PricingLine                    (photos, GPS)
            │
     (pickup/dropoff → Location)

Location ←── LocationAlias
      ↑
  (geocoded, GPS pins)

Vehicle ←── VehicleDriver ──→ User (driver)
    │
    └── VehicleExpense

User (driver) ←── DriverSalaryConfig

Vendor ←── VendorReconciliationImport → VendorReconciliationRow

Client ←── CustomerReconciliationImport → CustomerReconciliationRow
```

### Key Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | All system users (4 roles) | username, phone, hashed_password, role, is_active |
| `clients` | Customer companies | code, name, tax_code, address |
| `vendors` | External truck operators | code, name, phone |
| `locations` | Named places with GPS | name, lat, lng |
| `location_aliases` | Alternative names for locations | alias, location_id |
| `vehicles` | Truck fleet | plate, is_active |
| `vehicle_drivers` | Time-period driver assignments | vehicle_id, driver_id, effective_from |
| `booked_trips` | Client orders | trip_date, client_id, revenue, status |
| `booked_trip_containers` | Containers per booking | container_number, cont_type |
| `delivered_trips` | Actual deliveries | driver_id, vehicle_id, revenue, GPS, vessel |
| `delivered_trip_containers` | Containers per delivery | container_number, photo_url, GPS |
| `matched_trips` | Reconciliation links | booked_trip_id, delivered_trip_id, match_score |
| `pricings` | Rate tables | client_id, work_type, pickup/dropoff location |
| `pricing_lines` | Rate breakdown | unit_price, driver_salary, allowance |
| `vehicle_expenses` | Fleet costs | vehicle_id, category, amount |
| `driver_salary_configs` | Base salary history | driver_id, base_salary, effective_from |
| `settings` | System config (key-value) | key, value |
| `audit_logs` | Change tracking | table_name, action, old/new values |

---

## 7. Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL (via asyncpg + SQLAlchemy async)
- **Auth**: JWT (access 24h + refresh 7d), bcrypt password hashing
- **AI**: Google Gemini for Excel parsing, OCR for container recognition
- **Background Jobs**: Custom worker with async task queue
- **Migrations**: Alembic
- **Architecture**: Clean Architecture / Domain-Driven Design
  - 6 bounded contexts: Identity, Operations, CustomerPricing, Fleet, Payroll, Billing, Platform

### Frontend
- **Framework**: React 18 + TypeScript
- **Routing**: React Router v6 (lazy-loaded routes)
- **Styling**: Tailwind CSS with custom theme system
- **State**: React Query + Context API
- **PWA**: Service worker for offline support
- **Build**: Vite

### Infrastructure
- **Database**: PostgreSQL 15+
- **Caching**: Redis (rate limiting, notifications)
- **File Storage**: Local filesystem (photos, Excel exports)

---

## 8. Seed Data

The dev seed (`backend/app/seed_dev.py`) creates:

| Entity | Count | Details |
|--------|-------|---------|
| Staff users | 3 | admin (superadmin), giamdoc (director), ketoan (accountant) |
| Driver users | 20 | With Vietnamese names, phone numbers |
| Vehicles | 18 | License plates 15C/15H series |
| Vehicle-driver links | 23 | Including secondary driver assignments |
| Locations | 7 | HAI AN, NHĐV, VIP GREEN, NAM ĐỊNH VỤ, ĐÌNH VŨ, GREEN PORT, CHU VĂN AN |
| Clients | 3 | HAIAN, GLORY, CONSCIENCE |
| Vendors | 2 | XENGOAI01, XENGOAI02 |
| Pricings | 48 | All client × route × container type combinations |
| Delivered trips | ~5,778 | 4 months (Feb–May 2026), ~80/vehicle/month |
| Booked trips | ~5,829 | Including 51 PENDING (unmatched) |
| Matched trips | ~5,778 | 1:1 reconciliation records |
| Vehicle expenses | ~103 | Fuel, repairs, law/permits, other |
| Salary configs | 20 | Per-driver base salary |

All users share password: `admin123`
