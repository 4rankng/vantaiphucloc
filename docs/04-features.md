# TTransport — Phase 1: MVP Requirements

> Minimum Workable Product — everything needed to go live and deliver value

## Platform
- Web app (React) — responsive: desktop sidebar + mobile bottom nav
- PWA (installable on phone home screen, offline support)
- No native mobile app — mobile browser view only
- Single droplet deployment (Docker Compose)

## Authentication & Users
- [x] Login with username/password
- [x] JWT auth with HTTPOnly cookies
- [x] 4 roles: Giám đốc (Director), Điều hành (Dispatcher), Kế toán (Accountant), Tài xế (Driver)
- [x] Role-based route guards (frontend + backend)
- [x] Change password
- [x] User CRUD (Director only)

## Fleet & Vehicles
- [x] Vehicle registry (license plate, type, status)
- [x] Vehicle status: active / on-trip / idle / maintenance
- [x] Driver-vehicle assignment

## Trip Lifecycle
- [x] Create trip (Dispatcher assigns vehicle + driver + route)
- [x] Assign client (Chủ hàng) — or mark "Chưa rõ Chủ hàng"
- [x] Driver sees assigned trips (mobile view)
- [x] Driver updates trip status: Nhận ca → Đang chạy → Đến nơi → Hoàn thành
- [x] Trip completion triggers cost calculation

## Container OCR (Gemini)
- [x] Driver takes photo of container
- [x] Photo sent to Gemini Vision API → returns container code
- [x] Auto-fill container code in trip form
- [x] Fallback: manual entry if OCR fails

## GPS & Location (Browser API)
- [x] Capture GPS coordinates on every driver action (using `navigator.geolocation`)
- [x] Actions that stamp GPS: pickup photo, delivery photo, fuel declaration, expense submission
- [x] Store lat/lng/accuracy/timestamp with each action
- [x] Display location data in trip detail (office view)

## Photo & Receipts
- [x] Driver uploads photos (container pickup/delivery, fuel receipts, expense receipts)
- [x] Photos stored with: GPS coordinates + server timestamp (not client time)
- [x] Office staff views photos in trip detail

## Expense Management
- [x] Driver submits expenses (fuel, tolls, repairs, etc.) with photo receipt
- [x] Expense includes: amount, category, description, photo, GPS, timestamp
- [x] Dispatcher/Accountant reviews and approves/rejects expenses
- [x] Approved expenses auto-added to trip cost

## Anti-Fraud: Time-Based Anomaly Detection
- [x] Compare actual trip duration vs expected route duration
- [x] Flag trips where duration > expected × 1.5x (suspected idle/loitering)
- [x] Compare fuel claimed vs route distance × fuel quota
- [x] Flag fuel variance > 10% above quota
- [x] Alerts displayed in dashboard for Dispatcher/Director

## Orphan Trip Detection
- [x] Trips marked "Chưa rõ Chủ hàng" flagged with orange warning
- [x] Accountant assigns client to orphan trips
- [x] System blocks month-end close if any orphan trips remain unassigned

## Accounting
- [x] Completed trips list grouped by client
- [x] Trip cost breakdown: fuel + tolls + repairs + driver pay
- [x] Accounts receivable per client (total / paid / unpaid)
- [x] Mark trips as paid (partial or full)
- [x] Generate PDF invoice grouped by client (Python reportlab/weasyprint)

## Driver KPI (Simple)
- [x] Auto-count violations per driver (flagged trips)
- [x] Violation types: fuel variance, time anomaly, missing photos
- [x] KPI score = violations / total trips
- [x] Director sees driver ranking

## Dashboard
- [x] **Director:** Fleet status overview (active/idle counts), revenue vs cost summary, top violators, orphan trip count
- [x] **Dispatcher:** Active trips, pending alerts, trip timeline
- [x] **Accountant:** Pending expenses to approve, receivables summary, orphan trips
- [x] **Driver (mobile):** My trips, trip status update, submit photo/expense, my income today

## Audit Log
- [x] Auto-log all create/update/delete actions
- [x] Fields: who, when, what entity, old value, new value
- [x] Director-only access

## Offline Support (PWA)
- [x] Service Worker caches app shell
- [x] Queue driver submissions (photos, expenses, status updates) when offline
- [x] Auto-sync queue when back online

## All UI in Vietnamese

---

# TTransport — Phase 2: Advanced Features

> Nice-to-have, post-MVP enhancements

## Real-Time Tracking
- [ ] Continuous GPS tracking via hardware tracker device
- [ ] Live fleet map (Leaflet/Mapbox) showing all active vehicles
- [ ] Geofencing (auto-detect arrival at port/depot)

## Advanced Alerts
- [ ] Real-time idle detection (> 45 min stationary) — requires hardware GPS
- [ ] Route deviation detection
- [ ] Speed violation alerts

## E-Invoice Integration
- [ ] Connect to Vietnam e-invoice provider API (Viettel, VNPT)
- [ ] Auto-generate and submit electronic invoices

## Advanced KPI & Payroll
- [ ] Weighted KPI scoring system
- [ ] Auto-calculate monthly payroll (base + per-trip + bonus/penalty)
- [ ] Driver salary history & payslips

## Advanced Reporting
- [ ] P&L per vehicle (revenue - all costs = net profit)
- [ ] TAT (Turn-Around Time) analytics
- [ ] Top 5 drivers / Top 5 vehicles ranking
- [ ] Export reports (Excel/PDF)
- [ ] Revenue/cost/profit time-series charts

## Operations
- [ ] Route management (saved routes with distance & expected duration)
- [ ] Predictive maintenance alerts
- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] Multi-company/tenant support

## Monitoring & Infra
- [ ] Sentry error tracking
- [ ] Prometheus metrics
- [ ] Auto-scaling setup
- [ ] Database backup automation
