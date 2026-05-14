# P&L — Doanh thu − Chi phí = Lợi nhuận (per vehicle)

## Request (verbatim)

> Doanh thu - Chi phí = Lợi nhuận
> Chi phí gồm:
> - CP Xe: có 4 loại: xăng dầu, sửa chữa, khác, chung
> - CP Lương sản lượng, lương cơ bản
> Doanh thu: tính theo từng xe
> Có trường hợp 1 xe 2 lái xe

## Current state

- `DashboardSummaryOut` already exposes `total_revenue` and `total_expense`, but:
  - **Revenue** = `SUM(TripOrder.unit_price)` across the company, not per vehicle.
  - **Expense** = `SUM(WorkOrder.driver_salary + WorkOrder.allowance)` — only the per-trip driver payout. Nothing else.
- `DriverSalaryConfig` table stores driver **base salary** history (append-only). Not yet folded into the dashboard expense total.
- **No vehicle-expense model.** No table for xăng dầu / sửa chữa / khác / chung. No UI to record them.
- `Vehicle.driver_id` is a **single non-null FK** with `is_active` boolean. One vehicle = one active driver. Multi-driver-per-vehicle is unsupported.

## Gaps to close

### A. Vehicle-expense model

1. New table `vehicle_expenses` with columns:
   - `id`, `vehicle_id` (nullable for category=CHUNG / general overhead), `category` (enum: `XANG_DAU`, `SUA_CHUA`, `KHAC`, `CHUNG`), `amount` (Integer VND), `expense_date` (Date), `description` (String 500, nullable), `receipt_url` (nullable), `created_by`, `created_at`, `updated_at`.
   - Alembic migration.
2. CRUD endpoints under `/accountant/vehicle-expenses` with filters by vehicle, category, date range.
3. Frontend: accountant page to record + list vehicle expenses, grouped by vehicle and category.

### B. Multi-driver per vehicle

1. Replace `Vehicle.driver_id` with a many-to-many `vehicle_drivers` table:
   - `vehicle_id`, `driver_id`, `role` (PRIMARY | SECONDARY), `effective_from`, `effective_to` (nullable), `is_active`.
2. Backfill migration: existing `Vehicle.driver_id` → one PRIMARY row per vehicle.
3. Update everywhere that joins `Vehicle.driver_id`:
   - `app/contexts/identity/interface/routers/users.py` (driver-list endpoint that returns plate)
   - `app/contexts/fleet/interface/routers/drivers.py`
   - `app/contexts/operations/infrastructure/excel.py` (đối soát + salary exports — three call sites)
   - `app/contexts/platform/interface/routers/dashboard.py` (driver_salary_summary join)
4. Decide how revenue/expense splits between the two drivers (50/50? based on who drove that day? per work order via `WorkOrder.driver_id`?). Likely use `WorkOrder.driver_id` as ground truth and only use the join table for plate lookup.

### C. P&L report (per-vehicle)

1. New endpoint `/dashboard/pnl?date_from=&date_to=&vehicle_id=` returning per-vehicle breakdown:
   - Doanh thu = `SUM(TripOrder.unit_price)` for trips reconciled to WorkOrders whose `vehicle_id` matches.
   - CP Xe by category (4 sub-totals).
   - CP Lương sản lượng = `SUM(WorkOrder.driver_salary + WorkOrder.allowance)` for drivers on this vehicle in period.
   - CP Lương cơ bản = effective `DriverSalaryConfig.base_salary` × days-in-period for drivers attached to this vehicle (pro-rated if mid-period change).
   - Lợi nhuận = doanh thu − all costs.
   - General overhead (`CHUNG`) allocated across vehicles (decide method: equal split / weighted by revenue / not allocated, shown as company-level only).
2. Frontend P&L page: filterable by date range, drilldown per vehicle.
3. Excel export of the P&L table.

## Open questions for PL

- Definition of "CP Chung" (general): which expenses belong here, and should they be allocated to vehicles or kept at company level?
- For 1 xe / 2 lái xe — how to count revenue and salary when both drivers ran trips in the same period? Probably already correctly attributed via `WorkOrder.driver_id`, but confirm.
- Should base salary (lương cơ bản) be pro-rated by days, or always charged in full per period regardless of trips driven?
- Output format expected (dashboard widget, dedicated report, Excel export, all three)?

## Acceptance criteria

- New `vehicle_expenses` CRUD lives in Cài đặt or its own page; categories enforced.
- P&L endpoint returns per-vehicle rows matching `Doanh thu − Chi phí = Lợi nhuận`.
- Multi-driver vehicles do not double-count revenue or salary.
- Unit tests for the per-vehicle P&L use-case across 1-driver and 2-driver scenarios.
