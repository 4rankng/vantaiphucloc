# Vantaiphucloc — Requirements Document

## Overview
Freight container trip payroll system for Phuc Loc company.
- PWA (React + Vite + Tailwind), Python FastAPI backend
- Netlify: https://phucloc.netlify.app/

## Roles

| Role | Description |
|---|---|
| SuperAdmin | Manage all user accounts across the system |
| Giam doc (Director) | Dashboard KPIs, manage users in their company |
| Ke toan (Accountant) | Manage clients, routes, pricing, create trips, doi soat, calculate salary |
| Lai xe (Driver) | Submit work orders (photo + cont info), view earnings |

## Core Flow

### 1. Setup (Ke toan)
- Create **khach hang** (clients)
- Create **cung duong** (routes)
- Create **don gia** (pricing): Client x Loai cong x Cung duong → unit_price + driver_salary + allowance
  - driver_salary and allowance are optional in don gia
  - If present → autofill when creating trip
  - Ke toan can always override autofilled values

### 2. Create Trip (Ke toan)
- Trip = a request from a client
- Trip contains:
  - Khach hang (client)
  - Cung duong (route)
  - 1 or more **cong** (work items), each with:
    - Ma so cong (work type: E20/E40/F20/F40)
    - Loai cong (same)
  - Software looks up **don gia** based on: client + work type + route
  - Auto-fills: unit_price, driver_salary, allowance (if available in don gia)
  - If no don gia found → show warning, ke toan clicks to enter don gia manually
  - Ke toan can always edit autofilled values

### 3. Driver Submits Work Order (Lai xe)
- Driver submits a **job** with:
  - Container number (photo + OCR)
  - Loai cong (E20/E40/F20/F40)
  - Khach hang
  - Cung duong
- Job is stored with status: **Cho doi soat** (pending reconciliation)

### 4. Doi Soat (Reconciliation) — Auto + Manual
- Software auto-matches job → trip using: **loai cong + khach hang + cung duong**
- Match results:
  - **Khop** (matched) — job matches a trip
  - **Cho doi soat** — no auto-match found, ke toan must manual match
- Ke toan can manually match a job to a trip

### 5. Calculate Salary (Ke toan)
- Select period (configurable, e.g. 26th this month → 25th next month)
- Salary = sum of all matched work orders in period for each driver
- Based on driver_salary + allowance from matched trips

## Ke Toan Responsibilities (Summary)
1. Thiết lập tháng lương (từ ngày nào, đến ngày nào)
2. Xem/lọc số công theo biển số xe, theo thời gian
3. Quản lý khách hàng (CRUD)
4. Quản lý cung đường (CRUD)
5. Tạo đơn giá (pricing matrix)
6. Tạo chuyến/tạo lệnh → from this, doi soat with driver jobs
7. Tính lương lái xe theo số lượng công (theo tháng, configurable period)

## Entities

### Trip (Chuyến/Lệnh)
- id, created_at
- client_id (khach hang)
- route (cung duong)
- cong[] (work items):
  - work_type (E20/E40/F20/F40)
  - unit_price
  - driver_salary
  - allowance
- status: CHODOI_SOAT | DA_MATCH
- match logic: loai cong + khach hang + cung duong

### Work Order / Job (Số công)
- id, created_at
- driver_id
- container_number
- work_type (E20/E40/F20/F40)
- client_id (khach hang)
- route (cung duong)
- status: CHO_DOI_SOAT | KHOP | TU_CHOI
- earning (auto-calculated after match)

### Pricing (Đơn giá)
- client_id
- work_type
- route
- unit_price
- driver_salary (optional)
- allowance (optional)

### Client (Khách hàng)
- name, code, type, phone, tax_code, address, active

### Route (Cung đường)
- from_location, to_location, code, active

### Salary Period
- driver_id
- start_date, end_date
- status: OPEN | CALCULATED | PAID
- total_salary, total_allowance, net_pay

### User
- name, phone, role, company
- driver: tractor_plate
- director: company

## Ke Toan Layout
- **NO bottom nav, NO sidebar** — single scroll page (Trang chu)
- Everything accessible from Trang chu

### Quick Actions (row of buttons at top)
1. **Tạo chuyến** — create new trip
2. **Khách hàng** → opens client management page (includes don gia management per client)
3. **Thiết lập** → setup salary period (from date → to date, e.g. 26th to 25th)

### Trang Chu Sections (scroll)
1. **Stats strip** — trips today, jobs pending match, current salary period
2. **Chuyến chờ đối soát** — trips needing attention, tap to doi soat
3. **Số công chưa match** — jobs that failed auto-match, ke toan must manual match

### Drill-down Pages
- Trip detail → doi soat (view matched/unmatched jobs, manual match)
- Client management → CRUD clients + don gia per client
- Salary period → view drivers, calculated salary, mark paid
- Job detail → edit job info for manual matching

## Open Questions
- [x] Layout: single page, no nav
- [x] Quick actions: Tao chuyen, Khach hang, Thiet lap
- [x] Don gia is part of Khach hang page (per-client pricing)
- [x] Salary: sum of (driver_salary + allowance) from matched jobs in period
- [x] Doi soat: auto-match first, manual for unmatched (can edit job + trip before matching)
