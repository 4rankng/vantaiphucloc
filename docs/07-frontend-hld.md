# TTransport Frontend — High-Level Design Document

> Phase 1 MVP — Page inventory, navigation, component mapping

## 1. Navigation Architecture

### Desktop: Left Sidebar
```
┌─────────────────────────────────────┐
│  🚛 TTransport                      │
│─────────────────────────────────────│
│  📊 Tổng quan          (Dashboard)  │
│  🚚 Chuyến xe          (Trips)      │
│  🚛 Đầu xe             (Fleet)      │
│  👥 Khách hàng         (Clients)    │
│  ⚠️ Cảnh báo           (Alerts)     │
│─────────────────────────────────────│
│  💰 Doanh thu          (Revenue)    │ ← Kế toán + Giám đốc
│  📄 Công nợ            (Receivable) │
│  🧾 Chi phí            (Expenses)   │
│─────────────────────────────────────│
│  👤 Tài xế             (Drivers)    │ ← Giám đốc
│  📋 Nhật ký            (Audit Log)  │
│  ⚙️ Cài đặt            (Settings)   │
│  👤 Tài khoản          (Account)    │
└─────────────────────────────────────┘
```

### Mobile: Bottom Navigation (4 tabs + overflow)
```
┌──────────────────────────────────────┐
│  🏠     🚚     ⚠️     👤            │
│  Home   Trips  Alerts  Account       │
└──────────────────────────────────────┘
```
- Driver: Home = My Trips, Account = My Income
- Office roles: Home = Dashboard, Account = Settings

### Role-Based Visibility

| Menu Item | Giám đốc | Điều hành | Kế toán | Tài xế |
|-----------|:--------:|:---------:|:-------:|:------:|
| Tổng quan | ✅ | ✅ | ✅ | — |
| Chuyến xe | ✅ | ✅ | ✅ (read) | ✅ (own) |
| Đầu xe | ✅ | ✅ (read) | — | — |
| Khách hàng | ✅ | ✅ | ✅ | — |
| Cảnh báo | ✅ | ✅ | — | — |
| Doanh thu | ✅ | — | ✅ | — |
| Công nợ | ✅ | — | ✅ | — |
| Chi phí | ✅ | ✅ (approve) | ✅ (approve) | ✅ (submit) |
| Tài xế | ✅ | — | — | — |
| Nhật ký | ✅ | — | — | — |
| Cài đặt | ✅ | — | — | — |
| Tài khoản | ✅ | ✅ | ✅ | ✅ |

---

## 2. Page Inventory — 18 Pages Total

### 2.1 Shared Pages (All Roles)

#### P01: Đăng nhập (`/login`)
- **Purpose:** Username/password authentication
- **Access:** Public (redirect to role dashboard if already logged in)
- **Components:** LoginForm, ThemeToggle, ErrorBoundary
- **Layout:** Centered card, no sidebar/nav

#### P02: Tổng quan / Dashboard (`/`)
- **Purpose:** Role-specific landing page
- **Access:** All authenticated users
- **Content varies by role** (see P03-P06 below)

#### P03: Tài khoản (`/account`)
- **Purpose:** Change password, profile info
- **Access:** All authenticated users
- **Components:** AccountForm, PasswordChangeForm
- **Layout:** Simple form page

---

### 2.2 Director Pages (Giám đốc)

#### P04: Director Dashboard (`/` role=director)
- **Purpose:** Fleet status, revenue vs cost, top violators, orphan count
- **Widgets:**
  - MetricRow: Active trips | Idle vehicles | Revenue today | Orphan trips
  - ChartRow: Revenue vs Cost (Area) | Fleet utilization (Bar)
  - Top 5 drivers (DataTable) | Top 5 vehicles (DataTable)
  - Recent alerts (ActivityFeed)
- **Polling:** 30s refresh for active trips count
- **User Stories:** US-7.1, US-7.2

#### P05: Fleet Management (`/fleet`)
- **Purpose:** Vehicle registry, status, driver assignment
- **Widgets:**
  - MetricRow: Total | Active | Idle | Maintenance
  - DataTable: All vehicles with status badges, driver assignment
  - VehicleForm (Dialog): Add/edit vehicle
  - VehicleDetail (Sheet): Status history, assigned driver
- **User Stories:** US-2.1, US-2.2, US-2.3

#### P06: Client Management (`/clients`)
- **Purpose:** CRUD chủ hàng, view receivables per client
- **Widgets:**
  - SearchBar + DataTable: Client list
  - ClientDetail (Sheet): Contact info, receivable summary, trip history
  - ClientForm (Dialog): Add/edit client
- **User Stories:** US-3.2 (assign client to trip)

#### P07: Alerts & Violations (`/alerts`)
- **Purpose:** System-generated alerts, dispatcher review
- **Widgets:**
  - MetricRow: Total alerts | Unresolved | Fuel anomalies | Time anomalies
  - FilterBar: By type, status, driver
  - AlertList: Cards with severity badges, evidence photos, GPS data
  - AlertDetail (Sheet): Timeline, evidence, action buttons
- **Polling:** 15s for new alerts
- **User Stories:** US-4.1, US-4.2, US-4.4

#### P08: Driver Management (`/drivers`)
- **Purpose:** Driver list, KPI scores, violation count
- **Widgets:**
  - DataTable: Name, vehicle, KPI score, violations, trips count
  - DriverDetail (Sheet): Violation history, trip history
  - KPIBadge per driver (green/yellow/red)
- **User Stories:** US-6.1, US-6.5

#### P09: Revenue & Finance (`/revenue`)
- **Purpose:** Revenue vs cost breakdown, P&L per vehicle
- **Widgets:**
  - TimeRangePicker (Hôm nay / Tuần / Tháng / Quý)
  - MetricRow: Revenue | Cost | Profit | Margin %
  - ChartRow: Revenue vs Cost (Bar) | Profit trend (Area)
  - DataTable: P&L per vehicle (revenue - fuel - tolls - repairs - driver pay = net)
- **User Stories:** US-5.6, US-5.7

#### P10: Audit Log (`/audit-log`)
- **Purpose:** Who did what, when, old/new values
- **Widgets:**
  - FilterBar: By user, entity type, date range
  - DataTable: Timestamp, user, action, entity, old→new diff
- **User Stories:** US-1.7

#### P11: Settings (`/settings`)
- **Purpose:** User management (CRUD), fuel quotas, system config
- **Widgets:**
  - UserManagement: DataTable + UserForm (Dialog)
  - FuelQuotaConfig: Default liters/km per vehicle type
  - NotificationSettings: Alert thresholds
- **User Stories:** US-1.4, US-1.5, US-1.6

---

### 2.3 Dispatcher Pages (Điều hành)

#### P12: Dispatcher Dashboard (`/` role=dispatcher)
- **Purpose:** Active trips map, pending alerts, trip timeline
- **Widgets:**
  - MetricRow: Active trips | Pending alerts | Completing today | Unassigned drivers
  - ActiveTripsTimeline: Live list of in-progress trips
  - AlertsPreview: Top 5 unresolved alerts
  - QuickActions: Create Trip button
- **Polling:** 15s for trip status updates
- **User Stories:** US-7.1

#### P13: Trip Management (`/trips`)
- **Purpose:** Create, assign, monitor trips
- **Widgets:**
  - FilterBar: By status, driver, vehicle, date
  - DataTable: Trip list with status badges, driver, vehicle, route
  - TripForm (Dialog/Page): Create new trip (assign vehicle, driver, route, client)
  - TripDetail (Sheet): Full timeline, photos, expenses, GPS stamps
- **User Stories:** US-3.1, US-3.2, US-3.9, US-3.12

#### P14: Expense Review (`/expenses/review`)
- **Purpose:** Approve/reject driver expense submissions
- **Widgets:**
  - MetricRow: Pending | Approved | Rejected | Total amount
  - ExpenseList: Cards with receipt photo, amount, category, driver
  - ExpenseDetail (Sheet): Full receipt, GPS, approve/reject buttons
- **User Stories:** US-3.8, US-5.2

---

### 2.4 Accountant Pages (Kế toán)

#### P15: Accountant Dashboard (`/` role=accountant)
- **Purpose:** Pending expenses, receivables summary, orphan trips
- **Widgets:**
  - MetricRow: Pending expenses | Orphan trips | Total receivable | Overdue
  - OrphanTripAlert: Orange banner + list
  - ReceivablesSummary: Top 5 clients by unpaid amount
  - ExpenseApprovalQueue: Quick approve cards
- **User Stories:** US-3.10, US-5.1

#### P16: Receivables (`/receivables`)
- **Purpose:** Client receivables, mark as paid, generate invoices
- **Widgets:**
  - DataTable: Client | Total | Paid | Unpaid | Last payment
  - ReceivableDetail (Sheet): Trip list, payment history
  - PaymentForm (Dialog): Record payment (partial/full)
  - InvoiceActions: Group trips by client → Generate PDF invoice
  - OrphanTripBanner: Block month-end close if orphan trips exist
- **User Stories:** US-3.10, US-3.11, US-5.3, US-5.4, US-5.5

#### P17: Trip Costs (`/trip-costs`)
- **Purpose:** View completed trip cost breakdowns
- **Widgets:**
  - FilterBar: By client, date range, driver
  - DataTable: Trip | Client | Revenue | Fuel | Tolls | Repairs | Driver pay | Net
  - TripCostDetail (Sheet): Full breakdown with receipt photos
- **User Stories:** US-5.1, US-5.2

---

### 2.5 Driver Pages (Mobile-first PWA)

#### P18: Driver Home (`/` role=driver)
- **Purpose:** My trips, status updates, photo/expense submission
- **Layout:** Mobile-first, bottom nav, no sidebar
- **Tabs:**
  - **Chuyến của tôi:** Active trip card with status buttons (Nhận ca → Đang chạy → Đến nơi → Hoàn thành)
  - **Chụp ảnh:** Camera capture for container pickup/delivery + OCR result
  - **Chi phí:** Submit fuel/expense with photo receipt
  - **Thu nhập:** Today's income, this month's summary
- **Offline:** Queue all submissions when offline, auto-sync
- **User Stories:** US-8.1 to US-8.9

---

## 3. Page Count Summary

| Role | Dashboard | CRUD Pages | Detail/Action Pages | Total |
|------|:---------:|:----------:|:-------------------:|:-----:|
| Shared | 1 (login) | 1 (account) | — | 2 |
| Director | 1 | 5 | 1 (audit) | 7 |
| Dispatcher | 1 | 2 | — | 3 |
| Accountant | 1 | 2 | — | 3 |
| Driver | 1 (mobile) | — | — | 1 |
| **Total** | | | | **16 unique pages** |

Note: Some pages are shared (e.g., Trips visible to multiple roles but with different permissions).

---

## 4. Shared Page Patterns

Every page follows this composition:

```
DashboardShell (title + actions)
  └── DashboardSection
      ├── MetricRow (4 MetricCards)
      ├── ChartRow (2 ChartCards)
      └── DataTable (or ActivityFeed)
```

### Dialog/Sheet Pattern
- **Create/Edit:** Open in Dialog (modal) for simple forms
- **Detail/View:** Open in Sheet (slide-over panel) for rich detail
- **Delete:** Confirmation Dialog

### Error Boundaries per Page
```
ErrorBoundary level="app"
  └── ErrorBoundary level="page"
      ├── MetricRow ← ErrorBoundary level="component" per card
      ├── ChartRow  ← ErrorBoundary level="component" per chart
      └── DataTable ← ErrorBoundary level="component"
```

If MetricCard fails → only that card shows InlineError. Chart and table still work.

---

## 5. Component → Page Mapping

| Component | Used In |
|-----------|---------|
| MetricCard | P04, P05, P07, P12, P14, P15 |
| ChartCard + Charts | P04, P09, P12 |
| DataTable | P05, P06, P07, P08, P09, P10, P13, P16, P17 |
| KPIBadge | P07, P08 |
| TimeRangePicker | P04, P09 |
| DashboardShell | All dashboards |
| StatusBadge | P05, P13, P14 |
| SearchBar | P06, P08, P10, P13 |
| ActivityFeed | P04, P12 |
| ErrorBoundary | All pages |
| OfflineIndicator | All pages |
| GlassCard | P18 (Driver) |
| SegmentedControl | P18 (Driver tabs) |
| FloatingActionButton | P13, P18 |

---

## 6. Responsive Strategy

| Breakpoint | Layout |
|-----------|--------|
| Desktop (≥1024px) | Sidebar (240px) + Content area |
| Tablet (768-1023px) | Collapsed sidebar (icons only) + Content |
| Mobile (<768px) | Bottom nav + Full-width content |

Driver pages: Always mobile layout, no sidebar.

---

## 7. Route Structure

```
/login                          → P01 Login
/                               → P02 Dashboard (role-based)
/account                        → P03 Account
/fleet                          → P05 Fleet (Director, Dispatcher)
/clients                        → P06 Clients
/alerts                         → P07 Alerts
/drivers                        → P08 Drivers (Director)
/revenue                        → P09 Revenue (Director)
/audit-log                      → P10 Audit Log (Director)
/settings                       → P11 Settings (Director)
/trips                          → P13 Trip Management
/trips/:id                      → Trip Detail (Sheet)
/trips/new                      → Create Trip (Dialog)
/expenses/review                → P14 Expense Review
/receivables                    → P16 Receivables
/trip-costs                     → P17 Trip Costs
/driver                         → P18 Driver Home (mobile)
```

---

## 8. Data Flow Architecture

```
API Client (Axios + interceptors)
  ├── useApi<T>() → loading/error/data/retry/queue
  ├── usePolling<T>() → auto-refresh with backoff
  └── OfflineContext → IndexedDB queue → auto-sync

Error Flow:
  API → Axios interceptor → AppError → Vietnamese message
  → ErrorBoundary catches → InlineError at component
  → User sees: "Chuyến xe #123 — Không thể kết nối" + [Thử lại]
```

---

## 9. Implementation Priority (Phase 1)

### Sprint 1: Core Shell
1. Login page (P01)
2. Role-based routing + sidebar/nav
3. Dashboard shell + 4 role dashboards (P04, P12, P15, P18)

### Sprint 2: Trip Lifecycle
4. Trip management (P13)
5. Fleet management (P05)
6. Driver mobile experience (P18)

### Sprint 3: Financial
7. Expense review (P14)
8. Receivables + invoices (P16)
9. Trip costs (P17)

### Sprint 4: Intelligence
10. Alerts system (P07)
11. Revenue dashboard (P09)
12. Driver KPI (P08)
13. Audit log (P10)
14. Settings (P11)
15. Client management (P06)
