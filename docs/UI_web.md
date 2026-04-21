# TTransport — Web Dashboard UI Design (Mobile-First)

> Responsive web app for Giám đốc, Điều hành, Kế toán.
> **Mobile-first**: bottom nav on mobile, sidebar on desktop.
> All Vietnamese UI. Built with React + shadcn/ui + Tailwind + Recharts.

---

## 1. Navigation Strategy

### Mobile (<1024px): Bottom Navigation
Same pattern as driver app — max 4 items, overflow into grid menu.

### Desktop (≥1024px): Collapsible Sidebar
Full menu visible, collapsible to icon-only mode.

### Switching Logic
```
if (viewport < 1024px):
  → Bottom nav (fixed, 4 items)
  → No sidebar
  → Pages full-width with safe area padding
  → Sheets/drawers instead of modals

if (viewport ≥ 1024px):
  → Sidebar (collapsible)
  → No bottom nav
  → Pages in content area with sidebar offset
  → Modals OK
```

---

## 2. Bottom Navigation (Mobile) / Sidebar (Desktop)

### Role: Giám đốc (Director)

| # | Icon | Label | Mobile Route | Desktop Sidebar Group | Sub-items |
|---|------|-------|-------------|----------------------|-----------|
| 1 | 📊 | Tổng quan | `/director/dashboard` | Tổng quan | Dashboard |
| 2 | 🚛 | Vận tải | `/director/fleet` | Vận tải | Đội xe, Chuyến xe, Tuyến đường, Bảng giá cước, Định mức dầu |
| 3 | 💰 | Tài chính | `/director/finance` | Tài chính | Công nợ, Hóa đơn, P&L đầu xe, Chốt sổ |
| 4 | ☰ | Thêm | `/director/more` | — | Cảnh báo, Tài xế KPI, Khách hàng, Hồ sơ, Cài đặt, Audit Log |

### Role: Điều hành (Dispatcher)

| # | Icon | Label | Mobile Route | Desktop Sidebar Group | Sub-items |
|---|------|-------|-------------|----------------------|-----------|
| 1 | 📍 | Chuyến | `/dispatcher/trips` | Chuyến xe | Chuyến đang chạy, Tạo booking, Bản đồ |
| 2 | ⚠️ | Cảnh báo | `/dispatcher/alerts` | Cảnh báo | Chờ xử lý, Đã xử lý |
| 3 | 🚛 | Đội xe | `/dispatcher/fleet` | Đội xe | Xe, Tài xế, Tuyến đường, Geofence |
| 4 | ☰ | Thêm | `/dispatcher/more` | — | Khách hàng, Chi phí, Hồ sơ, Cài đặt |

### Role: Kế toán (Accountant)

| # | Icon | Label | Mobile Route | Desktop Sidebar Group | Sub-items |
|---|------|-------|-------------|----------------------|-----------|
| 1 | 🧾 | Chi phí | `/accountant/expenses` | Chi phí | Chờ duyệt, Đã duyệt, Từ chối |
| 2 | 💰 | Công nợ | `/accountant/receivables` | Công nợ | Tổng hợp, Aging (T1-T4+), Chi tiết KH |
| 3 | 📄 | Hóa đơn | `/accountant/invoices` | Hóa đơn | Danh sách, Tạo HĐ, Chốt sổ |
| 4 | ☰ | Thêm | `/accountant/more` | — | Chuyến mồ côi, Báo cáo, Hồ sơ, Cài đặt |

---

## 3. Page Inventory

### 3.1 Giám đốc Pages (12 pages)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| D01 | Director Dashboard | `/director/dashboard` | KPI overview, revenue, fleet status, top drivers, alerts summary |
| D02 | Fleet Overview | `/director/fleet` | All vehicles with status, filter by state |
| D03 | Vehicle Detail | `/director/fleet/:id` | Single vehicle: P&L, trips, driver, insurance, parts |
| D04 | Trip List | `/director/trips` | All trips, filter by status/date/client |
| D05 | Trip Detail | `/director/trips/:id` | Full trip: timeline, GPS trail, expenses, photos, OCR |
| D06 | Route List | `/director/routes` | Routes with pricing + fuel quotas |
| D07 | Client List | `/director/clients` | All clients, aging badge, status |
| D08 | Client Detail | `/director/clients/:id` | Client: trips, invoices, aging, payment history |
| D09 | Driver KPI | `/director/drivers` | Driver ranking, KPI scores, violation details |
| D10 | Finance Summary | `/director/finance` | Revenue, costs, profit by vehicle, aging overview |
| D11 | Vehicle P&L | `/director/finance/pnl` | Per-vehicle profit & loss report |
| D12 | Audit Log | `/director/audit` | Full audit trail, filter by user/entity/date |

### 3.2 Điều hành Pages (10 pages)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| O01 | Active Trips | `/dispatcher/trips` | Currently running trips + map view |
| O02 | Create Booking | `/dispatcher/bookings/new` | New booking form, select client/route/vehicle |
| O03 | Booking Detail | `/dispatcher/bookings/:id` | Booking details, approve/reject |
| O04 | Trip Detail | `/dispatcher/trips/:id` | Live trip: GPS map, timeline, checkpoint status |
| O05 | Fleet Map | `/dispatcher/map` | Map with all vehicle positions |
| O06 | Alert List | `/dispatcher/alerts` | Alerts pending, filter by type/severity |
| O07 | Alert Detail | `/dispatcher/alerts/:id` | Alert evidence: GPS, photos, comparison data, resolve |
| O08 | Vehicle List | `/dispatcher/vehicles` | Vehicles with status, assign driver |
| O09 | Driver List | `/dispatcher/drivers` | Drivers with online/offline status, GPLX expiry |
| O10 | Route Geofences | `/dispatcher/routes/geofences` | Configure geofence zones per route |

### 3.3 Kế toán Pages (11 pages)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| A01 | Expense List | `/accountant/expenses` | Pending expenses for approval |
| A02 | Expense Detail | `/accountant/expenses/:id` | Receipt photo, amount, compare with quota, approve/reject |
| A03 | Receivables Summary | `/accountant/receivables` | All clients with balance, aging badges |
| A04 | Client Receivable | `/accountant/receivables/:clientId` | Detail: GBN history, payments, aging breakdown |
| A05 | Invoice List | `/accountant/invoices` | All invoices by status |
| A06 | Create Invoice | `/accountant/invoices/new` | Select trips by client → generate PDF |
| A07 | Invoice Detail | `/accountant/invoices/:id` | Invoice PDF, payment history, record payment |
| A08 | Orphan Trips | `/accountant/orphans` | Trips without client, assign client |
| A09 | Period Close | `/accountant/close` | Month-end close: check orphans, lock data |
| A10 | Report Center | `/accountant/reports` | P&L by vehicle, expense breakdown, aging export |
| A11 | Client Detail | `/accountant/clients/:id` | Client financial: invoices, payments, balance |

**Total: 33 pages**

---

## 4. Shared Layout Components

### BottomNav (Mobile)

```
┌──────────┬──────────┬──────────┬──────────┐
│ 📊       │ 🚛       │ 💰       │ ☰        │
│ Tổng quan │ Vận tải  │ Tài chính│ Thêm      │
└──────────┴──────────┴──────────┴──────────┘
```

| Prop | Type | Description |
|------|------|-------------|
| `items` | `NavItem[]` | 4 items: icon, label, route, badge_count |
| `active` | `string` | Current route |
| `role` | `'director' \| 'dispatcher' \| 'accountant'` | Determines items |

### Sidebar (Desktop)

```
┌─────────────────┬──────────────────────────┐
│ 🪐 TTransport    │                          │
│                 │     [Content Area]        │
│ 📊 Tổng quan     │                          │
│                 │                          │
│ 🚛 Vận tải  ▸   │                          │
│  ├ Đội xe       │                          │
│  ├ Chuyến xe    │                          │
│  ├ Tuyến đường  │                          │
│  └ Bảng giá     │                          │
│                 │                          │
│ 💰 Tài chính ▸  │                          │
│  ├ Công nợ      │                          │
│  ├ Hóa đơn      │                          │
│  ├ P&L          │                          │
│  └ Chốt sổ      │                          │
│                 │                          │
│ ⚠️ Cảnh báo (3)  │                          │
│ 👥 Tài xế       │                          │
│ 🏢 Khách hàng   │                          │
│ 📋 Audit Log    │                          │
│                 │                          │
│ ─────────────── │                          │
│ 👤 An ▸         │                          │
└─────────────────┴──────────────────────────┘
```

| Prop | Type | Description |
|------|------|-------------|
| `groups` | `SidebarGroup[]` | Groups with sub-items |
| `collapsed` | `boolean` | Icon-only mode |
| `role` | `string` | Current user role |
| `onToggle` | `() => void` | Collapse/expand |

### MoreGrid (Mobile Overflow Menu)

```
┌─────────────────────────────────┐
│                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐ │
│  │ ⚠️   │  │ 👥   │  │ 🏢   │ │
│  │Cảnh  │  │Tài   │  │Khách │ │
│  │báo(3)│  │xế    │  │hàng  │ │
│  └──────┘  └──────┘  └──────┘ │
│                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐ │
│  │ 📋   │  │ 👤   │  │ ⚙️   │ │
│  │Audit │  │Hồ sơ │  │Cài   │ │
│  │Log   │  │      │  │đặt   │ │
│  └──────┘  └──────┘  └──────┘ │
│                                 │
└─────────────────────────────────┘
```

| Prop | Type | Description |
|------|------|-------------|
| `items` | `GridItem[]` | icon, label, badge?, route |
| `columns` | `3` | Fixed 3-column grid |

### PageShell

Every page wrapped in PageShell:

```
┌─────────────────────────────────┐
│ [Header] — title, back, actions │  Fixed top
├─────────────────────────────────┤
│                                 │
│        [Scrollable Content]     │
│                                 │
├──────┬──────┬──────┬───────────┤
│ Nav  │ Nav  │ Nav  │ Nav       │  Fixed bottom (mobile only)
└──────┴──────┴──────┴───────────┘
```

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Header title |
| `showBack` | `boolean` | Back arrow on mobile |
| `actions` | `ReactNode` | Header right buttons |
| `scroll` | `boolean` | Content scrollable (default true) |

---

## 5. Page Layouts — Giám đốc

### D01: Director Dashboard

**The main landing page.** Mobile: vertical scroll. Desktop: responsive grid.

**Mobile layout:**
```
┌─────────────────────────────────┐
│ 🪐 Tổng quan              🔔 👤 │ Header
├─────────────────────────────────┤
│                                 │
│  ┌───────┬───────┬───────┐     │
│  │ 8     │ 3     │ 1     │     │ MetricRow (3-col)
│  │ Đang  │ Rảnh  │ Sửa   │     │
│  │ chạy  │       │ chữa  │     │
│  └───────┴───────┴───────┘     │
│                                 │
│  ┌───────────────────────┐     │
│  │ 4     ⚠️ Nợ quá hạn  │     │ MetricRow (2-col)
│  │ Mồ côi                │     │
│  └───────────────────────┘     │
│                                 │
│  Doanh thu tháng 4 ──────      │  SectionHeader
│  ┌───────────────────────┐     │
│  │ [Revenue Bar Chart]   │     │  ChartCard (full width)
│  │ ▓▓▓▓▓▓▓░░░ 4.2B / 5B │     │
│  └───────────────────────┘     │
│                                 │
│  Top 5 tài xế ──────────       │  SectionHeader
│  1. Tuấn  98.0% ✅             │  DriverRankItem
│  2. Hoàng 93.3% ✅             │
│  3. Bình  85.0% ⚠️             │
│  ┌───────────────────────┐     │
│  │ [Xem tất cả →]        │     │  Link → D09
│  └───────────────────────┘     │
│                                 │
│  Cảnh báo chưa xử lý ───       │  SectionHeader
│  ⚠️ Fuel TR-102 (+31%)         │  AlertSummaryItem
│  ⚠️ Idle TR-107 (45min)       │
│  ⚠️ Time TR-103 (+50%)        │
│  [Xem tất cả →]                │
│                                 │
│  P&L đầu xe ───────────        │  SectionHeader
│  ┌───────┬───────┬───────┐     │
│  │51F-   │51F-   │51F-   │     │  VehiclePLCard (grid)
│  │136.31 │139.82 │070.63 │     │
│  │+18.1M │+12.3M │-2.1M  │     │  profit/loss color
│  └───────┴───────┴───────┘     │
│                                 │
├──────┬──────┬──────┬───────────┤
│ 📊   │ 🚛   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

**Desktop layout (≥1024px):**
```
┌──────────┬──────────────────────────────────────┐
│ Sidebar  │  Dashboard                            │
│          │  ┌──────┬──────┬──────┬──────┐       │
│          │  │ 8    │ 3    │ 1    │ 4    │       │
│          │  │Chạy  │Rảnh  │SC    │Mồ côi│       │
│          │  └──────┴──────┴──────┴──────┘       │
│          │                                       │
│          │  ┌────────────────┬─────────────┐    │
│          │  │ Revenue Chart  │ Top 5 Drivers│    │
│          │  │ [BarChart]     │ 1. Tuấn 98%  │    │
│          │  │                │ 2. Hoàng 93%  │    │
│          │  └────────────────┴─────────────┘    │
│          │                                       │
│          │  ┌────────────────┬─────────────┐    │
│          │  │ Alerts (3)     │ Vehicle P&L  │    │
│          │  │ ⚠️ Fuel +31%   │ 136 +18.1M  │    │
│          │  │ ⚠️ Idle 45m    │ 139 +12.3M  │    │
│          │  └────────────────┴─────────────┘    │
└──────────┴──────────────────────────────────────┘
```

**Components:**

| Component | Purpose | Props |
|-----------|---------|-------|
| **MetricRow** | Row of metric cards | `metrics[]` (value, label, trend, variant) |
| **MetricCard** | Single KPI number | value, label, trend{direction,value}, variant(success/warning/danger) |
| **ChartCard** | Chart wrapper with title | title, subtitle, action slot, children (chart) |
| **RevenueChart** | Monthly revenue bar chart | data[] (month, revenue, cost) |
| **DriverRankItem** | Ranked driver row | rank, name, kpi_score, avatar? |
| **AlertSummaryItem** | Alert preview | type_icon, description, severity, time_ago |
| **VehiclePLCard** | Vehicle profit/loss | license_plate, profit_amount, trip_count |
| **SectionHeader** | Section divider with link | title, link_text?, link_route? |

---

### D02: Fleet Overview

```
┌─────────────────────────────────┐
│ ← Đội xe                  [+ Xe]│
├─────────────────────────────────┤
│                                 │
│  [Tất cả] [Chạy] [Rảnh] [SC]  │  FilterChips (horizontal scroll)
│                                 │
│  ┌─────────────────────────┐   │
│  │ 51F-136.31  🟢 Running  │   │  VehicleCard
│  │ Container 40ft           │   │
│  │ Driver: Hoàng            │   │
│  │ Trip: TR-0101            │   │
│  │ P&L tháng: +18.1M ₫     │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 51F-070.63  ⚪ Idle     │   │  VehicleCard
│  │ Container 20ft           │   │
│  │ Driver: Tuấn             │   │
│  │ P&L tháng: +12.3M ₫     │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 51F-155.44  🔧 Maint.   │   │  VehicleCard
│  │ Container 40ft HC        │   │
│  │ Driver: —                │   │
│  │ P&L tháng: -2.1M ₫      │   │
│  └─────────────────────────┘   │
│                                 │
├──────┬──────┬──────┬───────────┤
│ 📊   │ 🚛   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

| Component | Purpose | Props |
|-----------|---------|-------|
| **FilterChips** | Horizontal filter pills | options[], selected |
| **VehicleCard** | Vehicle summary card | license_plate, type, status, driver_name?, trip_code?, pnl |
| **StatusBadge** | Vehicle status | status (idle/on_trip/maintenance/retired) |

---

### D03: Vehicle Detail

```
┌─────────────────────────────────┐
│ ← 51F-136.31                    │
├─────────────────────────────────┤
│                                 │
│  ┌───────┬───────┬───────┐     │
│  │ 28    │ 4,200 │ +18.1 │     │  StatRow (3-col)
│  │chuyến │ km    │ M ₫   │     │
│  └───────┴───────┴───────┘     │
│                                 │
│  Thông tin ─────────────        │  SectionHeader
│  Loại: Container 40ft           │  DetailRow
│  Hãng: Hyundai                  │  DetailRow
│  Năm: 2020                      │  DetailRow
│  Tài xế: Nguyễn Văn Hoàng      │  DetailRow (link to driver)
│  Gán từ: 15/01/2026             │  DetailRow
│                                 │
│  Bảo hiểm ─────────────         │  SectionHeader
│  Bảo Việt · BV-2026-00345      │  DetailRow
│  Hạn: 15/05/2026 (24 ngày) ⚠️  │  WarningRow
│                                 │
│  Linh kiện ─────────────        │  SectionHeader
│  Lốp trước trái                 │  PartItem
│  Hạn: 15/06/2026               │
│  Lốp trước phải                 │  PartItem
│  Hạn: 15/08/2026               │
│                                 │
│  P&L tháng 4 ──────────         │  SectionHeader
│  ┌───────────────────────┐     │
│  │ [Stacked Bar Chart]    │     │  ChartCard
│  │ Revenue vs Costs       │     │
│  └───────────────────────┘     │
│                                 │
│  Chi phí breakdown ─────        │
│  Dầu:        32.5M (38%)       │  ExpenseBar
│  Đi đường:   12.2M (14%)       │  ExpenseBar
│  Lương lx:   15.0M (18%)       │  ExpenseBar
│  Sửa chữa:    3.5M  (4%)       │  ExpenseBar
│  Lốp:         2.1M  (2%)       │  ExpenseBar
│  Dầu máy:     1.2M  (1%)       │  ExpenseBar
│                                 │
│  Chuyến gần đây ────────        │  SectionHeader
│  TR-0101  ✅ 21/04 · 47km      │  TripMiniRow
│  TR-0098  ✅ 20/04 · 120km     │  TripMiniRow
│  [Xem tất cả →]                 │
│                                 │
├──────┬──────┬──────┬───────────┤
│ 📊   │ 🚛   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

| Component | Purpose | Props |
|-----------|---------|-------|
| **StatRow** | Row of stat cards | stats[] (value, label) |
| **DetailRow** | Label: value | label, value, link? |
| **WarningRow** | Yellow warning | label, value, days_left |
| **PartItem** | Warranty part | part_name, expiry_date, status |
| **ExpenseBar** | Horizontal bar with % | category, amount, percentage, color |
| **TripMiniRow** | Trip one-liner | trip_code, status, date, km |
| **ChartCard** | Chart container | title, children |

---

### D04: Trip List

```
┌─────────────────────────────────┐
│ Chuyến xe                  🔍  │
├─────────────────────────────────┤
│                                 │
│  [Tất cả] [Chạy] [Hoàn thành] │  FilterChips
│  [Mồ côi]                       │
│                                 │
│  📅 21/04/2026           [▼]    │  DateFilter (today/week/month/custom)
│                                 │
│  ┌─────────────────────────┐   │
│  │ TR-2026-0101     🟢      │   │  TripCard
│  │ Cát Lái → Bình Dương    │   │
│  │ Hoàng · 51F-136.31       │   │
│  │ Samsung · 47.3 km       │   │
│  │ 850K chi phí · 4.5M cước│   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ TR-2026-0102     ✅      │   │  TripCard (completed)
│  │ HP → Đồng Nai            │   │
│  │ Bình · 51F-070.63        │   │
│  │ Vinatea · 120 km        │   │
│  │ 3.0M chi phí · 4.7M cước│   │
│  └─────────────────────────┘   │
│                                 │
├──────┬──────┬──────┬───────────┤
│ 📊   │ 🚛   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

| Component | Purpose | Props |
|-----------|---------|-------|
| **TripCard** | Trip summary | trip_code, route, driver, vehicle, client, km, costs, revenue, status |
| **DateFilter** | Date range selector | options: today/week/month/custom |
| **FilterChips** | Status filters | options[], selected |

---

### D05: Trip Detail

```
┌─────────────────────────────────┐
│ ← TR-2026-0101                  │
├─────────────────────────────────┤
│                                 │
│  Cát Lái → Bình Dương           │  RouteHeader
│  Samsung · Container 40ft       │  ClientInfo
│  ✅ Hoàn thành · 21/04 08:00    │  StatusLine
│                                 │
│  ┌───────┬───────┬───────┐     │
│  │ 47.3  │ 1h 15m│ 0.0%  │     │  StatRow
│  │ km    │ time  │deviate│     │
│  └───────┴───────┴───────┘     │
│                                 │
│  GPS Trail ─────────────         │  SectionHeader
│  ┌───────────────────────┐     │
│  │ [Map with polyline]    │     │  MapCard (interactive)
│  │ Start ●═══════● End    │     │
│  └───────────────────────┘     │
│                                 │
│  Timeline ─────────────         │  SectionHeader
│  ● Nhận ca       08:00  ✋     │  TimelineItem (manual)
│  ● Lấy rỗng      08:05  📍     │  TimelineItem (auto)
│  ● Cảng          08:20  📍     │  TimelineItem (auto)
│  ● OCR TCLU...   08:35  📷     │  TimelineItem (photo)
│  ● Rời cảng      08:40  📍     │  TimelineItem (auto)
│  ● Đang chạy     08:45  📍     │  TimelineItem (auto)
│  ● Đến nơi       09:45  📍     │  TimelineItem (auto)
│  ● Giao hàng     10:00  📷     │  TimelineItem (photo)
│  ● Hạ bãi        10:15  ✋     │  TimelineItem (manual)
│  ● Hoàn thành    10:15  📍     │  TimelineItem (auto)
│                                 │
│  Chi phí ─────────────          │  SectionHeader
│  Dầu:         850K (15L/42L=36%)│  ExpenseRow + quota bar
│  ████████░░░░ 36% of quota      │  QuotaBar
│  Cầu đường:   120K              │  ExpenseRow
│  ──────────────────             │
│  Tổng:        970K              │  TotalRow
│                                 │
│  Ảnh ────────────────           │  SectionHeader
│  ┌───────┐ ┌───────┐           │
│  │ 📷    │ │ 📷    │           │  PhotoGrid
│  │ Pick  │ │ Deliv │           │
│  └───────┘ └───────┘           │
│                                 │
│  Route deviation ──────         │  SectionHeader
│  Actual: 47.3 km               │  DetailRow
│  Planned: 45.0 km              │  DetailRow
│  Deviation: +5.1% ✅ OK        │  DeviationBadge
│                                 │
├──────┬──────┬──────┬───────────┤
│ 📊   │ 🚛   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

| Component | Purpose | Props |
|-----------|---------|-------|
| **RouteHeader** | Origin → Destination | origin, destination |
| **ClientInfo** | Client + container | client_name, container_type |
| **StatusLine** | Status + date | status, date |
| **MapCard** | Interactive map | gps_points[], geofences[], current_position? |
| **TimelineItem** | Timeline step | label, time, icon (✋manual/📍auto/📷photo), photo_thumb? |
| **QuotaBar** | Fuel quota comparison | actual_liters, quota_liters, percentage |
| **DeviationBadge** | Route deviation % | actual_km, planned_km, percentage, status(ok/warning/danger) |

---

### D06-D12: Remaining Director Pages

| Page | Layout Pattern | Key Components |
|------|---------------|----------------|
| D06 Route List | List + FilterChips | RouteCard (name, distance, duration, pricing_count) |
| D07 Client List | List + SearchBar | ClientCard (name, aging_badge, balance, is_active) |
| D08 Client Detail | Scroll sections | StatRow, InvoiceMiniRow[], PaymentMiniRow[], AgingBreakdown |
| D09 Driver KPI | Leaderboard | DriverKPICard (rank, name, score, violation_count, avatar) |
| D10 Finance Summary | Metrics + Charts | MetricRow, RevenueChart, CostBreakdown (pie/bar), AgingSummary |
| D11 Vehicle P&L | Table/Grid | PnLTable (vehicle, revenue, costs[], profit, margin%) |
| D12 Audit Log | Table + Filters | DataTable (timestamp, user, action, entity, old→new) |

---

## 6. Page Layouts — Điều hành

### O01: Active Trips

```
┌─────────────────────────────────┐
│ Chuyến đang chạy         [+ BK] │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────┐     │
│  │ [Live Map]             │     │  LiveMap (full width)
│  │ 🚛 Hoàng · TR-0101    │     │  VehicleMarker (tap → O04)
│  │ 🚛 Tuấn · TR-0107    │     │
│  │ 🚛 Bình · TR-0103    │     │
│  └───────────────────────┘     │
│                                 │
│  3 chuyến đang chạy ────        │  SectionHeader
│                                 │
│  ┌─────────────────────────┐   │
│  │ TR-0101 🟢 En route     │   │  ActiveTripCard
│  │ Hoàng · 51F-136.31      │   │
│  │ Cát Lái → Bình Dương    │   │
│  │ 47.3 km · chạy 1h 15m   │   │
│  │ Checkpoint: Chụp giao ←  │   │  NextCheckpoint
│  │ [Xem →]                  │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ TR-0107 🟢 En route     │   │  ActiveTripCard
│  │ Tuấn · 51F-070.63       │   │
│  │ HP → Mộc Châu           │   │
│  │ 120 km · chạy 2h 30m    │   │
│  │ ⚠️ Idle 45min            │   │  AlertBadge
│  │ [Xem →]                  │   │
│  └─────────────────────────┘   │
│                                 │
├──────┬──────┬──────┬───────────┤
│ 📍   │ ⚠️   │ 🚛   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

| Component | Purpose | Props |
|-----------|---------|-------|
| **LiveMap** | Map with vehicle markers | vehicles[] (lat, lng, status, driver_name) |
| **VehicleMarker** | Map pin for vehicle | vehicle, driver, trip_code, status, onTap |
| **ActiveTripCard** | Running trip summary | trip_code, route, driver, vehicle, km, elapsed, next_checkpoint, alerts? |
| **NextCheckpoint** | What driver needs to do next | step_number, label |
| **AlertBadge** | Warning indicator | alert_type, count |

---

### O02: Create Booking

```
┌─────────────────────────────────┐
│ ← Tạo booking              [Lưu]│
├─────────────────────────────────┤
│                                 │
│  Khách hàng ──────────          │
│  [Chọn khách hàng ▼]           │  Select (search dropdown)
│  ⚠️ Nợ quá hạn — xác nhận?     │  WarningBanner (conditional)
│                                 │
│  Tuyến đường ──────────         │
│  [Chọn tuyến ▼]                │  Select
│                                 │
│  Loại xe yêu cầu ────          │
│  [40ft ▼]                       │  Select
│                                 │
│  Loại container ──────          │
│  ⬤ 40ft  ○ 20ft  ○ 40ft HC    │  RadioPills
│                                 │
│  Load type ───────────          │
│  ○ Empty  ⬤ Loaded nhẹ  ○ Nặng│  RadioPills
│                                 │
│  Ghi chú ─────────────          │
│  [Ghi chú...           ]        │  TextInput
│                                 │
│  Tự động chọn ────────          │
│  Xe: [Auto-select ▼]           │  Select (filtered by available)
│  Tài xế: [Auto-select ▼]       │  Select (filtered by assigned)
│  Cước: 1,150,000 ₫ (auto)      │  AutoFilled (from ROUTE_PRICING)
│  Định mức: 0.35 l/km (auto)    │  AutoFilled (from ROUTE_FUEL_QUOTAS)
│                                 │
├──────┬──────┬──────┬───────────┤
│ 📍   │ ⚠️   │ 🚛   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

| Component | Purpose | Props |
|-----------|---------|-------|
| **Select** | Dropdown with search | options[], selected, searchable? |
| **RadioPills** | Horizontal radio options | options[], selected |
| **WarningBanner** | Client debt warning | client_name, amount, onConfirm |
| **AutoFilled** | Auto-calculated value | label, value, source_description |

---

### O04: Trip Detail (Dispatcher View — Live)

Same layout as D05 but with live elements:
- **LiveMap** auto-refreshes (30s polling)
- **DriverStatus** badge (🟢 Tracking / 🔴 Offline)
- **Resolve Alert** button if alert exists
- **Contact Driver** button (call/SMS)

---

### O07: Alert Detail

```
┌─────────────────────────────────┐
│ ← Cảnh báo chi tiết             │
├─────────────────────────────────┤
│                                 │
│  ⚠️ Gian lận nhiên liệu         │  AlertTypeHeader (severity color)
│  TR-2026-0102 · CRITICAL        │
│                                 │
│  ┌───────────────────────┐     │
│  │ [Map: actual route]    │     │  MapCard (route trail)
│  └───────────────────────┘     │
│                                 │
│  So sánh nhiên liệu ───        │  SectionHeader
│  Khai báo:   55 lít            │  ComparisonRow
│  Định mức:   42 lít            │  ComparisonRow
│  Chênh lệch: +31% ❌           │  DeltaBadge (danger)
│                                 │
│  Thông tin chuyến ─────         │
│  Tài xế: Bình                  │  DetailRow
│  Xe: 51F-070.63                │  DetailRow
│  Tuyến: Cát Lái → Đồng Nai    │  DetailRow
│  Load type: Loaded heavy       │  DetailRow
│  Thời gian: 21/04 10:00        │  DetailRow
│                                 │
│  Lịch sử vi phạm ─────         │  SectionHeader
│  #1 05/04 GPS off 1.5h  Warning│  ViolationRow
│  #2 12/04 GPS off 2h    Viol.  │  ViolationRow
│  #3 ← Lần này (+31% dầu)      │  ViolationRow (current)
│                                 │
│  Xử lý ────────────────         │  SectionHeader
│  ○ Ghi nhận vi phạm            │  ResolutionOption
│  ○ Bỏ qua                      │  ResolutionOption
│  Ghi chú: [________]           │  TextInput
│  [Xác nhận]                     │  SubmitButton
│                                 │
├──────┬──────┬──────┬───────────┤
│ 📍   │ ⚠️   │ 🚛   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

| Component | Purpose | Props |
|-----------|---------|-------|
| **AlertTypeHeader** | Alert title with severity | type, severity, trip_code |
| **ComparisonRow** | Side-by-side comparison | label, actual, expected |
| **DeltaBadge** | Percentage delta | value, threshold, variant |
| **ViolationRow** | Past violation | #, date, type, severity |
| **ResolutionOption** | Radio option for resolve | label, selected, onSelect |

---

## 7. Page Layouts — Kế toán

### A01: Expense List

```
┌─────────────────────────────────┐
│ Chi phí chờ duyệt               │
├─────────────────────────────────┤
│                                 │
│  12 chờ duyệt · 3.5M ₫         │  SummaryBar
│                                 │
│  [Chờ duyệt] [Đã duyệt] [Từ chối] │  TabSelector
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🧾 Dầu · 850,000 ₫      │   │  ExpenseCard
│  │ TR-0101 · Hoàng          │   │
│  │ 15 lít / 42 lít (36%)   │   │  QuotaMini
│  │ ████████░░░░ OK          │   │  MiniQuotaBar
│  │ 08:30 · [Duyệt] [Từ chối]│   │  ActionButtons
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🧾 Dầu · 1,500,000 ₫    │   │  ExpenseCard (flagged)
│  │ TR-0102 · Bình           │   │
│  │ 55 lít / 42 lít (+31%)❌ │   │  QuotaMini (danger)
│  │ ██████████████░ OVER     │   │  MiniQuotaBar (red)
│  │ 10:00 · [Duyệt] [Từ chối]│   │
│  └─────────────────────────┘   │
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🧾   │ 💰   │ 📄   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

| Component | Purpose | Props |
|-----------|---------|-------|
| **SummaryBar** | Count + total | count, total_amount |
| **ExpenseCard** | Expense summary + actions | amount, category, trip_code, driver, liters, quota_liters, percentage, status |
| **MiniQuotaBar** | Tiny fuel comparison bar | actual, quota, variant |
| **ActionButtons** | Approve/Reject | onApprove, onReject |

---

### A02: Expense Detail (Kế toán)

```
┌─────────────────────────────────┐
│ ← Chi tiết chi phí              │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │ [Full receipt photo]     │   │  PhotoViewer (presigned URL)
│  │ [Pinch to zoom]          │   │
│  └─────────────────────────┘   │
│                                 │
│  Dầu · 850,000 ₫ ⏳             │  AmountHeader
│  TR-0101 · Hoàng                │
│                                 │
│  Nhiên liệu ──────────          │  SectionHeader
│  Khai báo:   15 lít            │  DetailRow
│  Định mức:   42 lít            │  DetailRow
│  Tỷ lệ:      36% ✅ OK         │  QuotaStatus
│  ████████░░░░                   │  FullQuotaBar
│                                 │
│  Thông tin ─────────────         │
│  Chuyến: TR-0101               │  DetailRow
│  Tuyến: Cát Lái → Bình Dương   │  DetailRow
│  Load type: Loaded light        │  DetailRow
│  Vị trí: 10.740, 106.730       │  DetailRow + mini map
│  Thời gian: 21/04 08:30        │  DetailRow
│                                 │
│  [✅ Duyệt]  [❌ Từ chối]       │  DecisionBar (sticky bottom)
│                                 │
│  (Nếu từ chối → sheet:)        │
│  ┌─────────────────────────┐   │
│  │ Lý do từ chối            │   │  RejectSheet (bottom sheet)
│  │ [Biên lai mờ...     ]   │   │  TextInput
│  │ [Xác nhận]              │   │
│  └─────────────────────────┘   │
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🧾   │ 💰   │ 📄   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

| Component | Purpose | Props |
|-----------|---------|-------|
| **AmountHeader** | Large amount + meta | amount, category, status_badge, trip_code, driver |
| **FullQuotaBar** | Detailed quota comparison | actual_liters, quota_liters, percentage, load_type |
| **QuotaStatus** | Status text | percentage, threshold, variant |
| **DecisionBar** | Approve/Reject sticky | onApprove, onReject |
| **RejectSheet** | Bottom sheet for reason | onSubmit(reason) |

---

### A03: Receivables Summary

```
┌─────────────────────────────────┐
│ Công nợ                         │
├─────────────────────────────────┤
│                                 │
│  ┌───────┬───────┬───────┐     │
│  │ 223.5 │ 113.0 │ 37.5  │     │  MetricRow
│  │ M ₫   │ M T3+ │ M T1  │     │  total / aging_T3+ / aging_T1
│  │ Tổng  │ Quá hạn│ Nhắc  │     │
│  └───────┴───────┴───────┘     │
│                                 │
│  Aging phân bổ ────────         │  SectionHeader
│  ┌───────────────────────┐     │
│  │ [Stacked Bar]          │     │  ChartCard
│  │ Current | T1 | T2 | T3+│     │  AgingChart
│  └───────────────────────┘     │
│                                 │
│  Khách hàng ──────────          │  SectionHeader
│                                 │
│  ┌─────────────────────────┐   │
│  │ Trà Thu Đan              │   │  ClientReceivableCard
│  │ 140.0M ₫                 │   │
│  │ ██████████████ T3+ 100M  │   │  AgingBar
│  │ ⚠️ Nợ quá hạn            │   │  WarningBadge
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Tân Việt Hưng            │   │  ClientReceivableCard
│  │ 56.0M ₫                  │   │
│  │ ████████░░ T2 25M       │   │  AgingBar
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Samsung                  │   │  ClientReceivableCard
│  │ 15.0M ₫                  │   │
│  │ ██░░░░░░░░ Current      │   │  AgingBar (green)
│  └─────────────────────────┘   │
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🧾   │ 💰   │ 📄   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

| Component | Purpose | Props |
|-----------|---------|-------|
| **AgingChart** | Stacked bar by aging bucket | data[] (client, current, T1, T2, T3+) |
| **ClientReceivableCard** | Client with balance + aging | client_name, total, aging_breakdown, is_overdue |
| **AgingBar** | Stacked horizontal bar | segments[] (bucket, amount, color) |
| **WarningBadge** | "⚠️ Nợ quá hạn" | text, variant |

---

### A09: Period Close

```
┌─────────────────────────────────┐
│ ← Chốt sổ                      │
├─────────────────────────────────┤
│                                 │
│  Chốt sổ tháng 4/2026           │  PeriodHeader
│                                 │
│  Kiểm tra trước khi chốt:       │  ChecklistHeader
│                                 │
│  ✅ Chuyến mồ côi: 0            │  ChecklistItem (pass)
│  ❌ Chuyến mồ côi: 2            │  ChecklistItem (fail)
│     → TR-0105, TR-0108          │  OrphanList
│     [Gán chủ hàng →]            │  Link → A08
│                                 │
│  ✅ Chi phí chờ duyệt: 0        │  ChecklistItem (pass)
│  ✅ Hóa đơn chưa gửi: 3         │  ChecklistItem (warn)
│     → HD-201, HD-202, HD-203   │  InvoiceList
│                                 │
│  ┌─────────────────────────┐   │
│  │                          │   │
│  │  ❌ KHÔNG THỂ CHỐT SỔ    │   │  BlockCard (if checks fail)
│  │  Còn 2 chuyến mồ côi    │   │
│  │  [Gán chủ hàng →]        │   │
│  └─────────────────────────┘   │
│                                 │
│  (After all checks pass:)      │
│  ┌─────────────────────────┐   │
│  │  ✅ Sẵn sàng chốt sổ     │   │  ReadyCard
│  │  28 chuyến · 1,200 km   │   │
│  │  [Chốt sổ →]             │   │  PrimaryCTA (danger variant)
│  └─────────────────────────┘   │
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🧾   │ 💰   │ 📄   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

| Component | Purpose | Props |
|-----------|---------|-------|
| **PeriodHeader** | Month/Year display | month, year |
| **ChecklistItem** | Pass/Fail/Warning row | label, status, count, detail? |
| **OrphanList** | List of orphan trip codes | trip_codes[] |
| **BlockCard** | Cannot proceed notice | reason, action_link |
| **ReadyCard** | Ready to close | stats (trip_count, km), onConfirm |

---

## 8. Cross-Role Shared Components

### Data Display

| Component | Used In | Purpose |
|-----------|---------|---------|
| **DataTable** | D06, D07, D11, D12 | Generic typed table with sort/filter/pagination. Mobile: card-view mode |
| **MetricRow** | D01, A03 | Row of MetricCards (3-4 col) |
| **MetricCard** | D01, D03, A03 | Hero value + label + trend |
| **ChartCard** | D01, D03, D10, A03 | Chart wrapper with title + actions |
| **SectionHeader** | All pages | Section divider |
| **DetailRow** | D03, D05, D08, A02 | Label: Value row |
| **StatusBadge** | All pages | Colored pill status indicator |
| **KPIBadge** | D09 | Score badge with color |
| **EmptyState** | All lists | Icon + message placeholder |

### Navigation

| Component | Used In | Purpose |
|-----------|---------|---------|
| **BottomNav** | All pages (mobile) | 4-item bottom navigation |
| **Sidebar** | All pages (desktop) | Collapsible sidebar |
| **MoreGrid** | All roles (mobile) | 3-col grid overflow menu |
| **PageShell** | All pages | Header + scroll + nav wrapper |
| **FilterChips** | D02, D04, O01, A01 | Horizontal filter pills |
| **TabSelector** | D04, A01 | Tab content switcher |
| **DateFilter** | D04, D10, D11 | Date range selector |

### Forms

| Component | Used In | Purpose |
|-----------|---------|---------|
| **Select** | O02 | Dropdown with search |
| **RadioPills** | O02 | Horizontal radio options |
| **TextInput** | O02, O07, A02 | Text input |
| **WarningBanner** | O02 | Debt warning |
| **AutoFilled** | O02 | Auto-calculated (pricing, quota) |
| **RejectSheet** | A02 | Bottom sheet for rejection reason |

### Role-Specific

| Component | Role | Purpose |
|-----------|------|---------|
| **LiveMap** | Điều hành | Real-time vehicle map |
| **VehicleMarker** | Điều hành | Map pin |
| **ActiveTripCard** | Điều hành | Running trip with next checkpoint |
| **NextCheckpoint** | Điều hành | What driver does next |
| **AlertSummaryItem** | Giám đốc | Alert preview on dashboard |
| **VehiclePLCard** | Giám đốc | Vehicle profit/loss |
| **DriverKPICard** | Giám đốc | Driver score + rank |
| **ExpenseCard** | Kế toán | Expense with quota bar + actions |
| **MiniQuotaBar** | Kế toán | Tiny fuel comparison |
| **DecisionBar** | Kế toán | Approve/Reject sticky bar |
| **ClientReceivableCard** | Kế toán | Client with aging |
| **AgingBar** | Kế toán | Stacked aging segments |
| **ChecklistItem** | Kế toán | Pass/Fail check |
| **BlockCard** | Kế toán | Cannot proceed |

---

## 9. Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| **xs** | <640px | Full mobile: bottom nav, stacked cards, sheets |
| **sm** | 640-767px | Mobile landscape: same as xs |
| **md** | 768-1023px | Tablet: bottom nav, 2-col grids |
| **lg** | 1024-1279px | Desktop: sidebar (collapsed), multi-col grids |
| **xl** | ≥1280px | Desktop: sidebar (expanded), full dashboard layout |

### Grid Rules

| Page Section | xs | md | lg | xl |
|-------------|-----|-----|-----|-----|
| MetricRow | 2-col | 3-col | 4-col | 4-col |
| Chart area | full-width | full-width | 1/2-width | 1/2-width |
| List items | full-width cards | full-width cards | table rows | table rows |
| Map height | 200px | 300px | 400px | 500px |
| Bottom nav | visible | visible | hidden | hidden |
| Sidebar | hidden | hidden | visible (collapsed) | visible (expanded) |

### Mobile-Specific Patterns

- **Bottom sheets** instead of modals (dates, filters, reject reasons)
- **Swipe actions** on cards (approve/reject on expense cards)
- **Pull to refresh** on all list pages
- **Sticky headers** on scroll (section headers stay visible)
- **Skeleton loading** for all data-fetching pages
- **Toast notifications** for actions (approve/reject success)

---

## 10. Design Tokens

### Colors (same as driver app)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#1e40af` | Primary actions, active states |
| `--color-success` | `#059669` | Approved, completed, positive |
| `--color-warning` | `#d97706` | Pending, warnings |
| `--color-danger` | `#dc2626` | Rejected, errors, critical alerts |
| `--color-info` | `#0d9488` | Informational, auto-detected |
| `--color-neutral` | `#64748b` | Neutral badges, inactive |
| `--color-bg` | `#f8fafc` | Page background |
| `--color-surface` | `#ffffff` | Cards, surfaces |
| `--color-border` | `#e2e8f0` | Dividers |

### Typography

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `--text-hero` | 32px | Bold | Dashboard hero numbers |
| `--text-h1` | 24px | Bold | Page titles |
| `--text-h2` | 18px | SemiBold | Section headers |
| `--text-body` | 15px | Regular | Body, detail rows |
| `--text-caption` | 13px | Regular | Timestamps, muted |
| `--text-metric` | 28px | Bold | MetricCard numbers |
| `--text-badge` | 11px | SemiBold | Status badges |

### Spacing

| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |

---

## 11. Accessibility & i18n

- All text in Vietnamese
- Touch targets ≥44px on mobile
- Color is never the only indicator (always paired with text/icon)
- Keyboard navigation on desktop (Tab through sidebar, cards, forms)
- Screen reader labels on interactive elements
- High contrast mode support

---

*33 pages · 50+ components · 3 roles · Mobile-first responsive · Bottom nav mobile / Sidebar desktop*
