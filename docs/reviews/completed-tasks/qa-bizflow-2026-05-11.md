# BizFlow QA Report — phucloc.tingting.vip

**Date:** 2026-05-11
**Auditor:** Senior QA Engineer
**Bundle under test:** `index-AQTT0l1L.js` — confirmed via hard reload after SW unregistration + cache clear. **NEW bundle vs v5's `index-CdqPefyj.js`**. Fresh deployment confirmed.
**Session user:** `ketoan` (id=3, JWT name="ketoan", display name "Kế Toán Test")
**Previous open issues:** NX14, NX15, NX16, NX13, TASK-004, F-02 (DriverHome crash)

---

## Executive Summary

**Net status vs v5:** 8 issues confirmed fixed, 1 partially fixed, 4 regressed, 5 new findings.

**Fixes confirmed (vs v5 open list):**
- NX14 ✅ — ClientDetail dialog now shows all fields (Loại, Điện thoại, MST, Địa chỉ, Người liên hệ)
- NX16 ✅ — `GET /api/v1/users → 200` for ketoan; page now shows 6 accounts
- TASK-004 ✅ — Driver labels show full names everywhere (Nguyễn Văn Tài, Trần Minh Đức, Lê Quang Anh)
- F-02 ✅ — DriverHome no longer crashes; shows salary + trip list correctly
- F-03 ✅ — "Tạo chuyến" button visible in driver header
- F-05 ✅ — Container validation error distinguishes format vs check-digit
- F-16 ✅ — Driver history trip cards now navigate to /driver/job/:id
- F-10 ✅ — Director dashboard now has "Hoạt động gần đây" activity feed

**Regressions (was fixed in v5, broken now):**
- NX11 🔴 REGRESSED — `POST /api/v1/push/subscriptions` fires repeatedly (4–5× per session)
- NX15 🔴 REGRESSED — Đơn hàng filter chips reverted to "Chờ khớp" (was "Chờ ghép" in v5)

**Partially fixed:**
- NX15 🟡 PARTIAL — Ghép chuyến filter chips now say "Đã khớp" (not "Hoàn thành" anymore) but "Chờ khớp" persists instead of "Chờ ghép". Both pages now consistently use "Chờ khớp" — wrong term, but at least consistent.

**New findings (BF-01 through BF-05):**
- BF-01 🔴 HIGH — Đơn hàng Doanh thu column: all 19 rows show "0 ₫"
- BF-02 🔴 HIGH — Director dashboard "Đã khớp" KPI counter shows 0 despite matched trips existing
- BF-03 🟡 MED — `GET /api/v1/driver/earnings → 403` fires for driver role (explains "— đ" on some trips)
- BF-04 🟡 MED — Salary period displayed off by one: config says Day 26→25, kỳ hiện tại shows "25/04→24/05"
- BF-05 🟢 LOW — Auto-fill chips (Tạo chuyến) do not populate Khách hàng; only route fields filled

---

## BizFlow Test Results

### Flow 1 — Kế toán: Upload Excel + verify đơn hàng

**Step 1a: Login as ketoan**
- ✅ Login → `/accountant`. JWT confirms id=3, role="accountant"
- ✅ Dashboard paints in <2s with KPIs

**Step 1b: Nhập đơn (Excel upload)**
- ✅ Import modal opens from `/accountant/trips` → "Nhập đơn" button
- ✅ Modal contains: Khách hàng dropdown, Ngày mặc định (date input), drag-drop file area + "Phân tích tệp" button
- ⚠️ FILE UPLOAD NOT TESTABLE — Chrome MCP file_upload is restricted. Modal UI appears complete.
- ⚠️ F-15 persists — date input is plain `<input type="date">`, no per-row time override

**Step 1c: Đơn hàng list verification**
- ✅ 19 đơn hàng visible in May 2026 period
- ✅ Filter chips: Tất cả / Chờ khớp / Đã khớp (visible)
- 🔴 **BF-01** — ALL 19 rows show "0 ₫" in Doanh thu column (confirmed via JS: 0 non-zero instances)
- 🔴 **NX15 REGRESSION** — Filter chips now say "Chờ khớp" again. In v5 this was fixed to "Chờ ghép"
- ✅ 9 Chờ khớp, 10 Đã khớp counters visible

---

### Flow 2 — Tài xế: Create new chuyến đã đi

**Step 2a: Login as taixe**
- ✅ Login → `/driver` — NO CRASH (F-02 confirmed fixed)
- ✅ Driver home shows: salary period 26/04→25/05, lương 3.270.000 ₫, 11 chuyến

**Step 2b: Tạo chuyến navigation**
- ✅ "Tạo chuyến" button visible in header — F-03 confirmed fixed
- ✅ Navigates to `/driver/work-orders/new`
- ✅ Form shows: Container section (with type selector), Khách & Tuyến section, auto-fill chips

**Step 2c: Form validation**
- ✅ F-05 FIXED — entering `QATX1234567` shows "Sai số kiểm tra — định dạng đúng nhưng mã kiểm tra không khớp" (not the generic format error)
- 🟡 **BF-05** — Auto-fill chips only fill Điểm lấy + Điểm trả, NOT Khách hàng. "Còn thiếu: ảnh cont, khách hàng" after chip click.
- ⚠️ PHOTO REQUIRED — "ảnh cont" still required; submission cannot be tested via MCP tools

**Step 2d: Driver history + trip detail**
- ✅ F-16 FIXED — trip cards navigate to `/driver/job/:id`
- ✅ Trip detail shows: container(s), khách hàng, thời gian, thu nhập (₫ for matched, "Chờ khớp" for unmatched)
- 🟡 "Cung đường: -" on all trip detail pages — route data missing
- 🔴 **BF-03** — `GET /api/v1/driver/earnings → 403` fires twice during driver session. Some trip cards show "— đ" for income which may be caused by this 403.

---

### Flow 3 — Kế toán: Ghép chuyến

**Step 3a: Open Ghép chuyến**
- ✅ 21 "chờ khớp" work orders listed on entry
- ✅ Work order cards show full driver names (Nguyễn Văn Tài, Trần Minh Đức, Lê Quang Anh) — TASK-004 fixed
- 🟡 Route field shows "—" in all work order cards (same data issue as driver side)
- 🔴 **NX15 PARTIAL** — Filter chips: `Tất cả / Chờ khớp / Đã khớp`. "Hoàn thành" is gone (progress) but "Chờ khớp" should be "Chờ ghép"

**Step 3b: Manual match**
- ✅ Click W001032 → right pane shows 3 candidate trip orders
- ✅ Match scoring per-criterion panel renders (Ngày đi, Tuyến đường, Khách hàng, Điểm lấy, Điểm trả, Container)
- ✅ Click "Ghép" on T002001 (3/6) → `POST /api/v1/reconcile → 200`
- ✅ W001032 removed from left list (21→20 "chờ khớp")
- ✅ Right pane clears to "Chọn một phiếu để xem..."
- ✅ F-06 persists — no low-confidence warning (3/6 match accepted silently)
- ✅ F-09 persists — "Tự động ghép" button present; silent on 0 auto-match results

**Step 3c: Post-match verification (driver side)**
- ✅ After W001032 match, job/32 shows "Thu nhập: 350.000 ₫" — income updated correctly

---

### Flow 4 — Tài xế: verify chuyến shows matched + income

- ✅ Matched trip (job/32): shows `350.000 ₫` income
- ✅ Unmatched trips show "Chờ khớp" status with no income amount
- 🔴 **BF-03** — `GET /api/v1/driver/earnings → 403` (both date-range variants) — earnings API blocked for driver role

---

### Flow 5 — Giám đốc: dashboard verification

**Login as giamdoc**
- ✅ Login → `/director`
- ✅ Dashboard renders: 35 Tổng chuyến, 17 Chờ xử lý, 25.1 tr ₫ Doanh thu
- ✅ F-10 FIXED — "Hoạt động gần đây" activity feed shows 4 audit log entries
- 🔴 **BF-02** — "Đã khớp: 0" KPI counter is WRONG; recent orders list shows at least T0032 as "Đã khớp"
- 🟡 Activity log copy issues: "Ghép ghép chuyến" (duplicated word), "Tạo reconciliations" (English word leaked)
- 🟡 **REGRESSION** — In v5, giamdoc had a sidebar with 3 items (Tổng quan, Thông báo, Quản lý tài khoản). Now NO sidebar at all — navigation is only header buttons (Thông báo, Tài khoản). User is trapped on dashboard with no in-app navigation.
- ✅ Month navigation chevrons work
- ✅ "Xem tất cả" button present on recent orders panel

---

### Edge Case Tests

**Alias mapping:**
- ⚠️ NOT TESTABLE without DB access or alias management UI (F-12/F-13 still open)
- Auto-match threshold still produces 0 automatic matches in current data set

---

## Detailed Findings

---

### BF-01 — Đơn hàng Doanh thu column shows 0 ₫ for all rows

**Type:** Bug
**Layer:** Backend / Frontend
**Affected Role/Flow:** Kế toán — Đơn hàng
**Description:** All 19 trip orders in `/accountant/trips` display `0 ₫` in the Doanh thu (revenue) column. Verified via JavaScript: `document.body.innerText.match(/0 ₫/g).length === 19`, non-zero ₫ count = 0. The Dashboard KPI card still shows 25.050.000 ₫ Doanh thu, confirming the data exists but is not rendering per-row.
**Severity:** High
**Reproduce:** Login ketoan → Đơn hàng → observe Doanh thu column.
**Root cause hypothesis:** The `trip_order.revenue` field is not populated from pricing rules, or the `/api/v1/trip-orders` response no longer includes a `price`/`revenue` field that the table column expects.

---

### BF-02 — Director KPI "Đã khớp" counter shows 0

**Type:** Bug
**Layer:** Frontend / Backend
**Affected Role/Flow:** Giám đốc — Tổng quan
**Description:** The KPI card "Đã khớp" on the director dashboard shows `0`. The "Lệnh vận chuyển gần đây" panel immediately below shows T0032 as "Đã khớp". Both panels query different endpoints: KPI likely uses `/api/v1/trip-orders` without the correct filter, the recent list uses a separate endpoint. The stat counter is sourcing from stale or uncounted data.
**Severity:** High
**Reproduce:** Login giamdoc → Tổng quan → observe KPI card Đã khớp = 0 vs recent list showing matched orders.
**Network evidence:** Director dashboard calls `GET /api/v1/trip-orders` (no filters) + `GET /api/v1/audit-logs?page_size=8`.

---

### BF-03 — Driver earnings endpoint returns 403 for driver role

**Type:** Bug
**Layer:** Backend
**Affected Role/Flow:** Tài xế — thu nhập
**Description:** `GET /api/v1/driver/earnings?start_date=...&end_date=...` returns `403 Forbidden` when called by the `taixe` session. This endpoint is called twice per driver session with two different date ranges. The 403 means the driver cannot fetch their own earnings via this API. Some trips showing "— đ" on the driver home may be caused by this 403. The income shown on matched trips (e.g. 350.000 ₫ on job/32) likely comes from a different endpoint (`GET /api/v1/work-orders/:id`), not the earnings summary endpoint.
**Severity:** High
**Reproduce:** Login taixe → navigate home → observe network: `GET /api/v1/driver/earnings → 403`.
**Impact:** Drivers cannot see their total salary/earnings summary. The "3.270.000 ₫ lương" shown on the driver home may be calculated client-side or from a different API, and may be incorrect.

---

### BF-04 — Salary period configuration off by one

**Type:** Bug
**Layer:** Frontend / Backend
**Affected Role/Flow:** Kế toán — Kỳ lương
**Description:** The salary config shows Từ ngày=26, Đến ngày=25, and the label reads "Ngày 26 tháng này → ngày 25 tháng sau". But "Kỳ hiện tại" displays `25/04 → 24/05` — one day early. Today is 2026-05-11. The current period with from=26 should be 26/04 → 25/05, not 25/04 → 24/05. The period calculation subtracts 1 from both the from and to days.
**Severity:** Medium
**Reproduce:** Login ketoan → Cài đặt → Kỳ lương → observe "Kỳ hiện tại: 25/04 → 24/05" vs config "Ngày 26 tháng này → ngày 25 tháng sau".

---

### BF-05 — Auto-fill route chips do not populate Khách hàng field

**Type:** Usability Issue
**Layer:** Frontend
**Affected Role/Flow:** Tài xế — Tạo chuyến
**Description:** Clicking a quick-fill chip (e.g., "PAN / Tân Cảng → Hiệp Phước") populates Điểm lấy and Điểm trả but NOT the Khách hàng field. The chip label shows the client abbreviation ("PAN") but the customer dropdown remains "Chọn khách hàng". This defeats the purpose of quick-fill — drivers must still manually select the customer after using the chip.
**Severity:** Medium
**Reproduce:** Login taixe → Tạo chuyến → click any auto-fill chip → observe Khách hàng still empty.
**Recommendation:** The chip click handler should also fire a `setCustomer(chipData.clientId)` in addition to setting the route. The `chipData` already contains the client abbreviation (PAN → Công ty TNHH PAN HẢI AN).

---

### NX11 — REGRESSION: Push subscription fires repeatedly

**Type:** Bug (Regression)
**Layer:** Frontend
**Affected Role/Flow:** All roles
**Description:** `POST /api/v1/push/subscriptions → 201` fires 4–5 times in a single session. This was confirmed FIXED in v5 (0 push POSTs across 689 requests). The current session captured 5 POSTs to `/api/v1/push/subscriptions` during navigation across accountant pages + one page load as giamdoc. The push registration logic is re-triggering on every route change or component mount cycle.
**Severity:** Medium
**Impact:** Server-side noise; potential duplicate subscription records; may cause double-push notifications.
**Reproduce:** Login any role → navigate between pages → observe network: multiple `POST /push/subscriptions → 201`.

---

### NX15 — PARTIAL FIX / REGRESSION on Đơn hàng side

**Type:** Bug (Vocabulary)
**Layer:** Frontend
**Affected Role/Flow:** Kế toán — Đơn hàng, Ghép chuyến
**Description:** In v5, the Đơn hàng page filter chips were correctly fixed to `Chờ ghép / Đã khớp`. This has REGRESSED — both Đơn hàng and Ghép chuyến now use `Chờ khớp`. Progress: "Hoàn thành" on Ghép chuyến is now gone (replaced with "Đã khớp"). Remaining gap: both pages say "Chờ khớp" instead of "Chờ ghép".
**Correct target:** `Tất cả / Chờ ghép / Đã khớp` on BOTH pages.
**Severity:** Low (vocabulary issue, not a blocker)

---

### Director sidebar — REGRESSION

**Type:** Bug (Regression)
**Layer:** Frontend
**Affected Role/Flow:** Giám đốc
**Description:** In v5, the director role had a sidebar with 3 navigation items (Tổng quan, Thông báo, Quản lý tài khoản). In this build, the director has NO sidebar — only a header with "Thông báo" and "Tài khoản" buttons. The director is trapped on the Tổng quan page with no navigation to user management or notifications page.
**Severity:** Medium
**Reproduce:** Login giamdoc → observe no sidebar, no navigation menu.

---

## Status of Previously Open Issues

| # | Issue | v5 Status | v6 Status | Notes |
|---|-------|-----------|-----------|-------|
| NX13 | Khách hàng data all `—` | 🔴 STILL | **✅ FIXED** | 5 customers now have SĐT, MST, Địa chỉ, Người liên hệ populated |
| NX14 | ClientDetail dialog hides fields | 🔴 STILL | **✅ FIXED** | Dialog shows Loại, SĐT, MST, Địa chỉ, Người liên hệ |
| NX15 | Filter chip vocabulary drift | 🆕 NEW | **🟡 PARTIAL** | "Hoàn thành" gone from Ghép chuyến. But "Chờ khớp" on BOTH pages (Đơn hàng regressed back) |
| NX16 | 403 masquerades as empty state | 🆕 NEW | **✅ FIXED** | `GET /users → 200`, 6 accounts shown |
| TASK-004 | Raw usernames in driver labels | 🔴 STILL | **✅ FIXED** | Full names everywhere |
| F-02 | DriverHome splitRouteParts crash | 🔴 HIGH | **✅ FIXED** | No crash; home renders with salary + trips |
| F-03 | No in-app navigation to Tạo chuyến | 🔴 HIGH | **✅ FIXED** | "Tạo chuyến" button in header |
| F-05 | Container error misleading copy | 🟡 MED | **✅ FIXED** | Check-digit vs format errors distinguished |
| F-10 | Director no activity feed | 🟡 MED | **✅ FIXED** | "Hoạt động gần đây" section with 4 audit entries |
| F-16 | Driver history cards non-clickable | 🔴 HIGH | **✅ FIXED** | Navigate to /driver/job/:id |
| NX11 | Push subscriptions re-enabled | ✅ FIXED | **🔴 REGRESSED** | 5 POSTs per session again |

---

## What Could Not Be Tested

- **Excel upload (Phase 1b)** — Chrome MCP file_upload blocked. Modal UI looks correct.
- **Photo upload in Tạo chuyến** — "ảnh cont" required; no bypass available through browser tools
- **Alias management** — F-12/F-13 still have no UI; cannot test alias-variant auto-match
- **Real DB row counts** — verified via UI counts only

---

**End of BizFlow QA Report v6 (2026-05-11)**
