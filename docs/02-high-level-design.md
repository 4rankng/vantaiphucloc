# TTransport — Thiết kế Tổng thể Cấp cao (HLD)
# Giai đoạn 1 — Sản phẩm Khả dụng Tối thiểu

## 1. Kiến trúc Hệ thống

```
┌──────────────────────────────────────────────────────────────┐
│                         NGƯỜI DÙNG                           │
│                                                               │
│   📱 Tài xế (Mobile Browser / PWA)                           │
│   💻 Giám đốc, Điều hành, Kế toán (Desktop Browser)          │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                      NGINX (Reverse Proxy)                    │
│                   SSL termination + Static files               │
│                                                               │
│   /api/*  ─────────► FastAPI (port 8000)                      │
│   /*      ─────────► React Static Build                       │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                            │
│                                                               │
│   API Routes (Thin Layer):                                    │
│   - Xác thực request (JWT + RBAC)                             │
│   - Ghi Audit Log (user action)                               │
│   - Cập nhật bảng WORKFLOWS (state + attempt)                 │
│   - Trả về response ngay lập tức                              │
│                                                               │
│   → KHÔNG chứa business logic                                 │
│   → Mọi logic xử lý do Worker thực hiện                       │
└──────────────────────┬───────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   ┌──────────┐  ┌──────────┐  ┌──────────────┐
   │PostgreSQL│  │ Redis    │  │ Object       │
│          │  │ Cache +  │  │ Storage      │
│          │  │ Sessions │  │ (Ảnh, PDF)   │
│          │  └──────────┘  └──────────────┘
│ WORKFLOWS│        ▲
│ (queue)  │        │
│          │  ┌─────┴──────┐
│ Users    │  │  Workflow  │
│ Trips    │  │  Worker    │────────────── Gemini API (OCR)
│ Fleet    │  │            │
│ Expenses │  │  Polls     │────────────── Action handlers
│ Alerts   │  │  WORKFLOWS │              (code-defined)
│ Invoices │  │  attempt>0 │
│ Audit    │  │            │
│ Payments │  └────────────┘
└──────────┘

### Triển khai
- **Máy chủ đơn:** 1 DigitalOcean Droplet (4GB RAM, 2 vCPU)
- **Docker Compose** quản lý tất cả dịch vụ
- **Nginx** phục vụ frontend tĩnh + reverse proxy API
- **Let's Encrypt** SSL miễn phí

---

## 2. Mô hình Dữ liệu (Database Schema)

### 2.1 Users & Auth

```
USERS
├── id (PK, UUID)
├── username (VARCHAR 50, UNIQUE)
├── email (VARCHAR 255, UNIQUE, nullable)
├── fullname (VARCHAR 100)
├── hashed_password (VARCHAR 255)
├── phone (VARCHAR 20)
├── role (ENUM: director, dispatcher, accountant, driver)
├── is_active (BOOLEAN, default true)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── last_login (TIMESTAMP, nullable)

AUDIT_LOGS
├── id (PK, UUID)
├── user_id (FK → USERS)
├── action (ENUM: create, update, delete)
├── entity_type (VARCHAR 50) — e.g. "trip", "expense", "user"
├── entity_id (UUID)
├── old_value (JSONB, nullable)
├── new_value (JSONB, nullable)
├── ip_address (VARCHAR 45)
├── created_at (TIMESTAMP)

REFRESH_TOKENS
├── id (PK, UUID)
├── user_id (FK → USERS)
├── token_hash (VARCHAR 255)
├── expires_at (TIMESTAMP)
├── revoked (BOOLEAN)
└── created_at (TIMESTAMP)
```

### 2.2 Fleet

```
VEHICLES
├── id (PK, UUID)
├── license_plate (VARCHAR 20, UNIQUE) — Biển số
├── vehicle_type (VARCHAR 50) — Loại xe
├── manufacturer (VARCHAR 50, nullable)
├── model_year (INT, nullable)
├── status (ENUM: active, idle, maintenance, retired)
├── fuel_quota_per_km (DECIMAL 6,2) — Định mức dầu (lít/km)
├── notes (TEXT, nullable)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── created_by (FK → USERS)

DRIVER_ASSIGNMENTS
├── id (PK, UUID)
├── vehicle_id (FK → VEHICLES)
├── driver_id (FK → USERS, role=driver)
├── assigned_at (TIMESTAMP)
├── unassigned_at (TIMESTAMP, nullable)
└── is_current (BOOLEAN)
```

### 2.3 Clients (Chủ hàng)

```
CLIENTS
├── id (PK, UUID)
├── name (VARCHAR 200) — Tên công ty / cá nhân
├── tax_code (VARCHAR 20, nullable) — Mã số thuế
├── address (TEXT, nullable)
├── contact_person (VARCHAR 100, nullable)
├── phone (VARCHAR 20, nullable)
├── email (VARCHAR 255, nullable)
├── is_active (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### 2.4 Trips (Chuyến xe)

```
ROUTES
├── id (PK, UUID)
├── name (VARCHAR 200) — Tên tuyến đường
├── origin (VARCHAR 200) — Điểm xuất phát
├── destination (VARCHAR 200) — Điểm đến
├── distance_km (DECIMAL 8,2) — Quãng đường (km)
├── expected_duration_min (INT) — Thời gian dự kiến (phút)
├── created_at (TIMESTAMP)

TRIPS
├── id (PK, UUID)
├── trip_code (VARCHAR 20, UNIQUE) — Mã chuyến (tự sinh: TT-20260420-001)
├── vehicle_id (FK → VEHICLES)
├── driver_id (FK → USERS)
├── client_id (FK → CLIENTS, nullable) — NULL = chưa rõ chủ hàng
├── route_id (FK → ROUTES, nullable)
├── container_code (VARCHAR 15, nullable) — Mã container (11 ký tự)
├── status (ENUM: draft, assigned, pickup_empty, at_port, loaded,
│           in_transit, arriving, delivered, completed, cancelled)
├── is_orphan (BOOLEAN, default false) — Chuyến mồ côi
├── actual_distance_km (DECIMAL 8,2, nullable)
├── actual_duration_min (INT, nullable)
├── started_at (TIMESTAMP, nullable)
├── completed_at (TIMESTAMP, nullable)
├── total_fuel_cost (DECIMAL 12,2, default 0)
├── total_toll_cost (DECIMAL 12,2, default 0)
├── total_repair_cost (DECIMAL 12,2, default 0)
├── total_other_cost (DECIMAL 12,2, default 0)
├── total_driver_pay (DECIMAL 12,2, default 0)
├── total_revenue (DECIMAL 12,2, nullable) — Cước thu từ chủ hàng
├── notes (TEXT, nullable)
├── created_by (FK → USERS)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

TRIP_TIMELINE
├── id (PK, UUID)
├── trip_id (FK → TRIPS)
├── status (VARCHAR 30) — Trạng thái tại thời điểm ghi
├── latitude (DECIMAL 10,7)
├── longitude (DECIMAL 10,7)
├── accuracy (DECIMAL 8,2, nullable)
├── notes (TEXT, nullable)
├── created_by (FK → USERS)
└── created_at (TIMESTAMP)
```

### 2.5 Photos & Documents

```
TRIP_PHOTOS
├── id (PK, UUID)
├── trip_id (FK → TRIPS)
├── photo_type (ENUM: container_pickup, container_delivery,
│               fuel_receipt, expense_receipt, other)
├── file_path (VARCHAR 500) — Đường dẫn file lưu trữ
├── file_size (INT) — Bytes
├── latitude (DECIMAL 10,7)
├── longitude (DECIMAL 10,7)
├── accuracy (DECIMAL 8,2, nullable)
├── server_timestamp (TIMESTAMP) — Giờ máy chủ (không dùng giờ thiết bị)
├── device_timestamp (TIMESTAMP) — Giờ thiết bị (tham khảo)
├── uploaded_by (FK → USERS)
└── created_at (TIMESTAMP)
```

### 2.6 Expenses (Chi phí)

```
EXPENSES
├── id (PK, UUID)
├── trip_id (FK → TRIPS)
├── category (ENUM: fuel, toll, repair, other)
├── amount (DECIMAL 12,2)
├── description (TEXT, nullable)
├── receipt_photo_id (FK → TRIP_PHOTOS, nullable)
├── latitude (DECIMAL 10,7)
├── longitude (DECIMAL 10,7)
├── server_timestamp (TIMESTAMP)
├── status (ENUM: pending, approved, rejected)
├── reviewed_by (FK → USERS, nullable)
├── reviewed_at (TIMESTAMP, nullable)
├── rejection_reason (TEXT, nullable)
├── submitted_by (FK → USERS)
└── created_at (TIMESTAMP)
```

### 2.7 Alerts & Violations

```
ALERTS
├── id (PK, UUID)
├── trip_id (FK → TRIPS)
├── alert_type (ENUM: fuel_variance, time_anomaly, missing_photos)
├── severity (ENUM: warning, critical)
├── description (TEXT)
├── threshold_value (DECIMAL 10,2) — Giá trị ngưỡng
├── actual_value (DECIMAL 10,2) — Giá trị thực tế
├── is_resolved (BOOLEAN, default false)
├── resolved_by (FK → USERS, nullable)
├── resolution (ENUM: confirmed_violation, dismissed, pending)
├── resolution_notes (TEXT, nullable)
├── resolved_at (TIMESTAMP, nullable)
├── created_at (TIMESTAMP)

DRIVER_VIOLATIONS
├── id (PK, UUID)
├── driver_id (FK → USERS)
├── alert_id (FK → ALERTS)
├── trip_id (FK → TRIPS)
├── violation_type (VARCHAR 50)
├── penalty_points (INT) — Điểm trừ KPI
├── description (TEXT)
├── created_at (TIMESTAMP)
```

### 2.8 Invoices & Payments

```
INVOICES
├── id (PK, UUID)
├── invoice_code (VARCHAR 20, UNIQUE) — Mã hóa đơn (tự sinh: HD-20260420-001)
├── client_id (FK → CLIENTS)
├── billing_period_start (DATE)
├── billing_period_end (DATE)
├── total_amount (DECIMAL 14,2) — Tổng tiền
├── total_paid (DECIMAL 12,2, default 0) — Đã thanh toán
├── status (ENUM: draft, issued, partial_paid, fully_paid, overdue)
├── issued_at (TIMESTAMP, nullable)
├── pdf_path (VARCHAR 500, nullable) — File PDF hóa đơn
├── is_locked (BOOLEAN, default false) — Khóa sau chốt
├── created_by (FK → USERS)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

INVOICE_TRIPS (Bảng trung gian)
├── invoice_id (FK → INVOICES)
├── trip_id (FK → TRIPS)
└── trip_amount (DECIMAL 12,2) — Tiền cước chuyến này

PAYMENTS
├── id (PK, UUID)
├── invoice_id (FK → INVOICES)
├── amount (DECIMAL 12,2)
├── payment_method (VARCHAR 50) — Tiền mặt, chuyển khoản, etc.
├── reference_number (VARCHAR 100, nullable) — Số tham chiếu
├── notes (TEXT, nullable)
├── received_by (FK → USERS)
└── created_at (TIMESTAMP)
```

### 2.9 Period Close

```
PERIOD_CLOSES
├── id (PK, UUID)
├── period_month (INT) — Tháng
├── period_year (INT) — Năm
├── status (ENUM: open, closed)
├── closed_by (FK → USERS, nullable)
├── closed_at (TIMESTAMP, nullable)
└── created_at (TIMESTAMP)
```

### 2.10 Workflow Engine

```
WORKFLOWS
├── id (SERIAL, AUTO INCREMENT, PK)
├── run_id (UUID, UNIQUE)       — Nhận diện 1 thực thể chạy workflow
├── state (INTEGER)              — Trạng thái hiện tại (định nghĩa trong code)
├── attempt (INTEGER, default 0) — 0=chờ, 1+=đã thử, >max=dừng
├── data (JSONB)                 — Dữ liệu mở rộng (entity_type, entity_id, event, payload, kết quả, lỗi)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Nguyên tắc hoạt động:**

```
API endpoint                          Workflow Worker
─────────────                         ──────────────────
1. Xác thực request (JWT + RBAC)      Poll: WHERE attempt > 0
2. Ghi Audit Log (hành động user)     │
3. INSERT/UPDATE bảng WORKFLOWS  ────►│
   - Cập nhật state                   │
   - Đặt attempt = 1 (kích worker)    │
4. Trả về response ngay lập tức       │
                                      ▼
                                 Lấy workflow config (code)
                                 Kiểm tra: attempt ≤ max_attempts?
                                      │
                                 ├─ Có: Thực thi transition action
                                 │      ├─ Thành công → cập nhật state, attempt = 0
                                 │      └─ Thất bại → attempt += 1 (thử lại lần sau)
                                 │
                                 └─ Không: Bỏ qua (cần can thiệp thủ công)
```

**Ví dụ: Trip Workflow (định nghĩa trong code)**

```python
# States (integer enum)
TRIP_DRAFT = 0
TRIP_ASSIGNED = 1
TRIP_PICKUP_EMPTY = 2
TRIP_AT_PORT = 3
TRIP_LOADED = 4
TRIP_IN_TRANSIT = 5
TRIP_ARRIVING = 6
TRIP_DELIVERED = 7
TRIP_COMPLETED = 8
TRIP_CANCELLED = 9

# Transitions (code-defined)
TRIP_TRANSITIONS = {
    (0, "assign"):       {"to": 1, "max_attempts": 1, "actions": ["notify_driver"]},
    (1, "confirm_pickup"): {"to": 2, "max_attempts": 1, "actions": []},
    (3, "ocr_complete"):  {"to": 4, "max_attempts": 3, "actions": ["save_container_code"]},
    (7, "confirm_delivery"): {"to": 8, "max_attempts": 3, "actions": [
        "calculate_costs", "check_anomalies", "generate_alerts"
    ]},
}
```

**Phân tách rõ ràng:**
- **Audit Log** ghi lại hành động của người dùng (ai bấm gì, lúc nào, giá trị cũ/mới)
- **Workflow Table** chỉ là hàng đợi trạng thái hệ thống (không chứa user context)
- API route mỏng — chỉ xác thực + ghi log + cập nhật workflow
- Worker xử lý toàn bộ business logic

---

## 3. Thiết kế API (REST)

### 3.1 Authentication

```
POST   /api/v1/auth/login              — Đăng nhập → access_token + refresh_token
POST   /api/v1/auth/refresh            — Đổi token mới
POST   /api/v1/auth/logout             — Đăng xuất (thu hồi token)
GET    /api/v1/auth/me                  — Lấy thông tin user hiện tại
PUT    /api/v1/auth/change-password     — Đổi mật khẩu
```

### 3.2 Users

```
GET    /api/v1/users                    — Danh sách (filter: role, is_active, search)
POST   /api/v1/users                    — Tạo user mới
GET    /api/v1/users/{id}               — Chi tiết user
PUT    /api/v1/users/{id}               — Cập nhật user
PATCH  /api/v1/users/{id}/status        — Khóa / mở khóa
```

### 3.3 Vehicles

```
GET    /api/v1/vehicles                 — Danh sách xe (filter: status)
POST   /api/v1/vehicles                 — Thêm xe mới
GET    /api/v1/vehicles/{id}            — Chi tiết xe
PUT    /api/v1/vehicles/{id}            — Cập nhật thông tin
PATCH  /api/v1/vehicles/{id}/status     — Thay đổi trạng thái
POST   /api/v1/vehicles/{id}/assign-driver — Gán tài xế
```

### 3.4 Clients (Chủ hàng)

```
GET    /api/v1/clients                  — Danh sách chủ hàng
POST   /api/v1/clients                  — Thêm chủ hàng
GET    /api/v1/clients/{id}             — Chi tiết
PUT    /api/v1/clients/{id}             — Cập nhật
GET    /api/v1/clients/{id}/receivables — Công nợ của chủ hàng này
```

### 3.5 Routes (Tuyến đường)

```
GET    /api/v1/routes                   — Danh sách tuyến đường
POST   /api/v1/routes                   — Thêm tuyến đường
GET    /api/v1/routes/{id}              — Chi tiết
PUT    /api/v1/routes/{id}              — Cập nhật
```

### 3.6 Trips (Chuyến xe)

```
GET    /api/v1/trips                    — Danh sách chuyến (filter: status, date, driver, vehicle, client, is_orphan)
POST   /api/v1/trips                    — Tạo chuyến mới
GET    /api/v1/trips/{id}               — Chi tiết chuyến
PUT    /api/v1/trips/{id}               — Cập nhật chuyến
PATCH  /api/v1/trips/{id}/status        — Cập nhật trạng thái (tài xế)
PUT    /api/v1/trips/{id}/client        — Gán/chuyển chủ hàng
GET    /api/v1/trips/{id}/timeline      — Lịch sử trạng thái chuyến
GET    /api/v1/trips/{id}/photos        — Ảnh của chuyến
GET    /api/v1/trips/{id}/expenses      — Chi phí của chuyến
GET    /api/v1/trips/{id}/cost-summary  — Tổng hợp chi phí
```

### 3.7 Photos & OCR

```
POST   /api/v1/photos/upload            — Tải ảnh lên (multipart, đính GPS + timestamp)
POST   /api/v1/ocr/scan-container       — Gửi ảnh → nhận mã container (Gemini)
GET    /api/v1/photos/{id}              — Xem ảnh
```

### 3.8 Expenses

```
GET    /api/v1/expenses                 — Danh sách chi phí (filter: status, trip, category)
POST   /api/v1/expenses                 — Gửi chi phí mới
GET    /api/v1/expenses/{id}            — Chi tiết
PATCH  /api/v1/expenses/{id}/approve    — Duyệt
PATCH  /api/v1/expenses/{id}/reject     — Từ chối (kèm lý do)
```

### 3.9 Alerts

```
GET    /api/v1/alerts                   — Danh sách cảnh báo (filter: resolved, type, severity)
GET    /api/v1/alerts/{id}              — Chi tiết
PATCH  /api/v1/alerts/{id}/resolve      — Xử lý cảnh báo
GET    /api/v1/alerts/stats             — Thống kê cảnh báo
```

### 3.10 Invoices

```
GET    /api/v1/invoices                 — Danh sách hóa đơn (filter: status, client, period)
POST   /api/v1/invoices                 — Tạo hóa đơn (chọn chuyến + chủ hàng)
GET    /api/v1/invoices/{id}            — Chi tiết
PATCH  /api/v1/invoices/{id}/lock       — Khóa hóa đơn (read-only)
GET    /api/v1/invoices/{id}/pdf        — Tải PDF hóa đơn
POST   /api/v1/invoices/{id}/payments   — Ghi nhận thanh toán
```

### 3.11 Dashboard

```
GET    /api/v1/dashboard/director       — Dữ liệu bảng điều khiển Giám đốc
GET    /api/v1/dashboard/dispatcher     — Dữ liệu bảng điều khiển Điều hành
GET    /api/v1/dashboard/accountant     — Dữ liệu bảng điều khiển Kế toán
GET    /api/v1/dashboard/driver         — Dữ liệu bảng điều khiển Tài xế
```

### 3.12 KPI

```
GET    /api/v1/kpi/drivers              — Bảng xếp hạng tài xế
GET    /api/v1/kpi/drivers/{id}         — Chi tiết KPI tài xế
GET    /api/v1/kpi/drivers/{id}/violations — Lịch sử vi phạm
```

### 3.13 Period Close

```
GET    /api/v1/periods                  — Danh sách kỳ kế toán
GET    /api/v1/periods/current          — Kỳ hiện tại
POST   /api/v1/periods/{id}/close       — Chốt sổ (kiểm tra chuyến mồ côi trước khi cho phép)
```

### 3.14 Audit Log

```
GET    /api/v1/audit-logs               — Danh sách (filter: user, entity_type, date)
```

---

## 4. State Machines (Định nghĩa trong Code)

Tất cả trạng thái, chuyển đổi và hành động được định nghĩa trong code. Bảng `WORKFLOWS` chỉ lưu trữ trạng thái thời gian chạy.

### 4.1 Trạng thái Chuyến xe (Trip Workflow)

```
State 0: draft
State 1: assigned
State 2: pickup_empty
State 3: at_port
State 4: loaded
State 5: in_transit
State 6: arriving
State 7: delivered
State 8: completed   (terminal)
State 9: cancelled   (terminal)

Luồng chính:
0 ──► 1 ──► 2 ──► 3 ──► 4 ──► 5 ──► 6 ──► 7 ──► 8
0~4 ──► 9 (hủy bất kỳ lúc nào trước khi chạy)
```

**Chuyển đổi và hành động:**

| Từ → Đến | Event | Ai trigger | max_attempts | Actions (Worker) |
|-----------|-------|------------|-------------|-----------------|
| 0 → 1 | assign | Điều hành | 1 | notify_driver |
| 1 → 2 | confirm_pickup | Tài xế | 1 | (none) |
| 2 → 3 | arrive_port | Tài xế | 1 | (none) |
| 3 → 4 | ocr_complete | Tài xế | 3 | save_container_code |
| 4 → 5 | depart | Tài xế | 1 | notify_dispatcher |
| 5 → 6 | arrive_dest | Tài xế | 1 | (none) |
| 6 → 7 | deliver | Tài xế | 1 | (none) |
| 7 → 8 | confirm_delivery | Tài xế | 3 | calculate_costs, check_anomalies, generate_alerts |
| 0~4 → 9 | cancel | Điều hành | 1 | notify_driver |

**Ví dụ luồng API → Worker:**

```
Tài xế bấm "Hoàn thành" trên app
    │
    ├─► API: Xác thực JWT + RBAC (role=driver)
    ├─► API: Ghi Audit Log (user_id=xxx, action="confirm_delivery", entity=trip)
    ├─► API: UPDATE workflows SET state=7, attempt=1 WHERE run_id=...
    └─► API: Trả về {"status": "processing"}

    Worker poll: attempt > 0 → tìm thấy
    │
    ├─► Worker: calculate_costs(trip) → cập nhật TRIPS totals
    ├─► Worker: check_anomalies(trip) → tạo ALERTS nếu bất thường
    ├─► Worker: generate_alerts(trip) → ghi DRIVER_VIOLATIONS
    └─► Worker: UPDATE workflows SET state=8, attempt=0 WHERE run_id=...
```

### 4.2 Trạng thái Chi phí (Expense Workflow)

```
State 0: pending
State 1: approved  (terminal)
State 2: rejected  (terminal)
```

| Từ → Đến | Event | Ai trigger | max_attempts | Actions (Worker) |
|-----------|-------|------------|-------------|-----------------|
| 0 → 1 | approve | Điều hành / Kế toán | 1 | add_to_trip_cost |
| 0 → 2 | reject | Điều hành / Kế toán | 1 | notify_driver |

### 4.3 Trạng thái Hóa đơn (Invoice Workflow)

```
State 0: draft
State 1: issued
State 2: partial_paid
State 3: fully_paid  (terminal)
State 4: overdue
```

| Từ → Đến | Event | Ai trigger | max_attempts | Actions (Worker) |
|-----------|-------|------------|-------------|-----------------|
| 0 → 1 | issue | Kế toán | 1 | generate_pdf |
| 1 → 2 | partial_payment | Kế toán | 1 | record_payment |
| 1/2 → 3 | full_payment | Kế toán | 1 | record_payment, lock_invoice |
| 1/2 → 4 | mark_overdue | Hệ thống | 1 | notify_director |
| 4 → 2/3 | payment | Kế toán | 1 | record_payment |

### 4.4 Trạng thái Xe (Vehicle — không dùng workflow, đơn giản)

```
State 0: idle
State 1: active
State 2: on_trip
State 3: maintenance
State 4: retired  (terminal)
```

Giao tiếp trực tiếp qua API (không cần worker). Trạng thái xe thay đổi khi chuyến xe bắt đầu/kết thúc.

---

## 5. Logic Kinh doanh Chính

### 5.1 Phát hiện Bất thường Thời gian

```
Nếu actual_duration > expected_duration × 1.5:
    → Tạo cảnh báo loại "time_anomaly"
    → severity = "warning" nếu < 2x
    → severity = "critical" nếu ≥ 2x
```

### 5.2 Phát hiện Gian lận Nhiên liệu

```
fuel_expected = actual_distance_km × vehicle.fuel_quota_per_km
fuel_actual = tổng lít dầu khai báo trong chuyến

Nếu fuel_actual > fuel_expected × 1.1:
    → Tạo cảnh báo loại "fuel_variance"
    → threshold_value = fuel_expected
    → actual_value = fuel_actual
```

### 5.3 Chặn Chuyến mồ côi

```
Khi Kế toán bấm "Chốt sổ" (POST /periods/{id}/close):
    orphan_count = COUNT(trips WHERE is_orphan=true AND completed trong kỳ)
    
    Nếu orphan_count > 0:
        → Trả về lỗi 400: "Không thể chốt sổ. Còn {orphan_count} chuyến mồ côi chưa gán chủ hàng."
    Ngược lại:
        → Khóa tất cả chuyến trong kỳ (read-only)
        → Tạo period_close record
```

### 5.4 Tính KPI Tài xế

```
Trong kỳ (tháng):
    total_trips = số chuyến hoàn thành
    violation_trips = số chuyến có vi phạm đã xác nhận
    
    kpi_score = (total_trips - violation_trips) / total_trips × 100
    
    Phân loại:
        ≥ 90%: Xuất sắc
        70-89%: Tốt
        50-69%: Cần cải thiện
        < 50%: Kém
```

### 5.5 Tổng hợp Chi phí Chuyến

```
Khi chuyến chuyển sang trạng thái "completed":
    total_fuel_cost = SUM(expenses WHERE category='fuel' AND status='approved')
    total_toll_cost = SUM(expenses WHERE category='toll' AND status='approved')
    total_repair_cost = SUM(expenses WHERE category='repair' AND status='approved')
    total_other_cost = SUM(expenses WHERE category='other' AND status='approved')
    
    total_cost = fuel + toll + repair + other + driver_pay
    
    Nếu total_revenue IS NOT NULL:
        net_profit = total_revenue - total_cost
```

---

## 6. Phân quyền Chi tiết

| API Endpoint | Giám đốc | Điều hành | Kế toán | Tài xế |
|---|---|---|---|---|
| Auth (login/me/password) | ✅ | ✅ | ✅ | ✅ |
| Users CRUD | ✅ | ❌ | ❌ | ❌ |
| Vehicles CRUD | ✅ | ✅ (xem) | ❌ | ❌ |
| Clients CRUD | ✅ | ✅ | ✅ (xem) | ❌ |
| Routes CRUD | ✅ | ✅ | ❌ | ❌ |
| Trips — Tạo/Sửa | ✅ | ✅ | ❌ | ❌ |
| Trips — Cập nhật trạng thái | ❌ | ❌ | ❌ | ✅ (chuyến mình) |
| Trips — Xem | ✅ (tất cả) | ✅ (tất cả) | ✅ (hoàn thành) | ✅ (mình) |
| Photos — Tải lên | ❌ | ❌ | ❌ | ✅ |
| Photos — Xem | ✅ | ✅ | ✅ | ✅ (mình) |
| OCR Scan | ❌ | ❌ | ❌ | ✅ |
| Expenses — Gửi | ❌ | ❌ | ❌ | ✅ |
| Expenses — Duyệt | ✅ | ✅ | ✅ | ❌ |
| Alerts — Xem | ✅ | ✅ | ❌ | ❌ |
| Alerts — Xử lý | ✅ | ✅ | ❌ | ❌ |
| Invoices — Tạo | ✅ | ❌ | ✅ | ❌ |
| Invoices — Xem | ✅ | ❌ | ✅ | ❌ |
| Payments — Ghi nhận | ✅ | ❌ | ✅ | ❌ |
| Period Close | ✅ | ❌ | ✅ | ❌ |
| KPI — Xem tất cả | ✅ | ✅ (xem) | ❌ | ✅ (mình) |
| Dashboard — Giám đốc | ✅ | ❌ | ❌ | ❌ |
| Dashboard — Điều hành | ✅ | ✅ | ❌ | ❌ |
| Dashboard — Kế toán | ✅ | ❌ | ✅ | ❌ |
| Dashboard — Tài xế | ❌ | ❌ | ❌ | ✅ |
| Audit Log | ✅ | ❌ | ❌ | ❌ |

---

## 7. Frontend — Cấu trúc Trang

### 7.1 Giao diện Máy tính (Desktop)

```
┌─────────────────────────────────────────────────────────┐
│  [Logo TTransport]          [Tên user] [Avatar] [Đăng xuất] │
├────────┬────────────────────────────────────────────────┤
│        │                                                │
│ Menu   │  Nội dung chính                                │
│ dọc    │                                                │
│        │  - Bảng điều khiển                              │
│ Theo   │  - Danh sách / Form / Chi tiết                 │
│ vai    │                                                │
│ trò    │                                                │
│        │                                                │
├────────┴────────────────────────────────────────────────┤
```

**Menu theo vai trò:**

| Giám đốc | Điều hành | Kế toán |
|----------|-----------|---------|
| Tổng quan | Tổng quan | Tổng quan |
| Đội xe | Chuyến xe | Chuyến hoàn thành |
| Chuyến xe | Cảnh báo | Chi phí chờ duyệt |
| Chủ hàng | Đội xe | Chủ hàng & Công nợ |
| Hóa đơn | Chủ hàng | Hóa đơn |
| Người dùng | | Chốt sổ |
| Nhật ký | | |
| KPI Tài xế | | |

### 7.2 Giao diện Điện thoại (Tài xế)

```
┌──────────────────────────┐
│  TTransport     [Avatar] │
├──────────────────────────┤
│                          │
│  Chuyến đang thực hiện   │
│  ┌────────────────────┐  │
│  │ TT-0420-001        │  │
│  │ Cảng CAT LAI → Bình │  │
│  │ Đang chạy 🟢       │  │
│  └────────────────────┘  │
│                          │
│  Thu nhập hôm nay        │
│  850.000 VNĐ             │
│                          │
├──────────────────────────┤
│ 🏠  📋  📷  💰  👤     │
│ Home Trips Photos Income Me│
└──────────────────────────┘
```

**5 tab điều hướng:**
1. **Trang chủ** — Tổng quan nhanh
2. **Chuyến xe** — Danh sách chuyến, cập nhật trạng thái
3. **Chụp ảnh** — Camera → OCR / Biên lai
4. **Thu nhập** — Thu nhập hôm nay, lịch sử
5. **Tài khoản** — Thông tin cá nhân, đổi mật khẩu

---

## 8. Offline & Đồng bộ (PWA)

```
┌──────────────┐         ┌──────────────┐
│  Mobile App  │         │   Server     │
│  (PWA)       │         │              │
│              │  Online │              │
│  ┌────────┐ ──────────► ┌────────┐   │
│  │ Action │  gửi ngay  │  API   │   │
│  │ Queue  │             │        │   │
│  │(IndexedDB)│ Offline  └────────┘   │
│  │        │ ◄──────────              │
│  │ Chờ     │  Lưu hàng đợi           │
│  │ Đồng bộ │                          │
│  └────────┘ ──────────► Khi có mạng  │
│              Gửi tất cả              │
└──────────────┘         └──────────────┘
```

**Cơ chế:**
- **IndexedDB** lưu hàng đợi thao tác (trạng thái, chi phí, ảnh metadata)
- Ảnh lưu vào bộ nhớ cục bộ (Blob/Cache API) khi ngoại tuyến
- Khi có mạng → gửi theo thứ tự FIFO
- Đánh dấu đã gửi → xóa khỏi hàng đợi
- Thời gian luôn dùng giờ máy chủ khi gửi lên (không tin giờ thiết bị)

---

## 9. Luồng Dữ liệu Chính

### 9.1 Tạo → Hoàn thành Chuyến xe

```
Điều hành                    Tài xế (Mobile)              Hệ thống
───────────                  ────────────────              ────────
Tạo chuyến ────────────────► Hiển thị chuyến mới
Gán xe + tài xế + lộ trình    trên app
                                │
                             Nhận ca (GPS stamp)
                                │
                             Lấy rỗng (GPS)
                                │
                             Đến cảng
                                │
                             Chụp container ──────────► Gemini OCR
                                │                      → Mã container
                             Lấy hàng (GPS)
                                │
                             Rời cảng → in_transit
                                │
                             ... đang chạy ...
                                │
                             Đến nơi (GPS)
                                │
                             Hạ bãi + chụp ảnh ──────► Lưu ảnh + GPS
                                │
                             Hoàn thành ─────────────► Tính chi phí
                                                      Kiểm tra bất thường
                                                      → Tạo cảnh báo (nếu có)
```

### 9.2 Duyệt Chi phí → Chốt sổ

```
Tài xế                      Điều hành/Kế toán            Kế toán
───────                      ──────────────────            ────────
Gửi chi phí + ảnh ────────► Xem chi phí
(GPS + Timestamp)            │
                             Duyệt ✓ / Từ chối ✗
                                │
                                ▼
                          Chi phí approved ──────► Cộng vào tổng chuyến
                                                    │
                                          Chuyến hoàn thành
                                                    │
                                          Rà soát chuyến mồ côi
                                          Gán chủ hàng (nếu cần)
                                                    │
                                          Chọn chuyến + Chủ hàng
                                          → Tạo hóa đơn
                                                    │
                                          Ghi nhận thanh toán
                                                    │
                                          Chốt sổ (kiểm tra mồ côi)
```

---

## 10. Tích hợp Bên ngoài

| Dịch vụ | Mục đích | Trigger |
|---------|----------|---------|
| **Gemini Vision API** | Nhận diện mã container từ ảnh | Tài xế chụp ảnh container |
| **Object Storage** | Lưu trữ ảnh, PDF hóa đơn | Mọi lần tải ảnh / xuất hóa đơn |

---

*Hết tài liệu Thiết kế Tổng thể Cấp cao*
