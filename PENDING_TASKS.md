# Pending Tasks — Vantai Phuc Loc

> Generated 2026-05-19. Gap analysis against CONTEXT.md, PRODUCT_SPEC.md, and current codebase state.

---

## P0 — Data Model Gaps (Backend)

### 1. Add `vendor_id` to Vehicle model
- **File**: `backend/app/models/domain.py:42` — Vehicle class has no `vendor_id`
- **Context**: CONTEXT.md line 114 documents this gap: "Vendors' trucks stored in same `vehicles` table, distinguished by `vendor_id`. Internal vehicles have `vendor_id=NULL`."
- **Scope**: Add `vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)` to Vehicle. Add Alembic migration. Update Vehicle schemas, routers (create/update vehicle), and seed data. Update frontend Vehicle types and forms to allow selecting vendor.

### 2. Outstanding debt calculation
- **File**: `backend/app/contexts/platform/interface/routers/dashboard.py:90` — `# outstanding_debt: compute from order totals at read time (TODO)`
- **Scope**: Implement the debt computation from client order totals, or confirm this metric is not needed in Phase 1.

---

## P1 — Missing Frontend Pages (No UI exists)

### 3. Reconciliation Workflow UI (Accountant)
- **What exists**: `DoiSoatPage.tsx` shows a list of booked trips with search/filter by month. No match/unmatch/suggest/auto-match controls.
- **What's needed**:
  - Side-by-side view: BookedTrips vs DeliveredTrips for a given period
  - Manual match action (select booked + delivered → confirm match)
  - Auto-match trigger (bulk match with score ≥ 0.8)
  - Suggest matches endpoint UI (show scored suggestions)
  - Unmatch with reason
  - Match score display per pair
- **Backend**: All endpoints exist (`/reconcile` — match, unmatch, suggest, auto-match, bulk-match, export). Only frontend is missing.
- **Scope**: This is the **core operational feature** of the product.

### 4. Excel Import UI (Accountant)
- **What exists**: API services (`imports.api.ts`, `reconciliationImports.api.ts`) with preview/commit/upload endpoints. No page UI.
- **What's needed**:
  - **Booked Trip Import**: Upload client Excel → async AI parse → preview detected columns → accountant reviews/maps columns → commit → BookedTrips created
  - **Customer Reconciliation Import**: Upload client response file → preview rows → commit
  - **Vendor Reconciliation Import**: Upload vendor file → preview → apply
  - Job polling UI (upload → show job ID → poll status → show results)
- **Backend**: Async import pipeline with arq worker exists. Only frontend is missing.

### 5. Vehicle Expenses CRUD Page (Accountant)
- **What exists**: `vehicleExpenses.api.ts` service with full CRUD. Dashboard shows `totalVehicleExpenses` sum. No dedicated management page.
- **What's needed**: Page with list/filter by vehicle, month, category. Create/edit/delete expense entries. Category filter (XANG_DAU, SUA_CHUA, TIEN_LUAT, KHAC). Receipt upload.
- **Backend**: `/vehicle-expenses` CRUD endpoints fully implemented.

### 6. Salary Dashboard Page (Accountant)
- **What exists**: `salary.api.ts` service exists. Salary period config in SettingsPage. No dedicated salary management page.
- **What's needed**:
  - All-driver salary summary table (base salary + productivity pay + allowance per period)
  - Base salary config per driver (history with effective dates)
  - Salary period selector (configurable from_day/to_day)
  - Export salary report to Excel
- **Backend**: `/salary` endpoints (dashboard, earnings, export, base-salary) all implemented.

### 7. P&L Report Page (Accountant / Director)
- **What exists**: Backend `/dashboard/vehicle-pnl` endpoint returns per-vehicle P&L. Dashboard widgets show totals. No dedicated P&L report page.
- **What's needed**:
  - Per-vehicle monthly P&L table (revenue, driver_salary, allowance, base_salary, fuel, repairs, law_permits, other → profit)
  - Month/period selector
  - Drill-down into expense details per vehicle
  - Aggregate P&L across all vehicles
- **Formula**: `Profit = Revenue - (driver_salary + allowance + base_salary + fuel + repairs + law_permits + other)`

### 8. Customer Settlement Export UI (Accountant)
- **What exists**: `pnl.api.ts` and backend `/reports/customer-settlement` endpoint. No UI trigger.
- **What's needed**: Select client + date range → generate Excel → download. Matches the Client Export Format spec in CONTEXT.md (vessel, vehicle plate, container number, type, trip date, pickup, dropoff, operation type).

### 9. Location Alias Management UI (Accountant)
- **What exists**: `locationAliases.api.ts` with CRUD, promote, merge endpoints. No management page.
- **What's needed**: List aliases per location. Add/remove aliases. Promote alias to canonical name. Merge duplicate locations.

---

## P2 — Partial Frontend Implementations

### 10. Director Pricing Pages — Need Depth
- **What exists**: `PricingList.tsx` (5 lines) and `PricingDetail.tsx` (7 lines) are thin wrappers around `PricingClientCards` and `PricingClientDetail`.
- **What's needed**: Verify the shared components have full functionality: pricing CRUD by client × route × container type, pricing line management (quantity tiers, unit_price, driver_salary, allowance). If components are stubs, flesh them out.

### 11. Director Trip Review — Verify Completeness
- **What exists**: `ClientJobs.tsx` and `DriverJobs.tsx` pages. These appear to be trip review views.
- **What's needed**: Verify they allow viewing all trips, drilling down by client/driver, with filtering by date range. Director needs to oversee all operations from this view.

### 12. Driver Push Notification Subscription
- **What exists**: `lib/push-subscription.ts` and `sw.ts` (service worker). `DriverNotifications.tsx` displays a notification list.
- **What's needed**: Verify push subscription flow works end-to-end: subscribe on login, display incoming push, unsubscribe on logout. Backend `/push` endpoints exist.

### 13. Driver GPS Location Search
- **What exists**: Backend has `/locations/nearby` and geocoding. `CreateDeliveredTrip.tsx` has some location handling.
- **What's needed**: Fuzzy search on pickup/dropoff fields — type a few characters, show location suggestions. This is explicitly required per CONTEXT.md line 118.

---

## P3 — Backend Feature Gaps

### 14. AI/Gemini Excel Parsing Implementation
- **What exists**: Gemini API key in config. `import_pipeline/llm.py` has scaffolding. `CustomerImportTemplate` has `llm_cache` field.
- **What's missing**: Actual Gemini API calls for Excel structure detection and column mapping. Currently the import pipeline may be using deterministic fallbacks only.
- **Scope**: Implement `parse_excel_with_ai()` in the LLM module. The async job system is ready; only the AI call logic is missing. Defer if deterministic parsers are sufficient for Phase 1.

### 15. Vendor Reconciliation Invoice Line Storage
- **File**: `backend/app/contexts/operations/interface/routers/vendor_reconciliation.py:841` — `# TODO: When a dedicated VendorInvoiceLine table exists, write there instead.`
- **Scope**: Decide whether to create the table or keep current approach. Low priority if current vendor recon works.

---

## P4 — Quality & Hardening

### 16. Integration Test Suite — Run and Fix
- **Status**: 22 integration test files exist under `tests/integration/`. Recent CHUNG → TIEN_LUAT refactoring may have broken some.
- **Scope**: Run full test suite. Fix any failures from the expense category refactoring. Verify all endpoints return expected schemas.

### 17. Frontend Type Safety Audit
- **Status**: Backend schemas define the contract. Frontend types may drift.
- **Scope**: Verify frontend TypeScript types in `data/domain.ts` match backend response schemas. Especially after CHUNG → TIEN_LUAT changes.

### 18. Seed Data Validation
- **Status**: `seed_dev.py` was recently updated for CHUNG → TIEN_LUAT. Verify it runs cleanly end-to-end.
- **Scope**: Run `seed_dev.py` on fresh database. Verify all entities created correctly. Verify P&L calculations use correct categories.

---

## Summary

| Priority | Category | Count | Items |
|----------|----------|-------|-------|
| P0 | Data Model | 2 | #1 vendor_id on Vehicle, #2 outstanding debt |
| P1 | Missing Pages | 7 | #3–9 Reconciliation, Import, Expenses, Salary, P&L, Settlement, Location Aliases |
| P2 | Partial Pages | 4 | #10–13 Pricing depth, Trip review, Push, GPS |
| P3 | Backend Features | 2 | #14 AI parsing, #15 Vendor invoice lines |
| P4 | Quality | 3 | #16–18 Tests, Type audit, Seed validation |

**Critical path**: #3 (Reconciliation UI) and #4 (Excel Import UI) are the two most important missing features — they represent the core operational workflow of the product. All backend APIs exist; only frontend pages are needed.
