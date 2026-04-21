# TTransport — User Stories

## Epic 1: Authentication & User Management

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-1.1 | Đăng nhập bằng username/password | Tất cả | P0 |
| US-1.2 | Đổi mật khẩu | Tất cả | P0 |
| US-1.3 | Quên mật khẩu (reset qua email/phone) | Tất cả | P1 |
| US-1.4 | Tạo tài khoản nhân viên mới | Giám đốc | P0 |
| US-1.5 | Phân quyền theo vai trò (Giám đốc, Điều hành, Kế toán, Tài xế) | Giám đốc | P0 |
| US-1.6 | Khóa/mở khóa tài khoản | Giám đốc | P1 |
| US-1.7 | Xem audit log (ai làm gì, khi nào) | Giám đốc | P1 |
| US-1.8 | Phiên đăng nhập hết hạn sau thời gian quy định, yêu cầu đăng nhập lại | Hệ thống | P1 |

## Epic 2: Fleet & Vehicle Management

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-2.1 | Thêm/sửa/xóa đầu xe (biển số, loại xe, hãng, năm sản xuất, trạng thái) | Giám đốc | P0 |
| US-2.2 | Xem danh sách xe & trạng thái (đang chạy/bãi/sửa chữa/ngưng hoạt động) | Giám đốc, Điều hành | P0 |
| US-2.3 | Gán tài xế vào đầu xe (một xe một tài xế chính) | Giám đốc, Điều hành | P0 |
| US-2.4 | Xem lịch sử gán tài xế theo đầu xe | Giám đốc | P1 |
| US-2.5 | Lịch sử bảo dưỡng xe | Giám đốc | P1 |
| US-2.6 | Xem vị trí xe real-time trên bản đồ | Giám đốc, Điều hành | P1 |
| US-2.7 | Theo dõi linh kiện bảo hành theo từng xe (tên linh kiện, ngày lắp, hạn bảo hành) | Giám đốc | P1 |
| US-2.8 | Nhận thông báo nhắc nhở thay thế linh kiện (theo thời gian hoặc số km) | Giám đốc, Điều hành | P1 |
| US-2.9 | Quản lý thông tin bảo hiểm xe (nhà cung cấp, số hợp đồng, phí, hạn) | Giám đốc, Kế toán | P1 |
| US-2.10 | Nhận thông báo gia hạn bảo hiểm trước khi hết hạn | Giám đốc, Kế toán | P1 |
| US-2.11 | Tính actual_distance_km = haversine sum of GPS_LOG (30s intervals) sau mỗi chuyến; so với ROUTES.distance_km | Hệ thống | P1 |

## Epic 3: Client Management (Khách hàng / Chủ hàng)

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-3.1 | Thêm/sửa/xóa khách hàng (tên công ty, mã số thuế, địa chỉ, liên hệ) | Giám đốc, Điều hành | P0 |
| US-3.2 | Cấu hình điều khoản thanh toán cho từng khách hàng (net 15/30/45) | Giám đốc, Kế toán | P1 |
| US-3.3 | Khóa/mở khóa khách hàng (ngừng tạo chuyến mới nhưng giữ lịch sử) | Giám đốc | P1 |
| US-3.4 | Xem lịch sử giao dịch với khách hàng (chuyến, hóa đơn, công nợ) | Giám đốc, Kế toán, Điều hành | P1 |

## Epic 4: Driver Profile & Assignment

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-4.1 | Quản lý hồ sơ tài xế (số GPLX, ngày hết hạn GPLX, SĐT, liên hệ khẩn cấp) | Giám đốc | P0 |
| US-4.2 | Cảnh báo GPLX sắp hết hạn | Giám đốc, Điều hành | P1 |
| US-4.3 | Xem danh sách tài xế và xe đang gán | Giám đốc, Điều hành | P0 |

## Epic 5: Route & Quota Management

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-5.1 | CRUD tuyến đường (điểm đi, điểm đến, quãng đường, thời gian dự kiến, giảm vé, phụ phí vé) | Điều hành | P0 |
| US-5.1b | Cấu hình geofence zones cho tuyến: depot (lat, lng, radius), port, destination | Điều hành, Giám đốc | P0 |
| US-5.2 | Cấu hình định mức xăng dầu theo ma trận xe × tải trọng (5 mức: empty/loaded_light/loaded_heavy/cargo_heavy/cargo_light) — L/100km | Giám đốc | P1 |
| US-5.2b | Ghi đè định mức xăng dầu cho từng chuyến (kèm lý do, vd: xe cũ, đường sửa) | Điều hành | P1 |
| US-5.3 | So sánh chi phí thực tế (nhiên liệu, thời gian) với định mức tuyến đường (dựa trên load_type) | Hệ thống | P1 |
| US-5.3b | Tính actual_distance_km = running haversine total (on each GPS point arrival); so với ROUTES.distance_km → flag lệch tuyến >15% ngay lập tức | Hệ thống | P0 |
| US-5.3c | GPS logging: chỉ log point nếu moved >50m hoặc heading change >15°, mandatory mỗi 2 phút | Hệ thống | P0 |
| US-5.4 | Cấu hình bảng giá cước: tuyến × loại xe → tiền đi đường (mooc 40', 40', 20', mooc 20') | Giám đốc | P0 |
| US-5.5 | Chọn load_type khi tạo chuyến (empty/loaded_light/loaded_heavy) → tự áp đúng định mức | Điều hành | P1 |
| US-5.6 | Cấu hình phụ bổ sung định mức theo tuyến (vd: Mộc Châu +3L/100km) | Giám đốc | P2 |

## Epic 6: Booking & Trip Lifecycle

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-6.1 | Tạo booking / lệnh vận chuyển từ yêu cầu khách hàng | Điều hành | P0 |
| US-6.2 | Phê duyệt booking / lệnh vận chuyển | Giám đốc | P0 |
| US-6.3 | Tạo chuyến xe từ booking đã duyệt (gán xe, tài xế, tuyến, chủ hàng) — validate xe rảnh | Điều hành | P0 |
| US-6.4 | Gán chủ hàng cho chuyến — hoặc đánh dấu 'Chưa rõ Chủ hàng' | Điều hành | P0 |
| US-6.5 | Nhận ca / xác nhận chuyến trên Mobile | Tài xế | P0 |
| US-6.6 | Cập nhật trạng thái chuyến: 4 manual checkpoints (Nhận ca, Chụp container, Chụp giao hàng, Hạ bãi) + 4 auto geofence (Lấy rỗng, Cảng, Rời cảng, Đến nơi) | Tài xế + Hệ thống | P0 |
| US-6.7 | Ghi nhận loại container (20ft/40ft/45ft/high cube) trong chuyến | Điều hành, Tài xế | P0 |
| US-6.8 | Xem chi tiết chuyến (timeline 8 bước, ảnh, chi phí, GPS) | Giám đốc, Điều hành, Kế toán | P0 |
| US-6.9 | Tài xế xem chi tiết chuyến của mình (timeline, chi phí đã khai) | Tài xế | P0 |
| US-6.10 | Xem lịch sử chuyến xe (lọc theo trạng thái, tài xế, xe, khách hàng, ngày) | Tất cả (phạm vi vai trò) | P0 |
| US-6.11 | Lịch sử trạng thái chuyến kèm mốc thời gian từng bước và GPS | Hệ thống | P0 |
| US-6.12 | Tự động ghi nhận start_time, end_time, actual_distance_km khi hoàn thành | Hệ thống | P0 |

## Epic 7: OCR & Photo Management

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-7.1 | Chụp ảnh container tại điểm nhận và điểm giao | Tài xế | P0 |
| US-7.2 | AI OCR tự động nhận diện mã container (11 ký tự) từ ảnh | Tài xế | P0 |
| US-7.3 | Nhập mã container thủ công khi OCR thất bại | Tài xế | P0 |
| US-7.4 | Chụp ảnh biên lai cho mọi khoản chi phí phát sinh dọc đường | Tài xế | P0 |
| US-7.5 | Mỗi ảnh đính kèm tọa độ GPS + thời gian máy chủ (không dùng giờ điện thoại) | Hệ thống | P0 |
| US-7.6 | Ảnh đã tải lên không cho chỉnh sửa/xóa (chỉ đọc) | Hệ thống | P0 |
| US-7.7 | Ảnh gốc được lưu trữ làm tài liệu chứng minh | Hệ thống | P0 |

## Epic 8: Expense Management

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-8.1 | Khai báo chi phí dọc đường (7 loại: fuel/toll/repair/tires/engine_oil/salary/other, số tiền, mô tả, ảnh biên lai) | Tài xế | P0 |
| US-8.2 | Khai báo đổ dầu riêng (số lít, số tiền, ảnh biên lai) | Tài xế | P0 |
| US-8.3 | Duyệt hoặc từ chối chi phí (kèm lý do từ chối) | Kế toán, Điều hành | P0 |
| US-8.4 | Chi phí bị từ chối → tài xế nhận thông báo kèm lý do | Hệ thống → Tài xế | P1 |
| US-8.5 | Chi phí đã duyệt tự động cộng vào tổng chi phí chuyến | Hệ thống | P0 |
| US-8.6 | Khai báo chi phí sửa chữa, thay lốp, dầu máy (không chỉ nhiên liệu & cầu đường) | Tài xế, Kế toán | P1 |
| US-8.7 | Xem chi phí chi tiết theo 7 loại: Dầu + Cầu đường + Sửa chữa + Lốp + Dầu máy + Lương lx + Khác | Kế toán, Giám đốc | P1 |

## Epic 9: Fraud Detection & Alerts

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-9.1 | Cảnh báo thời gian thực > 150% thời gian dự kiến theo tuyến (nghi ngờ câu giờ) | Hệ thống → Điều hành | P0 |
| US-9.2 | Cảnh báo chênh lệch nhiên liệu > 10% so với định mức (dựa trên load_type, không phải định mức cố định) | Hệ thống → Điều hành, Kế toán | P0 |
| US-9.3 | Cảnh báo dừng đỗ > 45 phút (tự động) | Hệ thống → Điều hành | P0 |
| US-9.4 | Cảnh báo lệch tuyến đường | Hệ thống → Điều hành | P2 |
| US-9.5 | Xem danh sách cảnh báo & trạng thái xử lý | Giám đốc, Điều hành | P0 |
| US-9.6 | Xử lý cảnh báo: ghi nhận vi phạm (ảnh hưởng KPI) hoặc bỏ qua, kèm ghi chú | Điều hành | P0 |
| US-9.7 | Cảnh báo tắt GPS/định vị >1h — từ lần 3 phạt 500,000đ | Hệ thống → Điều hành | P1 |
| US-9.8 | Cảnh báo lái xe >4h liên tục không thay thẻ — từ lần 3 phạt 500,000đ | Hệ thống → Điều hành | P1 |
| US-9.9 | Cảnh báo không nộp phiếu hạ vỏ/hàng — phạt 100,000đ | Hệ thống → Điều hành | P1 |
| US-9.10 | Cấu hình quy định phạt nội quy (PENALTY_RULES): loại vi phạm, mức phạt, ngưỡng lần (vd: từ lần 3) | Giám đốc | P1 |
| US-9.11 | Tự động phạt khi vi phạm lần thứ N (occurrence_threshold) — auto-deduct từ lương | Hệ thống | P1 |
| US-9.12 | Cảnh báo duplicate container code — informational, không block trip | Hệ thống → Điều hành | P2 |
| US-9.13 | Warning khi tạo chuyến cho tuyến × loại xe chưa có định mức xăng dầu | Hệ thống → Điều hành | P1 |

## Epic 10: Orphan Trip & Period Close

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-10.1 | Chuyến 'Chưa rõ Chủ hàng' hiển thị cảnh báo màu cam | Hệ thống | P0 |
| US-10.2 | Kế toán gán đúng chủ hàng cho chuyến mồ côi | Kế toán | P0 |
| US-10.3 | KHÔNG CHO PHÉP chốt sổ nếu còn chuyến mồ côi chưa gán chủ hàng | Hệ thống → Kế toán | P0 |
| US-10.4 | Hiển thị số chuyến mồ côi trên dashboard Kế toán và Giám đốc | Hệ thống | P0 |
| US-10.5 | Sau chốt sổ, dữ liệu chuyến bị khóa (chỉ đọc), không sửa đổi | Hệ thống → Kế toán | P0 |

## Epic 11: Accounting & Invoicing

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-11.1 | Xem danh sách chuyến hoàn thành, nhóm theo chủ hàng | Kế toán | P0 |
| US-11.2 | Chi tiết chi phí mỗi chuyến: Dầu + Cầu đường + Sửa chữa + Lốp + Dầu máy + Lương lx + Khác | Kế toán | P0 |
| US-11.3 | Bảng công nợ theo chủ hàng: Tổng, Đã thanh toán, Chưa thanh toán | Kế toán, Giám đốc | P0 |
| US-11.4 | Ghi nhận thanh toán (một phần hoặc toàn bộ, nhiều đợt) cho từng nhóm chuyến | Kế toán | P0 |
| US-11.5 | Gom chuyến cùng chủ hàng → xuất hóa đơn PDF (số hóa đơn, ngày, file) | Kế toán | P0 |
| US-11.6 | Xem doanh thu / chi phí tổng hợp | Giám đốc | P1 |
| US-11.7 | Báo cáo P&L theo đầu xe: Cước vận chuyển - Tổng chi phí (7 loại) = Lợi nhuận gộp | Giám đốc | P1 |
| US-11.8 | Báo cáo aging công nợ: phân loại theo số tháng quá hạn (Current/T1/T2/T3/T4+) | Kế toán, Giám đốc | P1 |
| US-11.9 | Bảng kê chi tiết công nợ theo khách hàng (phát sinh Nợ/Có, lũy kế, GBN) | Kế toán | P1 |
| US-11.10 | Khóa tự động hoặc cảnh báo khách hàng nợ quá hạn khi tạo booking mới | Hệ thống | P2 |
| US-11.11 | Bảng giá cước tự động áp cho chuyến từ ROUTE_PRICING (tuyến × loại xe) | Hệ thống | P0 |

## Epic 12: Driver KPI & Payroll

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-12.1 | Tự động thống kê vi phạm theo loại: Gian lận nhiên liệu, Bất thường thời gian, Thiếu chứng từ | Hệ thống | P1 |
| US-12.2 | Điểm KPI = (Tổng chuyến - Số chuyến vi phạm) / Tổng chuyến × 100% | Hệ thống | P1 |
| US-12.3 | Giám đốc xem bảng xếp hạng tài xế theo điểm KPI | Giám đốc | P1 |
| US-12.4 | Chi tiết từng vi phạm hiển thị kèm bằng chứng (ảnh, thời gian, GPS) | Giám đốc, Điều hành | P1 |
| US-12.5 | Tính lương tài xế (lương cơ bản + tiền đi đường + thưởng/phạt theo PENALTY_RULES) | Hệ thống → Kế toán | P1 |
| US-12.6 | Tài xế xem thu nhập hôm nay trên Mobile | Tài xế | P1 |
| US-12.7 | Tài xế xem lịch sử lương | Tài xế | P2 |
| US-12.8 | Giám đốc xếp hạng tài xế (top 5 / bottom 5) | Giám đốc | P2 |

## Epic 13: Dashboard & Reporting

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-13.1 | Dashboard Giám đốc: Tổng quan đội xe, doanh thu/chi phí/lợi nhuận, chuyến mồ côi, cảnh báo chưa duyệt, xếp hạng KPI, aging công nợ tổng hợp | Giám đốc | P0 |
| US-13.2 | Dashboard Điều hành: Chuyến đang thực hiện, cảnh báo chờ duyệt, timeline chi tiết | Điều hành | P0 |
| US-13.3 | Dashboard Kế toán: Chi phí chờ duyệt, tóm tắt công nợ + aging (T1-T4+), chuyến mồ côi cần gán | Kế toán | P0 |
| US-13.4 | Dashboard Tài xế (mobile): Chuyến được giao, cập nhật tiến trình, gửi chi phí, thu nhập hôm nay | Tài xế | P0 |
| US-13.5 | TAT (Turn-Around Time) trung bình | Giám đốc | P1 |
| US-13.6 | Bảng xếp hạng 5 tài xế xuất sắc nhất / 5 xe hiệu quả nhất | Giám đốc | P2 |
| US-13.7 | Xuất báo cáo Excel/PDF | Giám đốc, Kế toán | P2 |
| US-13.8 | Báo cáo P&L theo đầu xe (tháng/chọn khoảng thời gian): Cước - Dầu - Đi đường - Lương - SC - Lốp - Dầu máy = Lợi nhuận gộp | Giám đốc | P1 |

## Epic 14: Mobile App (Driver — Capacitor Native)

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-14.1 | Đăng nhập bằng tài khoản tài xế | Tài xế | P0 |
| US-14.2 | Xem chuyến được giao | Tài xế | P0 |
| US-14.3 | Cập nhật tiến trình chuyến (8 trạng thái) | Tài xế | P0 |
| US-14.4 | Chụp ảnh container (pickup/delivery) qua Capacitor Camera | Tài xế | P0 |
| US-14.5 | Quét OCR mã container | Tài xế | P0 |
| US-14.6 | Khai báo đổ dầu (lít + tiền + ảnh biên lai) | Tài xế | P0 |
| US-14.7 | Khai báo chi phí phát sinh + ảnh biên lai | Tài xế | P0 |
| US-14.8 | Hoạt động offline — IndexedDB queue, tự đồng bộ khi có mạng | Tài xế | P0 |
| US-14.9 | Background GPS tracking qua native plugin — gửi vị trí mỗi 30 giây từ empty_pickup đến completed, kể cả khi screen off | Tài xế | P0 |
| US-14.10 | START tracking: "Nhận ca" → empty_pickup → native plugin start(); STOP: completed → stop() | Tài xế | P0 |
| US-14.11 | iOS: Request "Always Allow" location permission cho background tracking | Tài xế | P0 |
| US-14.12 | Geofence auto-status: GPS enters/exits depot/port/destination → auto transition trip status | Hệ thống | P0 |
| US-14.13 | Driver UI: chỉ 4 checkpoint buttons (Nhận ca, Chụp container, Chụp giao hàng, Hạ bãi), các bước khác auto | Tài xế | P0 |
| US-14.12 | Xem thu nhập hôm nay | Tài xế | P1 |
| US-14.13 | Nhận push notification (cảnh báo, từ chối chi phí, nhắc nhở) qua Capacitor Push | Tài xế | P1 |
| US-14.14 | Xem lịch sử vị trí chuyến trên bản đồ (đối soát sau chuyến) | Điều hành, Giám đốc | P1 |

## Epic 18: Real-Time Dashboard Updates

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-18.1 | Polling 30s cập nhật vị trí xe trên bản đồ + GPS trail cho tất cả chuyến đang chạy | Điều hành, Giám đốc | P0 |
| US-18.2 | Connection state indicator: 🟢 Online / 🔴 Offline (dựa trên navigator.onLine) | Hệ thống | P1 |
| US-18.3 | Auto-pause polling khi offline, auto-resume khi online trở lại | Hệ thống | P1 |
| US-18.4 | Cache GPS response 30s trên server (Redis) — tránh DB hit khi nhiều user mở dashboard | Hệ thống | P2 |
| US-18.5 | Driver heartbeat POST mỗi 2 phút khi KHÔNG có active trip (idle/no assignment) → track last_heartbeat_at | Tài xế | P1 |
| US-18.6 | Driver status on dashboard: 🟢 Tracking / 🟡 Idle Online / 🔴 Offline / ⚫ Off Duty | Điều hành, Giám đốc | P1 |
| US-18.7 | Route deviation alert: actual_distance_km >15% so với ROUTES.distance_km → cảnh báo lệch tuyến | Hệ thống → Điều hành | P0 |
| US-18.8 | GPS_LOG partitioned tables by month (GPS_LOG_YYYYMM) — drop old partitions instantly | Hệ thống | P2 |
| US-18.9 | Post-trip compression: Douglas-Peucker simplify + gzip → single TRIP_PATHS row, delete raw GPS_LOG | Hệ thống | P1 |
| US-18.10 | Cold storage: move compressed paths to S3 after 3 months, keep primary DB lean | Hệ thống | P2 |
| US-18.11 | Coordinate precision: DECIMAL(9,5) — 5 decimal places sufficient for mapping and audit | Hệ thống | P2 |
| US-18.12 | DB index on (trip_id, server_timestamp) for each GPS_LOG partition | Hệ thống | P1 |

## Epic 19: Document & File Storage (DigitalOcean Spaces)

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-19.1 | Upload photos/documents to DigitalOcean Spaces via backend API (không public) | Hệ thống | P0 |
| US-19.2 | Generate presigned URL (15 min) khi user cần xem ảnh/document | Hệ thống | P0 |
| US-19.3 | DB stores storage_key only, never public URL | Hệ thống | P0 |
| US-19.4 | File validation: size limits (photo 10MB, doc 25MB), type whitelist (jpeg, png, pdf) | Hệ thống | P1 |
| US-19.5 | Permission check: user phải có quyền truy cập entity trước khi lấy presigned URL | Hệ thống | P1 |
| US-19.6 | GPS archives stored in Spaces (cold storage), not in primary DB | Hệ thống | P2 |
| US-19.7 | Document auto-delete sau retention period (1/3/5 năm) — cron job cleanup Spaces + DB | Hệ thống | P2 |
| US-19.8 | Geofence status transition yêu cầu 2 consecutive GPS readings — chống false trigger | Hệ thống | P0 |
| US-19.9 | Status regression blocked — workflow engine không cho backward transition | Hệ thống | P0 |

## Epic 15: Notifications & Reminders

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-15.1 | Nhận thông báo trong ứng dụng (cảnh báo vi phạm, từ chối chi phí) | Tất cả | P0 |
| US-15.2 | Nhắc nhở thay thế linh kiện (theo thời gian hoặc km) | Giám đốc, Điều hành | P1 |
| US-15.3 | Nhắc nhở gia hạn bảo hiểm trước khi hết hạn | Giám đốc, Kế toán | P1 |
| US-15.4 | Nhắc nhở GPLX sắp hết hạn | Giám đốc, Điều hành | P1 |
| US-15.5 | Đánh dấu thông báo đã đọc / xem lịch sử thông báo | Tất cả | P1 |

## Epic 16: External Vehicle & Provider Management

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-16.1 | Đăng ký đối tác vận tải (nhà cung cấp xe thuê ngoài) | Giám đốc | P1 |
| US-16.2 | Quản lý hồ sơ năng lực xe thuê (đăng ký, kiểm định, bảo hiểm, GPLX, HĐLĐ) | Giám đốc, Điều hành | P1 |
| US-16.3 | Tạo lệnh giao hàng cho xe thuê ngoài | Điều hành | P1 |
| US-16.4 | Gán xe thuê ngoài vào chuyến (thay vì xe nội bộ) | Điều hành | P1 |
| US-16.5 | Theo dõi sản lượng xe thuê ngoài, ký nhận cuối tháng | Kế toán | P1 |
| US-16.6 | Phổ biến nội quy an toàn cho đơn vị thuê ngoài | Điều hành | P2 |

## Epic 17: Document & Workflow Management (QT.08)

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-17.1 | Tạo booking / lệnh vận chuyển từ yêu cầu khách hàng (BM.08.01a) | Điều hành | P0 |
| US-17.2 | Phê duyệt booking / lệnh vận chuyển | Giám đốc | P0 |
| US-17.3 | Quản lý phiếu xe chạy điện tử (thay BM.08.02 giấy) | Tài xế | P0 |
| US-17.4 | Quản lý DO (Delivery Order) và EIR (Equipment Interchange Receipt) | Điều hành | P1 |
| US-17.5 | Quản lý biên bản bàn giao hàng hóa (BM.08.04) | Tài xế, Điều hành | P1 |
| US-17.6 | Biên bản xác nhận sản lượng (BM.08.05) | Điều hành | P1 |
| US-17.7 | Lập biên bản quyết toán sản lượng (BM.08.06) | Kế toán, Điều hành | P1 |
| US-17.8 | Lập đề nghị thanh toán (BM.08.07) | Kế toán | P1 |
| US-17.9 | Quản lý chứng từ Hải quan (tờ khai xuất/nhập khẩu) | Điều hành | P2 |
| US-17.10 | Bàn giao tài liệu cho khách hàng, xác nhận nhận đủ | Điều hành | P2 |
| US-17.11 | Lưu trữ chứng từ theo thời gian quy định (5 năm/1 năm) | Hệ thống | P2 |
