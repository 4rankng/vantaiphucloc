# TTransport — High Level Design

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTS                             │
│  ┌──────────────┐              ┌───────────────────┐     │
│  │  Mobile App   │              │    Web App         │     │
│  │  (Lái xe)     │              │  (Văn phòng)      │     │
│  │  React Native │              │  React + Vite      │     │
│  │  Offline-1st  │              │  Desktop + Mobile  │     │
│  └──────┬───────┘              └────────┬──────────┘     │
└─────────┼──────────────────────────────┼─────────────────┘
          │ REST API                      │ REST API
          │ (JWT Auth)                    │ (JWT Auth)
          ▼                              ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND API                           │
│               Python FastAPI + SQLAlchemy                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Auth     │ │ Trip Mgmt│ │ Alert    │ │ Accounting │ │
│  │ Module   │ │ Module   │ │ Engine   │ │ Module     │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ OCR/AI   │ │ KPI      │ │ Fleet    │ │ Audit Log  │ │
│  │ Service  │ │ Engine   │ │ Tracker  │ │ Module     │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
└────────┬──────────────┬──────────────┬──────────────────┘
         │              │              │
         ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────────┐
   │PostgreSQL│  │Object    │  │AI/OCR        │
   │(Primary) │  │Storage   │  │Service       │
   │          │  │(Photos,  │  │(Container    │
   │          │  │ Receipts)│  │ recognition) │
   └──────────┘  └──────────┘  └──────────────┘
```

## Core Modules

### 1. Authentication & Authorization
- JWT-based auth with role-based access control (RBAC)
- Roles: **Giám đốc** (Director), **Điều hành** (Dispatcher), **Kế toán** (Accountant), **Tài xế** (Driver)
- Audit log for all sensitive operations

### 2. Fleet Management
- Vehicle registry (trucks, containers)
- Real-time GPS tracking & status
- Vehicle utilization & maintenance scheduling

### 3. Trip Management
- Trip creation, assignment, lifecycle
- Container tracking (OCR scanning)
- Route & stop logging with timestamps
- Fuel consumption tracking vs定额 (quota)

### 4. AI/OCR Service
- Container code recognition from photos
- Anomaly detection (fuel, idle time, route deviation)
- Automated violation alerts

### 5. Financial & Accounting
- Trip cost calculation (fuel + tolls + repairs + driver pay)
- Revenue per trip, per vehicle, per client
- E-invoice generation & batch processing
- Orphan trip detection & blocking

### 6. Driver KPI & Payroll
- Automated scoring based on violations & performance
- Bonus/penalty calculation
- Payroll generation with evidence trail

### 7. Reporting & Dashboard
- Real-time fleet overview (active / idle / loaded / empty)
- TAT (Turn-Around Time) analytics
- P&L per vehicle
- Top/bottom performers ranking

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Mobile App | React Native (or Kotlin + Compose for Android) |
| Backend API | Python FastAPI + SQLAlchemy 2.0 (async) |
| Database | PostgreSQL + asyncpg |
| Cache / Queue | Redis (caching, rate limiting, sessions) |
| Background Tasks | Celery / Arq (emails, reports, invoices) |
| Object Storage | S3-compatible (photos, receipts) |
| AI/OCR | Tesseract / Google Vision / custom model |
| Auth | JWT (python-jose + passlib) + HTTPOnly cookies |
| Validation | Pydantic v2 + OpenAPI |
| State Management (Web) | Zustand (global) + TanStack Query (server) |
| Forms (Web) | React Hook Form + Zod |
| Tables (Web) | TanStack Table |
| Maps | Leaflet / Mapbox (fleet tracking) |
| Real-time | WebSocket for live tracking & alerts |
| Monitoring | Sentry (errors) + Prometheus (metrics) |
| Deployment | Docker + docker-compose |

## Roles & Permissions Matrix

| Feature | Giám đốc | Điều hành | Kế toán | Tài xế |
|---------|----------|-----------|---------|--------|
| Dashboard (full) | ✅ | ❌ | ❌ | ❌ |
| Dashboard (operational) | ✅ | ✅ | ❌ | ❌ |
| Dashboard (financial) | ✅ | ❌ | ✅ | ❌ |
| Fleet management | ✅ | ✅ (view) | ❌ | ❌ |
| Trip CRUD | ✅ | ✅ | ❌ | ❌ |
| Trip execution (mobile) | ❌ | ❌ | ❌ | ✅ |
| Container OCR scan | ❌ | ❌ | ❌ | ✅ |
| Violation alerts | ✅ | ✅ | ❌ | ❌ |
| Expense approval | ✅ | ✅ | ✅ | ❌ |
| Expense submission | ❌ | ❌ | ❌ | ✅ |
| Invoice generation | ✅ | ❌ | ✅ | ❌ |
| Payroll view (own) | ❌ | ❌ | ❌ | ✅ |
| Payroll management | ✅ | ❌ | ✅ | ❌ |
| P&L per vehicle | ✅ | ❌ | ❌ | ❌ |
| KPI scores | ✅ | ✅ (view) | ❌ | ✅ (own) |
| Audit log | ✅ | ❌ | ❌ | ❌ |
| User management | ✅ | ❌ | ❌ | ❌ |

## Data Flow

```
Tài xế (Mobile)              Server                    Văn phòng (Web)
─────────────────           ────────                  ────────────────
Nhận ca ──────────────────► Tạo chuyến
Chụp container ───────────► OCR đọc mã
                           ├─ Lưu DB
                           ├─ Kiểm tra bất thường
                           └─ Push cảnh báo ──────────► Điều hành xử lý
Khai báo đổ dầu ──────────► Đối chiếu định mức
                           └─ Cảnh báo hụt dầu ──────► Điều hành / Kế toán
Chụp biên lai ────────────► Lưu + đóng dấu thời gian
                           └─ Chờ duyệt ─────────────► Kế toán duyệt
Hoàn thành chuyến ────────► Đánh dấu hoàn thành
                           ├─ Tính chi phí tự động
                           └─ Hiển thị ──────────────► Kế toán gom xuất HĐ
                                                      ► Giám đốc xem P&L
```

## Offline Strategy (Mobile)

- Local SQLite/AsyncStorage for offline data queue
- Auto-sync when network restored
- Timestamp + GPS stamp immutable (cannot backdate)
- Queue retry with exponential backoff

## Localization

- **All customer-facing UI text in Vietnamese**
- Internal code, comments, variable names in English
- API error messages in Vietnamese where user-facing
- Date/time format: DD/MM/YYYY (Vietnamese standard)
