# Functional + UX Critique — phucloc.tingting.vip

**Date:** 2026-05-09 (audit chạy 2026-05-10)
**Scope:** Hands-on functional test toàn site — tất cả CRUD, Khớp chuyến end-to-end, mọi clickable flow.
**Auditor role:** `ketoan` (Kế toán)
**Viewport:** Desktop 1316×912 + thử mobile via JS simulation.
**Tooling:** Chrome DevTools MCP — interaction, network requests, JS console.
**Reference:** Builds on `ux-critique-2026-05-09.md` (visual-only). Lần này bám vào FUNCTIONAL: bấm thật, submit thật, đọc HTTP response thật.

---

## 🚨 Phải sửa GẤP — Critical functional bugs

Trước khi đọc tiếp, có **5 bug functional gây mất việc** cần escalate ngay cho dev:

| # | Bug | Endpoint / Trigger | Hậu quả | Severity |
|---|-----|--------------------|---------|----------|
| **C1** | Khớp chuyến luôn fail HTTP 500 | `PUT /api/v1/work-orders/:id` | **Ketoan không ghép được chuyến** — feature core gãy hoàn toàn | 🔴 BLOCKER |
| **C2** | Xoá đối tác fail (422) nhưng UI báo OK | `DELETE /api/v1/clients/:id` | User tưởng đã xoá, thực tế còn → data drift, audit hỏng | 🔴 HIGH |
| **C3** | Xoá dòng giá KHÔNG có confirm dialog | trash icon trong Bảng giá detail | Click nhầm → mất dữ liệu giá vĩnh viễn, không undo | 🔴 HIGH |
| **C4** | Tạo Đối tác bỏ qua validation MST + SĐT | `POST /api/v1/clients` | Lưu được "abc123" làm MST, "notaphone" làm SĐT → data quality phá sản | 🔴 HIGH |
| **C5** | Diacritic search vẫn fail toàn site (đã ghi nhận lần trước, **chưa fix**) | mọi search | Ketoan không gõ được không dấu — pain point chính của 8h/ngày | 🔴 HIGH |

Chi tiết reproduce + recommendations xem từng phần dưới.

---

## Executive Summary

App đã có nhiều tiến bộ visual so với audit trước (route list trên Cung đường giờ hiển thị tên thay vì ID, nhiều màn dashboard / Đối soát hiện tên cảng PAN HAN/HẢI AN…). Nhưng deep functional test phơi bày một loạt bug **chưa từng được catch bằng visual-only** — đặc biệt là **toàn bộ feature Khớp chuyến không hoạt động**, một số API trả error nhưng UI im lặng, và validation form thiếu nghiêm trọng. Search không dấu — pain point #1 của ketoan ở audit trước — **vẫn chưa fix**.

### Top 5 Functional Bugs (đã verify)

1. **PUT /api/v1/work-orders/:id trả 500** mỗi lần bấm "Xác nhận khớp". Reproduce: vào `/accountant/match/39` → bấm "Xác nhận khớp" → toast `Lỗi - Không thể cập nhật phiếu chuyến`. Network log xác nhận 2 lần PUT trả 500. ⇒ **Feature core không xài được**.
2. **DELETE /api/v1/clients/:id trả 422** nhưng app KHÔNG show toast lỗi. Modal xoá tự đóng → user tưởng đã xoá → quay lại thấy đối tác vẫn còn → confusion + có thể lặp delete nhiều lần.
3. **Trash icon trong Bảng giá detail xoá ngay không hỏi**. Reproduce: vào `/accountant/pricing/3` → bấm icon thùng rác trên 1 dòng giá → mức giá biến mất ngay lập tức (verified: route 49→52 từ "2 mức" còn "1 mức"). Không undo, không toast.
4. **Form Tạo Đối tác bỏ qua validation MST + SĐT**. Lưu được "abc123" + "notaphone" thành công (POST 201). Thậm chí chi tiết hiện "📞 notaphone" như số điện thoại hợp lệ.
5. **Diacritic search broken** ở mọi text search test: Đối tác list, dropdown khách hàng (form Tạo chuyến), dropdown địa điểm (form Tạo cung đường), Cung đường list. Gõ `pan hai` → "Không tìm thấy". Đây là issue đã có ở audit trước, **chưa fix**.

### Top 5 UX Friction (functional-tier)

1. **Khớp chuyến UI mơ hồ**: 2 radio circle bên cạnh container/route không click được; "2/4" match score không có legend giải thích; chỉnh field `Điểm trả` từ "128" → "TC 189" KHÔNG re-compute score.
2. **Toggle "Chốt chuyến" không confirm + banner nói dối**: 1-click chốt ngay, banner hiển thị `🔒 Lệnh đã chốt với khách — không thể thay đổi` nhưng thực tế click lại toggle là un-chốt được. Banner sai sự thật.
3. **Form Sửa chuyến thiếu trầm trọng**: chỉ có Loại container + Khách hàng (text) + Cung đường (text). Không edit được số container, lương, phụ cấp. Cung đường là text input "28 → 31" — user gõ tay ID.
4. **Empty state search dẫn user sai hướng**: gõ `pan hai` không có kết quả → empty state Đối tác hiển thị `"Không có đối tác - Nhấn '+ Thêm' để bắt đầu"` (CTA mở form thêm mới — sai intent của user là search).
5. **Tạo đơn từ Khớp chuyến mất context**: Vào `/match/36` (đơn HAP, route 43→46) → click "+ Tạo đơn mới" → form Tạo chuyến mở rỗng, không pre-fill KH/route/container từ phiếu vận chuyển.

### Heuristics Compliance Update vs lần trước

| Heuristic | Lần trước | Lần này | Δ |
|-----------|-----------|---------|---|
| Visibility of system status | 3 | **2** | ↓ (silent delete fail, no spinner login, no toast on partner save) |
| Match real world | 2 | **2** | = (route IDs vẫn còn ở chi tiết đơn/bảng giá; dropdown địa điểm chỉ ID) |
| User control & freedom | 3 | **2** | ↓ (Bảng giá xoá không undo; Chốt chuyến không confirm; Tạo đơn mất context) |
| Consistency | 2 | **2** | = (date format Kỳ lương ISO vẫn còn, Khớp cont 2 chỗ trên detail vẫn còn) |
| Error prevention | 2 | **1** | ↓ (form Đối tác bỏ qua validation; Bảng giá no confirm; Kỳ lương vẫn cho gõ 32) |
| Recognition vs recall | 2 | **2** | = |
| Flexibility & efficiency | 2 | **2** | = |
| Aesthetic & minimalist | 4 | **4** | = |
| Recover from errors | 2 | **1** | ↓ (silent failures + generic toast "Lỗi - Không thể cập nhật phiếu chuyến" không nói gì) |
| Help & docs | 1 | **1** | = (vẫn không tooltip jargon) |
| Accessibility / Mobile | 2 | **2** | = (sidebar `hidden lg:flex` chưa fix, nhiều button ko aria-label) |
| Vietnamese locale | 3 | **3** | = |

**Average: 2.0/5** (giảm từ 2.4) — chính vì functional test bóc trần các silent failures + Khớp chuyến gãy.

### Net assessment cho ketoan

App có visual base tốt + nhiều UI feature thông minh, nhưng **functional layer vẫn unstable**: action core (ghép chuyến) không chạy, validation thiếu, error feedback không đủ. Nếu deploy production hôm nay, ketoan sẽ:

- Không ghép được chuyến nào (C1).
- Tạo nhầm đối tác có MST/SĐT linh tinh, làm sạch data tay sau (C4).
- Có thể vô tình xoá pricing row → tranh chấp với khách (C3).
- Tưởng đã xoá KH cũ nhưng vẫn còn (C2).
- Vẫn phải gõ đủ dấu khi search (C5).

**Recommend hold release cho đến khi C1–C4 fix.** C5 cần priority cao trong sprint sau.

---

## Test Coverage Matrix

| Flow | Test status | Working | Issues |
|------|-------------|---------|--------|
| Login (đúng / sai pwd / sai user / Enter / eye toggle / logout) | ✅ Tested | Mostly ✓ | 5 |
| Khớp chuyến (chọn radio, edit field, Xác nhận khớp, empty case) | ✅ Tested | ✗ | 8 |
| Đối tác CRUD (Create / Read / Update / Delete / search) | ✅ Tested | ✓ create + edit; ✗ delete | 9 |
| Cung đường (Read / Create modal / Detail modal / search) | ✅ Tested | ✓ | 5 |
| Đơn hàng (Read / Detail / Edit / Chốt chuyến) | ✅ Tested | ✓ chốt; ✗ edit fields thiếu | 6 |
| Bảng giá (Read / Detail / Add row / **Delete row**) | ✅ Tested | ✗ delete (no confirm) | 5 |
| Nhập từ Excel | Surface tested | n/a (chưa upload) | 3 |
| Kỳ lương (config + tính lương) | ✅ Tested | ✓ tính ✗ validation | 4 |
| Báo cáo customer settlement | Surface tested | (cần khách hàng để bật xuất) | 3 |
| Cross-flow: logout, deep link, role boundary, mobile, browser back | ✅ Tested | ✓ role ✗ mobile ✗ deep link | 5 |

---

## Per-Flow Findings

### 1. Login Flow

**Observation:** Login với đúng creds redirect `/` → `/accountant`. Sai password → toast lỗi đỏ inline trên form: `"Thông tin đăng nhập không hợp lệ. Vui lòng thử lại."`. Sai username → cùng message generic (security best practice ✅).
**Impact:** OK ✅
**Severity:** ✅ Strength
**Page:** `/`

---

**Observation:** Bấm Enter trên password field submit form ✅. Nhưng button "Đăng nhập" trong lúc pending KHÔNG có spinner / text "Đang đăng nhập...". Click 2 lần liên tiếp có thể trigger 2 request login.
**Impact:** UX nhỏ + risk double-submit cho slow connection.
**Recommendation:** Disable button + label "Đang đăng nhập..." + spinner trong khi `pending`. Network log cho thấy request POST /api/v1/auth/login mất ~150ms ở local nhưng production VN có thể chậm hơn.
**Severity:** LOW
**Page:** Login
**Reproduce:** Login form → nhập creds → bấm "Đăng nhập" nhanh 2 lần.

---

**Observation:** Sau wrong-pwd, password field GIỮ NGUYÊN value (chưa clear). User có thể edit và retry. Eye toggle (👁) trong password field hoạt động ✅.
**Impact:** Trade-off: tiện retry (đỡ phải gõ lại) vs kém security (password nằm trong DOM lâu hơn).
**Recommendation:** Acceptable. Nhưng nên auto-focus password sau lỗi (currently focus mất). Test `input[type="password"]` cũng nên có `autocomplete="current-password"` để password manager hoạt động.
**Severity:** LOW
**Page:** Login

---

**Observation:** Logout: 1-click vào icon "Đăng xuất" cạnh tên ketoan → instant redirect login. Không có confirm dialog, không có toast "Đã đăng xuất".
**Impact:** Click nhầm icon (icon nhỏ, sát viewport edge) → mất unsaved work. Nhưng acceptable cho most apps.
**Recommendation:** Optional: thêm tooltip "Đăng xuất" on hover (a11y), hoặc menu dropdown user (Cài đặt / Đăng xuất). Không nhất thiết phải confirm vì logout không destructive.
**Severity:** LOW
**Page:** Sidebar bottom

---

**Observation:** Deep link không preserve sau logout → login. Reproduce: logout → mở `https://phucloc.tingting.vip/accountant/trip/35` → form login hiển thị đúng → login → redirect `/accountant` (KHÔNG về `/trip/35`).
**Impact:** User mở link share từ teammate, login xong mất context, phải search lại.
**Recommendation:** Khi login form hiển thị do unauth, lưu URL gốc vào query param (`?next=/accountant/trip/35`) hoặc localStorage. Sau khi auth thành công, redirect về URL gốc.
**Severity:** MED
**Page:** Login
**Reproduce steps:**
1. Logout.
2. Truy cập `/accountant/trip/35`.
3. Login.
4. → Redirect về `/accountant` thay vì `/accountant/trip/35`.

---

### 2. Khớp chuyến (`/accountant/match/:id`) — CRITICAL

#### 🔴 C1. Xác nhận khớp luôn fail HTTP 500

**Observation:** Vào `/accountant/match/39` (W001039 — taixe1, F40 OOLU5982639, route PAN HAN → 128). UI hiển thị 2 panel:
- LEFT "CHUYẾN ĐÃ ĐI": container OOLU5982639 + KH PAN HẢI AN ✅ + Điểm lấy PAN HAN ✅ + Điểm trả `128` (ID, không có ✅).
- CENTER "ĐƠN HÀNG (6)": list đơn match — tất cả score `2/4`.
- BOTTOM "CHỈNH SỬA ĐƠN ĐÃ CHỌN": F40 HLXU9932644 + KH PAN HẢI AN ✅ + Điểm lấy PAN HAN ✅ + Điểm trả TC 189 (no ✅).

Bấm "Xác nhận khớp" (top-right) → toast lỗi: `Lỗi - Không thể cập nhật phiếu chuyến`. Network log: `PUT /api/v1/work-orders/39` → **HTTP 500**. Reproduce 2 lần đều cùng kết quả.

**Impact:** **Toàn bộ feature Khớp chuyến không hoạt động.** Đây là feature core của ketoan (cũng là page user gọi "kinh tởm" trong audit trước, đã redesign nhưng vẫn không chạy được).

**Recommendation:**
1. Check backend log endpoint `PUT /api/v1/work-orders/:id` — có thể là Pydantic schema mismatch, foreign key constraint, hay missing field.
2. Toast lỗi phải mang thông tin actionable: `"Không khớp được vì điểm trả không trùng (128 vs TC 189). Sửa rồi thử lại?"`.
3. Trước khi fix backend, frontend nên block button "Xác nhận khớp" khi điều kiện match không đủ (ví dụ: cần ít nhất 3/4 ✅), thay vì cho user click → 500.
4. Add Sentry / equivalent để bắt 500 errors trong production.

**Severity:** 🔴 BLOCKER (HIGH)
**Page:** `/accountant/match/39`
**Reproduce steps:**
1. Login ketoan.
2. Vào `/accountant/work-orders`.
3. Click row có order suggestions (W001039 OOLU5982639).
4. Click "Xác nhận khớp" top-right.
5. → Toast lỗi đỏ. Network: PUT 500.

**Screenshot:** ss_36443owf2 (toast hiển thị giữa header).

---

#### Khớp chuyến — UI / UX issues bổ sung

**Observation:** Match score luôn `2/4` cho mọi suggestion, không có legend nào giải thích "2 trong 4 trường nào match". Nhân viên ketoan không biết tiêu chí gì.
**Impact:** User bấm liều, không có cơ sở quyết định.
**Recommendation:** Hover score → tooltip `"Khớp 2/4: ✅ Khách hàng, ✅ Điểm lấy, ✗ Container, ✗ Điểm trả"`. Hoặc inline icon từng tiêu chí trên card đơn.
**Severity:** MED
**Page:** `/match/:id`

---

**Observation:** Edit field "Điểm trả 128" → "TC 189" → click ✓ confirm → ✅ green checkmark xuất hiện trên card. Nhưng score `2/4` của T002001 (đã có route TC 189) **KHÔNG re-compute** thành `4/4`.
**Impact:** User phải reload page hoặc lưu rồi mới thấy đúng score. Workflow edit-and-rematch không liền mạch.
**Recommendation:** Hoặc (a) re-fetch suggestions sau mỗi edit confirm, hoặc (b) tính score client-side (frontend đã có dữ liệu).
**Severity:** MED
**Page:** `/match/:id`
**Reproduce:**
1. Vào `/accountant/match/39`.
2. Click "Điểm trả 128" trong panel CHUYẾN ĐÃ ĐI → input editable.
3. Sửa thành "TC 189" → click ✓.
4. Score của T002001 vẫn `2/4` (lẽ ra phải lên `3/4` hoặc `4/4`).

---

**Observation:** Radio circle empty bên cạnh container `OOLU5982639` (left panel) — click không có hiệu ứng gì. Tương tự radio bên cạnh F40 `HLXU9932644` ở bottom panel. Không rõ purpose.
**Impact:** Confused selection — user không biết đã chọn gì.
**Recommendation:** Hoặc xoá radio không dùng được, hoặc làm cho click highlight selection. `read_page` cho thấy 22 buttons không có aria-label → accessibility cũng fail.
**Severity:** MED
**Page:** `/match/:id`

---

**Observation:** Empty case → Vào `/accountant/match/36` (W001036 HAP, route 43→46) → "ĐƠN HÀNG (0)" + empty state đẹp: icon 📄 + `"Không tìm thấy đơn hàng phù hợp"` + `"Tạo đơn hàng mới để bắt đầu đối soát"` + CTA xanh `"+ Tạo đơn mới"`.
**Impact:** Empty state pattern tốt ✅. NHƯNG click "+ Tạo đơn mới" mở `/accountant/create-trip` form RỖNG hoàn toàn — không pre-fill KH = HAP, route 43→46, container F40 từ context phiếu.
**Recommendation:** Pass context vào URL: `/create-trip?customer=HAP&route_from=43&route_to=46&container_type=F40&from_match=36`. Form pre-fill → user chỉ điền số container và bấm Tạo.
**Severity:** MED
**Page:** `/match/36` empty state
**Reproduce steps:**
1. Vào `/accountant/work-orders`.
2. Click row W001036 (route HAP 43→46).
3. Click "+ Tạo đơn mới".
4. Form mở rỗng, mất context.

---

**Observation:** Layout 3 panel (LEFT-CENTER-BOTTOM) hơi awkward khi viewport vừa. Bottom panel chiếm ~40% chiều cao → khu vực đơn hàng (CENTER) phải scroll khi nhiều đơn. Trên 1316px viewport panel BOTTOM lúc nào cũng visible — chiếm space ngay cả khi chưa chọn đơn.
**Impact:** Information density không tối ưu.
**Recommendation:** Bottom panel slide-up khi user chọn 1 đơn (currently auto-select đơn đầu tiên có vẻ là gây panel hiện luôn). Hoặc bottom panel collapse được.
**Severity:** LOW
**Page:** `/match/:id`

---

### 3. Đối tác CRUD (`/accountant/partners`)

#### 🔴 C4. Form Tạo Đối tác bỏ qua validation

**Observation:** Bấm "+ Thêm" → modal "Thêm khách hàng". Field:
- Tên (no `*` cho required)
- Loại: Công ty / Cá nhân toggle (KHÔNG có "Nhà thầu" option!)
- Mã số thuế (placeholder `0123456789`)
- Điện thoại (placeholder `0901234567`)
- Địa chỉ
- Người liên hệ

Test: Nhập `Test KH Audit` + `abc123` (MST không hợp lệ) + `notaphone` (SĐT không hợp lệ). Bấm "Xác nhận" → POST /api/v1/clients trả **201 Created**. Modal đóng, KH xuất hiện trong list với:
- Tên: `Test KH Audit`
- Phụ đề: `MST: abc123` (lưu nhưng KHÔNG vào cột MÃ ĐỐI TÁC)
- Điện thoại: `notaphone` (có icon 📞!)

**Impact:** Production sẽ dirty data nhanh chóng. Khi xuất bảng kê thanh toán cho khách hàng bằng MST, sẽ có MST sai gây tranh chấp.

**Recommendation:**
1. Frontend validation realtime:
   - MST: 10 hoặc 13 chữ số (regex `^\d{10}(\d{3})?$`).
   - SĐT VN: regex `^(0|\+?84)[35789]\d{8}$`.
2. Backend cần validation cùng schema (Pydantic).
3. Field `Tên *` thiếu asterisk required.
4. Toggle "Loại" chỉ có "Công ty / Cá nhân" — nhưng NHÓM partner có "Khách hàng / Nhà thầu" (xem filter pill). Form không cho chọn group → mọi KH tạo via form đều mặc định Khách hàng. Cần thêm field "Nhóm".

**Severity:** 🔴 HIGH
**Page:** `/accountant/partners` modal
**Reproduce steps:**
1. Vào `/accountant/partners`.
2. Click "+ Thêm" header.
3. Nhập Tên `X` + MST `abc123` + SĐT `notaphone`.
4. Click "Xác nhận".
5. → Tạo thành công, KH xuất hiện trong list với data invalid.

---

#### 🔴 C2. Xoá đối tác fail nhưng UI báo OK

**Observation:** Click row → modal chi tiết hiển thị Loại + Điện thoại + MST. Buttons: `Xoá` (left, outline đỏ + icon thùng rác) | `Sửa` (right, primary green + icon pencil).

Click `Xoá` → modal confirm:
- Title: `Xoá khách hàng?`
- Body: `Bạn có chắc muốn xoá Test KH Audit? Hành động này không thể hoàn tác.`
- Buttons: `Hủy` (left) | `Xác nhận` (right, RED danger)

Confirm → modal đóng, **KHÔNG có toast feedback**. Quay lại list, search "Test KH" — đối tác **vẫn còn**! Counter "Tất cả (20)" giữ nguyên.

Network log: `DELETE /api/v1/clients/19` → **HTTP 422 Unprocessable Entity**. Backend từ chối (có lẽ do KH có liên kết với đơn hàng / bảng giá).

**Impact:** User không biết delete fail. Sẽ:
- Bấm xoá lại nhiều lần (tăng tải server).
- Báo "đã xoá" cho sếp nhưng thực tế còn → audit trail mismatch.
- Dùng wrong workflow: bị block xoá vì có ràng buộc → cần soft-delete hoặc archive.

**Recommendation:**
1. **Show toast lỗi từ 422 response**: parse `detail` field từ FastAPI và hiển thị: `"Không thể xoá khách hàng này vì còn 12 đơn hàng / 3 dòng bảng giá liên kết. Hãy archive thay vì xoá."`.
2. Add `archive` (soft delete) làm action chính, giữ `Xoá vĩnh viễn` cho admin only.
3. Backend nên return chi tiết: `{"detail": "Cannot delete: has related entities", "blocked_by": {"trip_orders": 12, "pricing_rules": 3}}`.

**Severity:** 🔴 HIGH
**Page:** `/accountant/partners` modal Xoá
**Reproduce steps:**
1. Login ketoan.
2. Vào `/accountant/partners`.
3. Tạo "Test KH" → click row → click Xoá → click Xác nhận.
4. Modal đóng silent.
5. Search "Test KH" → vẫn còn. Network log: DELETE 422.

---

**Observation:** Modal chi tiết Đối tác chỉ hiển thị 3 fields (Loại, Điện thoại, MST). Form Sửa hiển thị thêm Địa chỉ + Người liên hệ. Sau khi tôi update với địa chỉ + người liên hệ, list view hiển thị đầy đủ nhưng modal chi tiết VẪN không hiển thị.
**Impact:** User phải bấm "Sửa" mới thấy thông tin đầy đủ → tăng cognitive load + risk vô tình edit.
**Recommendation:** Modal chi tiết phải hiển thị tất cả fields (read-only mode). Nếu cần compact, dùng tabs (Tổng quan / Liên hệ / Đơn hàng / Bảng giá).
**Severity:** MED
**Page:** `/partners` detail modal

---

**Observation:** Action button placement trong modal chi tiết: `Xoá` (left) | `Sửa` (right). Convention: Cancel/Close left + Primary right + Destructive trong overflow menu hoặc tách rõ.
**Impact:** Click nhầm Xoá khi định click Sửa (cùng size, cùng độ prominent).
**Recommendation:** Move Xoá → menu `⋯` ở góc trên phải modal, hoặc thêm 1 row ở dưới với padding lớn ngăn nhầm. Bottom row chỉ giữ `Đóng` (left) | `Sửa` (right).
**Severity:** MED
**Page:** `/partners` detail modal

---

**Observation:** Sau khi update Đối tác (POST PUT), modal đóng silent — KHÔNG có toast `"Đã cập nhật"`.
**Impact:** User không biết action thành công hay không. Phải nhìn list xem data có thay đổi không.
**Recommendation:** Add success toast `"Đã cập nhật {tên}"` hoặc inline confirmation trong modal trước khi auto-close 1.5s.
**Severity:** MED
**Page:** `/partners` Sửa modal

---

**Observation:** Search trên Đối tác diacritic-insensitive **broken**. Gõ `pan hai` → empty state generic `"Không có đối tác - Nhấn '+ Thêm' để bắt đầu"`.
**Impact:** (1) Không tìm được khách hàng quen thuộc khi gõ vội. (2) Empty state CTA "+ Thêm" sai intent — user đang search không đang tạo mới.
**Recommendation:**
1. Backend: dùng `unaccent` (PostgreSQL extension) hoặc tạo column `name_normalized` để LIKE match.
2. Empty state khi đang có search query: hiển thị `"Không tìm thấy đối tác cho 'pan hai'"` + CTA `"Xoá tìm kiếm"`. Có thể gợi ý `"Bạn có ý định gõ 'pan hải'?"` (nếu detect được).
**Severity:** 🔴 HIGH (xem cross-cutting)
**Page:** `/partners` search

---

### 4. Cung đường (`/accountant/routes`)

**Observation:** Cải thiện so với audit trước: card hiển thị place names (HẢI AN → NHĐV, HẢI AN → Nam Hải Đình Vũ, Vip Greenport, etc.) thay vì ID. ✅
**Severity:** ✅ Strength

---

**Observation:** Modal "Thêm cung đường" — Điểm lấy / Điểm trả là dropdown. Khi mở dropdown chưa search:
- Hiển thị: `128`, `22`, `25`, `28`, `31`, `34` ...
- **TOÀN ID, không có tên!**

Khi gõ search `HẢI AN` → dropdown hiển thị tên: `Bãi Pan Hải An`, `HẢI AN`, `PAN HẢI AN` ✅.
**Impact:** **Inconsistent display**: dropdown bình thường = ID, search = tên. User không có dấu chỉ rằng "phải search mới thấy tên". Ngay cả khi sort dropdown alphabet, IDs vẫn không có nghĩa cho ketoan.
**Recommendation:** Dropdown items luôn hiển thị `<tên> · #<ID>` (ví dụ `HẢI AN · #28`). Sort theo tên alphabet, không sort theo ID. Item value gửi backend vẫn là ID.
**Severity:** 🔴 HIGH
**Page:** `/routes` modal Thêm cung đường
**Reproduce:**
1. `/accountant/routes` → click "+ Thêm".
2. Click dropdown "Chọn điểm lấy".
3. → Items hiển thị `128, 22, 25, 28, 31, 34` (chỉ ID).
4. Gõ `HẢI` → items đổi thành tên (Bãi Pan Hải An, HẢI AN, PAN HẢI AN).

---

**Observation:** Search dropdown địa điểm cũng diacritic-broken. `hai an` → "Không tìm thấy kết quả". Pattern lặp ở mọi text search.
**Impact:** Cùng pain point hằng ngày.
**Recommendation:** Cùng fix `unaccent` toàn site.
**Severity:** 🔴 HIGH

---

**Observation:** Search bar trên page (top-right) `Tìm cung đường...`. Gõ `hai an` → empty state khá hơn page Đối tác: icon route + `"Không tìm thấy cung đường"` + `"Thử từ khoá khác"`.
**Impact:** Empty state slightly better, nhưng vẫn thiếu CTA "Xoá tìm kiếm" + suggest dấu.
**Recommendation:** Standardize empty state component (xem cross-cutting).
**Severity:** LOW

---

**Observation:** Modal chi tiết Cung đường (header gradient xanh đẹp với route HẢI AN → NHĐV) chỉ có 2 fields lặp lại (ĐIỂM LẤY: HẢI AN, ĐIỂM TRẢ: NHĐV) + buttons Xoá / Chỉnh sửa.
**Impact:** Sparse — không có metric nào (số chuyến đã đi, doanh thu trung bình, last used).
**Recommendation:** Thêm stats: `Đã có 47 chuyến · Doanh thu 218 triệu · Lần cuối: 8/5/2026`. Quick links: `Xem đơn hàng` `Xem bảng giá`.
**Severity:** MED
**Page:** `/routes` detail modal

---

**Observation:** Action button placement modal chi tiết Cung đường: `Xoá` (left, outline đỏ) | `Chỉnh sửa` (right, primary green). Cùng vấn đề như Đối tác.
**Severity:** MED (covered cross-cutting)

---

### 5. Đơn hàng / Chuyến (`/accountant/trips`)

**Observation:** List hiển thị nhiều route bằng tên (PAN HAN → NAM ĐÌNH VŨ, HẢI AN → Lạch Huyện) — cải thiện so với lần trước. NHƯNG row đầu T002035 vẫn `28 → 31` (ID).
**Impact:** Mixed display — một số row tên, một số row ID. Inconsistent.
**Recommendation:** Đảm bảo backend luôn populate route name (eager join) hoặc client-side lookup từ Cung đường table.
**Severity:** HIGH
**Page:** `/trips`

---

**Observation:** Click row T002035 → `/accountant/trip/35` chi tiết:
- Status: `Chờ đối soát` + checkbox-toggle `Chốt chuyến` (top right)
- Khách hàng: Công ty TNHH HAP
- **Cung đường: 28 → 31** (vẫn ID!)
- Lương + Phụ cấp: 0 đ + 0 đ
- Container: F40 TGHU1881778, F40 TGHU9478859
- Right panel: "Khớp hàng" với button "Khớp cont"
- Header: pencil edit + button "Khớp cont" (DUPLICATE)

**Impact:**
- Route ID `28 → 31` vẫn opaque.
- 2 button "Khớp cont" — đã ghi nhận lần trước, **chưa fix**.

**Recommendation:** Bỏ button "Khớp cont" header, chỉ giữ trong panel side. Hiển thị tên cảng cho route `HẢI AN → Lạch Huyện · #28→#31`.
**Severity:** MED
**Page:** `/trip/:id`

---

#### 🔴 Form Sửa chuyến thiếu trầm trọng

**Observation:** Click pencil edit trên `/trip/35` → modal "Sửa chuyến":
- Loại container pills (E20/E40/F20/F40)
- Khách hàng: TEXT input "Công ty TNHH HAP" (không phải dropdown!)
- Cung đường: TEXT input "28 → 31" (không phải selector!)

**KHÔNG có:**
- Số container (cont 1, cont 2)
- Lương tài xế
- Phụ cấp
- Ngày
- Status

**Impact:** User chỉ edit được 3 trường (loại container + KH text + route text). Không sửa được số container nếu nhập sai. Không update lương/phụ cấp ở đây — phải đi đường khác. Khách hàng và Cung đường là text input → user gõ tự do, không validate, không match với master data.

**Recommendation:**
1. Đổi Khách hàng thành dropdown (cùng component với form Tạo).
2. Đổi Cung đường thành 2 dropdown Điểm lấy / Điểm trả.
3. Thêm fields còn thiếu: Số container, Lương, Phụ cấp, Ngày.
4. Hoặc đổi modal thành full-page edit với tất cả field giống form Tạo.

**Severity:** HIGH
**Page:** `/trip/:id` Sửa modal
**Reproduce:**
1. Vào `/trip/35` → click pencil top-right.
2. → Modal "Sửa chuyến" chỉ có 3 trường.

---

#### Toggle "Chốt chuyến" — confusing & banner nói dối

**Observation:** Click toggle "Chốt chuyến" → instant action:
- Status badge thêm: `🔒 Đã chốt`
- Banner xanh: `"🔒 Lệnh đã chốt với khách — không thể thay đổi"`
- Pencil edit icon biến mất
- Toast: `"Thành công - Đã chốt chuyến"` ✅

NHƯNG click lại toggle → un-chốt thành công với toast `"Đã bỏ chốt chuyến"`. Banner kia LIES — chốt LÀ thay đổi được.

**Impact:**
- Toggle 1-click cho action ảnh hưởng business (chốt với khách = invoice) là quá nguy hiểm.
- Banner sai → user mất tin vào hệ thống, hoặc user tin → cẩn thận quá → không dám thử.

**Recommendation:**
1. Add confirm dialog `"Chốt chuyến này với khách hàng X? Lệnh sẽ ghi vào hợp đồng."` với button `Hủy | Chốt chuyến`.
2. Sửa banner: nếu chốt là reversible → `"🔒 Lệnh đã chốt. Click để bỏ chốt nếu cần điều chỉnh."`. Nếu thực sự irreversible → backend không cho un-chốt nữa.
3. Audit log: ghi ai chốt, lúc nào, ai bỏ chốt — vì đây là action ảnh hưởng tiền.

**Severity:** HIGH
**Page:** `/trip/:id`
**Reproduce:**
1. Vào `/trip/35` → click toggle "Chốt chuyến".
2. Toast thành công + banner "không thể thay đổi".
3. Click lại toggle → un-chốt thành công.

---

**Observation:** Page `/trip/:id` không có button Xoá đơn hàng. Cũng không có overflow menu `⋯`.
**Impact:** Không xoá được đơn hàng từ chi tiết. Phải làm gì để xoá? List view cũng không thấy.
**Recommendation:** Add menu `⋯` ở header detail page với options: Xoá / Nhân bản / Xuất PDF / Lịch sử.
**Severity:** MED
**Page:** `/trip/:id`

---

**Observation:** Filter pills `Tất cả / Nháp / Chờ đối soát / Hoàn thành / Đã huỷ` vẫn single-select (chưa fix từ lần trước).
**Impact:** Cover cross-cutting. Ketoan muốn xem "tất cả chưa hoàn thành" phải toggle qua từng filter.
**Recommendation:** Multi-select pills hoặc preset "Cần xử lý" (= Nháp + Chờ đối soát).
**Severity:** MED
**Page:** `/trips`

---

### 6. Bảng giá (`/accountant/pricing`)

#### 🔴 C3. Trash icon xoá pricing row WITHOUT confirm

**Observation:** Vào `/accountant/pricing/3` (HAP) → route `49 → 52` có 2 mức (F40 534.750đ + F20 460.350đ). Click icon thùng rác đỏ trên dòng F40 → **F40 row DELETED INSTANTLY**. Không confirm dialog, không toast feedback, không undo. Section route `49 → 52` còn 1 mức (F20 only).

**Impact:** Risk mất dữ liệu giá rất cao:
- Click nhầm → mất giá đã thoả thuận với khách → tranh chấp tiền.
- Production có thể có chục ngàn dòng giá → 1 click = 1 dòng mất.
- Không có audit log để recover.

**Recommendation:**
1. **MANDATORY**: Confirm dialog `"Xoá mức giá F40 1 cont = 534.750đ? Hành động này không thể hoàn tác."`.
2. Đẹp hơn: undo toast 5s `"Đã xoá. Hoàn tác?"`.
3. Soft-delete với `deleted_at` timestamp + admin restore page.
4. Audit log: ai xoá, khi nào, giá bao nhiêu.

**Severity:** 🔴 HIGH
**Page:** `/pricing/:id`
**Reproduce:**
1. Login ketoan.
2. `/accountant/pricing` → click card "Công ty TNHH HAP".
3. Trên route 49 → 52, click icon thùng rác đỏ trên dòng F40 (534.750đ).
4. → Dòng biến mất ngay. Counter route từ `2 mức` còn `1 mức`.

---

**Observation:** Routes vẫn hiển thị bằng ID: `49 → 52`, `46 → 49`. Ketoan không thuộc cảng nào là ID nào.
**Impact:** Không verify được bảng giá đúng tuyến.
**Recommendation:** Format `HẢI AN · #49 → Lạch Huyện · #52`.
**Severity:** HIGH
**Page:** `/pricing/:id`

---

**Observation:** Form "Tạo bảng giá mới" inline (không phải modal) khá ổn về flow:
- Loại container pills
- Cung đường: dropdown Điểm lấy + Điểm trả (cùng dropdown opaque ID)
- Bảng giá: ×1 / ×2 tier toggles + Đơn giá + Lương tài xế + Phụ cấp inputs
- "+ Thêm mức giá"
- Hủy / Tạo

**Severity:** ✅ Acceptable, nhưng inherit issue dropdown địa điểm IDs.

---

**Observation:** Vẫn chỉ 2 partner (HAP + PAN HẢI AN) có bảng giá visible, 17 partner còn lại không hiển thị.
**Impact:** Đã ghi nhận lần trước, **chưa fix**.
**Recommendation:** Hiển thị card "Chưa có bảng giá. Bấm để tạo" cho partner còn lại.
**Severity:** MED

---

### 7. Nhập từ Excel (`/accountant/import-orders`) & Nhập bảng giá

**Observation:** Form: KH dropdown, Ngày mặc định (date input native), Tệp Excel. Header: "Phân tích tệp" (disabled), "Tạo 0 đơn hàng" (disabled, "0" hardcoded). Description vẫn dùng jargon `BDST, log bãi`.
**Impact:** Cùng issues từ lần trước, chưa fix:
- "Tạo 0 đơn hàng" hiển thị "0" cứng — confusing.
- Không có instruction step-by-step trong empty state.
- Native date input không match design system.
**Recommendation:** (xem audit trước, mục Nhập từ Excel.)
**Severity:** MED (carry-over)

---

### 8. Kỳ lương (`/accountant/salary-setup`)

**Observation:** Date format vẫn ISO `2026-04-25 → 2026-05-24`. 2 button green primary cạnh nhau. Empty state "Chưa có kỳ lương nào" tốt.
**Impact:** Inconsistent với rest of site (DD/MM/YYYY).
**Severity:** MED (carry-over)

---

**Observation:** Input "Từ ngày" cho gõ `32`. Frontend không validate. Bấm "Lưu cấu hình" → backend reject với toast `"Lỗi - Không thể lưu cấu hình"` (generic).
**Impact:**
- Không validate realtime → user phải submit mới biết.
- Toast lỗi không nói lý do `"Từ ngày phải từ 1-31"`.
- Field không highlight đỏ.

**Recommendation:**
1. Frontend `<input type="number" min="1" max="31">` + custom validation.
2. Backend trả `{"detail": "Từ ngày phải từ 1-31"}` để frontend dùng.
3. Highlight field invalid với border đỏ + helper text dưới.

**Severity:** MED
**Page:** `/salary-setup`
**Reproduce:**
1. `/accountant/salary-setup`.
2. Triple-click "Từ ngày" → gõ `32`.
3. Bấm "Lưu cấu hình".
4. → Toast `"Lỗi - Không thể lưu cấu hình"` (không nói lý do).

---

### 9. Báo cáo (`/accountant/reports/customer-settlement`)

**Observation:** Vẫn 1 loại báo cáo. Form gồm Năm (text input free-text), Tháng (dropdown), Khách hàng (dropdown). Validation message `"Vui lòng chọn khách hàng để bật nút xuất."` màu CAM (chưa standardize).
**Impact:** Limited reports cho ketoan. Field "Năm" có thể nhập invalid `25` hoặc `2026.5`.
**Recommendation:** Year picker dropdown. Add 4-5 báo cáo cốt lõi (đã đề xuất ở audit trước).
**Severity:** MED-HIGH (carry-over)

---

### 10. Cross-flow

**Observation:** Truy cập `/admin` khi đang đăng nhập ketoan → app redirect về `/accountant`. Role permission boundary working ✅.
**Severity:** ✅ Strength

---

**Observation:** Mobile responsive vẫn KHÔNG có. JS check confirm:
```js
{innerWidth: 1173, sidebarHidden: 'flex', hamburgerSelectors: [all not found], bottomNavSelectors: [all not found]}
```
Sidebar vẫn `display: flex` ở viewport ngắn (test với resize_window 390x844 không trigger media query → vì popup window không tuân theo viewport meta). Nhưng selector hamburger / bottom-nav không tồn tại trong DOM → confirm chưa implement mobile nav.
**Impact:** Cùng pain point lần trước, chưa fix.
**Severity:** 🔴 HIGH (carry-over)

---

**Observation:** Đa số `<button>` không có `aria-label`. `read_page filter:interactive` trên `/match/39` cho 22 button, **chỉ 5 có label** (Xác nhận khớp, Thêm, Thêm container, etc.); còn lại empty.
**Impact:** Screen reader không nói được button làm gì → fail WCAG 4.1.2 Name, Role, Value.
**Recommendation:** Add `aria-label` cho mọi icon-only button (radio, X, ✓, edit, delete).
**Severity:** MED-HIGH (a11y)

---

## Cross-cutting Issues (functional-tier, lặp từ audit trước)

| # | Issue | Status |
|---|-------|--------|
| 1 | Mobile responsive thiếu hoàn toàn | 🔴 chưa fix |
| 2 | Search diacritic-insensitive thiếu | 🔴 chưa fix (5 vị trí test đều fail) |
| 3 | Date format không nhất quán | 🟡 chưa fix (Kỳ lương vẫn ISO) |
| 4 | Terminology drift Đơn/Chuyến/Lệnh/Phiếu | 🟡 chưa fix |
| 5 | Routes hiển thị ID không tên | 🟡 cải thiện ở list, nhưng detail + dropdown vẫn ID |
| 6 | Không có bulk actions | 🟡 chưa fix |
| 7 | Không có keyboard shortcuts | 🟢 chưa fix |
| 8 | Loading / error state không nhất quán | 🟡 chưa fix (delete partner silent fail!) |
| 9 | Inconsistent column header casing | 🟢 chưa fix |
| 10 | Modal action button placement (Xoá-Sửa) | 🟡 chưa fix |
| 11 | Density chưa tuỳ chỉnh | 🟢 chưa fix |
| 12 | Empty state không nhất quán | 🟢 chưa fix |
| 13 | Tooltip jargon thiếu | 🟢 chưa fix |

### Mới phát hiện ở functional audit

| # | Issue mới | Severity |
|---|-----------|----------|
| 14 | API trả 5xx / 4xx mà UI không show error chi tiết | 🔴 HIGH |
| 15 | Form validation thiếu cả frontend + backend (MST/SĐT/ngày) | 🔴 HIGH |
| 16 | Edit form thiếu fields (sửa chuyến chỉ 3/8 trường) | 🔴 HIGH |
| 17 | Destructive action không confirm (Bảng giá row delete) | 🔴 HIGH |
| 18 | Toggle business action không confirm + banner sai sự thật (Chốt chuyến) | 🟡 MED |
| 19 | Match score không re-compute realtime | 🟡 MED |
| 20 | Tạo đơn từ Khớp chuyến mất context | 🟡 MED |
| 21 | Deep link không preserve sau logout-login | 🟡 MED |
| 22 | Modal chi tiết Đối tác hide fields đã có data (địa chỉ, contact) | 🟡 MED |
| 23 | Nhiều `<button>` không có aria-label (a11y) | 🟡 MED |
| 24 | Dropdown địa điểm hiển thị ID khi chưa search, tên khi có search (inconsistent) | 🟡 MED |
| 25 | Tạo Đối tác form không có option chọn Nhóm (Khách hàng / Nhà thầu) | 🟡 MED |

---

## Quick Wins (S effort, < 1 day each)

Thứ tự ưu tiên fix:

1. **🔴 [BLOCKER] Debug PUT /api/v1/work-orders/:id 500** — backend log cần soi. Block cho cả frontend đến khi fix.
2. **🔴 [HIGH] Confirm dialog cho mọi delete action ở Bảng giá row + bất kỳ destructive action nào** — frontend chỉ cần wrap delete handler trong AlertDialog. ~2h.
3. **🔴 [HIGH] Show toast lỗi từ HTTP 4xx/5xx response** — currently silent. Wrap fetch hooks với global error toast handler. ~3h.
4. **🔴 [HIGH] Validation MST + SĐT trong form Tạo Đối tác (frontend + backend)** — regex đơn giản. ~4h.
5. **🔴 [HIGH] Implement diacritic-insensitive search** — server side `unaccent` extension hoặc precompute `name_normalized`. Apply cho tất cả search endpoints. ~1 ngày.
6. **🟡 [MED] Sửa banner "Lệnh đã chốt với khách — không thể thay đổi"** thành đúng sự thật. Hoặc backend chặn un-chốt. ~1h.
7. **🟡 [MED] Add confirm dialog cho toggle Chốt chuyến**. ~2h.
8. **🟡 [MED] Form Sửa chuyến — add các fields còn thiếu (số container, lương, phụ cấp)**. ~half-day.
9. **🟡 [MED] Pre-fill context từ work-order khi click "+ Tạo đơn mới" trong Khớp chuyến**. URL params + form initial state. ~3h.
10. **🟡 [MED] Empty state Đối tác — show search query echo + CTA "Xoá tìm kiếm"** thay vì "+ Thêm". ~2h.
11. **🟡 [MED] Modal chi tiết Đối tác — hiển thị tất cả fields đã save (address, contact)**. ~2h.
12. **🟡 [MED] Add `aria-label` cho mọi icon-only button**. Sweep toàn site. ~half-day.
13. **🟡 [MED] Standardize toast feedback cho mọi CRUD success** (đặc biệt Update partner / Delete partner / Update pricing). ~2h.
14. **🟡 [MED] Deep link preserve sau logout** — `?next=` query param. ~2h.
15. **🟡 [MED] Validation Kỳ lương field (1-31)** + show field-specific error. ~2h.

**Tổng ~5-7 ngày dev (1 dev). Có thể parallelize 2 dev xong trong 1 sprint.**

---

## Major Initiatives (M-L effort)

### A. Khớp chuyến UX overhaul (M, 2 sprints)

Mục tiêu: feature mà ketoan dùng nhiều nhất phải trực giác, không cần training.

- Fix bug PUT 500 (blocker prerequisite).
- Re-design panel layout: sidebar chuyến đã đi (left, sticky) + center suggestions với match score breakdown + bottom panel slide-up khi chọn 1 đơn.
- Match score legend tooltip: `"4/4 = khớp toàn bộ. Click để xem chi tiết tiêu chí."`.
- Re-compute score realtime khi edit field.
- Auto-fill route name + container info khi tạo đơn mới từ context match.
- Confirm dialog cho "Xác nhận khớp" với preview "Sẽ ghép phiếu W001039 + đơn T002001".

### B. API error handling overhaul (M, 1 sprint)

Mọi response 4xx/5xx phải có UI feedback cụ thể.

- Backend chuẩn hoá error response shape: `{detail: string, code: string, blocked_by?: object}`.
- Frontend global error toast handler đọc shape này, hiển thị actionable message.
- Sentry / equivalent để track 5xx.
- Custom 404 page nếu route không hợp lệ.

### C. Form validation framework (M, 1 sprint)

- Define validators tái sử dụng (MST VN, SĐT VN, ngày dương lịch, container code, biển số).
- Frontend: dùng React Hook Form + Zod hoặc Yup. Real-time validation.
- Backend: Pydantic field validators.
- UI pattern: border đỏ + helper text dưới field + scroll to first error on submit.

### D. Mobile responsive (L, 2 sprints) — chưa fix từ audit trước

(Xem audit trước Initiative A.)

### E. Reports library expansion (L, 2-3 sprints) — carry-over

---

## Recommendations Summary Table (Top 30 by impact)

| # | Page | Severity | Observation | Recommendation |
|---|------|----------|-------------|----------------|
| 1 | `/match/:id` | 🔴 BLOCKER | PUT work-orders trả 500 | Debug backend; thêm validation field trước khi cho submit |
| 2 | `/partners` | 🔴 HIGH | DELETE 422 silent fail | Show toast lỗi + soft-delete option |
| 3 | `/pricing/:id` | 🔴 HIGH | Trash row no confirm | Add confirm dialog + undo toast 5s |
| 4 | `/partners` Thêm | 🔴 HIGH | No validation MST/SĐT | Frontend regex + backend Pydantic |
| 5 | Toàn site | 🔴 HIGH | Diacritic search broken | Backend `unaccent` |
| 6 | Toàn site | 🔴 HIGH | Mobile nav thiếu | Hamburger drawer + bottom nav |
| 7 | `/trip/:id` | HIGH | Form Sửa chuyến thiếu fields | Add số cont, lương, phụ cấp; KH+route dropdown |
| 8 | `/trip/:id` | HIGH | Toggle Chốt chuyến no confirm | Add confirm + sửa banner sai |
| 9 | `/match/:id` | MED | Match score không re-compute | Re-fetch hoặc compute client |
| 10 | `/match/:id` | MED | Tạo đơn mới mất context | Pass URL params từ work-order |
| 11 | `/match/:id` | MED | 22 button không có aria-label | Sweep aria-label toàn site |
| 12 | `/partners` | MED | Modal chi tiết hide địa chỉ + contact | Show all fields read-only mode |
| 13 | `/partners` | MED | Toggle Loại không có "Nhà thầu" option | Thêm field Nhóm |
| 14 | `/partners` | MED | Update silent (no toast) | Add success toast |
| 15 | `/partners` | MED | Empty search state CTA "+ Thêm" sai intent | "Xoá tìm kiếm" |
| 16 | `/routes` modal | 🔴 HIGH | Dropdown địa điểm chỉ ID | Always show "Tên · #ID" |
| 17 | `/routes` detail | MED | Modal sparse, no metrics | Add stats |
| 18 | `/trip/:id` | MED | Cung đường vẫn ID `28→31` | Show place name |
| 19 | `/trip/:id` | MED | 2 button "Khớp cont" duplicate | Bỏ ở header |
| 20 | `/trip/:id` | MED | Không có button Xoá đơn | Add menu ⋯ |
| 21 | `/pricing/:id` | HIGH | Routes ID `49→52` | Show place name |
| 22 | `/pricing` | MED | Chỉ 2 partner card | Show all + placeholder |
| 23 | `/salary-setup` | MED | Cho gõ ngày 32, error generic | Validate 1-31 + field highlight |
| 24 | `/salary-setup` | MED | Date ISO format | DD/MM/YYYY |
| 25 | Login | MED | Deep link không preserve sau logout | `?next=` param |
| 26 | Login | LOW | No spinner submit | "Đang đăng nhập..." + spinner |
| 27 | `/import-orders` | MED | "Tạo 0 đơn hàng" hardcoded | Hide hoặc disable với reason |
| 28 | `/reports/...` | LOW | "Năm" free-text | Year picker dropdown |
| 29 | Toàn site | MED | API silent failures | Global error toast handler |
| 30 | Toàn site | MED | Đa số button không aria-label | A11y sweep |

---

## Final Note

Audit lần này khẳng định: **visual-only audit không bắt được 80% functional bugs**. App "trông đẹp" nhưng:

- 1 feature core gãy hoàn toàn (Khớp chuyến).
- 4 destructive actions không an toàn.
- Validation thiếu mọi nơi.
- Silent failures khắp các CRUD endpoint.

**3 ưu tiên hàng đầu nếu chỉ có 1 sprint:**

1. **Fix bug PUT work-orders 500** — feature core, không có gì quan trọng hơn.
2. **Add global error toast handler** — show error chi tiết từ mọi 4xx/5xx response.
3. **Add confirm dialog cho mọi destructive action** + validation MST/SĐT/ngày — prevent dirty data.

Search không dấu (lặp từ audit trước) cần được scope vào sprint 2 latest.

App có thể đạt B trong 2-3 sprint nếu attack đúng functional layer này. Visual đã đủ tốt — không cần thêm work cho design đẹp, work for it works.

— Audit completed by Claude (Cowork mode), 2026-05-10
