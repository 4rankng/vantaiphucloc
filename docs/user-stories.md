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

## Epic 2: Fleet & Vehicle Management

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-2.1 | Thêm/sửa/xóa đầu xe | Giám đốc | P0 |
| US-2.2 | Xem danh sách xe & trạng thái (đang chạy/bãi/sửa chữa) | Giám đốc, Điều hành | P0 |
| US-2.3 | Gán tài xế vào đầu xe | Giám đốc, Điều hành | P0 |
| US-2.4 | Lịch sử bảo dưỡng xe | Giám đốc | P1 |
| US-2.5 | Xem vị trí xe real-time trên bản đồ | Giám đốc, Điều hành | P1 |
| US-2.6 | Theo dõi linh kiện bảo hành theo từng xe | Giám đốc | P1 |
| US-2.7 | Nhận thông báo nhắc nhở thay thế linh kiện | Giám đốc, Điều hành | P1 |
| US-2.8 | Quản lý thông tin bảo hiểm xe và hạn gia hạn | Giám đốc, Kế toán | P1 |

## Epic 3: Trip Management

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-3.1 | Tạo chuyến xe mới (gán xe, tài xế, lộ trình) | Điều hành | P0 |
| US-3.2 | Gán chủ hàng cho chuyến | Điều hành | P0 |
| US-3.3 | Nhận ca / xác nhận chuyến trên Mobile | Tài xế | P0 |
| US-3.4 | Cập nhật trạng thái chuyến (đi, dừng, đến, hoàn thành) | Tài xế | P0 |
| US-3.5 | Chụp ảnh container tại cảng (pickup/delivery) | Tài xế | P0 |
| US-3.6 | AI OCR đọc mã container từ ảnh | Tài xế | P0 |
| US-3.7 | Khai báo đổ dầu (lít, số tiền, ảnh biên lai) | Tài xế | P0 |
| US-3.8 | Khai báo chi phí dọc đường (cầu đường, vá lốp, etc.) | Tài xế | P0 |
| US-3.9 | Xem lịch sử chuyến xe | Tất cả | P0 |
| US-3.10 | Phát hiện "chuyến xe mồ côi" (không có chủ hàng) | Hệ thống | P0 |
| US-3.11 | Khóa chốt sổ nếu còn chuyến mồ côi | Hệ thống → Kế toán | P0 |
| US-3.12 | Xem chi tiết chuyến (timeline, ảnh, chi phí) | Giám đốc, Điều hành, Kế toán | P0 |

## Epic 4: Violation & Alert System

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-4.1 | Cảnh báo dừng đỗ > 45 phút (tự động) | Hệ thống → Điều hành | P0 |
| US-4.2 | Cảnh báo hụt dầu > 10% so với định mức (tự động) | Hệ thống → Điều hành, Kế toán | P0 |
| US-4.3 | Cảnh báo lệch tuyến đường | Hệ thống → Điều hành | P2 |
| US-4.4 | Xem danh sách cảnh báo & trạng thái xử lý | Giám đốc, Điều hành | P0 |
| US-4.5 | Xử lý cảnh báo (ghi nhận, phạt, bỏ qua) | Điều hành | P0 |
| US-4.6 | Mọi bằng chứng có ảnh + timestamp không chỉnh sửa | Hệ thống | P0 |

## Epic 5: Financial & Accounting

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-5.1 | Xem danh sách chuyến hoàn thành kèm chi phí | Kế toán | P0 |
| US-5.2 | Duyệt chi phí dọc đường (biên lai cầu đường, vá lốp) | Kế toán, Điều hành | P0 |
| US-5.3 | Gom chuyến theo chủ hàng để xuất hóa đơn điện tử | Kế toán | P0 |
| US-5.4 | Xem công nợ chủ hàng (đã thu / chưa thu) | Kế toán, Giám đốc | P0 |
| US-5.5 | Đánh dấu đã thu tiền | Kế toán | P0 |
| US-5.6 | Xem doanh thu / chi phí tổng hợp | Giám đốc | P1 |
| US-5.7 | Xem lãi ròng từng đầu xe | Giám đốc | P1 |

## Epic 6: Driver KPI & Payroll

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-6.1 | Tự động tính điểm KPI tài xế dựa trên vi phạm | Hệ thống | P1 |
| US-6.2 | Tính lương tài xế (lương cơ bản + chuyến + thưởng/phạt) | Hệ thống → Kế toán | P1 |
| US-6.3 | Tài xế xem thu nhập hôm nay trên Mobile | Tài xế | P1 |
| US-6.4 | Tài xế xem lịch sử lương | Tài xế | P2 |
| US-6.5 | Giám đốc xếp hạng tài xế (top 5 / bottom 5) | Giám đốc | P2 |

## Epic 7: Dashboard & Reporting

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-7.1 | Dashboard real-time: xe chạy / rỗng / nằm bãi | Giám đốc | P0 |
| US-7.2 | Dashboard doanh thu / chi phí / lợi nhuận theo thời gian | Giám đốc | P1 |
| US-7.3 | TAT (Turn-Around Time) trung bình | Giám đốc | P1 |
| US-7.4 | Bảng xếp hạng 5 tài xế xuất sắc nhất | Giám đốc | P2 |
| US-7.5 | Bảng xếp hạng 5 xe hiệu quả nhất | Giám đốc | P2 |
| US-7.6 | Xuất báo cáo Excel/PDF | Giám đốc, Kế toán | P2 |

## Epic 8: Mobile App (Driver)

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-8.1 | Đăng nhập bằng tài khoản tài xế | Tài xế | P0 |
| US-8.2 | Xem chuyến được giao | Tài xế | P0 |
| US-8.3 | Cập nhật tiến trình chuyến | Tài xế | P0 |
| US-8.4 | Chụp ảnh container (pickup/delivery) | Tài xế | P0 |
| US-8.5 | Quét OCR mã container | Tài xế | P0 |
| US-8.6 | Khai báo đổ dầu + chụp biên lai | Tài xế | P0 |
| US-8.7 | Khai báo chi phí phát sinh + chụp biên lai | Tài xế | P0 |
| US-8.8 | Hoạt động offline — tự đồng bộ khi có mạng | Tài xế | P0 |
| US-8.9 | Xem thu nhập hôm nay | Tài xế | P1 |
| US-8.10 | Nhận thông báo cảnh báo | Tài xế | P1 |

## Epic 9: Route & Quota Management

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-9.1 | Quản lý danh mục tuyến đường và định mức đi đường | Điều hành | P1 |
| US-9.2 | Cấu hình định mức xăng dầu theo tuyến và loại xe | Giám đốc | P1 |
| US-9.3 | So sánh quãng đường thực tế với định mức tuyến đường | Hệ thống | P1 |

## Epic 10: External Vehicle & Provider Management

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-10.1 | Đăng ký đối tác vận tải (nhà cung cấp xe thuê ngoài) | Giám đốc | P1 |
| US-10.2 | Quản lý hồ sơ năng lực xe thuê (đăng ký, kiểm định, bảo hiểm, GPLX, HĐLĐ) | Giám đốc, Điều hành | P1 |
| US-10.3 | Tạo lệnh giao hàng cho xe thuê ngoài (BM.08.01b) | Điều hành | P1 |
| US-10.4 | Theo dõi sản lượng xe thuê ngoài, ký nhận cuối tháng | Kế toán | P1 |
| US-10.5 | Phổ biến nội quy an toàn cho đơn vị thuê ngoài | Điều hành | P2 |

## Epic 11: Document & Workflow Management (QT.08)

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-11.1 | Tạo booking / lệnh vận chuyển từ yêu cầu khách hàng (BM.08.01a) | Điều hành | P0 |
| US-11.2 | Phê duyệt booking / lệnh vận chuyển | Giám đốc | P0 |
| US-11.3 | Quản lý phiếu xe chạy điện tử (thay BM.08.02 giấy) | Tài xế | P0 |
| US-11.4 | Quản lý phiếu giao nhận / EIR (BM.08.04, BM.08.05) | Tài xế, Điều hành | P1 |
| US-11.5 | Lập biên bản quyết toán sản lượng (BM.08.06) | Kế toán, Điều hành | P1 |
| US-11.6 | Lập đề nghị thanh toán (BM.08.07) | Kế toán | P1 |
| US-11.7 | Quản lý chứng từ Hải quan (tờ khai xuất/nhập khẩu) | Điều hành | P2 |
| US-11.8 | Bàn giao tài liệu cho khách hàng, xác nhận nhận đủ | Điều hành | P2 |

## Epic 12: Data Integrity & Period Close

| ID | Story | Role | Priority |
|----|-------|------|----------|
| US-12.1 | Ảnh đã tải lên không cho chỉnh sửa/xóa (chỉ đọc) | Hệ thống | P0 |
| US-12.2 | Khóa dữ liệu chuyến sau chốt sổ cuối kỳ (chỉ đọc) | Hệ thống → Kế toán | P0 |
| US-12.3 | Lưu trữ chứng từ theo thời gian quy định (5 năm/1 năm) | Hệ thống | P2 |
| US-12.4 | Lịch sử trạng thái chuyến kèm mốc thời gian từng bước | Hệ thống | P0 |
