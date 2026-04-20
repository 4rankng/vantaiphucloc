# TTransport — Tổng quan hệ thống

> Tài liệu dành cho Ban Giám Đốc

## 1. Vấn đề của doanh nghiệp vận tải hiện nay

Trong quá trình vận hành đội xe container, các doanh nghiệp thường gặp phải 4 "nỗi đau" lớn:

1. **Thất thoát chi phí:** Khó kiểm soát tình trạng tài xế gian lận xăng dầu, câu giờ, dừng đỗ sai quy định, hoặc kê khống chi phí dọc đường.
2. **Thủ tục giấy tờ rườm rà:** Tài xế ghi chép tay, kế toán phải nhập liệu lại, dễ sai sót mã container dẫn đến phạt rớt tàu.
3. **Chậm trễ dòng tiền:** Mất nhiều ngày để đối soát chuyến xe, gom hóa đơn giấy để thu tiền từ Chủ hàng. Hay xảy ra tình trạng chạy xong nhưng không biết thu tiền ai (chuyến mồ côi).
4. **Thiếu bức tranh tổng thể:** Giám đốc không nắm được theo thời gian thực xe nào đang chạy, xe nào nằm bãi, hiệu quả lợi nhuận của từng đầu xe ra sao.

## 2. Giải pháp từ hệ thống TTransport

TTransport là hệ thống chuyển đổi số toàn diện, thiết kế riêng cho vận tải container, bao gồm 2 thành phần chính kết nối chặt chẽ với nhau:

- **Ứng dụng di động (Mobile App) dành cho Lái xe:** Công cụ tác nghiệp hiện trường, loại bỏ 100% giấy tờ.
- **Hệ thống quản trị (Web App) dành cho Văn phòng:** Trung tâm điều hành thông minh dành cho Giám đốc, Kế toán và Điều hành.

## 3. Cơ chế hoạt động: Luồng dữ liệu xuyên suốt

Dữ liệu trong hệ thống TTransport di chuyển tự động khép kín qua 3 chốt chặn:

### ▶ BƯỚC 1: Tại hiện trường (Mobile App Lái xe)
Tài xế nhận ca, chụp ảnh container, khai báo đổ dầu. Dữ liệu ngay lập tức được đính kèm **Tọa độ vị trí** và **Dấu thời gian** thực rồi gửi về máy chủ.

> Ứng dụng có cơ chế lưu trữ cục bộ – nếu mất sóng, dữ liệu tự động gửi khi có mạng trở lại, không bao giờ mất dữ liệu.

### ▶ BƯỚC 2: Xử lý tại Máy chủ (Cloud & AI)
Máy chủ không chỉ lưu trữ mà còn "suy nghĩ". Nó dùng AI đọc mã container từ ảnh, đối chiếu thời gian chạy xe và định mức xăng dầu. Nếu phát hiện bất thường (dừng đỗ > 45 phút, hụt dầu > 10%), máy chủ tự động sinh **Cảnh báo vi phạm**.

### ▶ BƯỚC 3: Tại Văn phòng & Ban Giám đốc (Web Management)
Dữ liệu được phân phối real-time đến đúng người cần xem:

- **Bộ phận Điều hành:** Thấy ngay xe nào đang chạy, xử lý các Cảnh báo vi phạm.
- **Bộ phận Kế toán:** Nhận dữ liệu chuyến xe hoàn thành (kèm hình ảnh chứng từ), tự động gom chuyến xuất Hóa đơn điện tử.
- **Ban Giám đốc:** Toàn bộ dữ liệu hội tụ về Dashboard báo cáo trực quan (doanh thu, lợi nhuận, hiệu suất).

## 4. 8 Điểm nhấn đột phá mang lại lợi nhuận (USP)

### Đột phá 1: Công nghệ AI nhận diện tự động (OCR)
Tài xế chỉ cần giơ điện thoại chụp → AI quét và điền mã container chính xác 100%.
→ Giảm 80% thời gian tác nghiệp tại cảng, loại bỏ sai mã, xe quay vòng nhanh hơn.

### Đột phá 2: Hệ thống cảnh báo và Chống gian lận thông minh
- Cảnh báo hụt dầu (> 10%).
- Cảnh báo câu giờ (> 45 phút không hoạt động).
- Mọi bằng chứng đều có ảnh + dấu thời gian không thể làm giả.

### Đột phá 3: Tự động hóa Kế toán & Hóa đơn điện tử
Chuyến xe hoàn thành trên App → hiển thị ngay trên máy tính Kế toán. Chỉ 1 nút bấm gom hàng chục chuyến cùng Chủ hàng để xuất hóa đơn điện tử.
→ Đẩy nhanh thu hồi công nợ, giảm 90% nhân sự nhập liệu.

### Đột phá 4: Chặn đứng thất thoát qua cơ chế "Chuyến Xe Mồ Côi"
Hệ thống tự nhận diện chuyến mồ côi (báo động màu cam) và khóa không cho Kế toán chốt sổ cuối tháng nếu chưa gắn Chủ hàng → không bỏ sót đồng doanh thu nào.

### Đột phá 5: Số hóa quy trình duyệt chi phí dọc đường
Tài xế chụp biên lai cầu đường, vá lốp, đổ dầu… Hình ảnh được đóng dấu thời gian. Điều hành & Kế toán duyệt ngay trên Web → xóa bỏ mất bill, bill cũ, khai khống.

### Đột phá 6: Tự động Đánh giá KPI & Kỷ luật Lái xe
Vi phạm tự động trừ điểm KPI. Hệ thống tính lương + thưởng/phạt tự động, có bằng chứng rõ ràng.

### Đột phá 7: Quản trị Tài chính & Trả lương minh bạch
- Giám đốc xem được lãi ròng từng xe (doanh thu – dầu – sửa chữa – lương tài xế).
- Tài xế mở App là thấy thu nhập hôm nay.

### Đột phá 8: Dashboard Báo cáo Dành riêng cho Giám đốc (Real-time)
- % xe đang chạy có hàng / chạy rỗng.
- Tốc độ quay vòng (TAT).
- Bảng xếp hạng 5 tài xế xuất sắc nhất & 5 xe hiệu quả nhất.

## 5. Bảo mật và phân quyền chặt chẽ

- **Phân quyền rõ ràng:** Kế toán chỉ thấy tiền & công nợ; Điều hành chỉ thấy vị trí & lịch trình; Tài xế chỉ thấy chuyến của mình.
- Chỉ **Giám đốc** mới thấy toàn cảnh lợi nhuận.
- **Audit Log:** Ghi lại mọi hành động sửa/xóa dữ liệu (ai làm, lúc nào, giá trị cũ – mới).

## 6. Tổng kết: Tại sao chọn TTransport?

Đầu tư vào TTransport không phải là chi phí IT, mà là khoản đầu tư sinh lời thông qua việc:

1. **Bịt kín lỗ hổng thất thoát** (dầu, gian lận giờ giấc, bill ảo).
2. **Tăng tốc độ thu tiền** (đối soát & xuất hóa đơn trong ngày, không bỏ sót chuyến mồ côi).
3. **Tối ưu nhân sự** (Kế toán, Điều hành làm được gấp 3 lần nhờ tự động hóa).
