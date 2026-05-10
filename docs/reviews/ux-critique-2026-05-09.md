# UX/UI Critique — phucloc.tingting.vip

**Date:** 2026-05-09
**Auditor scope:** Full walkthrough role `ketoan` (Kế toán)
**Viewport tested:** Desktop 1440 px (mobile inspected via DOM/CSS analysis — see Cross-cutting Issues)
**Tooling:** Chrome DevTools (DOM + media queries), screenshot inspection
**Tone:** Critique-only — không sửa code. Mục tiêu giúp ketoan làm việc 8h/ngày dễ hơn (fool-proof, ergonomic).

---

## Executive Summary

App có nền tảng visual khá hiện đại (gradient xanh, typography sạch, design token system với 241 tokens cho theming), và một vài tính năng nghiệp vụ thông minh (auto-detect Excel format, tier pricing theo số lượng container, auto-suggest ghép chuyến). Tuy nhiên có **2 critical gaps** cần ưu tiên fix trước, cộng với rất nhiều friction nhỏ tích lũy thành "kinh tởm" khi dùng 8h/ngày — phần lớn liên quan đến **terminology drift, opaque IDs thay cho place names, và validation/feedback patterns không hoàn thiện**.

### Top 5 Strengths

1. **Brand consistency**: Logo TTransport + màu xanh đậm/lá nhất quán; login screen với gradient và silhouette xe tải có "personality" mà không sến.
2. **Currency format chuẩn locale Việt**: `19.143.389 đ` dùng dấu chấm phân cách hàng nghìn + đơn vị `đ` lowercase — đúng convention VN.
3. **Status badges có hệ màu hợp ngữ cảnh**: Chờ xử lý (cam), Hoàn thành (xanh), Nháp (xám), Đã ghép (xanh dương) — scannable, không bị overload.
4. **Filter pill counts**: trang Đối tác hiển thị `Tất cả (19) / Khách hàng (18) / Nhà thầu (1)` — giúp user biết trước kết quả.
5. **Smart features cho domain logistics**: auto-detect file Excel theo tên (PAN/HAP/NEWWAY), pricing theo tier số lượng container, gợi ý ghép chuyến trên dashboard.

### Top 5 Critical Issues

1. **🔴 KHÔNG có mobile navigation**. Sidebar dùng class `hidden lg:flex`, không có hamburger/menu toggle thay thế. User dưới 1024 px **không có cách nào navigate**. Kế toán dùng iPad/điện thoại để check số liệu sẽ bị stuck ở Tổng quan.
2. **🔴 Search KHÔNG diacritics-insensitive**. Gõ `PAN HAI` để tìm "PAN HẢI" → empty state "Không tìm thấy lệnh nào". Người Việt gõ không dấu là phổ biến (đặc biệt khi vội), đây là blocker hàng ngày.
3. **🔴 Routes/cung đường hiển thị bằng ID số thay vì tên địa điểm**. Trang chi tiết đơn hàng và bảng giá hiển thị `28 → 31`, `49 → 52`, `46 → 49` — không đọc hiểu được nếu không thuộc lòng. Là root cause của cảm giác "kinh tởm" trên trang Ghép chuyến.
4. **🟡 Date format không nhất quán**. Trang Kỳ lương: `2026-04-25 → 2026-05-24` (ISO). Trang Báo cáo: `26/04/2026 → 25/05/2026` (DD/MM/YYYY). Trang Đơn hàng: `3/5/2026` (D/M/YYYY, không zero-pad). 3 format khác nhau cho cùng kiểu dữ liệu.
5. **🟡 Terminology drift giữa code và UI**. URL `/trips`, UI "Đơn hàng"; URL `/work-orders`, UI "Đối soát"; CTA "+ Tạo đơn" mở form titled "Tạo chuyến". User và team support sẽ nói khác ngôn ngữ với dev.

### Overall Grade per Dimension

| Dimension | Grade | Note |
|-----------|-------|------|
| Visual ("Look") | B | Modern, clean, brand-consistent. Mất điểm ở header casing inconsistency, contrast của error message + disabled buttons. |
| Usability ("Feel") | C | Search không dấu, opaque IDs, button cluster competing CTAs, no bulk action — đây là chỗ ăn 8h/ngày. |
| Information Architecture | C+ | Sidebar 1 group flat 10 items, terminology drift, redundant info trên route cards. |
| Heuristics Compliance | C+ | Match-to-real-world (place names vs IDs), Consistency, User Control đều có lỗ hổng. |
| Accessibility / Mobile | D | Không có mobile nav. Một số contrast issue. |

---

## Per-Page Findings

### Login (`/`)

**Observation:** Login screen có branding tốt, gradient xanh + silhouette xe tải decorative dưới chân, logo card nổi bật, password có eye-toggle, layout cân giữa.
**Impact:** First impression positive — vượt qua "3-second rule".
**Severity:** ✅ Strength
**Page:** Login

---

**Observation:** Field label đầu tiên là `Số điện thoại / Email / Tên đăng nhập` — dài, 3 lựa chọn nhồi vào 1 dòng; placeholder lặp lại "SĐT, email hoặc tên đăng nhập".
**Impact:** Tăng cognitive load lúc scan. User mới không biết nên gõ cái nào.
**Recommendation:** Đổi label thành ngắn gọn `Tên đăng nhập` và dùng helper text dưới input: "_Có thể là SĐT, email hoặc username_". Hoặc tự detect input type và đổi icon.
**Severity:** LOW
**Page:** Login

---

**Observation:** Sai mật khẩu → error banner `Thông tin đăng nhập không hợp lệ. Vui lòng thử lại.` xuất hiện giữa heading và input fields, không nhắm đến field cụ thể nào.
**Impact:** User không biết là username sai hay password sai. Phải đoán & retry. Mặc dù đây là security best practice (không tiết lộ tài khoản tồn tại), banner positioning có thể tốt hơn.
**Recommendation:** Giữ message generic (security ✅), nhưng:
1. Đặt banner _trên cùng_ form hoặc inline gần password (chỗ user vừa interact).
2. Tự động focus lại password field sau lỗi.
3. Có thể thêm "Quên mật khẩu? Liên hệ quản trị viên" link để user không bị stuck.

**Severity:** MED
**Page:** Login

---

**Observation:** Không có "Ghi nhớ đăng nhập" / "Remember me" và không có "Quên mật khẩu". Session có vẻ persistent (user mở lại app vẫn login) — nhưng UX không declare điều này.
**Impact:** Kế toán login nhiều thiết bị (PC công ty + laptop nhà) không có cách reset mật khẩu nếu quên. Không có feedback về việc session lưu bao lâu.
**Recommendation:** Thêm checkbox "Duy trì đăng nhập" (default off). Thêm link "Quên mật khẩu?" — kể cả nếu chỉ là `mailto:` hoặc text instruction "_Liên hệ admin: ..._" cũng OK.
**Severity:** MED
**Page:** Login

---

**Observation:** Lúc submit, button "Đăng nhập" chuyển sang trạng thái mờ/disabled nhưng KHÔNG có spinner hoặc text "Đang đăng nhập..." — user không biết click có nhận hay không.
**Impact:** User có thể double-click → có thể request 2 lần.
**Recommendation:** Khi pending, đổi text button thành "Đang đăng nhập..." kèm spinner nhỏ. Disable nhưng giữ màu primary (chỉ giảm opacity nhẹ) để user thấy đang loading.
**Severity:** LOW
**Page:** Login

---

### Tổng quan / Dashboard (`/accountant`)

**Observation:** 4 stat cards rõ ràng (Doanh thu tháng, Chi phí tài xế, Đơn chờ ghép, Phiếu chưa ghép) + 2 list cards (Đơn hàng gần đây, Hoạt động) + section "Gợi ý ghép chuyến". Layout grid sạch sẽ.
**Impact:** Dashboard pass "3-second rule" cho mục đích chính.
**Severity:** ✅ Strength
**Page:** Dashboard

---

**Observation:** CTA chính trên header là "Tạo chuyến" — chỉ 1 primary action. Với role kế toán làm 8h/ngày, action chính có thể không phải tạo chuyến mà là **đối soát, xuất báo cáo, hoặc tính lương** vào cuối kỳ.
**Impact:** Header CTA không reflect daily workflow của ketoan. Tăng số click cho task chính.
**Recommendation:** Cá nhân hoá theo role hoặc theo thời điểm tháng:
- Đầu/giữa tháng: "Nhập đơn hàng từ Excel" hoặc "Tạo chuyến".
- Ngày 25-31: "Xuất báo cáo khách hàng" / "Tính lương kỳ này".
Hoặc thêm shortcut bar dưới header với 3-4 quick actions.

**Severity:** MED
**Page:** Dashboard

---

**Observation:** Sidebar chỉ có 1 group `QUẢN LÝ` chứa 10 menu items flat (Tổng quan, Đơn hàng, Nhập từ Excel, Nhập bảng giá, Đối soát, Đối tác, Cung đường, Bảng giá, Kỳ lương, Báo cáo).
**Impact:** Khi list dài, scan visually slow. Không có hierarchy giúp ketoan tìm nhanh.
**Recommendation:** Group thành 3 cluster:

- **Vận hành**: Tổng quan, Đơn hàng, Đối soát
- **Nhập liệu**: Nhập từ Excel, Nhập bảng giá
- **Cấu hình**: Đối tác, Cung đường, Bảng giá, Kỳ lương
- **Báo cáo**: Báo cáo (có thể expand sau)

Dùng nhỏ section header xám giống "QUẢN LÝ" hiện tại.

**Severity:** MED
**Page:** Dashboard / sidebar

---

**Observation:** Brand "Phúc Lộc / Vận tải" ở góc trên sidebar khác với title app "TTransport" trên login. Tab title browser cũng "TTransport — Quản lý vận tải".
**Impact:** Confusion: app tên gì? Phúc Lộc? TTransport?
**Recommendation:** Thống nhất 1 brand name. Nếu Phúc Lộc là tenant/khách hàng, TTransport là platform → ghi rõ kiểu "TTransport • Phúc Lộc" trên sidebar.
**Severity:** LOW
**Page:** Dashboard / sidebar / login

---

**Observation:** Routes trong list "Đơn hàng gần đây" và "Hoạt động" bị **truncate giữa từ**: `PAN HAN → NAM HẢI ĐÌNH VŨ/VIP GREE...`, `HẢI AN → Nam Phát, Vietfracht, N...`.
**Impact:** Không xem được đầy đủ tuyến đường — kế toán không biết đơn này đi đâu để verify.
**Recommendation:** Truncate ở word boundary (`/`, `,`, hoặc space). Tốt nhất là tooltip on hover hiển thị full route. Với mobile/narrow column, ưu tiên hiển thị điểm cuối (`→ NAM HẢI ĐÌNH VŨ`) thay vì đầu (`PAN HAN →`).
**Severity:** MED
**Page:** Dashboard list cards (và toàn bộ list pages)

---

**Observation:** Status badges dùng nhiều màu: `Chờ xử lý` (cam), `Hoàn thành` (xanh đậm), `Nháp` (xám), `Đã ghép` (xanh dương), `Chờ ghép` (cam) — tổng 5+ trạng thái.
**Impact:** Hữu ích để scan, nhưng `Chờ xử lý` và `Chờ ghép` cùng cam — confusing.
**Recommendation:** Đảm bảo mỗi trạng thái 1 màu unique. Hoặc dùng cùng màu cam cho cả "Chờ" với icon khác (đồng hồ vs ghép cont). Cần legend tooltip giải thích sự khác biệt giữa "Chờ xử lý" và "Chờ ghép".
**Severity:** LOW
**Page:** Dashboard (lists), Đơn hàng, Đối soát

---

**Observation:** Stat card "DOANH THU THÁNG" wrap 2 dòng vì label dài, trong khi "ĐÃ HUỶ" 1 dòng.
**Impact:** Visual hierarchy bị inconsistent — labels có chiều cao khác nhau, làm cards lệch baseline.
**Recommendation:** Set min-height cho label hoặc rút gọn ("Doanh thu" + caption "Tháng này"). Hoặc dùng layout: number lớn ở giữa + label phía dưới chia 2 dòng đều.
**Severity:** LOW
**Page:** Dashboard, Đơn hàng

---

**Observation:** Section "Gợi ý ghép chuyến" có hint nhỏ với emoji `👇 Nhấn vào chuyến để tìm gợi ý` — emoji không phải style đồ hoạ design system, hơi casual cho B2B logistics.
**Impact:** Tone of voice không nhất quán — phần còn lại app khá formal.
**Recommendation:** Thay emoji bằng icon từ design system (chevron-down, info, sparkles) hoặc cụm từ rõ ràng "_Mẹo: nhấn vào một chuyến đã đi để xem gợi ý ghép_" với background tint nhẹ.
**Severity:** LOW
**Page:** Dashboard

---

### Đơn hàng (`/accountant/trips`)

**Observation:** URL là `/trips` nhưng UI label "Đơn hàng". CTA "+ Tạo đơn" mở form có title "Tạo chuyến". Trên Đối soát thì dùng "phiếu" và "lệnh".
**Impact:** Terminology drift giữa "đơn hàng / chuyến / lệnh / phiếu / trip / work-order". Support team / dev / accountant nói khác ngôn ngữ → khó debug và onboard người mới.
**Recommendation:** Định nghĩa từ điển domain rõ ràng và dùng nhất quán. Đề xuất:
- **Đơn hàng** (order/trip): customer-facing, đại diện cho 1 cont/lượt giao hàng.
- **Phiếu vận chuyển** (work-order): chuyến đi thực tế gắn với 1 tài xế.
- **Lệnh điều xe** (dispatch): lệnh tạo work-order.

Sau đó rename cả URL slug, button label, page title cho khớp.

**Severity:** HIGH (ảnh hưởng cross-cutting)
**Page:** Toàn site

---

**Observation:** Search box `Tìm mã lệnh, khách hàng` — gõ `PAN HAI` không match "Công ty TNHH PAN HẢI AN", trả về empty state "Không tìm thấy lệnh nào".
**Impact:** **Người Việt gõ không dấu rất phổ biến** (mobile, gõ vội). Đây là blocker hàng ngày — kế toán phải gõ đủ dấu hoặc copy-paste tên KH.
**Recommendation:** Implement diacritics-insensitive search:
- Backend: lowercase + remove diacritics cả query lẫn corpus trước khi match.
- Frontend: pre-normalize input nếu search local.
- Lib gợi ý: `unidecode`, hoặc đơn giản `s.normalize('NFD').replace(/[̀-ͯ]/g, '')`.
**Severity:** HIGH
**Page:** Đơn hàng (và toàn bộ search trên site)

---

**Observation:** Empty state cho search no-results: icon `#` xám + text "Không tìm thấy lệnh nào", không có hành động next-step.
**Impact:** User stuck — không biết là sai chính tả, sai bộ lọc, hay không có dữ liệu.
**Recommendation:** Empty state nên có:
- Echo lại query đang search ("_Không tìm thấy lệnh nào cho "PAN HAI"_").
- CTA "Xoá tìm kiếm" hoặc "Bỏ bộ lọc".
- Hint nếu detect query có thể không dấu: "_Thử với dấu: 'PAN HẢI'_".
**Severity:** MED
**Page:** Đơn hàng (và pattern dùng lại)

---

**Observation:** Table column header `CONTAINER` viết HOA toàn bộ trong khi `Ngày`, `Khách hàng`, `Doanh thu`, `Trạng thái` viết sentence case.
**Impact:** Inconsistent — không có quy tắc rõ ràng về casing.
**Recommendation:** Chọn 1 quy tắc (sentence case khuyến nghị cho i18n VN) và áp dụng đồng đều.
**Severity:** LOW
**Page:** Đơn hàng, Đối soát

---

**Observation:** Cột "Doanh thu" có giá trị `414.000` nhưng đơn vị `đ` bị clipped/đẩy ra ngoài viewport (chỉ thấy `đ` mờ ở rìa phải).
**Impact:** Khó nhận biết đơn vị; nếu user không quen có thể tưởng số lượng item thay vì tiền.
**Recommendation:** Tăng width column "Doanh thu" hoặc dùng layout responsive ẩn cột phụ (Container code) thay vì cắt cột tiền. Pin cột tiền right-aligned với padding cố định.
**Severity:** MED
**Page:** Đơn hàng

---

**Observation:** Không có pagination ở bottom — table load hết tất cả rows.
**Impact:** Với 100s/1000s đơn hàng/tháng, performance giảm + scroll dài. Khó nhớ vị trí cũ khi quay lại.
**Recommendation:** Thêm pagination hoặc virtualized scroll. Tối thiểu hiển thị "_Hiển thị 1-50 trên 213_" + load more button. Cho phép user chọn số rows/page (50 / 100 / 200).
**Severity:** MED
**Page:** Đơn hàng, Đối soát

---

**Observation:** Filter pills (`Tất cả / Nháp / Chờ đối soát / Hoàn thành / Đã huỷ`) là single-select — chọn cái này thì bỏ cái kia. Không thể combine "Nháp + Chờ đối soát".
**Impact:** Kế toán muốn xem "tất cả các đơn chưa hoàn thành" phải xem từng filter, hoặc dùng "Tất cả" rồi scan. Không hiệu quả với data dày.
**Recommendation:** Cho phép multi-select pills (toggle on/off). Hiển thị badge số lượng đang được filter ở mỗi pill. Hoặc thêm preset "Cần xử lý" (= Nháp + Chờ đối soát).
**Severity:** MED
**Page:** Đơn hàng, Đối soát

---

**Observation:** Trên header có 4 buttons: `Tải mẫu`, `Nhập`, `Xuất`, `+ Tạo đơn`. Chỉ "+ Tạo đơn" là primary green.
**Impact:** Visual clutter — 4 buttons đứng cạnh nhau, user phải scan để tìm action mong muốn. Đa số user 80% tạo đơn, nhưng "Tải mẫu / Nhập / Xuất" chiếm space.
**Recommendation:** Group secondary actions vào dropdown "..." menu hoặc gộp dưới 1 button "Excel" với menu (Tải mẫu / Nhập / Xuất). Giữ "+ Tạo đơn" primary.
**Severity:** MED
**Page:** Đơn hàng

---

**Observation:** Logo placeholder bên cạnh title "Đơn hàng" hiển thị ô xám rỗng (icon không load hoặc thiếu).
**Impact:** Visual bug — trông như UI vỡ.
**Recommendation:** Kiểm tra asset path hoặc bỏ placeholder nếu không cần icon ở title. Mỗi page nên có icon nhất quán hoặc đều không có.
**Severity:** LOW
**Page:** Đơn hàng (và các page khác có pattern tương tự — Đối tác, Đối soát)

---

#### Order detail (`/accountant/trip/:id`)

**Observation:** Trang chi tiết hiển thị: Khách hàng, Cung đường (`28 → 31`), Lương + Phụ cấp (0 đ + 0 đ), 2 dòng Container. Phần lớn screen rỗng.
**Impact:**
- "Cung đường: 28 → 31" — đây là port codes/IDs, **không có tên địa điểm** đi kèm. Kế toán phải nhớ ID nào là cảng nào.
- Không có lịch sử (ai tạo, khi nào, ai sửa), không có giá đã tính theo bảng giá, không có document đính kèm.
**Recommendation:**
1. **Hiển thị tên địa điểm cùng ID**: `28 (HẢI AN) → 31 (NHĐV)` hoặc dùng tên là chính, ID phụ tooltip.
2. Add timeline section: "Tạo bởi X lúc Y", "Sửa bởi Z", "Khớp cont lúc W".
3. Add pricing breakdown từ bảng giá nếu có match.
4. Use available whitespace cho activity feed hoặc related orders.
**Severity:** HIGH
**Page:** Order detail

---

**Observation:** Button "Khớp cont" xuất hiện 2 lần: 1 trên header (top-right), 1 trong panel "Khớp hàng" bên phải.
**Impact:** Duplicate action — user không biết click cái nào. Tăng chiều cao trang không cần thiết.
**Recommendation:** Giữ 1 button trong panel side (vì panel đã có context "Chọn số cont từ danh sách..."). Bỏ button header hoặc đổi thành menu action "..." overflow.
**Severity:** MED
**Page:** Order detail

---

**Observation:** Status badge "Chờ đối soát" + checkbox-like "Chốt chuyến" cạnh nhau ở top of detail card.
**Impact:** Không rõ "Chốt chuyến" là toggle hay button. Nếu toggle, không có hint là click sẽ thay đổi state.
**Recommendation:** Dùng button rõ ràng "Chốt chuyến" với confirm dialog, hoặc tách thành menu action. Thêm tooltip giải thích chốt nghĩa là gì.
**Severity:** MED
**Page:** Order detail

---

#### Tạo chuyến form (`/accountant/create-trip`)

**Observation:** Title page "Tạo chuyến" nhưng từ button "+ Tạo đơn". Required fields có `*` đỏ ✅. Container size pills E20/E40/F20/F40.
**Impact:** Inconsistent term (đã note ở cross-cutting).
**Severity:** Already covered.
**Page:** Tạo chuyến form

---

**Observation:** Button submit "Tạo chuyến" disabled khi form chưa hợp lệ — không có hint nào nói thiếu gì.
**Impact:** User click không phản hồi → tưởng app lỗi. Phải tự scan form tìm field thiếu.
**Recommendation:** Khi disabled, hover/focus button hiển thị tooltip "_Cần điền: Khách hàng, Điểm lấy, Điểm trả_". Hoặc highlight (border đỏ) các field thiếu khi user click.
**Severity:** MED
**Page:** Tạo chuyến form

---

**Observation:** "Lương / Phụ cấp" mặc định 0. Không có hint là sẽ tự tính theo bảng giá (nếu có) hoặc cần nhập tay.
**Impact:** Kế toán không biết khi nào hệ thống auto-fill.
**Recommendation:** Thêm helper text dưới field: "_Để trống để tự tính theo bảng giá khách hàng. Nhập số để override._". Hoặc thêm checkbox "Tính tự động" mặc định bật.
**Severity:** LOW
**Page:** Tạo chuyến form

---

**Observation:** "Số container" input không có format hint. Container code có format chuẩn (4 chữ + 7 số, e.g. TGHU1881778).
**Impact:** User có thể nhập sai format mà không biết → import lỗi sau này.
**Recommendation:** Helper text "_VD: TGHU1881778. 4 chữ + 7 số._" + validation realtime với error nếu sai pattern.
**Severity:** LOW
**Page:** Tạo chuyến form

---

### Nhập từ Excel (`/accountant/import-orders`)

**Observation:** Form: Khách hàng (dropdown), Ngày mặc định (date input native), Tệp Excel (file picker). Header có 2 button "Phân tích tệp" (disabled) và "Tạo 0 đơn hàng" (disabled).
**Impact:**
- Native date input có style khác design system (border, font).
- Empty state dưới form là vùng trống lớn — không có hint format file expected.
- "Tạo 0 đơn hàng" hiển thị "0" cứng khi chưa có file → confusing.
**Recommendation:**
1. Dùng custom date picker đồng nhất design system.
2. Empty state lớn nên có instruction: "_1. Tải mẫu file_ → _2. Điền dữ liệu_ → _3. Chọn tệp ở trên_". Có thể có illustration/icon.
3. Khi chưa có file, ẩn hoặc làm mờ button "Tạo 0 đơn hàng" với label "Cần tải file Excel trước".
**Severity:** MED
**Page:** Nhập từ Excel

---

**Observation:** Description mention `BDST, log bãi` — jargon chuyên ngành.
**Impact:** Người mới onboard không biết nghĩa.
**Recommendation:** Thêm tooltip `(?)` icon cạnh từ jargon → expand giải thích "BDST = Báo cáo đối soát thanh toán" / "log bãi = nhật ký bãi container" (whatever đúng).
**Severity:** LOW
**Page:** Nhập từ Excel, Báo cáo

---

### Nhập bảng giá (`/accountant/import-pricing`)

**Observation:** UI gần identical với Nhập từ Excel — cùng pattern, cùng issues. Có thêm dropdown "Định dạng" với option "Tự nhận diện theo tên tệp" — auto-detect feature ✅.
**Impact:** Pattern reuse tốt nhưng kéo theo cả issues. Auto-detect là điểm cộng.
**Recommendation:** Tách component import chung, fix một chỗ → cả 2 trang đều benefit.
**Severity:** ✅ Strength + LOW issues inherited
**Page:** Nhập bảng giá

---

### Đối soát (`/accountant/work-orders`)

**Observation:** Title "Đối soát" nhưng URL `/work-orders`. Search placeholder bị truncate: "_Tìm mã phiếu, biển số, tà..._" (thiếu "i xế").
**Impact:** Terminology drift đã note. Placeholder cụt ngữ làm user không biết có thể search được gì.
**Recommendation:** Tăng width search hoặc dùng label rõ "_Tìm: mã phiếu / biển số / tài xế_".
**Severity:** LOW
**Page:** Đối soát

---

**Observation:** Cột rightmost "Thu" bị truncate (có vẻ là "Thu nhập" hoặc "Doanh thu"). Tài xế hiển thị tên lowercase `taixe`, `taixe1` (seed data).
**Impact:** Cột header không đọc được. Tên seed data không formatted (lowercase + số).
**Recommendation:**
- Đặt min-width cho cột để header không bị cắt.
- Format driver name display theo capitalize hoặc map seed data về tên thật.
**Severity:** LOW (production data sẽ đỡ hơn)
**Page:** Đối soát

---

**Observation:** Click vào row không navigate đến chi tiết work-order.
**Impact:** Không có cách xem chi tiết phiếu.
**Recommendation:** Hoặc click row → modal/page chi tiết, hoặc thêm cột action với button "Xem".
**Severity:** MED
**Page:** Đối soát

---

**Observation:** Filter pill "Chờ khớp" màu cam đậm filled. "Tất cả" và "Hoàn thành" outline. Active state là filled cam → ổn.
**Impact:** OK ✅
**Severity:** ✅ Strength
**Page:** Đối soát

---

**Observation:** Routes của work-orders dài (`HẢI AN → Nam Phát, Vietfracht, Northfreight, Sao Đỏ`) hiển thị đầy đủ 1 dòng → font nhỏ, hơi khó đọc.
**Impact:** Dense info nhưng dễ miss khi scroll nhanh.
**Recommendation:** Cho phép user toggle compact/expanded view. Hoặc dùng badge/chip cho từng điểm: `Nam Phát` `Vietfracht` `Northfreight` `Sao Đỏ`.
**Severity:** LOW
**Page:** Đối soát

---

### Đối tác (`/accountant/partners`)

**Observation:** Header "Đối tác" + "+ Thêm" CTA. Search "Tìm tên, điện thoại, MST...". Filter chips với count rõ ràng. Avatar circles với initials random color.
**Impact:** Layout sạch, count helpful ✅.
**Severity:** ✅ Strength
**Page:** Đối tác

---

**Observation:** Cột "ĐIỆN THOẠI" và "ĐỊA CHỈ" mostly hiển thị `—` (empty). Tax code hiển thị trong column "MÃ ĐỐI TÁC" trùng tên company (e.g. 7S = 7S).
**Impact:** 2 cột phụ chiếm space lớn nhưng không có data. Mã đối tác trùng tên không add value.
**Recommendation:**
- Cho ẩn/hiện cột (column visibility toggle) — power user feature.
- Hoặc nhóm thông tin liên hệ thành 1 cột compact: tên + phone bên dưới.
- Chỉ hiển thị MÃ ĐỐI TÁC nếu khác với tên.
**Severity:** LOW
**Page:** Đối tác

---

**Observation:** Click vào row → modal nhỏ hiển thị: Loại (Khách hàng), Điện thoại (—). Action buttons: `Xoá` (left, outline đỏ) | `Sửa` (right, primary green).
**Impact:**
- Modal sparse — chỉ 2 fields. Không có MST, địa chỉ, contact person, email, contracts, lịch sử pricing, danh sách đơn hàng gần đây.
- **Action button placement bị ngược convention**: Xoá (destructive) ở vị trí thường dành cho "Hủy/Đóng". Sửa (primary) ở phải. Convention thông dụng: Hủy/Đóng (left) | Primary action (right). Destructive action thường ẩn dưới "..." menu hoặc tách rõ.
- "Xoá" button outline đỏ nhưng trông như action mạnh ngang Sửa — risk click nhầm.
**Recommendation:**
1. Modal expand nhiều hơn: thêm tabs (Thông tin / Cung đường / Bảng giá / Đơn hàng) hoặc convert thành slide-over panel.
2. Move "Xoá" sang menu "..." overflow ở header modal. Buttons bottom: `Đóng` (left, ghost) | `Sửa` (right, primary).
3. Khi user click Xoá → confirm dialog với input "Gõ tên đối tác để xác nhận xoá" cho action không reversible.
**Severity:** HIGH (destructive button placement)
**Page:** Đối tác (modal)

---

**Observation:** Modal close: chỉ có X. Test ESC key → modal đóng ✅. Click outside → chưa test cụ thể.
**Impact:** Behavior cần verify.
**Recommendation:** Đảm bảo cả 3 cách close (X, ESC, click backdrop) đều hoạt động và nhất quán toàn site.
**Severity:** LOW (assumed working)
**Page:** Đối tác (modal)

---

### Cung đường (`/accountant/routes`)

**Observation:** 2-column grid card. Mỗi card có header `HẢI AN → NHĐV` đậm, dưới đó label "ĐIỂM LẤY: HẢI AN" và "ĐIỂM TRẢ: NHĐV" — **lặp lại cùng thông tin**.
**Impact:** Wasted space, redundant.
**Recommendation:** Bỏ phần lặp. Card chỉ cần:
- Header: tên route ngắn gọn (origin → destination).
- Body: số chuyến đã đi, doanh thu trung bình, thời gian trung bình, last used date.
- Quick actions: edit, view trips on this route, delete.
**Severity:** MED
**Page:** Cung đường

---

**Observation:** Không có search/filter, không có sort. Khi data tăng (50+ routes), user phải scroll tìm.
**Impact:** Reduce hiệu quả khi scale.
**Recommendation:** Thêm search field (đã có placeholder "Tìm cung đường..." trên top — verify hoạt động). Thêm sort by alphabetical / frequency / last used.
**Severity:** MED
**Page:** Cung đường

---

**Observation:** Không có CTA edit/delete inline trên card; user phải click vào card mới biết.
**Impact:** Extra click cho task phổ biến.
**Recommendation:** Hover state hiển thị overflow menu "..." với edit/delete. Hoặc inline icons nhỏ ở góc card.
**Severity:** LOW
**Page:** Cung đường

---

### Bảng giá (`/accountant/pricing`)

**Observation:** Trang list chỉ hiển thị 2 cards (HAP, PAN HẢI AN) trong khi có 19 partners. Cards minimal: tên + số cung đường + số mức giá.
**Impact:** Không rõ tại sao chỉ 2 đối tác có bảng giá. Không có cách nhanh để tạo bảng giá cho partner còn lại.
**Recommendation:**
- Hiển thị TẤT CẢ partners — partner chưa có bảng giá hiển thị placeholder card "Chưa có bảng giá. Bấm để tạo".
- Card thêm thông tin: lần update gần nhất, tổng đơn áp dụng tháng này.
- Thêm filter "Đã có bảng giá / Chưa có" + search.
**Severity:** MED
**Page:** Bảng giá list

---

**Observation:** Trang chi tiết bảng giá hiển thị routes là `49 → 52`, `46 → 49` — chỉ ID, không có tên địa điểm.
**Impact:** **Không cách nào nhớ ID 49, 46, 52 là cảng nào.** Kế toán không thể verify bảng giá đúng tuyến.
**Recommendation:**
- Hiển thị tên route đầy đủ: `49 (HẢI AN) → 52 (Cảng 128)` hoặc đảo ngược (tên chính + ID phụ).
- Tốt hơn: lookup tên cảng từ Cung đường table và hiển thị inline.
**Severity:** HIGH
**Page:** Bảng giá detail

---

**Observation:** Edit pencil + delete trash (đỏ) ở cuối mỗi row giá. Không thấy confirmation.
**Impact:** Click nhầm trash → mất dữ liệu giá.
**Recommendation:** Confirmation dialog cho delete với preview "Sẽ xoá: F40 / SL=1 / 534.750 đ. Tiếp tục?". Cho phép undo trong 5s (toast với "Hoàn tác").
**Severity:** MED
**Page:** Bảng giá detail

---

**Observation:** Tier pricing theo SL (số lượng container) trên cùng route — feature mạnh ✅. Hỗ trợ "MỨC GIÁ THEO SỐ LƯỢNG CONTAINER".
**Impact:** Đúng nghiệp vụ logistics (volume discount).
**Severity:** ✅ Strength
**Page:** Bảng giá detail

---

**Observation:** Không có lịch sử thay đổi giá. Không biết ai sửa cuối, khi nào, từ giá nào.
**Impact:** Audit risk — tranh chấp với khách không có evidence.
**Recommendation:** Add "Lịch sử thay đổi" tab hoặc inline log per pricing row.
**Severity:** MED
**Page:** Bảng giá detail

---

### Kỳ lương (`/accountant/salary-setup`)

**Observation:** 2 cards side-by-side. Card 1 "Cấu hình kỳ lương" với input Từ ngày 26 / Đến ngày 25 + helper "Ngày 26 tháng này → ngày 25 tháng sau" + button "Lưu cấu hình" green primary. Card 2 "Tính lương kỳ này" với "Kỳ hiện tại: **2026-04-25 → 2026-05-24**" + button "Tính lương tất cả" green primary + download icon.
**Impact:**
- **DATE FORMAT BUG**: ISO `2026-04-25` trong khi rest of site dùng `25/04/2026` — inconsistency.
- 2 button green primary cùng prominence — competing CTAs.
**Recommendation:**
1. Đổi date display sang `25/04/2026 → 24/05/2026` cho khớp.
2. "Lưu cấu hình" thành secondary (outline). "Tính lương tất cả" primary. Hoặc dùng visual hierarchy khác: card 1 là setup (thường ít update), card 2 là daily action.
**Severity:** MED
**Page:** Kỳ lương

---

**Observation:** "Tháng dương lịch" caption không có giải thích. User VN có thể nhầm với âm lịch nếu không quen.
**Impact:** Confusion với SME/older accountants.
**Recommendation:** Tooltip "Theo lịch dương (Gregorian). Mỗi kỳ tính từ ngày X tháng này đến ngày Y tháng sau."
**Severity:** LOW
**Page:** Kỳ lương

---

**Observation:** Empty state "Lịch sử kỳ lương" có icon ví, "Chưa có kỳ lương nào" + "Nhấn 'Tính lương tất cả' để tạo kỳ lương đầu tiên".
**Impact:** Empty state với CTA pointer ✅ — pattern tốt.
**Severity:** ✅ Strength
**Page:** Kỳ lương

---

**Observation:** Input Từ ngày / Đến ngày không có validation visible — nếu user gõ 32 hoặc 0 thì sao? Trùng ngày? Đảo ngược?
**Impact:** Risk lưu config sai khiến tính lương sai.
**Recommendation:** Constrain 1-31, validate "Từ" != "Đến", hiển thị preview kỳ tiếp theo realtime.
**Severity:** MED
**Page:** Kỳ lương

---

### Báo cáo (`/accountant/reports/customer-settlement`)

**Observation:** Chỉ có 1 loại báo cáo — "Báo cáo khách hàng" / Bảng kê thanh toán & Sản lượng.
**Impact:** Hạn chế nghiêm trọng cho role kế toán. Thường cần thêm: doanh thu/chi phí theo tháng, công nợ khách hàng, chi phí tài xế chi tiết, hiệu suất tuyến đường, sản lượng theo loại container.
**Recommendation:** Roadmap mở rộng báo cáo. Tối thiểu nên có:
- Doanh thu - Chi phí theo tháng/quý.
- Công nợ khách hàng (aging).
- Lương + phụ cấp tài xế chi tiết.
- Sản lượng container theo route.

**Severity:** MED-HIGH (depends on business need)
**Page:** Báo cáo

---

**Observation:** Date format ở "Kỳ báo cáo: 26/04/2026 → 25/05/2026" dùng DD/MM/YYYY — đúng.
**Impact:** Nhưng KHÁC với Kỳ lương dùng ISO. Inconsistency.
**Severity:** Already covered in cross-cutting.
**Page:** Báo cáo

---

**Observation:** Validation message "Vui lòng chọn khách hàng để bật nút xuất." dùng màu cam — không match red error/warning yellow của design system rõ ràng.
**Impact:** User có thể không nhận ra đây là blocker.
**Recommendation:** Standardize validation colors:
- Đỏ: error (đã sai).
- Vàng: warning.
- Xám/info: helper hint (chưa đủ điều kiện).
Message này thuộc loại 3 → dùng xám hoặc info blue.
**Severity:** LOW
**Page:** Báo cáo

---

**Observation:** "Năm" là free-text input.
**Impact:** User có thể gõ "2025" hoặc "25" hoặc "2026.5".
**Recommendation:** Dropdown picker với list năm có data hoặc number input có constraint.
**Severity:** LOW
**Page:** Báo cáo

---

**Observation:** Không có "Xuất tất cả khách hàng" cho monthly batch run.
**Impact:** Kế toán phải xuất từng khách 1 → 19 lần click cho 19 partners mỗi tháng.
**Recommendation:** Add "Xuất hàng loạt" mode: chọn many customers → bundle thành 1 ZIP hoặc 1 Excel với multiple sheets.
**Severity:** MED
**Page:** Báo cáo

---

### Ghép chuyến / Đối soát workflow (brief)

User đã note đây là page sẽ redesign — nên chỉ note ngắn:

- **Cốt lõi vấn đề**: cùng root cause với chi tiết đơn hàng và bảng giá — opaque IDs `28 → 31` thay vì tên cảng. Kế toán/dispatcher phải nhớ thuộc lòng bản đồ ID → tên thì mới ghép được chuyến đúng.
- Suggest section "Gợi ý ghép chuyến" trên dashboard có potential — flow "click chuyến đã đi → tìm gợi ý" trực giác. Cần đẩy mạnh: tự suggest top 3 match dựa trên route similarity, time, container size.
- Empty state hint dùng emoji 👇 — đã note above.

---

## Cross-cutting Issues

### 🔴 1. Mobile responsive design hoàn toàn thiếu

**Observation:** Sidebar dùng class `hidden lg:flex` — chỉ hiển thị từ ≥1024 px. Dưới breakpoint đó **không có hamburger menu, bottom nav, hay bất kỳ navigation thay thế nào** (đã verify qua DOM inspection: `mobileToggleExists: false`, `responsiveHiddenElems: 0`). Token system có `--theme-bottom-nav-border` nhưng chưa apply.

**Impact:** Kế toán dùng tablet (iPad ~1024 px borderline) hoặc điện thoại để check số liệu cuối tháng → bị stuck ở bất kỳ page nào, không có cách điều hướng. Driver app có thể có flow mobile riêng nhưng accountant role thì gãy.

**Recommendation:**
1. Implement hamburger toggle ở header mobile, slide-out drawer cho sidebar.
2. Hoặc tận dụng `--theme-bottom-nav-border` token: làm bottom navigation với 4-5 mục chính (Tổng quan, Đơn hàng, Đối soát, Báo cáo).
3. Tables → responsive: ẩn cột phụ, hiển thị card view dưới 768 px.
4. Modal Đối tác → full-screen sheet trên mobile.

**Severity:** HIGH
**Page:** Toàn site

---

### 🔴 2. Search không diacritics-insensitive

**Observation:** Verified trên Đơn hàng — gõ `PAN HAI` không match "PAN HẢI". Pattern này áp dụng cho mọi search (Đối tác, Đối soát, Cung đường, Bảng giá).

**Impact:** Người Việt gõ không dấu thường xuyên — đặc biệt trên mobile, gõ vội, hoặc khi keyboard layout không có dấu. Đây là blocker hằng ngày.

**Recommendation:** Server-side: normalize cả query và corpus (lowercase + strip diacritics) trước khi LIKE/match. Có thể tạo column `name_normalized` trong DB cho search performance. Phổ biến lib: `unidecode` (Python) hoặc PostgreSQL `unaccent` extension.

**Severity:** HIGH
**Page:** Toàn site (search)

---

### 🟡 3. Date format không nhất quán

**Observation:**
- Đơn hàng list: `3/5/2026` (D/M/YYYY, không zero-pad)
- Báo cáo: `26/04/2026` (DD/MM/YYYY, zero-pad)
- Kỳ lương: `2026-04-25` (ISO YYYY-MM-DD)
- Form Tạo đơn: native date input style browser (DD/MM/YYYY ở Chrome VN)

**Impact:** Inconsistency phá visual cohesion, có thể gây confusion (đặc biệt ISO format không phải convention người Việt).

**Recommendation:** Standardize 1 format toàn site: `DD/MM/YYYY` zero-pad. Tạo helper formatter dùng chung. Date inputs dùng custom picker để control display.

**Severity:** MED
**Page:** Toàn site

---

### 🟡 4. Terminology drift Đơn hàng / Chuyến / Lệnh / Phiếu / Trip / Work-order

**Observation:** Cùng entity được gọi nhiều tên khác nhau ở UI và URL. Ví dụ:
- URL `/trips` ↔ UI "Đơn hàng"
- URL `/work-orders` ↔ UI "Đối soát"
- Button "Tạo đơn" → form title "Tạo chuyến"

**Impact:** Communication breakdown giữa dev / support / accountant. Người mới onboard mất nhiều thời gian học từ vựng. Lookup/search trong code khó.

**Recommendation:** Định nghĩa từ điển domain (đề xuất ở Per-Page Findings của Đơn hàng) và rename URL slugs, button labels, page titles cho đồng nhất.

**Severity:** HIGH (long-term debt)
**Page:** Toàn site

---

### 🟡 5. Routes / địa điểm hiển thị bằng ID số thay vì tên

**Observation:** Trang chi tiết đơn hàng (`28 → 31`), chi tiết bảng giá (`49 → 52`, `46 → 49`), Đơn hàng list (`40 → 43`, `22 → 25`) đều hiển thị ID. Không có lookup nào hiển thị tên cảng/địa điểm.

**Impact:** Kế toán phải nhớ map ID → tên cảng. Sai khả năng cao. Đây là root cause "kinh tởm" của Ghép chuyến.

**Recommendation:** Mọi nơi hiển thị place ID phải kèm tên (preferred): `28 (HẢI AN) → 31 (NHĐV)` hoặc `HẢI AN → NHĐV` với ID là tooltip phụ.

**Severity:** HIGH
**Page:** Đơn hàng detail, Bảng giá detail, Đối soát

---

### 🟡 6. Không có bulk actions

**Observation:** Tất cả list pages (Đơn hàng, Đối soát, Đối tác, Bảng giá) không có select-all checkbox hay bulk action (delete many, export selected, change status).

**Impact:** Kế toán làm 8h/ngày phải làm 1-1 cho mỗi row. Inefficient.

**Recommendation:** Add row checkbox + bulk action bar khi có select. Tối thiểu: Xoá nhiều, Đổi trạng thái nhiều, Xuất Excel selected.

**Severity:** MED
**Page:** Toàn site (list pages)

---

### 🟡 7. Không có keyboard shortcuts

**Observation:** Power users dùng 8h/ngày nhưng không có shortcut nào: search (`/`), close modal (`Esc` chưa verify), navigation (`g d` for dashboard).

**Impact:** Mouse-only flow chậm.

**Recommendation:** Implement common shortcuts:
- `/` focus search
- `?` show keyboard help
- `g d` Tổng quan, `g o` Đơn hàng, `g r` Báo cáo
- `n o` New order
- `Esc` close modal/drawer

Document trong "?" overlay.

**Severity:** LOW (polish)
**Page:** Toàn site

---

### 🟡 8. Loading / pending / error states không nhất quán

**Observation:** Login submit không có spinner/text. "Phân tích tệp", "Tạo 0 đơn hàng" disabled khi chưa có file nhưng không có hint. Validation messages dùng nhiều màu (cam ở Báo cáo, hồng nhạt ở Login error).

**Impact:** User không biết app đang làm gì hay đang chặn gì.

**Recommendation:** Standardize:
- Loading: spinner + label "Đang xử lý..." trong button.
- Disabled với reason: tooltip on hover.
- Error: inline đỏ với icon + text near field.
- Helper info: xám + icon (i) near field.

**Severity:** MED
**Page:** Toàn site

---

### 🟡 9. Inconsistent column header casing

**Observation:** Trong cùng table có cột `CONTAINER` viết HOA và `Ngày`, `Khách hàng` sentence case. Filter pill "Đã huỷ" dùng tiếng Việt cũ (huỷ thay vì hủy — đây là chính tả VN miền Bắc, OK).

**Impact:** Visual inconsistency.

**Recommendation:** Chọn 1 quy tắc (sentence case khuyến nghị) cho tất cả table headers.

**Severity:** LOW
**Page:** Đơn hàng, Đối soát

---

### 🟡 10. Modal/dialog action button placement

**Observation:** Đối tác modal: Xoá (left) | Sửa (right). Convention: cancel/safe action left, primary right; destructive thường tách riêng.

**Impact:** Risk click nhầm Xoá khi định click Sửa.

**Recommendation:** Standardize:
- Bottom-right: primary action (`Sửa`, `Lưu`, `Xác nhận`)
- Bottom-left: cancel (`Đóng`, `Hủy`)
- Destructive (`Xoá`): trong overflow menu `...` ở header modal, hoặc tách dòng dưới với spacing rõ.

Áp dụng toàn site.

**Severity:** MED
**Page:** Toàn site (modals)

---

### 🟢 11. Density có thể tốt hơn cho 8h/ngày

**Observation:** Padding/spacing khá generous — đẹp nhưng cho power user data-heavy thì lãng phí. Ví dụ table row Đơn hàng cao ~70 px → 1 viewport (~900 px) chỉ thấy ~10 rows.

**Impact:** Kế toán scroll nhiều. Mất context cũ.

**Recommendation:** Cho phép user toggle density (Comfortable / Compact / Dense). Lưu preference trong account.

**Severity:** LOW (polish)
**Page:** Toàn site (lists)

---

### 🟢 12. Empty states không nhất quán

**Observation:**
- Search no-result: icon `#` xám + text only (Đơn hàng).
- Pending salary period: icon ví + text + reference button (Kỳ lương).
- File import: vùng trống lớn, không có instruction (Nhập từ Excel).

**Impact:** User experience bị fragmented.

**Recommendation:** Standardize empty state component với:
1. Icon (relevant to context)
2. Title (nguyên nhân: "Chưa có đơn hàng nào", "Không tìm thấy kết quả")
3. Description (giải thích/next step)
4. CTA button (primary action)

**Severity:** LOW
**Page:** Toàn site

---

### 🟢 13. Tooltip giải thích jargon

**Observation:** Domain có nhiều thuật ngữ chuyên: BDST, BKTT, SL, log bãi, lệnh, phiếu, MST. Không có tooltip hover.

**Impact:** Người mới onboard mất nhiều thời gian.

**Recommendation:** Add `?` icon nhỏ cạnh label kèm tooltip giải thích. Có thể có 1 trang Trợ giúp dành riêng giải thích thuật ngữ.

**Severity:** LOW
**Page:** Toàn site

---

## Quick Wins (S effort, ship next sprint)

Các fix đơn giản, impact lớn, có thể merge trong 1 sprint:

1. **Fix search diacritics-insensitive** (1-2 ngày): Áp dụng `unaccent` hoặc tương đương ở backend cho tất cả search field.
2. **Standardize date format DD/MM/YYYY toàn site** (0.5 ngày): Tạo `formatDate(d)` helper, replace tất cả ad-hoc format.
3. **Hiển thị tên cảng cùng ID** (1-2 ngày): Lookup từ table Cung đường, render `28 (HẢI AN)` ở Đơn hàng detail, Bảng giá detail.
4. **Đổi position Xoá/Sửa modal Đối tác** (0.5 ngày): Move Xoá → menu `...`, giữ Sửa primary.
5. **Truncate route ở word boundary, add tooltip on hover** (0.5 ngày).
6. **Add hamburger menu cho mobile** (1-2 ngày): Toggle button + slide-out drawer reuse sidebar contents.
7. **Loading spinner cho login + form submit** (0.5 ngày): Chỉ là pending state UX polish.
8. **Sửa empty state search có CTA "Xoá tìm kiếm" + echo query** (0.5 ngày).
9. **Group sidebar thành 3 sub-section** (0.5 ngày): Vận hành / Nhập liệu / Cấu hình / Báo cáo.
10. **Confirm dialog cho delete pricing rows + delete partner** (0.5 ngày).

Tổng ~7-10 ngày, có thể split 2 dev parallel.

---

## Major Initiatives (M-L effort)

Các initiative lớn cần 1-3 sprint, scope rõ:

### A. Mobile responsive overhaul (M effort, 1-2 sprints)

Implement breakpoint-aware navigation (hamburger drawer + optional bottom nav), responsive tables (card view < 768 px), full-screen sheets cho modal. Dùng token `--theme-bottom-nav-border` đã sẵn có.

### B. Terminology + URL alignment (M, 1 sprint)

Định nghĩa glossary domain (Đơn hàng / Phiếu vận chuyển / Lệnh điều xe), rename URL slugs (`/trips` → `/orders`?), button labels, page titles. Update tài liệu cho team.

### C. Order detail expansion + Pricing match (L, 2 sprints)

Trang chi tiết đơn hàng có:
- Tên cảng cho route.
- Pricing breakdown auto-match với bảng giá.
- Activity timeline (audit trail).
- Related: previous orders cùng route, same customer.
- Document upload (BDST, log bãi gắn vào đơn).

Đẩy mạnh "Gợi ý ghép chuyến" — auto-suggest top 3.

### D. Bulk actions + density toggle (M, 1 sprint)

Row checkbox + bulk action bar trên mọi list. Density toggle stored per user.

### E. Reports library expansion (L, 2-3 sprints)

Thêm 4-5 báo cáo quan trọng: Doanh thu - chi phí, Công nợ aging, Lương tài xế chi tiết, Sản lượng theo route, Hiệu suất tuyến. Cho phép custom report builder cơ bản.

---

## Heuristics Compliance Matrix

Dùng Nielsen's 10 heuristics + extras user requested. Score 1-5 (5 = excellent):

| Heuristic | Score | Notes |
|-----------|-------|-------|
| Visibility of system status | 3 | Loading/pending states không nhất quán. Status badges tốt. Disabled buttons không nói lý do. |
| Match between system and the real world | 2 | **Opaque IDs `28 → 31` thay tên cảng** là vi phạm chính. Domain jargon (BDST, BKTT) không tooltip. Currency format ✅. |
| User control and freedom | 3 | Có Quay lại, ESC close modal. Nhưng không có undo cho delete. Không có draft auto-save. |
| Consistency and standards | 2 | Date format 3 kiểu. Terminology drift. Header casing mixed. Modal button placement ngược convention. |
| Error prevention | 2 | Bảng giá delete không confirm. Form Tạo chuyến disabled không nói lý do. Kỳ lương input không validate. |
| Recognition rather than recall | 2 | Phải nhớ ID cảng. Search không tha lỗi gõ không dấu. |
| Flexibility and efficiency of use | 2 | Không bulk action. Không keyboard shortcut. Không saved filter. Density không tuỳ chỉnh. |
| Aesthetic and minimalist design | 4 | Visual khá clean, brand consistent. Cung đường card lặp info. Modal Đối tác sparse. |
| Help users recognize, diagnose, recover errors | 2 | Login error generic không nói field nào. Empty search không suggest fix. Validation màu không đồng bộ. |
| Help and documentation | 1 | Không tooltip jargon. Không onboarding/tour. Không help center link. |
| **+ Accessibility (WCAG 2.1 AA)** | 2 | Mobile nav không có. Một số contrast cần verify (disabled buttons, error message banner). |
| **+ Vietnamese locale** | 3 | Currency ✅, ngôn ngữ tốt; nhưng search không dấu fail, ngày ISO ở Kỳ lương sai locale, jargon thiếu giải thích. |

**Average:** ~2.4/5 — cần đầu tư mạnh vào Match-to-real-world, Consistency, và Help/documentation.

---

## Recommendations Summary Table

| # | Page | Severity | Observation | Recommendation |
|---|------|----------|-------------|----------------|
| 1 | Toàn site | HIGH | Sidebar `hidden lg:flex`, không có hamburger | Implement mobile drawer + optional bottom nav |
| 2 | Toàn site | HIGH | Search "PAN HAI" không match "PAN HẢI" | Diacritics-insensitive search backend |
| 3 | Đơn hàng detail / Bảng giá / Đối soát | HIGH | Routes `28 → 31` opaque IDs | Hiển thị tên cảng cùng/thay ID |
| 4 | Toàn site | HIGH | Terminology drift (Đơn/Chuyến/Lệnh/Phiếu/Trip) | Glossary + rename URLs/labels |
| 5 | Đối tác modal | HIGH | Xoá (left) | Sửa (right) sai convention | Move Xoá → overflow menu, Sửa primary right |
| 6 | Báo cáo | MED-HIGH | Chỉ 1 loại báo cáo cho role kế toán | Roadmap 4-5 báo cáo cốt lõi |
| 7 | Toàn site | MED | Date format 3 kiểu (D/M, DD/MM, YYYY-MM-DD) | Standardize DD/MM/YYYY |
| 8 | Đơn hàng list | MED | Search no-result empty state thiếu CTA | Echo query + "Xoá tìm kiếm" + suggest dấu |
| 9 | Đơn hàng list | MED | Filter pill single-select | Multi-select + preset "Cần xử lý" |
| 10 | Đơn hàng list | MED | Header 4 buttons cluster | Group Excel actions vào dropdown |
| 11 | Đơn hàng | MED | Không pagination | Pagination hoặc virtualized scroll |
| 12 | Đơn hàng detail | MED | "Khớp cont" duplicate 2 chỗ | Giữ 1 button trong panel side |
| 13 | Tạo chuyến form | MED | Submit disabled không nói lý do | Tooltip lý do + highlight field thiếu |
| 14 | Nhập từ Excel | MED | Vùng trống không có instruction | Step-by-step instructions + illustration |
| 15 | Đối soát | MED | Click row không navigate detail | Add row click action hoặc cột "Xem" |
| 16 | Cung đường card | MED | Top header lặp info bottom labels | Bỏ phần lặp, thêm metrics (frequency, last used) |
| 17 | Cung đường | MED | Không sort, search có thể chưa work | Sort alphabetical/frequency + verify search |
| 18 | Bảng giá list | MED | Chỉ 2 partners có giá, không thấy khác | Hiển thị tất cả + placeholder card "Chưa có" |
| 19 | Bảng giá detail | MED | Delete trash không confirm | Confirmation + undo trong 5s |
| 20 | Bảng giá detail | MED | Không lịch sử thay đổi giá | Log changes per row |
| 21 | Kỳ lương | MED | Date ISO format sai locale | DD/MM/YYYY |
| 22 | Kỳ lương | MED | 2 button green primary cạnh nhau | "Lưu cấu hình" thành secondary |
| 23 | Kỳ lương | MED | Input ngày không validate range | Constrain 1-31, validate range |
| 24 | Báo cáo | MED | Không bulk export tất cả khách hàng | Multi-select customers + ZIP export |
| 25 | Toàn site | MED | Không bulk action trên list | Row checkbox + bulk action bar |
| 26 | Toàn site | MED | Loading/error state không consistent | Standardize spinner/disabled-with-reason/error patterns |
| 27 | Toàn site | MED | Modal action button position ngược | Standardize convention |
| 28 | Login | MED | Error generic, không retain focus | Auto-focus password sau lỗi |
| 29 | Login | MED | Không có "Quên mật khẩu" / "Ghi nhớ" | Add cả 2 (kể cả mailto:) |
| 30 | Login | LOW | Field label "SĐT/Email/Tên ĐN" dài | Đổi label ngắn + helper text |
| 31 | Dashboard | MED | "Tạo chuyến" CTA không match daily flow | Cá nhân hóa CTA theo thời điểm |
| 32 | Dashboard | MED | Sidebar 1 group flat 10 items | Sub-group thành 3-4 cluster |
| 33 | Dashboard | LOW | Brand name TTransport vs Phúc Lộc | Thống nhất naming |
| 34 | Dashboard | MED | Routes truncate giữa từ | Word boundary + tooltip full route |
| 35 | Dashboard | LOW | Stat label wrap 2 dòng | Min-height labels, baseline align |
| 36 | Dashboard | LOW | Hint section dùng emoji 👇 | Replace với icon design system |
| 37 | Đơn hàng | LOW | Header column casing mixed | Sentence case toàn bộ |
| 38 | Đơn hàng | LOW | Đơn vị đ clipped right edge | Increase column width / responsive |
| 39 | Đơn hàng | LOW | Logo placeholder grey trống | Fix asset hoặc remove placeholder |
| 40 | Tạo chuyến | LOW | "Số container" không format hint | Helper text + realtime validation |
| 41 | Tạo chuyến | LOW | Lương/Phụ cấp default 0 không hint | "Để trống = tự tính" helper |
| 42 | Nhập từ Excel | LOW | Date input native style | Custom date picker đồng nhất |
| 43 | Nhập từ Excel | LOW | "Tạo 0 đơn hàng" cứng khi chưa có file | "Cần tải file Excel trước" |
| 44 | Đối soát | LOW | Search placeholder truncated "tà..." | Tăng width hoặc đổi label rõ |
| 45 | Đối soát | LOW | Driver name lowercase "taixe" | Format display capitalize (production data) |
| 46 | Đối soát | LOW | Cột "Thu" header truncated | Min-width column |
| 47 | Đối soát | LOW | Routes dài 1 dòng dense | Toggle compact/expanded view |
| 48 | Đối tác | LOW | Cột phone/address mostly empty | Column visibility toggle |
| 49 | Đối tác | LOW | MÃ ĐỐI TÁC trùng tên company | Hide nếu trùng |
| 50 | Đối tác modal | HIGH | Modal sparse 2 fields | Expand thành tabs / slide-over |
| 51 | Cung đường card | LOW | Không edit/delete inline | Hover actions overflow menu |
| 52 | Báo cáo | LOW | "Năm" free-text input | Year picker dropdown |
| 53 | Báo cáo | LOW | Validation message orange chưa standard | Use info gray cho hint, red cho error |
| 54 | Login | LOW | Submit không có spinner | "Đang đăng nhập..." + spinner |
| 55 | Toàn site | LOW | Không keyboard shortcuts | `/` search, `g d/o/r` nav, `?` help |
| 56 | Toàn site | LOW | Density không tuỳ chỉnh | Comfortable/Compact/Dense toggle |
| 57 | Toàn site | LOW | Tooltip jargon thiếu | `?` icon cạnh label |
| 58 | Toàn site | LOW | Empty state không consistent | Standardize EmptyState component |
| 59 | Toàn site | LOW | Status "Chờ xử lý" và "Chờ ghép" cùng cam | Đảm bảo unique color hoặc icon khác |
| 60 | Kỳ lương | LOW | "Tháng dương lịch" jargon | Tooltip giải thích |

---

## Final Note

Phần lớn issues đều fix được — không phải redesign từ đầu. **3 ưu tiên hàng đầu** nếu chỉ có 2 tuần:

1. Fix search không dấu (Quick Win #1).
2. Add tên cảng vào tất cả nơi hiển thị route ID (Quick Win #3).
3. Standardize date format (Quick Win #2).

Sau đó plan mobile responsive (Initiative A) cho sprint sau — mỗi ngày bị blocker mobile là kế toán phải mở laptop, lãng phí.

Cuối cùng: app đang ở giai đoạn "good bones, rough finish" — base architecture (theme tokens, status badges, brand identity) khá vững, các vấn đề còn lại chủ yếu là polish + nghiệp vụ. Có thể đạt B+ trong 2-3 sprints với roadmap đúng ưu tiên.

— Audit completed by Claude (Cowork mode), 2026-05-09
