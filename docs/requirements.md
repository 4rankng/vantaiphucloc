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
- **Hết hạn phiên:** Phiên đăng nhập hết hạn sau khoảng thời gian quy định, yêu cầu đăng nhập lại (REQ-1.6).
- **Audit Log:** Ghi lại mọi tác động (Ai sửa, sửa lúc nào, dữ liệu cũ/mới). Nhật ký không được phép xóa hoặc chỉnh sửa.

### 3.2 Quản lý Đội xe & Tài sản (Fleet Management)
- **CRUD Vehicles:** Quản lý biển số, loại xe, hãng xe, năm sản xuất, trạng thái (đang chạy, bãi, bảo dưỡng, ngưng hoạt động).
- **Ước tính km:** Sau mỗi chuyến, hệ thống ước tính km thực tế dựa trên tuyến đường + GPS checkpoints tại mỗi bước trạng thái. Không cần công-tơ-mét thủ công.
- **Gán tài xế:** Quản lý việc bàn giao xe cho tài xế, lưu lịch sử gán/bàn giao.
- **Linh kiện bảo hành:** Theo dõi danh sách linh kiện còn trong hạn bảo hành của từng xe, ngày lắp đặt, hạn bảo hành.
- **Nhắc nhở thay thế:** Tự động nhắc nhở khi đến hạn thay thế linh kiện dựa trên thời gian hoặc số km (so với công-tơ-mét).
- **Bảo hiểm & Gia hạn:** Theo dõi hạn bảo hiểm, số hợp đồng, nhà cung cấp, phí bảo hiểm, tự động thông báo gia hạn trước khi hết hạn.

### 3.3 Quản lý Khách hàng (Client Management)
- **CRUD Clients:** Quản lý thông tin khách hàng / chủ hàng: tên công ty, mã số thuế, địa chỉ, người liên hệ, số điện thoại, email.
- **Điều khoản thanh toán:** Cấu hình điều khoản thanh toán cho từng khách hàng (net 15, net 30, v.v.).
- **Trạng thái:** Khách hàng có thể bị khóa (không tạo chuyến mới nhưng vẫn xem được lịch sử).

### 3.4 Quản lý Tuyến đường & Định mức (Routes & Quotas)
- **Quản lý Tuyến đường:** Danh mục các tuyến đường (Điểm đi - Điểm đến - Quãng đường - Thời gian dự kiến).
- **Định mức đi đường:** Quy định thời gian và quãng đường dự kiến cho từng tuyến.
- **Định mức xăng dầu:** Cấu hình lít/km cho từng tuyến × loại xe (ma trận: tuyến × loại xe → định mức). Định mức mặc định được áp dụng tự động nhưng người dùng có thể ghi đè thủ công cho từng chuyến (kèm lý do, ví dụ: xe cũ tốn nhiều dầu hơn, đường đang sửa).
- **So sánh tự động:** Hệ thống tự động so sánh chi phí thực tế với định mức tuyến đường.

### 3.5 Quản lý Chuyến xe (Trip Lifecycle)
- **Khởi tạo:** Điều hành tạo chuyến từ booking đã duyệt, gán xe, tài xế, tuyến đường, chủ hàng (nếu có).
- **Trạng thái (8 bước theo REQ-3.4):** Nhận ca → Lấy rỗng → Đến cảng lấy hàng → Rời cảng → Đang chạy → Đến nơi → Hạ bãi → Hoàn thành.
- **Loại container:** Ghi nhận loại container (20ft/40ft/45ft/high cube) trong chuyến.
- **Thời gian & quãng đường:** Tự động ghi nhận start_time, end_time, actual_distance_km khi hoàn thành.
- **Chuyến mồ côi:** Phát hiện và cảnh báo các chuyến chưa gán chủ hàng để kế toán xử lý.
- **Chốt sổ:** Sau khi chốt sổ cuối kỳ, dữ liệu chuyến bị khóa (chỉ đọc), không cho phép sửa đổi (REQ-10.6).
- **Ảnh chỉ đọc:** Không cho phép chỉnh sửa hoặc xóa ảnh sau khi đã tải lên (REQ-6.5).
- **Lịch sử trạng thái:** Lưu trữ lịch sử trạng thái chuyến kèm mốc thời gian từng bước.

### 3.6 Công nghệ AI OCR & GPS
- **OCR Container:** Tài xế chụp ảnh, AI tự động nhận diện 11 mã số container. Hỗ trợ nhập tay nếu OCR thất bại.
- **Tuyến đường:** Mỗi tuyến định nghĩa điểm đi, điểm đến, quãng đường và thời gian dự kiến. GPS tại mỗi bước trạng thái dùng để ước tính km thực tế.
- **Theo dõi trực tuyến:** Ứng dụng mobile theo dõi vị trí trực tuyến trong suốt hành trình (REQ-5.3).
- **Lịch sử vị trí:** Lưu trữ lịch sử vị trí để phục vụ đối soát và kiểm tra sau chuyến (REQ-5.5).

### 3.7 Quản lý Chi phí & Cảnh báo
- **Chi phí dọc đường:** Tài xế khai báo chi phí gồm: loại chi phí, số tiền, số lít (đối với nhiên liệu), mô tả, ảnh biên lai.
- **Duyệt/Từ chối:** Điều hành/Kế toán duyệt hoặc từ chối từng khoản chi phí. Chi phí bị từ chối kèm lý do, tài xế được thông báo.
- **Cảnh báo vi phạm:** Tự động phát hiện hụt dầu (>10%), thời gian vượt 150% dự kiến, sai tuyến đường.
- **Xử lý cảnh báo:** Điều hành xác nhận cảnh báo, ghi lý do, quyết định ghi nhận vi phạm hoặc bỏ qua. Vi phạm đã xác nhận tự động ảnh hưởng điểm KPI.

### 3.8 Kế toán & Tài chính
- **Duyệt chi phí:** Điều hành/Kế toán duyệt các yêu cầu chi phí từ tài xế. Chi phí đã duyệt tự động cộng vào tổng chi phí chuyến.
- **Xuất hóa đơn:** Gom chuyến theo chủ hàng, xuất hóa đơn (PDF). Lưu trữ số hóa đơn, ngày, file PDF, trạng thái.
- **Công nợ:** Theo dõi tình trạng thanh toán của từng chủ hàng (tổng, đã thu, chưa thu).
- **Đánh dấu thanh toán:** Kế toán ghi nhận thanh toán (một phần hoặc toàn bộ).
- **Chốt sổ:** Khóa dữ liệu cuối tháng, chặn chốt sổ nếu còn chuyến mồ côi chưa gán chủ hàng.

### 3.9 Báo cáo & Dashboard
- **Giám đốc:** Dashboard lợi nhuận Real-time, lãi ròng từng xe, xếp hạng tài xế (KPI), số cảnh báo chưa duyệt.
- **Điều hành:** Theo dõi vị trí xe trên bản đồ, trạng thái chuyến, timeline chi tiết, xử lý cảnh báo.
- **Kế toán:** Chi phí chờ duyệt, tóm tắt công nợ, chuyến mồ côi cần gán chủ hàng.
- **Tài xế (mobile):** Chuyến được giao, cập nhật tiến trình, gửi chi phí, xem thu nhập hôm nay.

### 3.10 Hệ thống Thông báo & Nhắc nhở
- **Thông báo trong ứng dụng:** Cảnh báo vi phạm, từ chối chi phí (kèm lý do), nhắc nhở thay thế linh kiện, gia hạn bảo hiểm.
- **Nhắc nhở tự động:** Trước khi bảo hiểm hết hạn, trước khi linh kiện đến hạn thay thế (theo thời gian hoặc km).
- **Lịch sử thông báo:** Lưu trữ thông báo đã gửi, trạng thái đã đọc/chưa đọc.

### 3.11 Quản lý Xe thuê ngoài
- **Đăng ký đối tác:** Quản lý nhà cung cấp vận tải thuê ngoài, hồ sơ năng lực (đăng ký xe, kiểm định, bảo hiểm, GPLX, HĐLĐ).
- **Lệnh giao hàng:** Tạo lệnh giao hàng riêng cho xe thuê ngoài.
- **Theo dõi sản lượng:** Theo dõi và ký nhận sản lượng xe thuê ngoài theo tháng.

---

## 4. Kiến trúc Hệ thống (Technical Design)

### 4.1 Tech Stack
- **Backend:** FastAPI (Python), PostgreSQL, SQLAlchemy (Async), Redis (Cache/Session).
- **Frontend:** React, Tailwind CSS, Lucide Icons.
- **Mobile:** PWA (Progressive Web App) hỗ trợ Offline & Đồng bộ.
- **AI:** Gemini Vision API cho OCR container.
- **Infrastructure:** Docker Compose, Nginx, DigitalOcean.

### 4.2 Mô hình Dữ liệu (Database Schema)

#### Users & Authentication
- `USERS`: id, username, hashed_password, role, is_active, created_at, updated_at.
- `DRIVER_PROFILES`: id, user_id, license_number, license_expiry, phone, emergency_contact, assigned_vehicle_id.
- `AUDIT_LOGS`: id, user_id, action, entity_type, entity_id, old_value, new_value, timestamp.

#### Clients
- `CLIENTS`: id, name, tax_code, address, contact_name, contact_phone, email, payment_terms, is_active, created_at.

#### Fleet & Vehicles
- `VEHICLES`: id, license_plate, vehicle_type, brand, model, year, status (active/on_trip/idle/maintenance/retired), created_at.
- `INSURANCE`: id, vehicle_id, provider, provider_phone, policy_number, premium_amount, start_date, expiry_date, renewal_reminder_days, status (active/expired/cancelled), notes.
- `WARRANTY_PARTS`: id, vehicle_id, part_name, part_number, install_date, expiry_date, replacement_cycle_km, install_odometer_km, notes.
- `DRIVER_ASSIGNMENTS`: id, vehicle_id, driver_id, assigned_at, unassigned_at, reason.
- `EXTERNAL_VEHICLES`: id, provider_name, provider_phone, license_plate, vehicle_type, driver_name, driver_license, license_expiry, insurance_doc_path, tech_inspection_doc_path, labor_contract_path, is_active.

#### Routes & Quotas
- `ROUTES`: id, name, origin, destination, distance_km, expected_duration_min, is_active.
- `ROUTE_FUEL_QUOTAS`: id, route_id, vehicle_type, liters_per_km, is_default, created_by, updated_by, updated_at. — Ma trận định mức: tuyến × loại xe. Có thể ghi đè thủ công.

#### Trips & Bookings
- `BOOKINGS`: id, booking_code, client_id, route_id, vehicle_type_required, container_type, notes, status (pending/approved/rejected/completed), created_by, approved_by, approved_at, created_at.
- `TRIPS`: id, trip_code, booking_id, vehicle_id, driver_id, client_id, route_id, container_code, container_type (20ft/40ft/45ft/hc), status (received/empty_pickup/at_port/leaving_port/en_route/arrived/dropped_off/completed), is_orphan, is_locked, start_time, end_time, actual_distance_km, created_at.
- `TRIP_STATUS_HISTORY`: id, trip_id, status, timestamp, latitude, longitude, accuracy, notes.
- `TRIP_PHOTOS`: id, trip_id, photo_type (container_pickup/container_delivery/fuel_receipt/expense_receipt/other), file_path, latitude, longitude, accuracy, server_timestamp.
- `EXPENSES`: id, trip_id, category (fuel/toll/repair/other), amount, liters, fuel_quota_override, description, receipt_photo_id, status (pending/approved/rejected), reject_reason, approved_by, approved_at, created_at.
- `TRIP_FUEL_QUOTAS`: id, trip_id, route_fuel_quota_id, default_liters_per_km, actual_liters_per_km, override_reason, overridden_by. — Định mức thực tế cho chuyến (mặc định từ ROUTE_FUEL_QUOTAS, có thể ghi đè).

#### Financials
- `INVOICES`: id, invoice_number, client_id, trip_ids (array), subtotal, tax, total, pdf_path, status (draft/issued/paid/partially_paid), issued_at, paid_at, notes.
- `PAYMENTS`: id, invoice_id, amount, payment_method, reference_number, paid_by, notes, created_at.

#### Workflows, Alerts & Notifications
- `WORKFLOWS`: id (auto-increment), run_id (UUID) — định danh instance, workflow_id (int) — loại workflow, state (int), event (int), attempt (int), data (JSON). — State machine engine.
- `ALERTS`: id, trip_id, alert_type (fuel_anomaly/time_anomaly/route_deviation/idle), severity, description, is_resolved, resolved_by, resolution (violation/dismissed), resolution_note, created_at, resolved_at.
- `NOTIFICATIONS`: id, user_id, type, title, message, entity_type, entity_id, is_read, created_at.
- `DOCUMENTS`: id, entity_type, entity_id, doc_type (booking/do/eir/invoice/receipt/customs), file_path, uploaded_by, retention_years, created_at.

### 4.3 Workflow Engine (State Machine)

Bảng `WORKFLOWS` điều khiển trạng thái phức tạp của Chuyến xe, Chi phí, Hóa đơn v.v.

**Cấu trúc bảng:**
- `id`: Auto-increment primary key
- `run_id`: UUID — định danh instance của workflow (một chuyến xe, một chi phí, v.v.)
- `workflow_id`: int — loại workflow (trip, expense, invoice…). Mỗi loại định nghĩa tập state/event/transition riêng trong code.
- `state`: int — trạng thái hiện tại
- `event`: int — sự kiện cần xử lý (0 = không có event chờ)
- `attempt`: int — số lần thử transition
- `data`: JSON — payload nghiệp vụ

**Một thực thể = một dòng.** Mọi thay đổi trạng thái đều UPDATE trực tiếp trên cùng một dòng, không INSERT dòng mới.

**Nguyên tắc hoạt động:**
1. Mỗi cặp (state, event) có **đúng một** transition function duy nhất — bản chất của state machine.
2. Khi `attempt > 0` và `event != 0` → workflow engine thực thi transition function.
3. Nếu transition thành công → `event = 0`, `attempt = 0` (không còn event chờ, chuyển sang state mới).
4. Nếu transition thất bại → `attempt` tăng, engine thử lại (retry).
5. Một số state có event không cần transition (ví dụ event = 999) — đây là event hợp lệ, khi `attempt = 1` thì transition function vẫn được thực thi.

**Ví dụ — Chuyến xe:**
- State 1 (Nhận ca) + Event 10 (Bắt đầu) → State 2 (Lấy rỗng)
- State 2 + Event 20 (Lấy xong) → State 3 (Đến cảng)
- State 3 + Event 999 (Auto-timeout) → Alert + giữ state

**Retry Mechanism:** Tự động thử lại các action thất bại (OCR, Notify) với exponential backoff.
**Blocking Actions:** Chỉ chuyển trạng thái khi các action quan trọng thành công.

---

## 5. Thiết kế API (RESTful)

### 5.1 Danh mục chính
- `POST /api/v1/auth/login`: Xác thực người dùng.
- `POST /api/v1/auth/logout`: Đăng xuất.
- `PUT /api/v1/auth/change-password`: Đổi mật khẩu.
- `GET/POST /api/v1/users`: Quản lý người dùng (Giám đốc).
- `GET/POST /api/v1/clients`: Quản lý khách hàng.
- `GET/POST /api/v1/vehicles`: Quản lý đầu xe.
- `GET/POST /api/v1/vehicles/{id}/insurance`: Bảo hiểm xe.
- `GET/POST /api/v1/vehicles/{id}/parts`: Linh kiện bảo hành.
- `GET/POST /api/v1/routes`: Quản lý tuyến đường & định mức.
- `GET/POST /api/v1/routes/{id}/fuel-quotas`: Định mức xăng dầu theo tuyến.
- `GET/POST /api/v1/bookings`: Booking / Lệnh vận chuyển.
- `PUT /api/v1/bookings/{id}/approve`: Phê duyệt booking.
- `GET/POST /api/v1/trips`: Quản lý chuyến xe & trạng thái.
- `PUT /api/v1/trips/{id}/status`: Cập nhật trạng thái chuyến (8 bước).
- `POST /api/v1/photos/upload`: Tải ảnh & đính kèm GPS.
- `GET/POST /api/v1/expenses`: Duyệt chi phí dọc đường.
- `GET/POST /api/v1/invoices`: Quản lý hóa đơn & công nợ.
- `POST /api/v1/invoices/{id}/payments`: Ghi nhận thanh toán.
- `GET /api/v1/alerts`: Cảnh báo vi phạm.
- `PUT /api/v1/alerts/{id}/resolve`: Xử lý cảnh báo.
- `GET /api/v1/notifications`: Thông báo người dùng.
- `GET /api/v1/audit-logs`: Nhật ký kiểm duyệt (Giám đốc).
- `GET/POST /api/v1/external-vehicles`: Quản lý xe thuê ngoài.

---

## 6. Offline & Đồng bộ (PWA)
- Sử dụng Service Worker để cache app shell.
- **IndexedDB:** Lưu hàng đợi thao tác khi tài xế mất mạng.
- Tự động đồng bộ (Background Sync) khi có kết nối trở lại.
- **Không bao giờ mất dữ liệu đã nhập do lỗi mạng.**

---

## 7. Lộ trình Triển khai (Roadmap)

### Giai đoạn 1: MVP (Sản phẩm khả dụng tối thiểu)
- Xác thực & phân quyền 4 vai trò.
- CRUD: Users, Vehicles, Clients, Routes.
- Luồng Booking → Phê duyệt → Tạo chuyến → 8 trạng thái → Hoàn thành.
- OCR container + GPS timestamp + ảnh chỉ đọc.
- Chi phí dọc đường + duyệt/từ chối (kèm lý do).
- Cảnh báo gian lận (nhiên liệu >10%, thời gian >150%).
- Chuyến mồ côi + chặn chốt sổ.
- Công nợ + xuất hóa đơn PDF.
- Dashboard cơ bản cho 4 vai trò.
- Audit log (Giám đốc).
- Offline + auto-sync (tài xế).

### Giai đoạn 2: Nâng cao
- Tích hợp bảo hiểm, nhắc nhở thay thế linh kiện.
- Định mức xăng dầu theo ma trận tuyến × loại xe.
- Dashboard tài chính chuyên sâu (P&L từng đầu xe, TAT).
- Theo dõi xe Real-time trên bản đồ.
- Quản lý xe thuê ngoài (đối tác vận tải, hồ sơ năng lực).
- Quản lý chứng từ hải quan (tờ khai xuất/nhập khẩu).
- Phiếu xe chạy điện tử (thay thế BM.08.02 giấy).
- Báo cáo Excel/PDF.
- Hệ thống thông báo đẩy (Push notifications).
- Đánh giá KPI tài xế + xếp hạng.

---

*Tài liệu được hợp nhất và cập nhật vào tháng 04/2026.*
