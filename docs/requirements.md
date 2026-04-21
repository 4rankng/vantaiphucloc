# TTransport — Tổng quan & Yêu cầu Hệ thống

> Tài liệu Chuyển Đổi Số Toàn Diện Ngành Vận Tải Container

---

## 1. Tầm nhìn và Giải pháp

### 1.1 Vấn đề của doanh nghiệp vận tải hiện nay
1. **Thất thoát chi phí:** Gian lận xăng dầu, câu giờ, chi phí dọc đường không kiểm soát.
2. **Giấy tờ rườm rà:** Nhập liệu thủ công, sai sót mã container.
3. **Chậm trễ dòng tiền:** Đối soát chậm, "chuyến mồ côi" không rõ người thanh toán.
4. **Thiếu dữ liệu:** Giám đốc thiếu bức tranh Real-time về hiệu quả từng xe.

### 1.2 Giải pháp TTransport
- **Mobile App (Lái xe):** Loại bỏ 100% giấy tờ, chụp ảnh OCR, GPS timestamp.
- **Web App (Văn phòng):** Trung tâm điều hành, kế toán và Dashboard cho Giám đốc.
- **AI & Automation:** Tự động đọc mã container, đối chiếu định mức, cảnh báo vi phạm.

---

## 2. Yêu cầu Chức năng (Functional Requirements)

### 2.1 Quản lý Người dùng (User Management)
- **CRUD Users:** Giám đốc có quyền tạo, sửa, xóa, khóa/mở khóa tài khoản nhân viên.
- **Phân quyền (RBAC):** 4 vai trò chính: Giám đốc, Điều hành, Kế toán, Tài xế.
- **Xác thực:** Đăng nhập JWT, đổi mật khẩu.
- **Audit Log:** Ghi lại mọi tác động (Ai sửa, sửa lúc nào, dữ liệu cũ/mới).

### 2.2 Quản lý Đội xe & Tài sản (Fleet Management)
- **CRUD Vehicles:** Quản lý biển số, loại xe, trạng thái (đang chạy, bãi, bảo dưỡng).
- **Gán tài xế:** Quản lý việc bàn giao xe cho tài xế.
- **Linh kiện bảo hành:** Theo dõi danh sách linh kiện còn trong hạn bảo hành của từng xe.
- **Nhắc nhở thay thế:** Tự động nhắc nhở khi đến hạn thay thế linh kiện dựa trên thời gian hoặc số km.
- **Bảo hiểm & Gia hạn:** Theo dõi hạn bảo hiểm, tự động thông báo gia hạn.

### 2.3 Quản lý Tuyến đường & Định mức (Routes & Quotas)
- **Quản lý Tuyến đường:** Danh mục các tuyến đường (Điểm đi - Điểm đến - Quãng đường).
- **Định mức đi đường:** Quy định thời gian và quãng đường dự kiến cho từng tuyến.
- **Định mức xăng dầu:** Cấu hình lít/km cho từng loại xe hoặc từng tuyến đường cụ thể.

### 2.4 Quản lý Chuyến xe (Trip Lifecycle)
- **Khởi tạo:** Điều hành gán xe, tài xế, tuyến đường và chủ hàng (nếu có).
- **Trạng thái:** Nhận ca → Lấy rỗng → Đến cảng → Lấy hàng → Đang chạy → Đến nơi → Hạ bãi → Hoàn thành.
- **Chuyến mồ côi:** Phát hiện và cảnh báo các chuyến chưa gán chủ hàng để kế toán xử lý.

### 2.5 Công nghệ AI OCR & GPS
- **OCR Container:** Tài xế chụp ảnh, AI tự động nhận diện 11 mã số container.
- **GPS Timestamp:** Mọi hành động của tài xế (chụp ảnh, báo chi phí) đều đính kèm tọa độ và thời gian thực.

### 2.6 Quản lý Chi phí & Cảnh báo
- **Chi phí dọc đường:** Tài xế chụp biên lai (dầu, cầu đường, sửa chữa) gửi về văn phòng duyệt.
- **Cảnh báo vi phạm:** Tự động phát hiện hụt dầu (>10%), dừng đỗ quá lâu (>45p), sai tuyến đường.

### 2.7 Kế toán & Tài chính
- **Duyệt chi phí:** Điều hành/Kế toán duyệt các yêu cầu chi phí từ tài xế.
- **Xuất hóa đơn:** Gom chuyến theo chủ hàng, xuất hóa đơn điện tử (PDF/E-Invoice).
- **Công nợ:** Theo dõi tình trạng thanh toán của từng chủ hàng.
- **Chốt sổ:** Khóa dữ liệu cuối tháng, chặn chốt sổ nếu còn chuyến mồ côi.

### 2.8 Báo cáo & Dashboard
- **Giám đốc:** Dashboard lợi nhuận Real-time, lãi ròng từng xe, xếp hạng tài xế (KPI).
- **Điều hành:** Theo dõi vị trí xe, trạng thái chuyến, xử lý cảnh báo.
- **Kế toán:** Theo dõi chi phí, công nợ, hóa đơn.

---

## 3. Kiến trúc Hệ thống (Technical Design)

### 3.1 Tech Stack
- **Backend:** FastAPI (Python), PostgreSQL, SQLAlchemy (Async), Redis (Cache/Session).
- **Frontend:** React, Tailwind CSS, Lucide Icons.
- **Mobile:** PWA (Progressive Web App) hỗ trợ Offline & Đồng bộ.
- **AI:** Gemini Vision API cho OCR container.
- **Infrastructure:** Docker Compose, Nginx, DigitalOcean.

### 3.2 Mô hình Dữ liệu (Database Schema)

#### Users & Vehicles
- `USERS`: id, username, hashed_password, role, is_active.
- `VEHICLES`: id, license_plate, vehicle_type, fuel_quota_per_km, status.
- `INSURANCE`: id, vehicle_id, provider, policy_number, expiry_date, status.
- `WARRANTY_PARTS`: id, vehicle_id, part_name, install_date, expiry_date, replacement_cycle_km.

#### Trips & Routes
- `ROUTES`: id, name, origin, destination, distance_km, expected_duration_min.
- `TRIPS`: id, trip_code, vehicle_id, driver_id, client_id, route_id, container_code, status, is_orphan.
- `TRIP_PHOTOS`: id, trip_id, photo_type, file_path, latitude, longitude, server_timestamp.
- `EXPENSES`: id, trip_id, category, amount, receipt_photo_id, status (pending/approved).

#### Workflows & Alerts
- `WORKFLOWS`: id, run_id, state, attempt, data (JSONB).
- `ALERTS`: id, trip_id, alert_type, severity, description, is_resolved.
- `AUDIT_LOGS`: id, user_id, action, entity_type, entity_id, old_value, new_value.

### 3.3 Workflow Engine
Sử dụng `python-statemachine` kết hợp bảng `WORKFLOWS` để quản lý trạng thái phức tạp của Chuyến xe, Chi phí và Hóa đơn.
- **Retry Mechanism:** Tự động thử lại các action thất bại (OCR, Notify).
- **Blocking Actions:** Chỉ chuyển trạng thái khi các action quan trọng thành công.

---

## 4. Thiết kế API (RESTful)

### 4.1 Danh mục chính
- `POST /api/v1/auth/login`: Xác thực người dùng.
- `GET /api/v1/users`: Quản lý người dùng (Giám đốc).
- `GET /api/v1/vehicles`: Quản lý đầu xe & bảo hiểm.
- `GET /api/v1/routes`: Quản lý tuyến đường & định mức.
- `GET /api/v1/trips`: Quản lý chuyến xe & trạng thái.
- `POST /api/v1/photos/upload`: Tải ảnh & đính kèm GPS.
- `GET /api/v1/expenses`: Duyệt chi phí dọc đường.
- `GET /api/v1/invoices`: Quản lý hóa đơn & công nợ.

---

## 5. Offline & Đồng bộ (PWA)
- Sử dụng Service Worker để cache app shell.
- **IndexedDB:** Lưu hàng đợi thao tác khi tài xế mất mạng.
- Tự động đồng bộ (Background Sync) khi có kết nối trở lại.

---

## 6. Lộ trình Triển khai (Roadmap)

### Giai đoạn 1: MVP (Sản phẩm khả dụng tối thiểu)
- Hoàn thiện luồng Chuyến xe, OCR, GPS và Duyệt chi phí.
- Dashboard cơ bản cho 3 vai trò (Giám đốc, Kế toán, Điều hành).
- Chặn chuyến mồ côi và xuất hóa đơn PDF.

### Giai đoạn 2: Nâng cao
- Tích hợp bảo hiểm, nhắc nhở thay thế linh kiện.
- Dashboard tài chính chuyên sâu (P&L từng đầu xe).
- Theo dõi xe Real-time trên bản đồ.

---

*Tài liệu được hợp nhất và cập nhật vào tháng 04/2026.*
