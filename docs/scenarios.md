# TTransport — Kịch bản nghiệp vụ (Scenarios)

> Mục đích: Phát hiện thiếu sót, bước thiếu, workflow chưa考虑. Mỗi kịch bản có sample data cụ thể.

---

## SC-01: Chuyến xe hoàn chỉnh (Happy Path)

**Vai trò:** Điều hành Minh → Tài xế Hoàng → Kế toán Lan → Giám đốc An
**Tuyến:** Cát Lái → Bình Dương (45km, 90 phút dự kiến)

### Bước 1: Tiếp nhận yêu cầu khách hàng
```
Khách hàng Samsung gửi email yêu cầu vận chuyển 1 container 40ft từ Cát Lái đến kho Bình Dương.

Điều hành Minh tạo booking:
BOOKINGS:
  id: 1
  booking_code: "BK-2026-0001"
  client_id: 5 (Samsung)
  route_id: 3 (Cát Lái → Bình Dương)
  vehicle_type_required: "container_40ft"
  container_type: "40ft"
  notes: "Hàng điện tử, nhẹ nhàng"
  status: "pending"
  created_by: user_id=3 (Minh)
  workflow_id: 1

WORKFLOWS (id=1):
  workflow_type: "Booking", state: "pending", event: NULL, attempt: 0
```

### Bước 2: Giám đốc phê duyệt booking
```
Giám đốc An xem booking trên dashboard → click Duyệt.

WORKFLOWS (id=1):
  event: "approve", attempt: 1
→ wf.send('approve') → pending → approved
→ UPDATE: state="approved", event=NULL, attempt=0

BOOKINGS (id=1):
  status: "approved", approved_by: user_id=1 (An), approved_at: 2026-04-21T07:00:00Z
```

### Bước 3: Điều hành tạo chuyến
```
Điều hành Minh chọn xe và tài xế:
  - Vehicle: 51F-1234 (container 40ft, đang rảnh)
  - Driver: Hoàng (GPLX còn hạn đến 2027)
  - Client: Samsung (đã có từ booking)

TRIPS:
  id: 101
  trip_code: "TR-2026-0101"
  booking_id: 1
  vehicle_id: 7 (51F-1234)
  driver_id: 12 (Hoàng)
  client_id: 5 (Samsung)
  route_id: 3
  container_code: NULL
  container_type: "40ft"
  status: "received"
  is_orphan: false
  is_locked: false
  workflow_id: 2

WORKFLOWS (id=2):
  workflow_type: "Trip", state: "received", event: NULL, attempt: 0

Tự động tạo TRIP_FUEL_QUOTAS:
  trip_id: 101
  route_fuel_quota_id: 15 (route_id=3 × vehicle_type=container_40ft → 0.35 l/km)
  default_liters_per_km: 0.35
  actual_liters_per_km: 0.35
  override_reason: NULL
  overridden_by: NULL

Tài xế Hoàng nhận thông báo trên mobile:
NOTIFICATIONS:
  user_id: 12 (Hoàng)
  title: "Chuyến mới"
  message: "TR-2026-0101 — Cát Lái → Bình Dương, 40ft"
  entity_type: "trip", entity_id: 101

VEHICLES (id=7): status → "on_trip"
```

### Bước 4: Tài xế nhận ca (Mobile)
```
Hoàng mở app → thấy chuyến TR-2026-0101 → click "Nhận ca"

WORKFLOWS (id=2):
  event: "confirm", attempt: 1
→ wf.send('confirm') → received → empty_pickup
→ UPDATE: state="empty_pickup", event=NULL, attempt=0

TRIP_STATUS_HISTORY:
  trip_id: 101, status: "empty_pickup"
  lat: 10.7320, lng: 106.7200, accuracy: 5.0
  timestamp: 2026-04-21T07:30:00Z (server time)
```

### Bước 5: Lấy rỗng tại bãi
```
Hoàng đến bãi lấy container rỗng → click "Lấy rỗng xong"

WORKFLOWS (id=2):
  event: "pick_empty", attempt: 1
→ empty_pickup → at_port
→ UPDATE: state="at_port", event=NULL, attempt=0

TRIP_STATUS_HISTORY:
  trip_id: 101, status: "at_port"
  lat: 10.7350, lng: 106.7250, accuracy: 8.0
```

### Bước 6: Chụp container tại cảng (OCR)
```
Hoàng chụp ảnh container → app gửi ảnh lên server:

POST /api/v1/photos/upload
  trip_id: 101, photo_type: "container_pickup"
  file: image.jpg
  lat: 10.7355, lng: 106.7252, accuracy: 5.0

Server nhận ảnh → gửi Gemini Vision API → nhận "TCLU7845230"

TRIP_PHOTOS:
  id: 1, trip_id: 101, photo_type: "container_pickup"
  file_path: "/photos/2026/04/101_pickup.jpg"
  lat: 10.7355, lng: 106.7252
  server_timestamp: 2026-04-21T08:00:00Z

TRIPS (id=101):
  container_code: "TCLU7845230" (auto-fill từ OCR)

Nếu OCR thất bại:
  → App hiển thị "Nhận diện thất bại" → Hoàng nhập tay "TCLU7845230"
  → Vẫn lưu ảnh gốc làm chứng từ
```

### Bước 7: Rời cảng
```
Hoàng xác nhận đã lấy hàng xong → click "Rời cảng"

WORKFLOWS (id=2):
  event: "depart_port", attempt: 1
→ at_port → leaving_port
→ UPDATE: state="leaving_port", event=NULL, attempt=0
```

### Bước 8: Đang chạy
```
Hoàng click "Đang chạy" → GPS bắt đầu theo dõi liên tục

WORKFLOWS (id=2):
  event: "en_route", attempt: 1
→ leaving_port → en_route

GPS tracking: mỗi 5 phút ghi vị trí (REQ-5.3)
App mobile hiển thị lộ trình đang đi
Văn phòng xem vị trí Hoàng trên bản đồ (REQ-5.4)
```

### Bước 9: Khai báo đổ dầu trên đường
```
Hoàng dừng đổ dầu → app: Khai báo chi phí → loại: Nhiên liệu

EXPENSES:
  id: 501
  trip_id: 101
  category: "fuel"
  amount: 850000
  liters: 15
  description: "Đổ dầu tại trạm PV Cát Lái"
  receipt_photo_id: 2
  status: "pending"
  workflow_id: 3

TRIP_PHOTOS (id=2):
  trip_id: 101, photo_type: "fuel_receipt"
  file_path: "/photos/2026/04/101_fuel.jpg"
  lat: 10.7400, lng: 106.7300
  server_timestamp: 2026-04-21T08:30:00Z

WORKFLOWS (id=3):
  workflow_type: "Expense", state: "pending", event: NULL, attempt: 0

Hệ thống kiểm tra ngay:
  15 lít / 45 km định mức = 0.33 l/km
  vs actual_liters_per_km = 0.35
  → 0.33 < 0.35 → OK, không cảnh báo
```

### Bước 10: Khai báo phí cầu đường
```
EXPENSES:
  id: 502
  trip_id: 101
  category: "toll"
  amount: 120000
  description: "Phí cầu đường Bình Dương"
  receipt_photo_id: 3
  status: "pending"
  workflow_id: 4
```

### Bước 11: Đến nơi
```
Hoàng đến kho Samsung → click "Đến nơi"

WORKFLOWS (id=2):
  event: "arrive", attempt: 1
→ en_route → arrived

TRIP_STATUS_HISTORY:
  trip_id: 101, status: "arrived"
  lat: 10.8500, lng: 106.7100, timestamp: 2026-04-21T09:45:00Z
```

### Bước 12: Chụp ảnh giao hàng + Hạ bãi
```
Hoàng chụp ảnh container tại điểm giao:

TRIP_PHOTOS (id=4):
  trip_id: 101, photo_type: "container_delivery"
  file_path: "/photos/2026/04/101_delivery.jpg"
  lat: 10.8502, lng: 106.7105
  server_timestamp: 2026-04-21T10:00:00Z

Khách hàng Samsung ký biên bản bàn giao (BM.08.04) → lưu trong DOCUMENTS:
  doc_type: "delivery_receipt", entity_type: "trip", entity_id: 101

Hoàng click "Hạ bãi":

WORKFLOWS (id=2):
  event: "drop_off", attempt: 1
→ arrived → dropped_off
```

### Bước 13: Hoàn thành chuyến
```
Hoàng click "Hoàn thành"

WORKFLOWS (id=2):
  event: "complete", attempt: 1
→ dropped_off → completed (final state)
→ UPDATE: state="completed", event=NULL, attempt=0

TRIPS (id=101):
  status: "completed"
  end_time: 2026-04-21T10:30:00Z
  actual_distance_km: 47.3 (ước tính từ GPS: khoảng cách giữa pickup GPS và delivery GPS)

VEHICLES (id=7): status → "idle"

Tự động tổng hợp chi phí:
  - Nhiên liệu: 850,000 (đã duyệt)
  - Phí cầu đường: 120,000 (chờ duyệt)
  - Tổng tạm tính: 970,000
```

### Bước 14: Kế toán duyệt chi phí
```
Kế toán Lan xem danh sách chi phí chờ duyệt:

Expense 501 (fuel): Xem biên lai → Duyệt
WORKFLOWS (id=3): event="approve", attempt=1 → pending → approved
EXPENSES (id=501): status="approved", approved_by=user_id=4

Expense 502 (toll): Biên lai mờ → Từ chối
WORKFLOWS (id=4): event="reject", attempt=1 → pending → rejected
EXPENSES (id=502): status="rejected", reject_reason="Biên lai không rõ, gửi lại ảnh"

NOTIFICATIONS → Tài xế Hoàng nhận: "Chi phí 120,000 (phí cầu đường) bị từ chối: Biên lai không rõ, gửi lại ảnh"
```

### Bước 15: Xuất hóa đơn
```
Kế toán Lan gom chuyến theo chủ hàng Samsung → xuất hóa đơn:

INVOICES:
  id: 201
  invoice_number: "HD-2026-0201"
  client_id: 5 (Samsung)
  trip_ids: [101]
  subtotal: 3500000
  tax: 350000
  total: 3850000
  pdf_path: "/invoices/HD-2026-0201.pdf"
  status: "issued"
  issued_at: 2026-04-21T14:00:00Z
  workflow_id: 5
```

### Bước 16: Khách hàng thanh toán
```
Samsung chuyển khoản 3,850,000:

PAYMENTS:
  id: 1
  invoice_id: 201
  amount: 3850000
  payment_method: "bank_transfer"
  reference_number: "VCB-20260421-001"
  paid_by: user_id=4 (Kế toán Lan)

INVOICES (id=201):
  status: "paid", paid_at: 2026-04-21T16:00:00Z

WORKFLOWS (id=5): state → "paid" (final)
```

---

## SC-02: Phát hiện gian lận nhiên liệu

**Vai trò:** Tài xế Bình → Hệ thống → Điều hành Minh → Kế toán Lan

### Bối cảnh
```
TRIPS (id=102):
  route_id: 5 (Cát Lái → Đồng Nai, 120km)
  vehicle_id: 8 (51F-5678, container 40ft)
  driver_id: 13 (Bình)
  status: "en_route"

TRIP_FUEL_QUOTAS:
  trip_id: 102
  actual_liters_per_km: 0.35
  → Định mức: 120km × 0.35 = 42 lít
```

### Bình khai báo đổ dầu
```
EXPENSES:
  id: 510
  trip_id: 102
  category: "fuel"
  amount: 3025000
  liters: 55
  description: "Đổ dầu trạm Petrolimex"
  status: "pending"

Hệ thống tự động kiểm tra khi expense được tạo:
  55 lít khai báo vs 42 lít định mức = +31%
  → VƯỢT ngưỡng 10% (REQ-8.3, REQ-8.4)

ALERTS:
  id: 1
  trip_id: 102
  alert_type: "fuel_anomaly"
  severity: "high"
  description: "Tài xế Bình khai 55 lít, định mức tuyến 42 lít. Chênh lệch +31%."
  is_resolved: false

NOTIFICATIONS:
  user_id: 3 (Điều hành Minh)
  title: "⚠️ Cảnh báo gian lận dầu"
  message: "Chuyến TR-2026-0102: Bình khai 55L (định mức 42L, +31%)"
```

### Điều hành xử lý
```
Minh mở Alerts → xem chi tiết:
  - Chuyến: TR-2026-0102
  - Tuyến: Cát Lái → Đồng Nai (120km)
  - Định mức: 42L
  - Khai: 55L (+31%)
  - Biên lai: [xem ảnh]
  - GPS đổ dầu: [xem vị trí trên bản đồ]

Minh chọn: Ghi nhận vi phạm
  ALERTS (id=1):
    is_resolved: true
    resolved_by: user_id=3
    resolution: "violation"
    resolution_note: "Xác nhận gian lận. Chênh quá lớn."

  → Tự động ghi vi phạm vào hồ sơ Bình:
    Vi phạm loại: fuel_anomaly
    → Ảnh hưởng KPI: tổng vi phạm++ / tổng chuyến

Kế toán từ chối chi phí:
  EXPENSES (id=510): status="rejected", reject_reason="Gian lận nhiên liệu +31%"
  NOTIFICATIONS → Bình nhận: "Chi phí nhiên liệu bị từ chối: Gian lận nhiên liệu +31%"
```

---

## SC-03: Phát hiện bất thường thời gian (Time Anomaly)

**Vai trò:** Tài xế Tuấn → Hệ thống → Điều hành Minh

### Bối cảnh
```
TRIPS (id=103):
  route_id: 3 (Cát Lái → Bình Dương, 45km, expected_duration: 90 phút)
  driver_id: 14 (Tuấn)
  status: "en_route"

TRIP_STATUS_HISTORY:
  trip_id: 103, status: "leaving_port", timestamp: 2026-04-21T08:00:00Z
  trip_id: 103, status: "en_route", timestamp: 2026-04-21T08:10:00Z
```

### Hệ thống phát hiện
```
Sau 135 phút (150% × 90 phút), chuyến vẫn ở "en_route":

ALERTS:
  id: 2
  trip_id: 103
  alert_type: "time_anomaly"
  severity: "medium"
  description: "Chuyến TR-2026-0103: 135 phút đã qua (định mức 90 phút, +50%). Nghi ngờ dừng đỗ / câu giờ."
  is_resolved: false

NOTIFICATIONS → Điều hành Minh nhận cảnh báo
```

### Điều hành xử lý
```
Minh xem GPS trail của Tuấn → thấy xe dừng 45 phút tại một vị trí:
  → Chọn: Ghi nhận vi phạm (resolution: "violation")
  → Hoặc: Bỏ qua nếu Tuấn báo bão tắc đường (resolution: "dismissed")
    resolution_note: "Tắc đường theo báo cáo giao thông. Bỏ qua lần này."
```

---

## SC-04: Chuyến mồ côi + Chặn chốt sổ

**Vai trò:** Điều hành Minh → Kế toán Lan → Hệ thống

### Tạo chuyến không có chủ hàng
```
Điều hành Minh nhận cuốc vãng lai, chưa biết ai thanh toán:

TRIPS (id=105):
  trip_code: "TR-2026-0105"
  client_id: NULL
  is_orphan: true
  status: "received"

Dashboard Kế toán hiển thị:
  ⚠️ Chuyến mồ côi: 1

NOTIFICATIONS → Kế toán Lan:
  title: "Chuyến mồ côi mới"
  message: "TR-2026-0105 chưa có chủ hàng"
```

### Kế toán gán chủ hàng
```
Lan điều tra → phát hiện Công ty ABC thuê cuốc này:

TRIPS (id=105):
  client_id: 8 (Công ty ABC)
  is_orphan: false

Dashboard cập nhật: ⚠️ Chuyến mồ côi: 0
```

### Chốt sổ cuối tháng
```
Kế toán Lan click "Chốt sổ tháng 4/2026":

Hệ thống kiểm tra:
  SELECT COUNT(*) FROM trips
  WHERE is_orphan = true
    AND EXTRACT(MONTH FROM created_at) = 4
    AND EXTRACT(YEAR FROM created_at) = 2026

Trường hợp 1: COUNT > 0
  → "KHÔNG THỂ CHỐT SỔ — Còn 2 chuyến mồ côi chưa gán chủ hàng: TR-0105, TR-0108"
  → Không cho phép tiếp tục

Trường hợp 2: COUNT = 0
  → Chốt sổ thành công
  → UPDATE trips SET is_locked = true WHERE tháng 4
  → Toàn bộ dữ liệu chuyến tháng 4 bị khóa (chỉ đọc)
  → Không sửa được chi phí, container code, ảnh, trạng thái
```

---

## SC-05: Ghi đè định mức xăng dầu

**Vai trò:** Điều hành Minh

### Bối cảnh
```
Xe 51F-1234 vừa bảo dưỡng máy lớn, tốn nhiều dầu hơn bình thường.
Điều hành Minh cần ghi đè định mức cho chuyến này.

ROUTE_FUEL_QUOTAS (default):
  route_id: 3, vehicle_type: "container_40ft"
  liters_per_km: 0.35
  is_default: true

Khi tạo trip (id=106):
TRIP_FUEL_QUOTAS tự động tạo:
  trip_id: 106
  route_fuel_quota_id: 15
  default_liters_per_km: 0.35
  actual_liters_per_km: 0.35
  override_reason: NULL
```

### Ghi đè
```
Minh thấy chuyến 106 → click "Điều chỉnh định mức":
  actual_liters_per_km: 0.45 (+28.6%)
  override_reason: "Xe vừa bảo dưỡng máy lớn, tốn dầu hơn tạm thời"
  overridden_by: user_id=3

→ Kiểm tra gian lận cho chuyến 106 sẽ dùng 0.45 l/km (không phải 0.35)
→ Biên lai đổ 20L cho 45km = 0.44 l/km < 0.45 → OK, không cảnh báo
```

---

## SC-06: Workflow Retry (OCR thất bại)

**Vai trò:** Hệ thống

### Bối cảnh
```
Tài xế chụp ảnh container → server nhận ảnh → gọi Gemini Vision API → timeout

WORKFLOWS (Trip, id=2):
  state: "at_port"
  event: "ocr_complete" ← event này sẽ trigger sang leaving_port sau OCR thành công
  attempt: 1

Lần 1: Gemini timeout
→ attempt: 2 (retry)

Lần 2: Gemini timeout
→ attempt: 3

Lần 3: Gemini timeout
→ attempt: 4

Lần 4: Gemini timeout
→ attempt: 5 → MAX_RETRIES = 5

→ Tạo ALERT: OCR thất bại 5 lần cho chuyến TR-0101
→ NOTIFICATIONS → Điều hành Minh
→ Không block chuyến — tài xế có thể nhập tay container code
→ WORKFLOWS: event=NULL, attempt=0 (skip OCR, cho phép tiếp tục)
```

---

## SC-07: Offline — Tài xế mất mạng

**Vai trò:** Tài xế Hoàng

### Bối cảnh
```
Hoàng đang ở "en_route" trên quốc lộ, mất 3G/4G.

Mobile app (Capacitor native):
  → IndexedDB lưu local:
    - Queue item 1: { action: "status_update", trip_id: 101, status: "arrived", lat: ..., lng: ... }
    - Queue item 2: { action: "expense_create", trip_id: 101, category: "fuel", amount: 500000, liters: 10 }
    - Queue item 3: { action: "photo_upload", file: blob, trip_id: 101, photo_type: "expense_receipt", lat: ..., lng: ... }

App hiển thị:
  - Offline indicator 🔴
  - "3 thao tác đang chờ đồng bộ"
  - Hoạt động bình thường, không block user

Background GPS vẫn hoạt động (native layer, không phụ thuộc mạng):
  → Native plugin tiếp tục gửi GPS location mỗi 5 phút
  → Nếu không có mạng → native layer cache location → gửi khi có mạng lại
  → GPS interval KHÔNG bị ảnh hưởng bởi mất mạng

Khi có mạng trở lại:
  → Background Sync tự động:
    1. Gửi status_update arrived → server
    2. Gửi expense_create → server
    3. Upload photo → server
  → Mỗi item dùng server_timestamp (không dùng giờ điện thoại)
  → Offline indicator 🟢 "Đã đồng bộ"

Nếu sync thất bại cho 1 item:
  → Các item khác vẫn sync được (không block lẫn nhau)
  → Item thất bại giữ lại trong queue, thử lại lần sau
  → Không bao giờ mất dữ liệu đã nhập
```

---

## SC-08: Background GPS Tracking (Native Plugin)

**Vai trò:** Tài xế Hoàng → Hệ thống → Điều hành Minh

### Bối cảnh
```
TRIPS (id=107):
  driver_id: 14 (Tuấn)
  status: "en_route"

Tài xế Tuấn click "Đang chạy" trên mobile:
  → JS gọi: BackgroundGeolocation.start({ interval: 300000 }) // 5 phút
  → Native plugin khởi tạo:

    ANDROID:
    - Foreground Service bắt đầu
    - Persistent notification: "🚛 Tuấn đang chạy chuyến TR-2026-0107"
    - OS sẽ không kill app kể cả khi screen off / app minimized
    - GPS sample mỗi 5 phút → gửi POST /api/v1/gps-location

    iOS:
    - Request "Always Allow" location permission (nếu chưa có)
    - Background task bắt đầu
    - iOS cho phép background location updates nhưng hạn chế hơn Android
    - Plugin tự động manage background execution limits

Mỗi 5 phút, native layer gửi:
  POST /api/v1/gps-location
  { trip_id: 107, lat: 10.8100, lng: 106.7150, accuracy: 12.0, speed: 65.3 }
  → Server lưu vào TRIP_STATUS_HISTORY hoặc bảng GPS_LOG riêng
```

### Detect idle qua GPS
```
Native plugin report location mỗi 5 phút:
  10:00 → lat: 10.8100, lng: 106.7150, speed: 0
  10:05 → lat: 10.8101, lng: 106.7151, speed: 0 (<5km/h)
  10:10 → lat: 10.8100, lng: 106.7150, speed: 0
  ... 9 consecutive readings ...
  10:45 → lat: 10.8100, lng: 106.7150, speed: 0

Hệ thống detect: xe không di chuyển >45 phút → tạo ALERT (idle)

Lưu ý: GPS tracking tiếp tục kể cả khi screen off.
setInterval() KHÔNG được dùng — chỉ native layer đảm bảo.
```

### Khi hoàn thành chuyến
```
Tuấn click "Hoàn thành":
  → JS gọi: BackgroundGeolocation.stop()
  → Native foreground service dừng
  → Notification biến mất
  → GPS tracking ngừng gửi
```

---

## SC-09: Bảo hiểm sắp hết hạn

**Vai trò:** Hệ thống → Giám đốc An → Kế toán Lan

### Bối cảnh
```
INSURANCE (id=3, vehicle_id=7, 51F-1234):
  provider: "Bảo Việt"
  provider_phone: "19005588"
  policy_number: "BV-2026-00345"
  premium_amount: 15000000
  start_date: 2025-05-15
  expiry_date: 2026-05-15
  renewal_reminder_days: 30

Cron job chạy mỗi ngày 06:00 SGT:
  CHECK: expiry_date - today <= renewal_reminder_days
  → 2026-05-15 - 2026-04-21 = 24 ngày ≤ 30 ngày → TẠO CẢNH BÁO

NOTIFICATIONS:
  user_id: 1 (Giám đốc An)
  type: "insurance_expiry"
  title: "🔒 Bảo hiểm sắp hết hạn"
  message: "Xe 51F-1234 — Bảo Việt BV-2026-00345 hết hạn 15/05/2026 (còn 24 ngày)"
  entity_type: "insurance", entity_id: 3

  user_id: 4 (Kế toán Lan)
  title: "Bảo hiểm xe sắp hết hạn"
  message: "51F-1234 — Bảo Việt — hết hạn 15/05. Phí dự kiến: 15,000,000"

An click notification → xem chi tiết bảo hiểm → click "Gia hạn":
  → Cập nhật INSURANCE: expiry_date mới, premium mới
  → NOTIFICATION: "Đã gia hạn thành công"

Nếu KHÔNG gia hạn và expiry_date đã qua:
  INSURANCE: status → "expired"
  VEHICLE: cảnh báo trên dashboard "⚠️ Xe 51F-1234 chưa có bảo hiểm hợp lệ"
  → Không nên cho phép tạo chuyến mới cho xe hết bảo hiểm (business rule)
```

---

## SC-10: Nhắc nhở thay thế linh kiện

**Vai trò:** Hệ thống → Giám đốc An → Điều hành Minh

### Bối cảnh theo thời gian
```
WARRANTY_PARTS (id=5, vehicle_id=7):
  part_name: "Lốp trước trái"
  part_number: "MICHELIN-XZE-295"
  install_date: 2024-06-15
  expiry_date: 2026-06-15 (bảo hành 2 năm)
  replacement_cycle_km: 80000
  notes: "Kiểm tra mòn đều mỗi 20000km"

Cron check (2026-04-21):
  2026-06-15 - 2026-04-21 = 55 ngày → sắp hết hạn bảo hành
  → Tạo nhắc nhở

NOTIFICATIONS:
  user_id: 1 (Giám đốc An)
  title: "🔧 Linh kiện sắp hết hạn bảo hành"
  message: "Xe 51F-1234 — Lốp trước trái (MICHELIN-XZE-295) hết hạn bảo hành 15/06/2026 (còn 55 ngày)"

  user_id: 3 (Điều hành Minh)
  title: "Nhắc nhở thay thế linh kiện"
  message: "51F-1234 — Lốp trước trái cần lên kế hoạch thay thế"
```

### Bối cảnh theo km (nếu áp dụng)
```
Note: Km estimation sau mỗi chuyến → hệ thống tính cumulative km cho xe.
Nếu cumulative km gần đến replacement_cycle_km → nhắc nhở sớm.

Ví dụ: Lốp thay ở km=120,000, replacement_cycle=80,000km → nhắc ở km ~195,000
```

---

## SC-29: Bảng giá cước theo tuyến (ROUTE_PRICING)

**Vai trò:** Giám đốc An → Điều hành Minh → Hệ thống

### Cấu hình giá cước
```
Giám đốc An cấu hình bảng giá cước cho tuyến Cát Lái → Bình Dương:

ROUTE_PRICING:
  route_id: 3 (Cát Lái → Bình Dương)
  ┌────────────┬───────────────┐
  │ Loại xe     │ Tiền đi đường │
  ├────────────┼───────────────┤
  │ mooc_40    │ 1,150,000     │
  │ 40ft        │ 1,150,000     │
  │ 20ft        │   930,000     │
  │ mooc_20    │   930,000     │
  └────────────┴───────────────┘

ROUTE (id=3):
  toll_discount: 80,000 (giảm vé QL5)
  toll_surcharge: 0

Tuyến Cát Lái → Mộc Châu, Sơn La:
ROUTE_PRICING:
  route_id: 1, 40ft: 2,740,000, 20ft: 2,470,000
  toll_discount: 0, toll_surcharge: 0
```

### Tự động áp giá khi tạo chuyến
```
Điều hành Minh tạo chuyến:
  route_id: 3, vehicle_id: 7 (51F-1234, 40ft)

Hệ thống tự động lookup:
  ROUTE_PRICING: route_id=3 × 40ft → trip_pay = 1,150,000
  ROUTES: toll_discount = 80,000

TRIPS (id=112):
  trip_pay: 1,150,000 (auto-fill)
  toll_adjustment: -80,000

→ Cước hiển thị cho kế toán khi xuất hóa đơn
```

---

## SC-30: Báo cáo P&L theo đầu xe

**Vai trò:** Giám đốc An

### Bối cảnh tháng 4/2026, xe 15C-136.31
```
Báo cáo P&L — Xe 15C-136.31 — Tháng 4/2026
═══════════════════════════════════════

Số chuyến: 28
Tổng km: 4,200 km

DOANH THU:
  Cước vận chuyển:    85,400,000
  ────────────────────────────────
  Tổng doanh thu:     85,400,000

CHI PHÍ:
  Nhiên liệu (dầu):   32,500,000  (38%)
  Tiền đi đường:       12,200,000  (14%)
  Lương tài xế:        15,000,000  (18%)
  Sửa chữa:            3,500,000   (4%)
  Lốp:                 2,100,000   (2%)
  Dầu máy:             1,200,000   (1%)
  Khác:                  800,000   (1%)
  ────────────────────────────────
  Tổng chi phí:       67,300,000  (79%)

LỢI NHUẬN GỘP:       18,100,000  (21%)
Biên lợi nhuận:      21.2%

So với tháng trước:
  Doanh thu: ▲ +12%
  Chi phí:   ▲ +5%
  Lợi nhuận: ▲ +28%
```

Giám đốc click vào từng tháng → xem chi tiết từng chuyến:
  TR-0101: Cát Lái → BD, 40ft, cước 1,150,000, chi phí 930,000, LN 220,000
  TR-0105: Cát Lái → Sơn La, 40ft, cước 2,740,000, chi phí 3,060,000, LN -320,000 ❌

---

## SC-31: Báo cáo Aging Công nợ

**Vai trò:** Kế toán Lan → Giám đốc An

### Bảng aging tổng hợp
```
CÔNG NỢ PHẢI THU — T4/2026
═══════════════════════════════════════

Khách hàng        │ Current    │ T1         │ T2         │ T3+        │ Tổng nợ
──────────────────┼────────────┼────────────┼────────────┼────────────┼────────────
Samsung           │ 15,000,000 │            │            │            │ 15,000,000
Công ty ABC       │            │ 12,500,000 │            │            │ 12,500,000
Tân Việt Hưng     │            │            │ 18,000,000 │ 38,000,000 │ 56,000,000
Trà Thu Đan       │            │ 25,000,000 │ 40,000,000 │ 75,000,000 │ 140,000,000 ⚠️
──────────────────┼────────────┼────────────┼────────────┼────────────┼────────────
TỔNG              │ 15,000,000 │ 37,500,000 │ 58,000,000 │ 113,000,000│ 223,500,000
```

### Bảng kê chi tiết — Trà Thu Đan
```
BẢNG KÊ CHI TIẾT CÔNG NỢ — Trà Thu Đan
Số dư đầu kỳ: 140,000,000

STT │ Ngày       │ Diễn giải              │ Phát sinh Nợ │ Phát sinh Có │ Lũy kế
────┼────────────┼─────────────────────────┼──────────────┼──────────────┼──────────
1   │ 01/04/2026 │ GBN TTD2604001          │  25,000,000  │              │ 165,000,000
2   │ 15/04/2026 │ Trà Thu Đan TT T3       │              │  40,000,000  │ 125,000,000
3   │ 28/04/2026 │ GBN TTD2604002          │  18,000,000  │              │ 143,000,000

Số dư cuối kỳ: 143,000,000
Aging: T1=18M, T2=25M, T3+=100M
```

### Cảnh báo khi tạo booking cho khách nợ quá hạn
```
Điều hành tạo booking cho Trà Thu Đan:
  POST /api/v1/bookings { client_id: 12 (Trà Thu Đan) }

  → 200 OK nhưng kèm warning:
    "⚠️ Khách hàng Trà Thu Đan đang nợ 143,000,000 (T3+: 100M). Xem xét trước khi duyệt."

Giám đốc duyệt booking → thấy warning → quyết định:
  - Duyệt bình thường (khách hàng VIP, chắc chắn trả)
  - Yêu cầu thanh toán trước khi tiếp tục
```

---

## SC-32: Real-Time Dashboard — WebSocket Heartbeat

**Vai trò:** Điều hành Minh → Hệ thống

### Bối cảnh
```
Điều hành Minh mở dashboard → xem vị trí 3 xe đang chạy.

Frontend mở WebSocket connection:
  wss://api.tingting.vip/ws/dispatcher/user_3

Server accepts → client joins channels:
  - channel:vehicle_locations (GPS updates từ driver native app)
  - channel:alerts (new fraud/idle alerts)
  - channel:trip_status (status changes)
```

### Ping/Pong heartbeat
```
Mỗi 30 giây, browser gửi WebSocket PING frame:
  → Server tự động trả PONG frame (protocol level)

Nếu PONG không trả về trong 10 giây:
  → Client biết connection died
  → UI: "🔴 Disconnected — Reconnecting..."
  → Auto-reconnect attempt (exponential backoff: 1s, 2s, 4s, 8s, max 30s)
```

### Real-time updates flow
```
Tài xế Hoàng (mobile native GPS) gửi location mỗi 5 phút:
  → Server receives via POST /api/v1/gps-location
  → Server publishes to Redis: PUBLISH vehicle_locations {trip_id: 101, lat: ..., lng: ...}
  → WebSocket server picks up → pushes to all subscribers
  → Điều hành dashboard cập nhật marker trên bản đồ — NO RELOAD needed

Tài xế Tuấn dừng 45 phút:
  → Server tạo ALERT (idle)
  → Server publishes to Redis: PUBLISH alerts {alert: ...}
  → WebSocket server pushes to Minh's dashboard
  → Alert popup xuất hiện ngay — Minh không cần F5
```

### Connection fallback cascade
```
Trường hợp: Công ty dùng corporate proxy chặn WebSocket.

1. WebSocket connect fails (3 attempts) → ❌
2. Frontend fallback sang SSE:
   EventSource('/api/v1/sse/dispatcher/user_3')
   → Server push one-way: alerts, notifications, trip_status
   → Không nhận được vehicle_locations realtime (SSE không bidirectional)
   → UI: "🟡 Connected (SSE) — limited real-time"

3. Nếu SSE cũng bị chặn:
   → Fallback sang Long Polling:
   GET /api/v1/poll/dispatcher/user_3?after=1713700800
   → Server giữ request mở cho đến khi có data mới hoặc 30s timeout
   → Client gửi request mới ngay
   → UI: "🟠 Connected (Polling) — slight delay"

4. Khi WebSocket available lại:
   → Auto-upgrade: Long Polling → SSE → WebSocket
   → UI: "🟢 Connected (WebSocket)"
```

---

## SC-11: GPLX tài xế sắp hết hạn

**Vai trò:** Hệ thống → Giám đốc An → Điều hành Minh

### Bối cảnh
```
DRIVER_PROFILES (user_id=12, Hoàng):
  license_number: "B2-123456789"
  license_expiry: 2026-05-10
  phone: "0901234567"

Cron check (2026-04-21):
  2026-05-10 - 2026-04-21 = 19 ngày → cảnh báo

NOTIFICATIONS:
  user_id: 1 (An)
  title: "GPLX sắp hết hạn"
  message: "Tài xế Hoàng — GPLX B2-123456789 hết hạn 10/05/2026 (còn 19 ngày)"

  user_id: 3 (Minh)
  title: "GPLX tài xế sắp hết hạn"
  message: "Hoàng (B2-123456789) — hết hạn 10/05. Không được giao chuyến sau ngày này."

Business rule: Nếu GPLX đã hết hạn → không cho tạo chuyến mới cho tài xế đó.
```

---

## SC-12: Kế toán duyệt chi phí (chi tiết)

**Vai trò:** Kế toán Lan

### Xem danh sách chờ duyệt
```
GET /api/v1/expenses?status=pending

Response:
[
  {
    id: 501, trip_id: 101, category: "fuel", amount: 850000, liters: 15,
    driver: "Hoàng", vehicle: "51F-1234", route: "Cát Lái → BD",
    receipt_photo: "/photos/2026/04/101_fuel.jpg",
    gps: { lat: 10.740, lng: 106.730 },
    server_timestamp: "2026-04-21T08:30:00Z"
  },
  {
    id: 502, trip_id: 101, category: "toll", amount: 120000,
    driver: "Hoàng", vehicle: "51F-1234",
    receipt_photo: "/photos/2026/04/101_toll.jpg"
  }
]
```

### Duyệt
```
PUT /api/v1/expenses/501/approve
  → WORKFLOWS (id=3): event="approve" → pending → approved
  → EXPENSES (id=501): status="approved", approved_by=4
  → Chi phí tự động cộng vào tổng chi phí chuyến 101
  → Không có notification cho tài xế (chỉ khi reject mới gửi)
```

### Từ chối
```
PUT /api/v1/expenses/502/reject
  Body: { "reject_reason": "Biên lai mờ, gửi lại ảnh rõ hơn" }
  → WORKFLOWS (id=4): event="reject" → pending → rejected
  → EXPENSES (id=502): status="rejected", reject_reason="..."
  → NOTIFICATIONS → Hoàng: "Chi phí phí cầu đường 120,000 bị từ chối: Biên lai mờ, gửi lại ảnh rõ hơn"
```

---

## SC-13: Audit Log — Truy xuất nguồn gốc

**Vai trò:** Giám đốc An

### Xem audit log
```
GET /api/v1/audit-logs?entity_type=trip&entity_id=101

Response:
[
  { timestamp: "2026-04-21T07:00:00Z", user: "Minh", action: "CREATE",
    entity: "trip:101", old: null, new: "{status: received, vehicle: 7}" },
  { timestamp: "2026-04-21T07:30:00Z", user: "Hoàng", action: "UPDATE",
    entity: "trip:101", old: "{status: received}", new: "{status: empty_pickup}" },
  { timestamp: "2026-04-21T08:00:00Z", user: "System", action: "UPDATE",
    entity: "trip:101", old: "{container_code: null}", new: "{container_code: TCLU7845230}" },
  { timestamp: "2026-04-21T10:30:00Z", user: "Hoàng", action: "UPDATE",
    entity: "trip:101", old: "{status: dropped_off}", new: "{status: completed}" },
  { timestamp: "2026-04-21T14:00:00Z", user: "Lan", action: "UPDATE",
    entity: "expense:501", old: "{status: pending}", new: "{status: approved}" }
]

Lưu ý: Audit log KHÔNG được phép xóa hoặc chỉnh sửa (REQ-13.4).
Chỉ Giám đốc được quyền xem (REQ-13.3).
```

---

## SC-14: Xe thuê ngoài

**Vai trò:** Giám đốc An → Điều hành Minh → Kế toán Lan

### Đăng ký đối tác
```
EXTERNAL_VEHICLES:
  id: 1
  provider_name: "Vận tải Phương Trang"
  provider_phone: "0909876543"
  license_plate: "60C-99999"
  vehicle_type: "container_40ft"
  driver_name: "Chín"
  driver_license: "C-987654321"
  license_expiry: 2027-01-15
  insurance_doc_path: "/docs/external/insurance_60C.pdf"
  tech_inspection_doc_path: "/docs/external/inspection_60C.pdf"
  labor_contract_path: "/docs/external/contract_chin.pdf"
  is_active: true
```

### Tạo chuyến với xe thuê ngoài
```
TRIPS (id=110):
  vehicle_id: NULL (không phải xe nội bộ)
  external_vehicle_id: 1 (FK → external_vehicles)
  driver_id: NULL (không phải user hệ thống)
  ... (rest same as normal trip)

Chuyến vẫn có workflow, GPS, OCR, chi phí như bình thường.
```

### Ký nhận sản lượng cuối tháng
```
Kế toán Lan xem sản lượng xe thuê ngoài tháng 4:
  60C-99999 (Chín): 25 chuyến, 4,500km, doanh thu 45,000,000

Xuất biên bản quyết toán (BM.08.06) cho Phương Trang:
DOCUMENTS:
  doc_type: "settlement", entity_type: "external_vehicle", entity_id: 1
  file_path: "/docs/settlement/2026-04_phuongtrang.pdf"
```

---

## SC-15: Partial Payment (Thanh toán một phần)

**Vai trò:** Kế toán Lan

### Bối cảnh
```
INVOICES (id=202):
  client_id: 5 (Samsung)
  trip_ids: [108, 109, 110]
  total: 15,000,000
  status: "issued"
```

### Samsung thanh toán lần 1
```
PAYMENTS:
  id: 5
  invoice_id: 202
  amount: 10000000
  payment_method: "bank_transfer"
  reference_number: "TCB-20260425-001"

INVOICES (id=202):
  status: "partially_paid"
  paid_amount: 10000000 / 15000000
```

### Samsung thanh toán lần 2
```
PAYMENTS:
  id: 6
  invoice_id: 202
  amount: 5000000
  payment_method: "bank_transfer"
  reference_number: "TCB-20260428-002"

INVOICES (id=202):
  status: "paid"
  paid_at: 2026-04-28T10:00:00Z
```

---

## SC-16: KPI tài xế

**Vai trò:** Hệ thống → Giám đốc An

### Tính KPI
```
Tài xế Hoàng (user_id=12) — Tháng 4/2026:
  Tổng chuyến: 30
  Chuyến vi phạm: 2
    - 1x fuel_anomaly (nhiên liệu +15%)
    - 1x missing_photo (thiếu ảnh giao hàng)

KPI = (30 - 2) / 30 × 100% = 93.3%

Bảng xếp hạng tháng 4:
  1. Tuấn — 98.0% (50 chuyến, 1 vi phạm)
  2. Hoàng — 93.3% (30 chuyến, 2 vi phạm)
  3. Bình — 85.0% (20 chuyến, 3 vi phạm)
  4. Hùng — 75.0% (16 chuyến, 4 vi phạm)

Giám đốc An xem:
  → Click Bình → chi tiết vi phạm: 2x fuel_anomaly, 1x time_anomaly
    → Mỗi vi phạm kèm: chuyến, ảnh, GPS, timestamp
```

---

## SC-17: Tài xế xem thu nhập (Mobile)

**Vai trò:** Tài xế Hoàng

### Xem thu nhập hôm nay
```
Hoàng mở app → tab "Thu nhập":

┌──────────────────────────┐
│  💰 Thu nhập hôm nay     │
│  ─────────────────────── │
│  3 chuyến hoàn thành     │
│  Thu nhập cơ bản: 500,000│
│  Thưởng chuyến:  300,000 │
│  Phạt:                0  │
│  ─────────────────────── │
│  Tổng:        800,000 ₫  │
│                          │
│  Tháng này: 12,500,000 ₫ │
└──────────────────────────┘

Chi tiết:
  TR-0101: Cát Lái → BD — 100,000 ₫
  TR-0103: Cát Lái → ĐN — 120,000 ₫
  TR-0104: Bình Dương → BT — 80,000 ₫
```

---

## SC-18: Chuyến xe bị lỗi data — Resume workflow

**Vai trò:** Hệ thống

### Bối cảnh: Server crash giữa transition
```
WORKFLOWS (id=2, Trip):
  state: "at_port"
  event: "depart_port"
  attempt: 3 ← đã thử 3 lần, server crash mỗi lần

Server khởi động lại → engine scan:
  SELECT * FROM workflows WHERE attempt > 0 AND event IS NOT NULL

→ Tìm thấy id=2, attempt=3
→ Kiểm tra: attempt < MAX_RETRIES (5)?
→ Yes → tiếp tục retry
→ Instantiate TripWorkflow, set initial_state="at_port"
→ wf.send('depart_port')
→ Success → UPDATE: state="leaving_port", event=NULL, attempt=0

Nếu attempt >= MAX_RETRIES:
→ Tạo ALERT: "Workflow stuck — cần xử lý thủ công"
→ NOTIFICATIONS → admin
```

---

## SC-19: Khóa dữ liệu sau chốt sổ

**Vai trò:** Kế toán Lan → Hệ thống

### Bối cảnh
```
Sau khi chốt sổ tháng 4:

Mọi API attempt sửa dữ liệu tháng 4 bị chặn:

PUT /api/v1/trips/101 → 403 "Dữ liệu đã khóa sau chốt sổ"
PUT /api/v1/expenses/501 → 403 "Dữ liệu đã khóa sau chốt sổ"
DELETE /api/v1/trip-photos/1 → 403 "Dữ liệu đã khóa sau chốt sổ"

TRIPS tháng 4: is_locked = true
Chỉ đọc được, không sửa được.
```

---

## SC-20: Booking bị từ chối

**Vai trò:** Điều hành Minh → Giám đốc An

### Bối cảnh
```
BOOKINGS (id=3):
  booking_code: "BK-2026-0003"
  client_id: 9 (Công ty XYZ — nợ quá hạn)
  notes: "Yêu cầu vận chuyển gấp"

WORKFLOWS (id=10):
  workflow_type: "Booking", state: "pending"

Giám đốc An click "Từ chối":
WORKFLOWS (id=10): event="reject" → pending → rejected

BOOKINGS (id=3):
  status: "rejected"

Không tạo trip. Không gửi notification cho tài xế.
Điều hành Minh thấy booking bị từ chối với lý do.
```

---

## SC-21: Photo chỉ đọc sau khi upload

**Vai trò:** Hệ thống

### Bối cảnh
```
Tài xế Hoàng upload ảnh biên lai:

POST /api/v1/photos/upload → 201 Created
  TRIP_PHOTOS (id=5):
    is_readonly = true (immediately after upload)

Hoàng cố gắng xóa:
DELETE /api/v1/trip-photos/5 → 403 "Ảnh đã tải lên không thể xóa"

Hoàng cố gắng sửa:
PUT /api/v1/trip-photos/5 → 403 "Ảnh đã tải lên không thể chỉnh sửa"

Ảnh chỉ có thể xem:
GET /api/v1/trip-photos/5 → 200 (file content)
```

---

## SC-22: Khách hàng bị khóa

**Vai trò:** Giám đốc An → Điều hành Minh

### Bối cảnh
```
CLIENTS (id=9, Công ty XYZ):
  is_active: false (bị khóa do nợ quá hạn)

Điều hành Minh tạo chuyến mới:
  Select client → XYZ không hiện trong dropdown (is_active=false)

Hoặc nếu cố gắng API:
POST /api/v1/trips { client_id: 9 }
→ 400 "Khách hàng XYZ đã bị khóa. Không thể tạo chuyến mới."

XYZ vẫn xem được lịch sử giao dịch cũ (read-only).
```

---

## SC-23: Lịch sử gán tài xế

**Vai trò:** Giám đốc An

### Bối cảnh
```
DRIVER_ASSIGNMENTS:
  id: 1, vehicle_id: 7 (51F-1234), driver_id: 12 (Hoàng)
    assigned_at: 2026-01-15, unassigned_at: NULL, reason: "Bàn giao đầu năm"

  id: 2, vehicle_id: 7 (51F-1234), driver_id: 13 (Bình)
    assigned_at: 2025-06-01, unassigned_at: 2025-12-31, reason: "Bình chuyển sang xe khác"

  id: 3, vehicle_id: 7 (51F-1234), driver_id: 14 (Tuấn)
    assigned_at: 2025-01-10, unassigned_at: 2025-05-30, reason: "Tuấn nghỉ việc"

Giám đốc An xem chi tiết xe 51F-1234:
  → "Tài xế hiện tại: Hoàng (từ 15/01/2026)"
  → "Lịch sử: Tuấn (01/2025-05/2025) → Bình (06/2025-12/2025) → Hoàng (01/2026-nay)"
```

---

## SC-24: Dashboard Giám đốc

**Vai trò:** Giám đốc An

### Widgets hiển thị
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  Xe chạy: 8 │  Xe rảnh: 3 │  Sửa chữa:1 │  Mồ côi: 2  │
│  ▲ +2       │  ▼ -1       │  —          │  ⚠️          │
└─────────────┴─────────────┴─────────────┴─────────────┘

┌───────────────────────────┬───────────────────────────┐
│  Doanh thu vs Chi phí     │  Fleet Utilization        │
│  ▓▓▓▓▓▓▓░░░ Revenue      │  █ Running  67%           │
│  ▓▓▓▓░░░░░░ Cost         │  ░ Idle     25%           │
│  ▓▓▓░░░░░░░ Profit       │  ▒ Maint.    8%           │
│  [Hôm nay / Tuần / Tháng]│                           │
└───────────────────────────┴───────────────────────────┘

┌───────────────────────────┬───────────────────────────┐
│  Top 5 Tài xế (KPI)      │  Cảnh báo chưa xử lý      │
│  1. Tuấn  98.0% ✅        │  ⚠️ Fuel anomaly TR-102   │
│  2. Hoàng 93.3% ✅        │  ⚠️ Idle 45min TR-107    │
│  3. Bình  85.0% ⚠️        │  ⚠️ Time anomaly TR-103  │
│  4. Hùng  75.0% ❌        │  [Xem tất cả →]           │
└───────────────────────────┴───────────────────────────┘
```

---

## SC-25: Self-loop Event (Timeout không block)

**Vai trò:** Hệ thống

### Bối cảnh
```
TRIPS (id=107):
  status: "en_route"
  en_route đã 60 phút, expected 90 phút → chưa phải time_anomaly

Cron check mỗi 15 phút cho tất cả en_route trips:
  → Kiểm tra elapsed time vs expected
  → Nếu elapsed > expected × 1.5 → tạo alert

WORKFLOWS (id=7):
  workflow_type: "Trip", state: "en_route"
  event: "timeout_check", attempt: 1

Engine:
  wf.send('timeout_check') → self-loop (state stays "en_route")
  Side effect trong transition function:
    → Kiểm tra elapsed > expected × 1.5?
    → No → nothing happens
    → Yes → tạo ALERT + NOTIFICATION

  Sau khi chạy xong:
  UPDATE: event=NULL, attempt=0 (self-loop thành công, state không đổi)
```

---

## SC-26: Người dùng bị khóa tài khoản

**Vai trò:** Giám đốc An

### Bối cảnh
```
USERS (id=15, Tài xế Hùng):
  is_active: true → Giám đốc An khóa → is_active: false

AUDIT_LOGS:
  user_id: 1 (An), action: "UPDATE"
  entity_type: "user", entity_id: 15
  old: "{is_active: true}"
  new: "{is_active: false}"

Hùng cố gắng đăng nhập:
  POST /api/v1/auth/login { username: "hung", password: "***" }
  → 403 "Tài khoản đã bị khóa. Liên hệ quản lý."

Nếu Hùng đang có chuyến en_route:
  → Chuyến vẫn tiếp tục (không interrupt)
  → Nhưng không nhận chuyến mới
```

---

## SC-27: Φòng vé — DO / EIR Management

**Vai trò:** Điều hành Minh

### Bối cảnh
```
Booking đã duyệt (BK-2026-0001) → cần lấy DO và EIR:

DELIVERY_ORDERS:
  id: 1
  booking_id: 1
  do_number: "MAEU-123456-001"
  eir_number: "EIR-CATLAI-2026-000789"
  container_type: "40ft"
  container_code: "TCLU7845230" (sau khi OCR)
  notes: "Lấy vỏ tại bãi Cát Lái, khu B"

Điều hành Minh nhập DO từ hãng tàu:
  → Lưu vào DELIVERY_ORDERS
  → Liên kết với BOOKING

Khi tài xế đến cảng → Minh có thể xem DO/EIR để hướng dẫn.
```

---

## SC-28: Định mức xăng dầu — Ma trận

**Vai trò:** Giám đốc An

### Cấu hình
```
ROUTE_FUEL_QUOTAS:
  route_id: 3 (Cát Lái → BD), vehicle_type: "20ft",   liters_per_km: 0.25
  route_id: 3 (Cát Lái → BD), vehicle_type: "40ft",   liters_per_km: 0.35
  route_id: 3 (Cát Lái → BD), vehicle_type: "40ft_hc", liters_per_km: 0.38
  route_id: 5 (Cát Lái → ĐN), vehicle_type: "20ft",   liters_per_km: 0.28
  route_id: 5 (Cát Lái → ĐN), vehicle_type: "40ft",   liters_per_km: 0.38
  route_id: 5 (Cát Lái → ĐN), vehicle_type: "40ft_hc", liters_per_km: 0.42

Khi tạo trip:
  route_id + vehicle_type → lookup ROUTE_FUEL_QUOTAS → auto-fill TRIP_FUEL_QUOTAS
```

---

*Tổng: 32 kịch bản — bao phủ toàn bộ main flows, edge cases, fraud detection, offline, workflow engine, reminders, pricing, P&L, aging, real-time, và error handling.*
