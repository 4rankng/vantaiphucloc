# TTransport — Tổng quan hệ thống

> Tài liệu dành cho Ban Giám Đốc

## Chuyển Đổi Số Toàn Diện — Ngành Vận Tải Container

Từ việc bịt kín lỗ hổng thất thoát chi phí đến tự động hóa quản trị dòng tiền. Khám phá cách hệ thống TTransport định hình lại bức tranh lợi nhuận cho Ban Giám Đốc.

---

### 4 "Nỗi Đau" Của Vận Hành Truyền Thống

Những điểm nghẽn đang bào mòn trực tiếp vào lợi nhuận và tốc độ dòng tiền của doanh nghiệp vận tải mỗi ngày.

| | |
|---|---|
| ⛽ **Thất thoát Chi phí** | Khó kiểm soát tình trạng gian lận xăng dầu, câu giờ, dừng đỗ sai quy định, hoặc kê khống chi phí dọc đường. |
| 📝 **Giấy tờ Rườm rà** | Tài xế ghi chép tay, kế toán nhập lại. Dễ sai sót mã container (11 số) dẫn đến rủi ro phạt rớt tàu. |
| ⏱️ **Chậm Dòng tiền** | Mất nhiều ngày đối soát. Dễ phát sinh "chuyến mồ côi" (chạy xong không rõ thu tiền ai) gây mất doanh thu. |
| 👁️‍🗨️ **Mù Điểm Dữ Liệu** | Giám đốc thiếu bức tranh tổng thể realtime: xe nào nằm bãi, xe nào đang chạy, lợi nhuận từng xe ra sao. |

---

### Cơ Chế Hoạt Động Xuyên Suốt

Dữ liệu di chuyển tự động khép kín qua 3 chốt chặn, loại bỏ hoàn toàn yếu tố độ trễ của con người.

**📱 1. Tại Hiện Trường** — Mobile App dành cho Lái xe. Nhận ca, chụp ảnh OCR container, khai báo chi phí.
- ✔️ Tự động đính kèm Tọa độ GPS
- ✔️ Đóng dấu Thời gian thực
- ✔️ Lưu trữ cục bộ (Chống mất mạng)

**☁️ 2. Xử Lý Máy Chủ (AI)** — Hệ thống Cloud phân tích dữ liệu tức thì, không chỉ lưu trữ mà còn "suy nghĩ".
- ✔️ AI đọc chính xác mã container
- ✔️ Đối chiếu định mức xăng dầu
- ✔️ Phát hiện câu giờ & hao hụt tự động

**💻 3. Tại Văn Phòng** — Web Management phân phối dữ liệu Real-time đến đúng người quản trị.
- ✔️ Điều hành: Xử lý cảnh báo tức thời
- ✔️ Kế toán: Xuất E-Invoice tự động
- ✔️ Giám đốc: Dashboard lợi nhuận

---

### Bằng Chứng Bằng Dữ Liệu — 8 Điểm Nhấn Đột Phá

Làm thế nào TTransport can thiệp trực tiếp vào việc tối ưu hóa chi phí và tăng tốc doanh thu? Dưới đây là các mô phỏng dữ liệu phản ánh hiệu quả thực tế của hệ thống.

**📸 Hiệu quả Công nghệ AI OCR**

*Đột phá 1: Giảm thiểu thời gian khai báo mã Container*

Thay vì tài xế phải gõ thủ công 11 ký tự phức tạp (ví dụ: TCKU1234567), hệ thống nhận diện ảnh trong tích tắc. Điều này tăng tốc độ quay vòng xe đáng kể tại các trạm chốt.

**⚠️ Cơ Cấu Cảnh Báo Chống Gian Lận**

*Đột phá 2 & 6: AI tự động bắt lỗi dựa trên thời gian thực*

Hệ thống phân tích chuỗi hoạt động để phát hiện các bất thường như hụt dầu (>10%) hay nhàn rỗi bất thường (>45 phút), tự động trừ điểm KPI tài xế vi phạm.

**📊 Bức Tranh Lợi Nhuận Từng Đầu Xe**

*Đột phá 7 & 8: Dashboard Giám đốc theo dõi Doanh thu vs Chi phí*

Không còn cảnh chờ báo cáo cuối tháng. Giám đốc theo dõi trực tiếp biên lợi nhuận của từng phương tiện. Hệ thống tính tự động: **Lãi Ròng = Doanh thu - (Tiền dầu + Phí cầu đường/sửa chữa + Lương tài xế)**.

| Đột phá | Metric |
|---------|--------|
| 🧾 Tự động Hóa đơn (Đột phá 3) | **1 Click** — Gom hàng chục chuyến của cùng Chủ Hàng để xuất E-Invoice ngay trong ngày |
| 🚫 Chặn Chuyến Mồ Côi (Đột phá 4) | **0% Thất thoát** — Khóa chốt sổ nếu có chuyến chạy xong mà chưa gán đối tượng thu tiền |
| 📸 Số hóa Bill dọc đường (Đột phá 5) | **100% Kiểm chứng** — Bill vá lốp, cầu đường bị đóng dấu Timestamp thực, xóa bỏ khai khống cuối tháng |

---

### Đầu Tư Sinh Lời & Bảo Mật Tuyệt Đối

TTransport không phải chi phí IT, mà là công cụ kiểm soát dòng tiền mạnh mẽ nhất.

**🔒 Hệ Thống Bảo Mật Dữ Liệu**

1. **Phân Quyền Chặt Chẽ (RBAC)** — Kế toán chỉ thấy tiền; Điều hành chỉ thấy vị trí xe; Lái xe chỉ thấy chuyến của mình. Chỉ Giám Đốc mới có quyền nhìn toàn cảnh lợi nhuận doanh nghiệp.
2. **Nhật Ký Lưu Vết (Audit Log)** — Hệ thống ngầm ghi lại mọi tác động (Ai sửa, sửa lúc nào, dữ liệu cũ/mới là gì) đối với thông tin chuyến xe và định mức. Chống gian lận nội bộ 100%.

**📈 3 Cột Trụ Thu Hồi Vốn (ROI)**

1. **Bịt Kín Lỗ Hổng Chi Phí** — Chặn đứng hao hụt nhiên liệu, thời gian nhàn rỗi ảo, và hóa đơn chi phí ma dọc đường.
2. **Tăng Tốc Độ Thu Tiền** — Báo cáo hoàn thành chuyến tức thời, gom hóa đơn tự động. Giải quyết triệt để thất thoát từ các chuyến mồ côi.
3. **Tối ưu nhân sự** (Kế toán, Điều hành làm được gấp 3 lần nhờ tự động hóa).

---

## Hành Trình Dữ Liệu Khép Kín

> Từ Mobile App Lái Xe đến Bảng Chốt Lợi Nhuận của Kế Toán

Sơ đồ dưới đây minh họa quá trình hệ thống TTransport tự động hóa việc thu thập, kiểm duyệt và chốt dữ liệu vận tải. Mỗi bước đều được thiết kế các "Chốt chặn bảo vệ" nhằm chống thất thoát chi phí và đảm bảo thu đủ doanh thu cho doanh nghiệp.

### 📱 Bước 1: Hiện trường (Lái xe) — Mobile App
**Khởi tạo chuyến & Quét OCR Mã Container**

Tài xế nhận lệnh, dùng điện thoại chụp ảnh cửa container để AI tự động điền mã số. Nếu tài xế nhận cuốc vãng lai chưa rõ ai là người thanh toán cước, chỉ cần tích chọn "Chưa rõ Chủ hàng" và khởi hành.

> 💡 **Giá trị Quản trị:** Giảm 80% thời gian nhập liệu thủ công. Giải phóng xe nhanh khỏi cảng mà không bắt tài xế phải biết các thông tin kế toán phức tạp, tránh kẹt xe.

### 📍 Bước 2: Hiện trường (Lái xe) — Mobile App
**Trả hàng & Báo cáo chi phí dọc đường**

Đến điểm đích, hạ bãi và chụp ảnh bằng chứng hoàn thành chuyến. Nếu có phát sinh chi phí vá lốp, cầu đường, tài xế chụp biên lai gửi thẳng về văn phòng qua App.

> 💡 **Giá trị Quản trị:** Mọi bức ảnh đều bị đóng dấu Tọa độ GPS và Thời gian thực (Timestamp) của máy chủ. Loại bỏ hoàn toàn vấn nạn dùng hóa đơn cũ để kê khống chi phí vào cuối tháng.

### ☁️ Bước 3: Trạm Trực Tuyến (Hệ Thống) — Cloud
**Đồng bộ, Giám sát & Phân tích Tự động**

Hệ thống ghi nhận chuyến xe hoàn thành. Ngay lập tức, AI so sánh quãng đường thực chạy với định mức nhiên liệu, đồng thời rà soát khoảng cách thời gian giữa các thao tác của tài xế.

> 💡 **Giá trị Quản trị:** Phát hiện ngay lập tức tình trạng hao hụt dầu (>10%) hoặc câu giờ, nhàn rỗi bất thường (>45 phút) để chủ động bắn cảnh báo đỏ về văn phòng điều hành.

### ⚙️ Bước 4: Văn phòng (Điều hành) — Web Dashboard
**Kiểm duyệt Sự cố & Duyệt Chi phí Dọc đường**

Nhân viên Điều hành xem xét các Cảnh báo do Hệ thống đẩy về. Nhấn xác nhận duyệt các hóa đơn chi phí hợp lệ thông qua ảnh chụp thực tế.

> 💡 **Giá trị Quản trị:** Các vi phạm (như bán xăng, câu giờ) một khi được Điều hành xác nhận sẽ tự động ghim vào hồ sơ của tài xế và quy đổi thành điểm trừ KPI vào cuối tháng. Minh bạch, không cãi vã.

### 🔍 Bước 5: Văn phòng (Kế toán) — Web Dashboard
**Rà soát "Chuyến mồ côi" & Hoàn thiện Dữ liệu**

Mở danh sách chuyến hoàn thành. Các chuyến mà tài xế chọn "Chưa rõ Chủ hàng" ở Bước 1 sẽ bị báo động màu cam. Kế toán tra soát và gán lại đúng tên Chủ hàng thanh toán.

> 💡 **Giá trị Quản trị:** Cơ chế khóa chặn thông minh: Hệ thống tuyệt đối không cho phép Kế toán bấm "Chốt sổ" nếu vẫn còn chuyến mồ côi chưa gán tên người trả tiền. Đảm bảo không bỏ sót một đồng doanh thu nào.

### 💰 Bước 6: Văn phòng (Kế toán) — Web Dashboard
**Chốt Công Nợ & Xuất Hóa Đơn Điện Tử**

Sau khi thông tin đã đầy đủ, Kế toán chọn các chuyến trong kỳ và bấm "Chốt chuyến". Chỉ với 1 thao tác click tiếp theo, hệ thống gom toàn bộ chuyến của cùng 1 Chủ hàng để xuất Hóa đơn điện tử (E-Invoice).

> 💡 **Giá trị Quản trị:** Khi đã "Chốt", dữ liệu bị Khóa (Read-only), không ai được phép sửa đổi. Rút ngắn thời gian đối soát và thu hồi nợ từ hàng tuần xuống chỉ còn vài giờ đồng hồ. Góp phần xoay vòng vốn cực nhanh cho doanh nghiệp.

### Kết Quả Cuối Cùng

| | |
|---|---|
| **0%** Thất thoát chi phí ẩn | **3X** Năng suất Kế toán | **100%** Lợi nhuận được kiểm soát |

---

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
