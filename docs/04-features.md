# TTransport — Feature List

## Phase 1 — MVP (P0)

### Core Platform
- [ ] F-001 User authentication (JWT login/logout)
- [ ] F-002 Role-based access control (4 roles)
- [ ] F-003 User management (CRUD, lock/unlock)

### Fleet
- [ ] F-004 Vehicle registry (add/edit/deactivate)
- [ ] F-005 Vehicle status tracking (active/idle/maintenance)
- [ ] F-006 Driver-vehicle assignment

### Trip Operations
- [ ] F-007 Trip creation & assignment (web)
- [ ] F-008 Trip lifecycle management (created → in-progress → completed)
- [ ] F-009 Client (Chủ hàng) assignment to trip
- [ ] F-010 Trip status updates from mobile

### Mobile App (Driver)
- [ ] F-011 Driver login
- [ ] F-012 View assigned trips
- [ ] F-013 Update trip progress
- [ ] F-014 Photo capture (container pickup/delivery)
- [ ] F-015 OCR container code recognition
- [ ] F-016 Fuel declaration + receipt photo
- [ ] F-017 Expense declaration + receipt photo
- [ ] F-018 Offline mode with auto-sync

### Anti-Fraud & Alerts
- [ ] F-019 Idle alert (> 45 min stationary)
- [ ] F-020 Fuel variance alert (> 10% deviation from quota)
- [ ] F-021 Alert dashboard & resolution workflow
- [ ] F-022 Tamper-proof photo timestamps + GPS coordinates

### Accounting
- [ ] F-023 Completed trip list with full cost breakdown
- [ ] F-024 Expense approval workflow
- [ ] F-025 E-invoice batch generation (group trips by client)
- [ ] F-026 Accounts receivable tracking (paid/unpaid by client)
- [ ] F-027 Orphan trip detection & month-end blocking

### Dashboard
- [ ] F-028 Real-time fleet overview (loaded/empty/idle)
- [ ] F-029 Trip detail view (timeline, photos, costs)

---

## Phase 2 — Growth (P1)

### Fleet
- [ ] F-030 Real-time GPS map view
- [ ] F-031 Maintenance schedule & history

### Financial
- [ ] F-032 Revenue/expense aggregated reports
- [ ] F-033 P&L per vehicle
- [ ] F-034 Client receivables aging report

### Driver KPI & Payroll
- [ ] F-035 Automated KPI scoring based on violations
- [ ] F-036 Payroll calculation (base + per-trip + bonus/penalty)
- [ ] F-037 Driver daily income view (mobile)

### Dashboard
- [ ] F-038 Revenue/cost/profit time-series charts
- [ ] F-039 TAT (Turn-Around Time) analytics
- [ ] F-040 Password reset (email/phone)
- [ ] F-041 Audit log viewer

---

## Phase 3 — Polish (P2)

### Reporting
- [ ] F-042 Top 5 drivers ranking
- [ ] F-043 Top 5 vehicles ranking
- [ ] F-044 Export reports (Excel/PDF)
- [ ] F-045 Driver salary history

### Advanced
- [ ] F-046 Route deviation detection
- [ ] F-047 Driver notification system (push alerts)
- [ ] F-048 Predictive maintenance alerts
