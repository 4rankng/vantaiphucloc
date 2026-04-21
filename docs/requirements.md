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
- **Ước tính km:** Sau mỗi chuyến, hệ thống tính actual_distance_km bằng cách **cộng dồn khoảng cách haversine** giữa tất cả GPS points (mỗi 30 giây) trong GPS_LOG. So sánh với distance_km từ Google Maps (lưu trong ROUTES) để phát hiện lệch tuyến. Không cần công-tơ-mét thủ công.
- **Gán tài xế:** Quản lý việc bàn giao xe cho tài xế, lưu lịch sử gán/bàn giao.
- **Linh kiện bảo hành:** Theo dõi danh sách linh kiện còn trong hạn bảo hành của từng xe, ngày lắp đặt, hạn bảo hành.
- **Nhắc nhở thay thế:** Tự động nhắc nhở khi đến hạn thay thế linh kiện dựa trên thời gian hoặc số km (so với công-tơ-mét).
- **Bảo hiểm & Gia hạn:** Theo dõi hạn bảo hiểm, số hợp đồng, nhà cung cấp, phí bảo hiểm, tự động thông báo gia hạn trước khi hết hạn.

### 3.3 Quản lý Khách hàng (Client Management)
- **CRUD Clients:** Quản lý thông tin khách hàng / chủ hàng: tên công ty, mã số thuế, địa chỉ, người liên hệ, số điện thoại, email.
- **Điều khoản thanh toán:** Cấu hình điều khoản thanh toán cho từng khách hàng (net 15, net 30, v.v.).
- **Trạng thái:** Khách hàng có thể bị đánh dấu `is_active: false`. Vẫn hiện trong danh sách/dropdown nhưng có badge "🔒 Ngừng". Cho phép tạo chuyến nhưng cảnh báo "Khách hàng đang ngừng hoạt động — xác nhận tiếp tục?". Lịch sử giao dịch luôn xem được.

### 3.4 Quản lý Tuyến đường & Định mức (Routes & Quotas)
- **Quản lý Tuyến đường:** Danh mục các tuyến đường (Điểm đi - Điểm đến - Quãng đường - Thời gian dự kiến).
- **Định mức đi đường:** Quy định thời gian và quãng đường dự kiến cho từng tuyến.
- **Bảng giá cước theo tuyến (ROUTE_PRICING):** Ma trận giá cước: tuyến × loại xe → tiền đi đường. Bao gồm giảm vé theo tuyến (vd: QL5 giảm 80K) và phụ phí vé cầu/Y lệnh. Xe mooc 40', 40', 20', mooc 20' có giá khác nhau.
- **Định mức xăng dầu phụ thuộc tải trọng:** Cấu hình L/100km cho từng xe × loại tải (5 mức):
  - Hàng+vỏ >20t (chạy nặng)
  - Hàng+vỏ <20t (chạy nhẹ)
  - Vỏ rỗng (empty)
  - Hàng >20t only
  - Hàng <20t only
  Phụ bổ sung theo tuyến (vd: Mộc Châu + Sơn La +2 đến +3 L/100km theo loại động cơ).
  Mặc định từ `ROUTE_FUEL_QUOTAS` áp dụng tự động, có thể ghi đè thủ công cho từng chuyến.
- **Loại tải chuyến:** Khi tạo chuyến, điều hành chọn load_type (empty/loaded_light/loaded_heavy) → hệ thống tự động chọn đúng định mức từ ma trận.
- **So sánh tự động:** Hệ thống tự động so sánh chi phí thực tế với định mức tuyến đường (dựa trên load_type).

### 3.5 Quản lý Chuyến xe (Trip Lifecycle)
- **Khởi tạo:** Điều hành tạo chuyến từ booking đã duyệt, gán xe, tài xế, tuyến đường, chủ hàng (nếu có).
- **Trạng thái (8 bước theo REQ-3.4):** Hệ thống theo dõi 8 trạng thái nội bộ, nhưng tài xế chỉ cần thao tác **4 bước thủ công** — 4 bước còn lại tự động qua GPS geofencing:
  - **Thủ công (4 bước tài xế click):**
    1. **Nhận ca** — Tài xế xác nhận nhận chuyến
    2. **Chụp container tại cảng** — Chụp ảnh → OCR tự nhận diện mã container
    3. **Chụp giao hàng** — Chụp ảnh tại điểm giao
    4. **Hạ bãi xong** — Xác nhận đã hạ container
  - **Tự động (4 bước GPS geofence):**
    - Lấy rỗng: GPS thoát depot geofence
    - Đến cảng: GPS vào port geofence
    - Rời cảng: GPS thoát port geofence + OCR xong
    - Đang chạy: GPS trên highway (away from port)
    - Đến nơi: GPS vào destination geofence
    - Hoàn thành: auto sau khi hạ bãi xác nhận
- **Loại container:** Ghi nhận loại container (20ft/40ft/45ft/high cube) trong chuyến.
- **Thời gian & quãng đường:** Tự động ghi nhận start_time, end_time, actual_distance_km khi hoàn thành.
- **Chuyến mồ côi:** Phát hiện và cảnh báo các chuyến chưa gán chủ hàng để kế toán xử lý.
- **Chốt sổ:** Sau khi chốt sổ cuối kỳ, dữ liệu chuyến bị khóa (chỉ đọc), không cho phép sửa đổi (REQ-10.6).
- **Ảnh khóa sau khi xác nhận:** Tài xế upload ảnh → xem kết quả OCR/dữ liệu → xác nhận đúng → **khóa**. Trước khi xác nhận, tài xế có thể xóa/chụp lại. Sau khi xác nhận: không chỉnh sửa, không xóa (REQ-6.5).
- **Lịch sử trạng thái:** Lưu trữ lịch sử trạng thái chuyến kèm mốc thời gian từng bước.

### 3.6 Công nghệ AI OCR & GPS
- **OCR Container:** Tài xế chụp ảnh, AI tự động nhận diện 11 mã số container. Hỗ trợ nhập tay nếu OCR thất bại.
- **Tuyến đường:** Mỗi tuyến định nghĩa điểm đi, điểm đến, quãng đường (Google Maps) và thời gian dự kiến. Hệ thống tính actual_distance_km từ GPS_LOG (haversine sum) và so sánh với route distance_km.
- **Theo dõi trực tuyến:** Native background geolocation plugin gửi vị trí **mỗi 30 giây** trong suốt hành trình, kể cả khi tắt màn hình hoặc thu nhỏ app (REQ-5.3).
  - **BẮT ĐẦU tracking:** Tài xế click "Nhận ca" → status `received` → `empty_pickup` → native plugin `start({ interval: 30000 })`. Tracking bắt đầu từ lúc driver rời đi lấy container rỗng.
  - **KẾT THÚC tracking:** Trip status → `completed` → native plugin `stop()`. Tracking dừng khi chuyến hoàn thành.
  - **7/8 trạng thái được track:** empty_pickup, at_port, leaving_port, en_route, arrived, dropped_off, (completed = stop). Chỉ `received` không track (driver chưa nhận ca).
  - **Tại sao track từ empty_pickup:** Driver đốt nhiên liệu từ lúc lấy rỗng → cảng → highway → giao → hạ bãi. actual_distance_km phải bao gồm toàn bộ hành trình, không chỉ phần highway.
  - **Android:** Sử dụng Foreground Service với persistent notification (vd: "Hoàng đang chạy TR-0101") để OS không kill app.
  - **iOS:** Yêu cầu "Always Allow" location permission. Plugin xử lý background execution limits.
- **Tính km thực tế (Running Total):** Không đợi đến khi xem bản đồ. **Khi server nhận được mỗi GPS point mới**, tính khoảng cách haversine từ điểm trước đó → cộng dồn vào `TRIPS.actual_distance_km` (running total). So sánh ngay với `ROUTES.distance_km` → nếu lệch >15% → trigger ALERT cho Giám đốc.
- **Hiệu suất nhiên liệu:** actual_liters_per_100km = liters × 100 / actual_distance_km. So sánh với định mức từ ROUTE_FUEL_QUOTAS.
- **Lịch sử vị trí:** Lưu trữ lịch sử vị trí để phục vụ đối soát và kiểm tra sau chuyến (REQ-5.5).

### 3.7 Quản lý Chi phí & Cảnh báo
- **Chi phí dọc đường:** Tài xế khai báo chi phí gồm: loại chi phí, số tiền, số lít (đối với nhiên liệu), mô tả, ảnh biên lai.
- **Loại chi phí mở rộng:** fuel (nhiên liệu), toll (phí cầu đường), repair (sửa chữa), tires (lốp), engine_oil (dầu máy), salary (lương tài xế), other (khác).
- **Duyệt/Từ chối:** Điều hành/Kế toán duyệt hoặc từ chối từng khoản chi phí. Chi phí bị từ chối kèm lý do, tài xế được thông báo.
- **Cảnh báo vi phạm:** Tự động phát hiện hụt dầu (>10%), thời gian vượt 150% dự kiến, dừng đỗ >45 phút, sai tuyến đường.
- **Xử lý cảnh báo:** Điều hành xác nhận cảnh báo, ghi lý do, quyết định ghi nhận vi phạm hoặc bỏ qua. Vi phạm đã xác nhận tự động ảnh hưởng điểm KPI.
- **Quy định phạt vi phạm nội quy (từ NEPO operations):**
  - Tắt GPS/định vị >1h: từ lần 3 trở đi phạt 500,000đ/lần
  - Lái xe >4h liên tục không thay thẻ: từ lần 3 trở đi phạt 500,000đ/lần
  - Không nộp phiếu hạ vỏ/hàng: phạt 100,000đ/lần + chịu chi phí phát sinh
  - Vi phạm an toàn (rượu/bia/chất kích thích): phạt 500,000đ/lần hoặc buộc thôi việc
  - Báo nghỉ muộn (<12h ngày trước): phạt 200,000đ/lần
  - Nghỉ trước 30 ngày notice: phạt 200,000đ/ngày từ ngày nghỉ đến đủ 30 ngày

### 3.8 Kế toán & Tài chính
- **Duyệt chi phí:** Điều hành/Kế toán duyệt các yêu cầu chi phí từ tài xế. Chi phí đã duyệt tự động cộng vào tổng chi phí chuyến.
- **Xuất hóa đơn:** Gom chuyến theo chủ hàng, xuất hóa đơn (PDF). Lưu trữ số hóa đơn, ngày, file PDF, trạng thái.
- **Công nợ:** Theo dõi tình trạng thanh toán của từng chủ hàng (tổng, đã thu, chưa thu).
- **Báo cáo aging công nợ:** Phân loại nợ theo số tháng quá hạn (T1, T2, T3, T4+). Cảnh báo khi tạo booking mới cho khách hàng nợ quá hạn, nhưng KHÔNG tự động khóa. Giám đốc quyết định manually.
- **Đánh dấu thanh toán:** Kế toán ghi nhận thanh toán (một phần hoặc toàn bộ). Hỗ trợ thanh toán nhiều đợt cho cùng hóa đơn.
- **Chốt sổ:** Khóa dữ liệu cuối tháng, chặn chốt sổ nếu còn chuyến mồ côi chưa gán chủ hàng.
- **Bảng kê chi tiết công nợ:** Mỗi khách hàng có bảng kê riêng (phát sinh Nợ/Có, lũy kế, ghi chú) — tương tự sổ cái kế toán.

### 3.9 Báo cáo & Dashboard
- **Giám đốc:** Dashboard lợi nhuận Real-time, lãi ròng từng xe, xếp hạng tài xế (KPI), số cảnh báo chưa duyệt, báo cáo aging công nợ.
- **Điều hành:** Theo dõi vị trí xe trên bản đồ, trạng thái chuyến, timeline chi tiết, xử lý cảnh báo.
- **Kế toán:** Chi phí chờ duyệt, tóm tắt công nợ, aging công nợ (T1-T4+), chuyến mồ côi cần gán chủ hàng.
- **Tài xế (mobile):** Chuyến được giao, cập nhật tiến trình, gửi chi phí, xem thu nhập hôm nay.
- **Báo cáo P&L theo đầu xe:** Doanh thu - tổng chi phí (dầu + đi đường + lương lx + sửa chữa + lốp + dầu máy) = lợi nhuận gộp. Xem theo tháng, theo xe.

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
- **Mobile:** Capacitor (Ionic) native app — PWA core + native plugins cho background geolocation, camera, notifications.
- **Background Geolocation:** `@capacitor-community/background-geolocation` — native foreground service (Android) / background task (iOS). Interval: every 30 seconds. Start: empty_pickup. Stop: completed.
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
- `ROUTES`: id, name, origin, destination, distance_km, expected_duration_min, toll_discount, toll_surcharge, is_active.
- `ROUTE_GEOFENCES`: id, route_id, geofence_type (depot/port/destination), latitude, longitude, radius_meters, label. — Vùng geofence cho auto status transitions.
- `ROUTE_PRICING`: id, route_id, vehicle_type (mooc_40/40ft/20ft/mooc_20), trip_pay, is_active. — Bảng giá cước: tuyến × loại xe → tiền đi đường.
- `ROUTE_FUEL_QUOTAS`: id, route_id, vehicle_id, load_type (empty/loaded_light/loaded_heavy/cargo_heavy/cargo_light), liters_per_100km, supplement_note, is_default, created_by, updated_by, updated_at. — Định mức dầu: xe × tải trọng. Phụ bổ sung ghi trong supplement_note (vd: 'Mộc Châu +3').
- `TRIP_FUEL_QUOTAS`: id, trip_id, route_fuel_quota_id, load_type, default_liters_per_100km, actual_liters_per_100km, override_reason, overridden_by. — Định mức thực tế cho chuyến.

#### Trips & Bookings
- `BOOKINGS`: id, booking_code, client_id, route_id, vehicle_type_required, container_type, notes, status (pending/approved/rejected/completed), created_by, approved_by, approved_at, workflow_id (FK → workflows.id), created_at.
- `TRIPS`: id, trip_code, booking_id, vehicle_id, driver_id, client_id, route_id, container_code, container_type (20ft/40ft/45ft/hc), status (received/empty_pickup/at_port/leaving_port/en_route/arrived/dropped_off/completed), is_orphan, is_locked, start_time, end_time, actual_distance_km (haversine sum of GPS_LOG), route_deviation_pct (actual vs ROUTES.distance_km), workflow_id (FK → workflows.id), created_at.
- `TRIP_STATUS_HISTORY`: id, trip_id, status, timestamp, latitude, longitude, accuracy, notes.
- `GPS_LOG_YYYYMM`: Partitioned by month (vd: `gps_log_202604`). id, trip_id, latitude (DECIMAL(9,5)), longitude (DECIMAL(9,5)), accuracy, speed, heading, server_timestamp. — Ingestion table: mỗi 30 giây từ empty_pickup đến completed, nhưng chỉ log nếu delta >50m hoặc heading change >15°. Index: (trip_id, server_timestamp).
- `GPS_LOG_CURRENT`: View → union last 3 months of partitions for active queries.
- `TRIP_PATHS`: id, trip_id, compressed_path (BYTEA — Douglas-Peucker simplified + gzip), point_count, raw_point_count, created_at. — One row per trip after completion. Raw GPS_LOG rows deleted after compression.
- `GPS_ARCHIVES`: id, trip_id, month, storage_path (S3/flat-file), archived_at. — Cold storage reference.
- `TRIP_PHOTOS`: id, trip_id, photo_type (container_pickup/container_delivery/fuel_receipt/expense_receipt/other), storage_key (S3 key), latitude, longitude, accuracy, server_timestamp, is_confirmed (boolean, default false), confirmed_at. — Ảnh upload → editable cho đến khi tài xế xác nhận. Sau confirmed: không sửa/xóa. Presigned URL generated on demand (not stored).
- `EXPENSES`: id, trip_id, category (fuel/toll/repair/tires/engine_oil/salary/other), amount, liters (nullable, chỉ cho fuel/engine_oil), description, receipt_photo_id, status (pending/approved/rejected), reject_reason, approved_by, approved_at, workflow_id (FK → workflows.id), created_at.
- `PENALTY_RULES`: id, rule_code, description, penalty_amount, penalty_type (fine/warning/termination), occurrence_threshold (vd: '3' = từ lần thứ 3), is_active. — Quy định phạt nội quy.
- `DRIVER_PENALTIES`: id, driver_id, trip_id, penalty_rule_id, amount, description, created_by, created_at. — Ghi nhận vi phạm phạt.

#### Financials
- `INVOICES`: id, invoice_number, client_id, trip_ids (array), subtotal, tax, total, pdf_storage_key (S3 key), status (draft/issued/paid/partially_paid), issued_at, paid_at, workflow_id (FK → workflows.id), notes.
- `PAYMENTS`: id, invoice_id, amount, payment_method, reference_number, paid_by, notes, created_at.
- `RECEIVABLES_AGING`: id, client_id, period_month, period_year, beginning_balance, new_charges, payments_received, ending_balance, aging_bucket (current/T1/T2/T3/T4+), gbn_number, notes. — Bảng aging công nợ (tổng hợp tháng).
- `RECEIVABLES_DETAIL`: id, client_id, transaction_date, transaction_type (charge/payment), gbn_number, amount_debit, amount_credit, running_balance, notes. — Chi tiết sổ cái theo khách hàng.

#### Workflows, Alerts & Notifications
- `WORKFLOWS`: id (auto-increment), run_id (UUID), workflow_type (varchar), state (varchar), event (varchar), attempt (int), data (JSON). — State machine engine.
- `ALERTS`: id, trip_id, alert_type (fuel_anomaly/time_anomaly/route_deviation/idle), severity, description, is_resolved, resolved_by, resolution (violation/dismissed), resolution_note, created_at, resolved_at.
- `NOTIFICATIONS`: id, user_id, type, title, message, entity_type, entity_id, is_read, created_at.
- `DOCUMENTS`: id, entity_type, entity_id, doc_type (booking/do/eir/invoice/receipt/customs), storage_key (S3 key), original_filename, content_type, file_size_bytes, uploaded_by, retention_years, created_at. — Chứng từ lưu trên DigitalOcean Spaces, truy cập qua presigned URL.

### 4.3 Workflow Engine (State Machine)

Bảng `WORKFLOWS` điều khiển trạng thái phức tạp của Chuyến xe, Chi phí, Hóa đơn v.v.

**Cấu trúc bảng:**
- `id`: Auto-increment primary key
- `run_id`: UUID — định danh instance của workflow
- `workflow_type`: varchar — loại workflow (`'Trip'`, `'Expense'`, `'Invoice'`) → engine map sang Python class (`TripWorkflow`, `ExpenseWorkflow`)
- `state`: varchar — state id trực tiếp từ `wf.current_state_value` (ví dụ `'received'`, `'en_route'`, `'completed'`)
- `event`: varchar — event id trực tiếp từ library, đúng tên method (ví dụ `'start'`, `'pick_empty'`, `'timeout'`). NULL hoặc `''` = không có event chờ.
- `attempt`: int — số lần thử transition
- `data`: JSON — payload nghiệp vụ

**Một thực thể = một dòng.** Mọi thay đổi trạng thái đều UPDATE trực tiếp trên cùng một dòng, không INSERT dòng mới.

**Tại sao varchar thay vì int:**
- `python-statemachine` dùng string id cho state và event. `send('start')` nhận string, `current_state_value` trả string.
- Lưu trực tiếp string loại bỏ lớp mapping int↔string, giảm code và rủi ro sai.
- Library cung cấp `allowed_events` để kiểm tra event hợp lệ từ state hiện tại.

**Nguyên tắc hoạt động:**
1. Mỗi cặp (state, event) có **đúng một** transition function duy nhất — bản chất của state machine.
2. Khi `attempt > 0` và `event IS NOT NULL` → workflow engine thực thi `wf.send(event)`.
3. Nếu transition thành công → `event = NULL`, `attempt = 0` (không còn event chờ, state đã chuyển).
4. Nếu transition thất bại → `attempt++`, engine thử lại (retry with exponential backoff).
5. Self-loop events (`.to.itself()`) — event hợp lệ, state không đổi, `attempt = 1` vẫn thực thi.

**Ví dụ — Chuyến xe (workflow_type='TripWorkflow'):**
- state='received' + event='start' → state='empty_pickup' (Trip)
- state='en_route' + event='timeout' → state='en_route' (Trip, self-loop, tạo alert)
- state='pending' + event='approve' → state='approved' (Expense)

**Ánh xạ workflow_type → Python class:**
- `'Trip'` → class TripWorkflow (8 states, 8+ transitions)
- `'Expense'` → class ExpenseWorkflow (3 states: pending/approved/rejected)
- `'Invoice'` → class InvoiceWorkflow

**python-statemachine API chính:**
- `wf = TripWorkflow()` → khởi tạo
- `wf.send('start')` → trigger transition
- `wf.current_state_value` → state id string
- `wf.allowed_events` → danh sách event hợp lệ từ state hiện tại
- `wf.is_terminated` → true nếu ở final state
- `.to.itself()` cho self-loop
- Mỗi (state, event) = đúng một transition (bắt buộc bởi library)

**Retry Mechanism:** Tự động thử lại các action thất bại (OCR, Notify) với exponential backoff.
**Blocking Actions:** Chỉ chuyển trạng thái khi các action quan trọng thành công.

### 4.4 Kịch bản nghiệp vụ (Sample Scenarios)

#### Kịch bản 1: Chuyến xe hoàn chỉnh (Happy Path)

**Bối cảnh:** Điều hành tạo chuyến từ Cát Lái → Bình Dương cho chủ hàng Samsung.

```
--- Bước 1: Tạo Booking ---
BOOKINGS:
  id: 1, booking_code: "BK-2026-0001"
  client_id: 5 (Samsung), route_id: 3 (Cát Lái → Bình Dương)
  status: "pending", created_by: user_id=3 (Điều hành Minh)

--- Bước 2: Giám đốc phê duyệt ---
BOOKINGS:
  status: "approved", approved_by: user_id=1 (Giám đốc An)

WORKFLOWS:
  id: 1, workflow_type: "Booking", state: "approved", event: NULL, attempt: 0

--- Bước 3: Tạo chuyến ---
TRIPS:
  id: 101, trip_code: "TR-2026-0101"
  booking_id: 1, vehicle_id: 7 (51F-1234), driver_id: 12 (Tài xế Hoàng)
  route_id: 3, client_id: 5
  container_code: null, container_type: "40ft"
  status: "received", is_orphan: false
  workflow_id: 2

WORKFLOWS (id=2):
  workflow_type: "Trip", state: "received", event: NULL, attempt: 0

TRIP_FUEL_QUOTAS:
  trip_id: 101, default_liters_per_km: 0.35, actual_liters_per_km: 0.35
  (route_id=3 × vehicle_type=“container_40ft” → 0.35 l/km từ ROUTE_FUEL_QUOTAS)

--- Bước 4: Tài xế nhận ca (Mobile) ---
WORKFLOWS (id=2):
  event: "confirm", attempt: 1
→ engine: wf.send('confirm') → received → empty_pickup
→ UPDATE: state="empty_pickup", event=NULL, attempt=0

TRIP_STATUS_HISTORY:
  trip_id: 101, status: "empty_pickup", lat: 10.732, lng: 106.720, timestamp: server

--- Bước 5: Lấy rỗng tại bãi ---
WORKFLOWS (id=2): event="pick_empty", attempt: 1
→ empty_pickup → at_port

--- Bước 6: Chụp container tại cảng (OCR) ---
TRIP_PHOTOS:
  id: 1, trip_id: 101, photo_type: "container_pickup"
  file_path: "/photos/2026/04/101_pickup.jpg"
  lat: 10.735, lng: 106.725, server_timestamp: 2026-04-21T08:30:00Z

OCR Gemini → container_code: "TCLU7845230"
TRIPS (id=101): container_code = "TCLU7845230"

--- Bước 7: Rời cảng → Đang chạy → Đến nơi → Hạ bãi ---
WORKFLOWS (id=2) state transitions:
  at_port → leaving_port → en_route → arrived → dropped_off

--- Bước 8: Tài xế khai báo chi phí dọc đường ---
EXPENSES:
  id: 501, trip_id: 101, category: "fuel", amount: 850000, liters: 15
  description: "Đổ dầu tại trạm PV", status: "pending"
  workflow_id: 3

EXPENSES:
  id: 502, trip_id: 101, category: "toll", amount: 120000
  description: "Phí cầu đường", status: "pending"
  workflow_id: 4

WORKFLOWS (id=3): workflow_type: "Expense", state: "pending", event: NULL, attempt: 0
WORKFLOWS (id=4): workflow_type: "Expense", state: "pending", event: NULL, attempt: 0

--- Bước 9: Kế toán duyệt chi phí ---
WORKFLOWS (id=3): event: "approve", attempt: 1
→ pending → approved
EXPENSES (id=501): status: "approved", approved_by: user_id=4 (Kế toán Lan)

WORKFLOWS (id=4): event: "reject", attempt: 1
→ pending → rejected
EXPENSES (id=502): status: "rejected", reject_reason: "Biên lai không rõ, gửi lại ảnh"

--- Bước 10: Hoàn thành chuyến ---
WORKFLOWS (id=2): event: "complete", attempt: 1
→ dropped_off → completed (final)

TRIPS (id=101):
  status: "completed", end_time: 2026-04-21T14:30:00Z
  actual_distance_km: 47.3

--- Bước 11: Xuất hóa đơn ---
INVOICES:
  id: 201, invoice_number: "HD-2026-0201"
  client_id: 5 (Samsung)
  trip_ids: [101]
  total: 4500000, pdf_path: "/invoices/HD-2026-0201.pdf"
  status: "issued", workflow_id: 5

--- Bước 12: Khách hàng thanh toán ---
PAYMENTS:
  id: 1, invoice_id: 201, amount: 4500000
  payment_method: "transfer", reference_number: "VCB-20260421-001"
INVOICES (id=201): status: "paid", paid_at: 2026-04-21T16:00:00Z
```

#### Kịch bản 2: Phát hiện gian lận nhiên liệu

```
Bối cảnh: Chuyến 102, tuyến Cát Lái → Đồng Nai (120km), định mức 0.35 l/km
  = 120 × 0.35 = 42 lít dự kiến

EXPENSES (id=510):
  trip_id: 102, category: "fuel", liters: 55, amount: 3025000
  status: "pending"

Hệ thống tự động kiểm tra:
  55 lít vs 42 lít định mức = +31% → VƯỢT 10% NGƯỠNG

ALERTS:
  id: 1, trip_id: 102, alert_type: "fuel_anomaly", severity: "high"
  description: "Khai 55 lít, định mức 42 lít. Chênh lệch +31%."
  is_resolved: false

NOTIFICATIONS:
  user_id: 3 (Điều hành Minh)
  title: "Cảnh báo gian lận dầu"
  message: "Chuyến TR-2026-0102: Tài xế Hoàng khai 55 lít (định mức 42 lít, +31%)"

Kế toán từ chối chi phí:
  WORKFLOWS (expense): event: "reject", attempt: 1 → rejected
  EXPENSES: reject_reason: "Gian lận nhiên liệu +31%"
  NOTIFICATIONS → Tài xế Hoàng nhận thông báo từ chối kèm lý do

Điều hành xử lý alert:
  ALERTS: is_resolved: true, resolution: "violation", resolution_note: "Xác nhận gian lận"
  → Tự động ghi vào hồ sơ vi phạm tài xế Hoàng
  → KPI bị ảnh hưởng
```

#### Kịch bản 3: Chuyến mồ côi + Chặn chốt sổ

```
Bối cảnh: Chuyến 105 — cuốc vãng lai, chưa rõ chủ hàng

TRIPS (id=105):
  client_id: NULL, is_orphan: true

Dashboard Kế toán hiển thị:
  ⚠️ 2 chuyến mồ côi chưa gán chủ hàng
  → TR-2026-0105, TR-2026-0108

Kế toán gán chủ hàng:
  TRIPS (id=105): client_id: 8 (Công ty ABC), is_orphan: false

Kế toán chốt sổ tháng 4:
  System check: SELECT COUNT(*) FROM trips WHERE is_orphan=true AND month=4
  → Nếu > 0: "KHÔNG THỂ CHỐT SỔ — Còn 1 chuyến mồ côi chưa gán chủ hàng"
  → Nếu = 0: Cho phép chốt sổ, khóa toàn bộ dữ liệu (is_locked=true)
```

#### Kịch bản 4: Ghi đè định mức xăng dầu

```
Bối cảnh: Xe 51F-1234 (container 40ft) được giao chuyến tuyến #3
  nhưng xe đang bảo dưỡng máy, tốn nhiều dầu hơn bình thường.

ROUTE_FUEL_QUOTAS (default):
  route_id: 3, vehicle_type: "container_40ft", liters_per_km: 0.35

Điều hành tạo chuyến → TRIP_FUEL_QUOTAS tự động tạo:
  trip_id: 106, default_liters_per_km: 0.35, actual_liters_per_km: 0.35

Điều hành ghi đè:
  TRIP_FUEL_QUOTAS: actual_liters_per_km: 0.45, override_reason: "Xe vừa bảo dưỡng máy, tốn dầu hơn"
  overridden_by: user_id=3

→ Khi kiểm tra gian lận, hệ thống dùng actual_liters_per_km = 0.45 (không phải 0.35)
```

#### Kịch bản 5: Nhắc nhở bảo hiểm + linh kiện

```
Bối cảnh: Hệ thống chạy cron job mỗi ngày kiểm tra hạn.

INSURANCE (id=3, vehicle_id=7):
  provider: "Bảo Việt", policy_number: "BV-2026-00345"
  expiry_date: 2026-05-15, renewal_reminder_days: 30

Cron check (2026-04-21):
  days_until_expiry = 24 → < 30 ngày
  → Tạo NOTIFICATION:
    user_id: 1 (Giám đốc An)
    title: "Bảo hiểm sắp hết hạn"
    message: "Xe 51F-1234 — Bảo Việt BV-2026-00345 hết hạn 15/05/2026 (còn 24 ngày)"
    entity_type: "insurance", entity_id: 3

WARRANTY_PARTS (id=5, vehicle_id=7):
  part_name: "Lốp trước trái", install_date: 2025-01-15
  replacement_cycle_km: 80000
  → Reminder: theo thời gian hoặc km (tùy nào đến trước)
```

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
- `GET/POST /api/v1/expenses`: Duyệt chi phí dọc đường (7 loại: fuel/toll/repair/tires/engine_oil/salary/other).
- `GET/POST /api/v1/invoices`: Quản lý hóa đơn & công nợ.
- `POST /api/v1/invoices/{id}/payments`: Ghi nhận thanh toán (hỗ trợ nhiều đợt).
- `GET /api/v1/receivables/aging`: Báo cáo aging công nợ (phân loại T1-T4+).
- `GET /api/v1/receivables/{client_id}/detail`: Bảng kê chi tiết công nợ theo khách hàng.
- `GET/POST /api/v1/routes/{id}/pricing`: Bảng giá cước theo tuyến × loại xe.
- `GET/POST /api/v1/penalty-rules`: Quản lý quy định phạt nội quy.
- `POST /api/v1/drivers/{id}/penalties`: Ghi nhận vi phạm phạt.
- `GET /api/v1/reports/vehicle-pnl`: Báo cáo P&L theo đầu xe (doanh thu - chi phí = lợi nhuận).
- `GET /api/v1/alerts`: Cảnh báo vi phạm.
- `PUT /api/v1/alerts/{id}/resolve`: Xử lý cảnh báo.
- `GET /api/v1/notifications`: Thông báo người dùng.
- `GET /api/v1/audit-logs`: Nhật ký kiểm duyệt (Giám đốc).
- `GET/POST /api/v1/external-vehicles`: Quản lý xe thuê ngoài.

---

## 6. Mobile Architecture (Capacitor + Native Plugins)

### 6.1 Nền tảng
- **Capacitor (Ionic):** Wrapping web app (React + Vite) thành native app cho iOS và Android.
- Web core dùng chung với desktop — chỉ thêm native layer cho hardware access.
- Build: `pnpm build` → Capacitor copy web assets vào native project.

### 6.2 Background Geolocation (REQ-5.3)
- **Plugin:** `@capacitor-community/background-geolocation`
- Xử lý logic native phức tạp để giữ GPS hoạt động khi app ở background.
- **Workflow tích hợp:**
  1. User click "Đang chạy" → JS gọi native plugin `start()`
  2. Native Layer: Plugin khởi tạo foreground service (Android) hoặc background task (iOS)
  3. GPS Interval: Native OS xử lý trigger mỗi 30 giây, kể cả khi tắt màn hình hoặc thu nhỏ app
  4. API Sync: Plugin gửi tọa độ về server tự động
- **Android:** Phải dùng Foreground Service với persistent notification (vd: "Hoàng đang chạy chuyến TR-0101") — báo cho OS biết đang thực hiện task, không kill.
- **iOS:** Apple rất hạn chế. Phải request "Always Allow" location permission. Plugin xử lý background execution limits, hạn chế hơn Android.
- **KHÔNG dùng setInterval()** — JavaScript timer chết khi screen off. Native layer quản lý GPS interval.

### 6.3 Offline & Đồng bộ
- **IndexedDB:** Lưu hàng đợi thao tác khi tài xế mất mạng.
- Tự động đồng bộ (Background Sync) khi có kết nối trở lại.
- **Không bao giờ mất dữ liệu đã nhập do lỗi mạng.**
- Service Worker cache app shell cho fast load.

### 6.4 Camera & Notifications
- `@capacitor/camera` — chụp ảnh chất lượng cao cho OCR + biên lai.
- `@capacitor/push-notifications` — nhận thông báo đẩy từ server (cảnh báo, từ chối chi phí, nhắc nhở).
- Ảnh đính kèm GPS metadata từ native layer (không dùng browser Geolocation API — dùng plugin).

### 6.5 Real-Time Location Updates (Polling)

GPS positions arrive every 30 seconds from driver mobile app (native plugin) from empty_pickup to completed. Dashboard polls at same frequency. Simple HTTP polling is sufficient — no WebSocket overhead needed.

#### Strategy: Interval Polling
- **Interval:** Web dashboard polls every 30 seconds (same frequency as GPS updates from driver)
- **Endpoint:** `GET /api/v1/trips/active/locations` → returns latest GPS for all active trips + last_seen timestamp
- **Update:** Replace map markers, draw GPS trail, update online/offline status
- **Driver status on dashboard:**
  - 🟢 **Tracking** — trip active (empty_pickup→dropped_off), last GPS <2 min ago
  - 🟡 **Idle Online** — no active trip, heartbeat <5 min ago
  - 🔴 **Offline** — no GPS/heartbeat >10 min
  - ⚫ **Off Duty** — not assigned

#### Driver Heartbeat (when NO active trip)
- Driver app sends lightweight POST every 2 min when idle (no trip assigned): `POST /api/v1/drivers/heartbeat { user_id, lat, lng, app_state }`
- Server tracks `last_heartbeat_at` on DRIVER_PROFILES
- When driver has active trip → GPS plugin handles presence (no separate heartbeat needed, GPS IS the heartbeat)

#### Connection State
- 🟢 **Online** — polling active, dashboard updates every 30s
- 🔴 **Offline** — browser offline event detected, pause polling, show "Mất kết nối"
- Auto-resume polling when `navigator.onLine` returns true

#### Tech
- **Frontend:** `setInterval` + `fetch` + AbortController for cleanup. Native browser APIs only.
- **Backend:** Standard REST endpoint. Cache response in Redis for 30s to avoid DB hits from multiple dashboard users.

### 6.6 GPS Data Lifecycle

GPS data is high-volume (30s intervals × N active trips). Without lifecycle management, the database grows rapidly and becomes slow. Strategy: **quality over volume**.

#### Stage 1: Smart Ingestion (Real-time)
- **Distance-based threshold:** Only log a new GPS point if driver has moved **>50 meters** from the last logged point. Filters out GPS noise when idling in traffic or stopped.
- **Angle-based threshold:** Log if heading changed **>15°** from last point. Captures turns and route changes.
- **Mandatory log every 2 minutes:** Even if thresholds not met, log at least once per 2 min to prove tracking is active.
- **Coordinate precision:** Store as `DECIMAL(9,5)` — 5 decimal places (~1m accuracy) is sufficient for map rendering and auditing. Don't store full GPS chip precision.
- **Result:** A 90-minute trip produces ~150-300 points (not 180 raw pings). Straight highway: ~45 points. City traffic with turns: ~300 points.

#### Stage 2: Running Distance Calculation
- **On arrival** of each GPS point, server calculates haversine distance from previous point → adds to `TRIPS.actual_distance_km`.
- **Immediate comparison** with `ROUTES.distance_km`. If deviation >15% → trigger `route_deviation` ALERT.
- **No batch processing** — distance is always up-to-date. Director sees real distance, not stale estimate.

#### Stage 3: Post-Trip Compression (After Completion)
- When trip status → `completed`:
  1. Apply **Douglas-Peucker algorithm** to simplify path — removes redundant points on straight segments while preserving turns.
  2. Compress simplified path with **gzip** → store as single `BYTEA` in `TRIP_PATHS.compressed_path`.
  3. Store metadata: `point_count` (simplified), `raw_point_count` (original).
  4. **Delete all raw GPS_LOG rows** for this trip from partitioned table.
  5. Result: Thousands of rows → **1 row**. Full path still reconstructable for audit.

#### Stage 4: Table Partitioning
- `GPS_LOG_YYYYMM` — one table per month (vd: `gps_log_202604`, `gps_log_202605`).
- Keeps each table small. Drop old partitions instantly instead of row-by-row DELETE.
- `GPS_LOG_CURRENT` — view unioning last 3 months for active dashboard queries.
- **Index:** `(trip_id, server_timestamp)` on each partition for fast lookup.

#### Stage 5: Cold Storage Archive
- After 3 months, compressed `TRIP_PATHS` rows move to cold storage:
  - Store compressed path as flat file on S3/object storage.
  - Record reference in `GPS_ARCHIVES` table.
  - Delete `TRIP_PATHS` row from primary DB.
- Trip history is rarely accessed after a few months. Cold storage is cheap, primary DB stays fast.

#### Visual Summary
```
Raw GPS (30s)     Smart Filter       Douglas-Peucker     Compressed Path     Cold Storage
────────────── ───────────────── ──────────────────── ──────────────────── ────────────
~180 pts/trip → ~150-300 filtered → ~50-80 simplified → 1 row (BYTEA gzip) → S3 file
  90 min        +heading change      preserve turns       + metadata           after 3mo
                 +50m minimum         remove straight      delete raw rows      cheap storage
                 +2min mandatory      segments             keep shape
```

---

### 6.7 Document & File Storage (DigitalOcean Spaces)

All uploaded files (photos, invoices, receipts, documents) stored on **DigitalOcean Spaces** (S3-compatible object storage). Files are **never public** — accessed exclusively via **presigned URLs**.

#### Architecture
- **Storage:** DigitalOcean Spaces bucket (vd: `ttransport-docs`)
- **Access control:** AWS SDK `get_presigned_url(key, expires=900)` — URL valid for 15 minutes only
- **No direct links:** Database stores only `storage_key` (vd: `photos/2026/04/101_pickup.jpg`), never public URL
- **Upload flow:** Client → Backend API → validate → upload to Spaces → store `storage_key` in DB
- **Download flow:** Client request → Backend generate presigned URL (15 min) → Client fetches file

#### Storage Structure
```
ttransport-docs/
  photos/
    {year}/{month}/{trip_id}_{type}.jpg     ← TRIP_PHOTOS
  invoices/
    {year}/{month}/{invoice_number}.pdf      ← INVOICES
  documents/
    {entity_type}/{entity_id}/{doc_type}.pdf ← DOCUMENTS
  gps-archives/
    {year}/{month}/trip_{id}_path.bin.gz     ← GPS_ARCHIVES
```

#### Presigned URL Rules
- **Photo/Document view:** 15-minute presigned URL, generated on demand
- **Invoice PDF:** 15-minute presigned URL, generated on demand
- **GPS archive:** Internal only, not exposed to frontend
- **Never store presigned URL in DB** — always generate fresh on request
- **Never make bucket public** — all access through backend API

#### Security
- Spaces API key stored in backend environment variables only
- CORS configured to allow only TTransport domains
- Upload requires authenticated API request (JWT)
- Download requires authenticated API request + entity-level permission check
- File size limits: photos 10MB, documents 25MB, invoices 5MB
- Allowed types: image/jpeg, image/png, application/pdf

### 6.8 Geofence Auto-Status

Hệ thống sử dụng GPS + geofence để tự động chuyển 4/8 trạng thái chuyến, giảm thao tác thủ công cho tài xế.

#### Geofence Zones (ROUTE_GEOFENCES)
- **Depot:** Khu vực bãi xe (bán kính ~500m). Khi GPS thoát → auto `empty_pickup`.
- **Port:** Khu vực cảng (bán kính ~1km). Khi GPS vào → auto `at_port`. Khi GPS thoát + OCR xong → auto `leaving_port`.
- **Destination:** Khu vực giao hàng (bán kính ~500m). Khi GPS vào → auto `arrived`.
- **Configurable:** Admin cấu hình toạ độ + bán kính cho từng tuyến.

#### Auto-Transition Logic
```
GPS point arrives every 30s:
  1. Calculate distance to each geofence center
  2. If distance < radius:
     - Inside depot + status=received → auto empty_pickup
     - Inside port + status=empty_pickup → auto at_port
     - Left port + OCR done + status=at_port → auto leaving_port
     - On highway (not in any geofence) + status=leaving_port → auto en_route
     - Inside destination + status=en_route → auto arrived
  3. After driver confirms "Hạ bãi" → auto completed
```

#### Driver Mobile UI (4 checkpoints only)
```
┌─────────────────────────────────────┐
│  CHUYẾN TR-2026-0101               │
│                                     │
│  ✅ 1. Nhận ca        [Đã nhận]    │
│  ✅ 2. Chụp container [Đã chụp]    │
│     (OCR auto: TCLU7845230)         │
│  ☐ 3. Chụp giao hàng [Chụp ảnh]    │
│  ☐ 4. Hạ bãi xong    [Xác nhận]    │
│                                     │
│  Auto: Lấy rỗng ✓ Cảng ✓ Rời cảng ✓│
│        Đang chạy... 📍 10.81, 106.71│
└─────────────────────────────────────┘
```

### Giai đoạn 1: MVP (Sản phẩm khả dụng tối thiểu)
- Xác thực & phân quyền 4 vai trò.
- CRUD: Users, Vehicles, Clients, Routes, Route Geofences.
- Luồng Booking → Phê duyệt → Tạo chuyến → 4 manual checkpoints + 4 auto geofence → Hoàn thành.
- OCR container + GPS timestamp + ảnh chỉ đọc (DigitalOcean Spaces + presigned URL).
- Geofence auto-status: depot, port, destination zones.
- Chi phí dọc đường (7 loại: fuel/toll/repair/tires/engine_oil/salary/other) + duyệt/từ chối (kèm lý do).
- Bảng giá cước theo tuyến × loại xe.
- Cảnh báo gian lận (nhiên liệu >10%, thời gian >150%, dừng đỗ >45 phút, lệch tuyến >15%).
- Chuyến mồ côi + chặn chốt sổ.
- Công nợ + aging (T1-T4+) + bảng kê chi tiết theo khách hàng + xuất hóa đơn PDF.
- Báo cáo P&L theo đầu xe.
- Dashboard cơ bản cho 4 vai trò.
- Audit log (Giám đốc).
- Offline + auto-sync (tài xế).

### Giai đoạn 2: Nâng cao
- Tích hợp bảo hiểm, nhắc nhở thay thế linh kiện.
- Định mức xăng dầu theo ma trận xe × tải trọng (5 mức: empty/loaded_light/loaded_heavy/cargo_heavy/cargo_light) + phụ bổ sung theo tuyến.
- Quy định phạt vi phạm nội quy (tắt GPS, lái quá 4h, không nộp phiếu, rượu bia).
- Dashboard tài chính chuyên sâu (P&L từng đầu xe, TAT).
- Theo dõi xe Real-time trên bản đồ.
- Quản lý xe thuê ngoài (đối tác vận tải, hồ sơ năng lực).
- Quản lý chứng từ hải quan (tờ khai xuất/nhập khẩu).
- Phiếu xe chạy điện tử (thay thế BM.08.02 giấy).
- Báo cáo Excel/PDF.
- Hệ thống thông báo đẩy (Push notifications).
- Đánh giá KPI tài xế + xếp hạng.

---

*Tài liệu được hợp nhất và cập nhật vào tháng 04/2026. Phiên bản này tích hợp dữ liệu thực tế từ hoạt động của Công ty NEPO (Hải Phòng) — định mức đi đường, định mức dầu theo tải trọng, công nợ aging, và quy định phạt nội quy.*
