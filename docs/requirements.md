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

## 2. Quy trình Giao nhận Vận tải (QT.08 — ASHICOLOGS)

> Nguồn: QT.08 Quy trình giao nhận vận tải (01/08/2015)

### 2.1 Luồng nghiệp vụ chính
1. **Tiếp nhận yêu cầu** (Phòng KD) — Customer gửi booking qua email/fax/giấy
2. **Lập phương án** (Phòng KT + KD) — Phân loại hàng, chọn tuyến, tính phương tiện
3. **Phê duyệt** (Giám đốc) — Ký duyệt booking / lệnh vận chuyển
4. **Thủ tục liên quan** (Phòng KT) — Hải quan, DO, EIR, lệnh cấp vỏ container
5. **Thực hiện vận chuyển** (Lái xe) — Theo lệnh đã duyệt, báo cáo tiến trình
6. **Giao nhận hàng hóa** (Lái xe → Khách hàng) — Ký biên bản bàn giao
7. **Lập hồ sơ thanh toán** (Phòng KD + KTTH) — Xuất hóa đơn, đề nghị thanh toán

### 2.2 Hai phương thức vận chuyển
- **Xe công ty sở hữu**: Lái xe nội bộ, phiếu xe chạy BM.08.02, bảng sản lượng BM.08.03
- **Xe thuê ngoài**: Nhà cung cấp phải chứng minh năng lực (đăng ký xe, kiểm định, bảo hiểm, GPLX, HĐLĐ). Lệnh giao hàng BM.08.01b. Ký nhận sản lượng cuối tháng.

### 2.3 Hệ thống Biểu mẫu / Chứng từ
| Mã | Tên | Nơi lưu | Thời gian lưu |
|----|-----|---------|---------------|
| BM.08.01a | Booking / Lệnh vận chuyển (xe nội bộ) | P.KT | 5 năm |
| BM.08.01b | Lệnh giao hàng (xe thuê ngoài) | P.KT | 5 năm |
| BM.08.02 | Phiếu xe chạy | P.KT | 5 năm |
| BM.08.03 | Bảng sản lượng xe chạy | P.KT | 5 năm |
| BM.08.04 | Biên bản bàn giao hàng hóa | P.KT | 1 năm |
| BM.08.05 | Biên bản xác nhận sản lượng | P.KT | 1 năm |
| BM.08.06 | Biên bản quyết toán sản lượng | P.KT-TH | 5 năm |
| BM.08.07 | Đề nghị thanh toán | P.KT-TH | 5 năm |

### 2.4 Nguyên tắc giao nhận hàng hóa
- Container: giao nguyên cont, nguyên chì
- Hàng lẻ: giao nguyên đai, nguyên kiện đúng số lượng & tình trạng
- Hàng lỏng/bột/viên: giao theo trọng lượng/số khối như khi nhận
- Khách hàng ký nhận biên bản, ghi rõ tình trạng thực tế

---

## 3. Yêu cầu Chức năng (Functional Requirements)

### 3.1 Quản lý Người dùng (User Management)
- **CRUD Users:** Giám đốc có quyền tạo, sửa, xóa, khóa/mở khóa tài khoản nhân viên.
- **Phân quyền (RBAC):** 4 vai trò chính: Giám đốc, Điều hành, Kế toán, Tài xế.
- **Xác thực:** Đăng nhập JWT, đổi mật khẩu.
- **Audit Log:** Ghi lại mọi tác động (Ai sửa, sửa lúc nào, dữ liệu cũ/mới).

### 3.2 Quản lý Đội xe & Tài sản (Fleet Management)
- **CRUD Vehicles:** Quản lý biển số, loại xe, trạng thái (đang chạy, bãi, bảo dưỡng).
- **Gán tài xế:** Quản lý việc bàn giao xe cho tài xế.
- **Linh kiện bảo hành:** Theo dõi danh sách linh kiện còn trong hạn bảo hành của từng xe.
- **Nhắc nhở thay thế:** Tự động nhắc nhở khi đến hạn thay thế linh kiện dựa trên thời gian hoặc số km.
- **Bảo hiểm & Gia hạn:** Theo dõi hạn bảo hiểm, tự động thông báo gia hạn.

### 3.3 Quản lý Tuyến đường & Định mức (Routes & Quotas)
- **Quản lý Tuyến đường:** Danh mục các tuyến đường (Điểm đi - Điểm đến - Quãng đường).
- **Định mức đi đường:** Quy định thời gian và quãng đường dự kiến cho từng tuyến.
- **Định mức xăng dầu:** Cấu hình lít/km cho từng loại xe hoặc từng tuyến đường cụ thể.

### 3.4 Quản lý Chuyến xe (Trip Lifecycle)
- **Khởi tạo:** Điều hành gán xe, tài xế, tuyến đường và chủ hàng (nếu có).
- **Trạng thái (8 bước theo QT.08):** Nhận ca → Lấy rỗng → Đến cảng lấy hàng → Rời cảng → Đang chạy → Đến nơi → Hạ bãi → Hoàn thành.
- **Chuyến mồ côi:** Phát hiện và cảnh báo các chuyến chưa gán chủ hàng để kế toán xử lý.
- **Chốt sổ:** Sau khi chốt sổ cuối kỳ, dữ liệu chuyến bị khóa (chỉ đọc), không cho phép sửa đổi (REQ-10.6).
- **Ảnh chỉ đọc:** Không cho phép chỉnh sửa hoặc xóa ảnh sau khi đã tải lên (REQ-6.5).

### 3.5 Công nghệ AI OCR & GPS
- **OCR Container:** Tài xế chụp ảnh, AI tự động nhận diện 11 mã số container.
- **GPS Timestamp:** Mọi hành động của tài xế (chụp ảnh, báo chi phí) đều đính kèm tọa độ và thời gian thực.

### 3.6 Quản lý Chi phí & Cảnh báo
- **Chi phí dọc đường:** Tài xế chụp biên lai (dầu, cầu đường, sửa chữa) gửi về văn phòng duyệt.
- **Cảnh báo vi phạm:** Tự động phát hiện hụt dầu (>10%), dừng đỗ quá lâu (>45p), sai tuyến đường.

### 3.7 Kế toán & Tài chính
- **Duyệt chi phí:** Điều hành/Kế toán duyệt các yêu cầu chi phí từ tài xế.
- **Xuất hóa đơn:** Gom chuyến theo chủ hàng, xuất hóa đơn điện tử (PDF/E-Invoice).
- **Công nợ:** Theo dõi tình trạng thanh toán của từng chủ hàng.
- **Chốt sổ:** Khóa dữ liệu cuối tháng, chặn chốt sổ nếu còn chuyến mồ côi.

### 3.8 Báo cáo & Dashboard
- **Giám đốc:** Dashboard lợi nhuận Real-time, lãi ròng từng xe, xếp hạng tài xế (KPI).
- **Điều hành:** Theo dõi vị trí xe, trạng thái chuyến, xử lý cảnh báo.
- **Kế toán:** Theo dõi chi phí, công nợ, hóa đơn.

---

## 4. Kiến trúc Hệ thống (Technical Design)

### 4.1 Tech Stack
- **Backend:** FastAPI (Python), PostgreSQL, SQLAlchemy (Async), Redis (Cache/Session).
- **Frontend:** React, Tailwind CSS, Lucide Icons.
- **Mobile:** PWA (Progressive Web App) hỗ trợ Offline & Đồng bộ.
- **AI:** Gemini Vision API cho OCR container.
- **Infrastructure:** Docker Compose, Nginx, DigitalOcean.

### 4.2 Mô hình Dữ liệu (Database Schema)

#### Users & Vehicles
- `USERS`: id, username, hashed_password, role, is_active.
- `VEHICLES`: id, license_plate, vehicle_type, fuel_quota_per_km, status.
- `INSURANCE`: id, vehicle_id, provider, policy_number, expiry_date, status.
- `WARRANTY_PARTS`: id, vehicle_id, part_name, install_date, expiry_date, replacement_cycle_km.

#### Trips & Routes
- `ROUTES`: id, name, origin, destination, distance_km, expected_duration_min, fuel_quota_liters_per_km.
- `TRIPS`: id, trip_code, vehicle_id, driver_id, client_id, route_id, container_code, status, is_orphan, is_locked.
- `TRIP_STATUS_HISTORY`: id, trip_id, status, timestamp, latitude, longitude.
- `TRIP_PHOTOS`: id, trip_id, photo_type, file_path, latitude, longitude, server_timestamp, is_readonly.
- `EXPENSES`: id, trip_id, category, amount, description, receipt_photo_id, status (pending/approved/rejected), reject_reason.
- `EXTERNAL_VEHICLES`: id, provider_name, license_plate, driver_name, driver_license, insurance_doc, tech_inspection_doc, labor_contract.
- `BOOKINGS`: id, client_id, route_id, booking_code, status, approved_by, created_by.
- `DELIVERY_ORDERS`: id, booking_id, do_number, eir_number, container_type, notes.

#### Workflows, Alerts & Documents
- `WORKFLOWS`: id, run_id, state, attempt, data (JSONB).
- `ALERTS`: id, trip_id, alert_type, severity, description, is_resolved, resolved_by, resolution, resolution_note.
- `AUDIT_LOGS`: id, user_id, action, entity_type, entity_id, old_value, new_value, timestamp.
- `DOCUMENTS`: id, entity_type, entity_id, doc_type (booking/do/eir/invoice/receipt), file_path, uploaded_by, retention_years.

### 4.3 Workflow Engine
Sử dụng `python-statemachine` kết hợp bảng `WORKFLOWS` để quản lý trạng thái phức tạp của Chuyến xe, Chi phí và Hóa đơn.
- **Retry Mechanism:** Tự động thử lại các action thất bại (OCR, Notify).
- **Blocking Actions:** Chỉ chuyển trạng thái khi các action quan trọng thành công.

---

## 5. Thiết kế API (RESTful)

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

## 6. Offline & Đồng bộ (PWA)
- Sử dụng Service Worker để cache app shell.
- **IndexedDB:** Lưu hàng đợi thao tác khi tài xế mất mạng.
- Tự động đồng bộ (Background Sync) khi có kết nối trở lại.

---

## 7. Lộ trình Triển khai (Roadmap)

### Giai đoạn 1: MVP (Sản phẩm khả dụng tối thiểu)
- Hoàn thiện luồng Chuyến xe, OCR, GPS và Duyệt chi phí.
- Dashboard cơ bản cho 3 vai trò (Giám đốc, Kế toán, Điều hành).
- Chặn chuyến mồ côi và xuất hóa đơn PDF.

### Giai đoạn 2: Nâng cao
- Tích hợp bảo hiểm, nhắc nhở thay thế linh kiện.
- Dashboard tài chính chuyên sâu (P&L từng đầu xe).
- Theo dõi xe Real-time trên bản đồ.
- Quản lý xe thuê ngoài (đối tác vận tải, hồ sơ năng lực).
- Quản lý chứng từ hải quan (tờ khai xuất/nhập khẩu).
- Phiếu xe chạy điện tử (thay thế BM.08.02 giấy).

---

*Tài liệu được hợp nhất và cập nhật vào tháng 04/2026.*
