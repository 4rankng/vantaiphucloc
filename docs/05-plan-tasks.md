# TTransport — Plan & Design Tasks

## Phase 1: MVP — Backend Foundation

### Sprint 1: Auth & Core Infrastructure
- [ ] T-1.1 Set up FastAPI project structure with async SQLAlchemy
- [ ] T-1.2 PostgreSQL schema design (users, vehicles, trips, expenses, alerts, invoices)
- [ ] T-1.3 Alembic migration setup & initial migration
- [ ] T-1.4 JWT auth endpoints (login, logout, refresh)
- [ ] T-1.5 RBAC middleware (role-based route guards)
- [ ] T-1.6 User CRUD endpoints (create, update, list, lock/unlock)
- [ ] T-1.7 Audit log middleware (auto-track all mutations)
- [ ] T-1.8 API documentation (OpenAPI/Swagger)

### Sprint 2: Fleet & Trip Engine
- [ ] T-2.1 Vehicle model & CRUD endpoints
- [ ] T-2.2 Vehicle status state machine (active → on-trip → maintenance → idle)
- [ ] T-2.3 Driver-vehicle assignment logic
- [ ] T-2.4 Trip model & CRUD endpoints
- [ ] T-2.5 Trip lifecycle state machine (draft → assigned → in-progress → completed → invoiced)
- [ ] T-2.6 Client (Chủ hàng) model & CRUD
- [ ] T-2.7 Trip-client assignment + orphan detection logic
- [ ] T-2.8 Month-end close blocking (if orphan trips exist)

### Sprint 3: Mobile API & Photo Handling
- [ ] T-3.1 Driver trip list & status update endpoints
- [ ] T-3.2 Photo upload endpoint (S3/object storage)
- [ ] T-3.3 GPS coordinate & timestamp stamping (server-side validation)
- [ ] T-3.4 Fuel declaration endpoint
- [ ] T-3.5 Expense declaration endpoint (with receipt photo)
- [ ] T-3.6 Offline sync endpoint (batch upload queue)

### Sprint 4: OCR & Alert Engine
- [ ] T-4.1 Integrate OCR service (container code from photo)
- [ ] T-4.2 Idle detection logic (> 45 min stationary via GPS)
- [ ] T-4.3 Fuel variance detection (> 10% vs quota)
- [ ] T-4.4 Alert generation & storage
- [ ] T-4.5 Alert resolution workflow (acknowledge, penalize, dismiss)
- [ ] T-4.6 Alert notification (push to dispatcher/director)

### Sprint 5: Accounting & Invoicing
- [ ] T-5.1 Trip cost auto-calculation (fuel + tolls + repairs + driver pay)
- [ ] T-5.2 Expense approval workflow (submit → review → approve/reject)
- [ ] T-5.3 E-invoice model & batch generation (group by client)
- [ ] T-5.4 Accounts receivable tracking (invoice → partial/fully paid)
- [ ] T-5.5 Payment recording endpoint

---

## Phase 1: MVP — Web Frontend

### Sprint 6: Layout & Auth UI
- [ ] T-6.1 Responsive layout (desktop sidebar + mobile bottom nav)
- [ ] T-6.2 Login page
- [ ] T-6.3 Auth context & route guards
- [ ] T-6.4 Change password page
- [ ] T-6.5 User management page (Director only)

### Sprint 7: Dashboard
- [ ] T-7.1 Director dashboard (fleet overview, revenue/profit, alerts)
- [ ] T-7.2 Dispatcher dashboard (active trips, alerts, vehicle positions)
- [ ] T-7.3 Accountant dashboard (pending expenses, receivables, invoices)
- [ ] T-7.4 Real-time data refresh (polling or WebSocket)

### Sprint 8: Fleet & Trip Management UI
- [ ] T-8.1 Vehicle list, detail, form pages
- [ ] T-8.2 Trip list with filters (status, date, driver, vehicle)
- [ ] T-8.3 Trip detail page (timeline, photos, costs, alerts)
- [ ] T-8.4 Trip creation form (assign vehicle, driver, route, client)
- [ ] T-8.5 Alert list & resolution UI

### Sprint 9: Accounting UI
- [ ] T-9.1 Completed trips list with cost breakdown
- [ ] T-9.2 Expense review & approval page (with receipt photos)
- [ ] T-9.3 Invoice generation page (batch by client)
- [ ] T-9.4 Accounts receivable page (paid/unpaid)
- [ ] T-9.5 Orphan trip warning banner + blocking modal

---

## Phase 1: MVP — Mobile App

### Sprint 10: Driver Mobile App
- [ ] T-10.1 Mobile project setup (React Native or Kotlin Compose)
- [ ] T-10.2 Driver login screen
- [ ] T-10.3 Trip list (assigned trips)
- [ ] T-10.4 Trip detail & progress update
- [ ] T-10.5 Camera integration (photo capture)
- [ ] T-10.6 OCR scan screen (container code)
- [ ] T-10.7 Fuel declaration screen
- [ ] T-10.8 Expense declaration screen
- [ ] T-10.9 Offline storage & sync queue
- [ ] T-10.10 Push notification integration

---

## Phase 2: Growth

### Sprint 11-12: KPI & Payroll
- [ ] T-11.1 KPI scoring engine (violation → point deduction)
- [ ] T-11.2 Payroll calculation service
- [ ] T-11.3 Payroll UI (accountant view)
- [ ] T-11.4 Driver income view (mobile)
- [ ] T-11.5 P&L per vehicle report
- [ ] T-11.6 GPS map view (real-time fleet tracking)

### Sprint 13-14: Reports & Polish
- [ ] T-13.1 Advanced dashboard charts (revenue, cost, profit over time)
- [ ] T-13.2 TAT analytics
- [ ] T-13.3 Driver & vehicle ranking
- [ ] T-13.4 Export functionality (Excel/PDF)
- [ ] T-13.5 Audit log viewer UI
- [ ] T-13.6 Password reset flow

---

## Phase 3: Polish & Scale
- [ ] T-P1 Route deviation detection
- [ ] T-P2 Predictive maintenance
- [ ] T-P3 Performance optimization (caching, indexing)
- [ ] T-P4 Multi-company/tenant support
- [ ] T-P5 White-label branding
