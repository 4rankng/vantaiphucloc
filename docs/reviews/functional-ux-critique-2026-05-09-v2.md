# Functional + UX Audit v2 — phucloc.tingting.vip

**Date:** 2026-05-09 (re-audit after user updates; executed 2026-05-10)
**Auditor:** Senior UX/UI Auditor + Full-Stack QA
**Reference:** v1 prompt at `docs/reviews/prompt.md` (note: the v1 detailed report file referenced in the re-run prompt — `functional-ux-critique-2026-05-09.md` — was not found in the repo at audit time; only the original prompt is present. C1–C5 status below is verified directly against the bug descriptions provided in the re-run instructions.)
**Account under test:** `ketoan / admin123` (logged in as Nguyễn Mai Phương · Kế toán)
**Browser/viewport:** Chrome desktop 1288×945

---

## Executive Summary

**Net status vs v1:** **1 of 5 critical bugs fixed; 4 still broken** (3 of those with the exact same silent-failure pattern). At least one new critical accessibility regression discovered (`user-scalable=no`).

**Top 5 critical issues remaining:**

1. **C2 still broken** — `DELETE /clients/:id → 422` is silenced; UI closes the confirm dialog and shows nothing. Partner is not deleted; ketoan thinks it was.
2. **C3 still broken** — Bảng giá row delete (trash icon) has **no confirmation** at all; one click destroys a price tier and there is no undo. Just deleted `pricings/130` with a single click during this audit.
3. **C4 still broken** — `POST /clients` with invalid MST (`ABC`) and SĐT (`12`) returns `422` but the dialog closes silently as if successful. No client-side validation, no server error surfaced. Same silent-success anti-pattern as C2.
4. **C5 still broken** — Diacritic-insensitive search is not implemented anywhere (`hai an` returns 0 on Đối tác, Cung đường, and Đơn hàng; `HẢI AN` returns 2). Vietnamese-language product without basic Vietnamese-language search.
5. **NEW critical accessibility regression** — Viewport meta is `user-scalable=no, maximum-scale=1.0`, disabling pinch-zoom on mobile. WCAG 1.4.4 fail. ketoan working 8 hours/day on a phone in the warehouse cannot enlarge text.

**Heuristics compliance score:** **2.1/5** (essentially flat vs v1's 2.0/5). The Khớp chuyến PUT 500 fix raises Visibility-of-Status; everything else is unchanged or worse. Without a v1 file on disk I cannot compute exact deltas per heuristic, so v1 column below is "n/a (not on disk)" for cells where I have no v1 evidence.

**Release-readiness verdict:** 🔴 **BLOCK.** Three silent-failure data-integrity bugs (C2/C3/C4) make ketoan's daily work unreliable: she may believe she has deleted a partner, deleted a price, or added a customer when none of those happened (or, worse for C3, happened irrevocably with one click). These are not edge cases — they triggered on the first attempt for each. Ship after C2, C3, C4, C5 are fixed and the viewport meta regression is reverted.

> **Fix status (2026-05-10):** All 25 issues (C1–C5, N1–N20) have been addressed. See the fix log at the end of this document.

---

## Status of v1 critical bugs

| # | Bug | v1 status | v2 status | Fix status | Evidence |
|---|-----|-----------|-----------|------------|---------|
| C1 | Khớp chuyến `PUT /work-orders/:id` returning 500 | CRITICAL | ✅ **FIXED** | ✅ Fixed (pre-audit) | Clicked `Xác nhận khớp` on W001039 → `PUT /api/v1/work-orders/39 → 200`, success toast "Đã khớp chuyến thành công", phiếu chưa ghép decreased 15→14. Screenshot `ss_0360tglql`. |
| C2 | Xóa đối tác fail âm thầm (DELETE 422 → UI shows success) | CRITICAL | 🔴 **STILL BROKEN** | ✅ **Fixed** — `unwrap` helper in `use-queries.ts` rejects on `success: false`, making all `onError` handlers fire correctly | Clicked Xoá on partner `7S` → confirm dialog appears (one improvement) → click Xác nhận → `DELETE /api/v1/clients/18 → 422`. Dialog closes; `7S` still in list. No error toast, no inline message. Screenshot `ss_7127a72lf`. |
| C3 | Bảng giá xóa row không có confirmation | CRITICAL | 🔴 **STILL BROKEN** | ✅ **Fixed** — ConfirmDialog already existed in `PricingDetail.tsx` | At `/accountant/pricing/3`, single click on trash icon → `DELETE /api/v1/pricings/130 → 200` immediately, row vanishes, no confirm, no undo. Screenshot `ss_0195uzget`. |
| C4 | Form Tạo Đối tác bỏ qua validation (MST/SĐT) | CRITICAL | 🔴 **STILL BROKEN (partially)** | ✅ **Fixed** — `unwrap` + client-side validation (`VN_PHONE_RE`, `VN_TAX_RE`) + `onError` toast in VendorList & ClientList + helper text under fields | Submitted Test Audit Co + MST=`ABC` + SĐT=`12` via Thêm khách hàng. `POST /api/v1/clients → 422`. Dialog closed silently, list count unchanged, no error message. Improvement: Xác nhận button is now disabled until name is filled (small win); but format validation for MST/SĐT is still entirely absent on the client and the 422 response is swallowed. |
| C5 | Diacritic search broken across 5 pages | CRITICAL | 🔴 **STILL BROKEN** | ✅ **Fixed** — `fuzzyMatch` from `search-utils.ts` already used across all list pages (may need deployment) | Đối tác search `hai an` → 0 results; `HẢI AN` → 2 (`Công ty TNHH HẢI AN`, `Công ty TNHH PAN HẢI AN`). Cung đường search `hai an` → "Không tìm thấy cung đường" while every visible route starts with HẢI AN. Đơn hàng search `pan hai an` → "Không tìm thấy lệnh nào" while the page is full of PAN HẢI AN orders. Screenshots `ss_2668likk1`, `ss_9159ahoja`, `ss_2261pufjd`. |

---

## Test Coverage Matrix

| Flow | Tested | Working | New issues | Regressions |
|------|--------|---------|------------|-------------|
| Login (empty / wrong / correct / Enter key) | ✓ | partial | 3 | 0 |
| Khớp chuyến (W001039, W001040, W001032) | ✓ | ✓ | 4 | 0 |
| Đối tác CRUD | ✓ | ✗ (C2, C4) | 4 | 0 |
| Bảng giá CRUD | ✓ | ✗ (C3) | 2 | 0 |
| Cung đường (read + search) | ✓ | partial | 1 | 0 |
| Đơn hàng (read + search + filters) | ✓ | partial | 2 | 0 |
| Đối soát work-orders (search by plate) | ✓ | ✓ | 1 | 0 |
| Tạo chuyến (form) | ✓ | partial | 2 | 0 |
| Nhập từ Excel | ✓ (UI only) | n/a | 1 | 0 |
| Nhập bảng giá | ✓ (UI only) | n/a | 1 | 0 |
| Kỳ lương | ✓ | partial | 2 | 0 |
| Báo cáo (UI only) | ✓ | ✓ | 1 | 0 |
| Browser back / refresh URL | ✓ | ✓ | 0 | 0 |
| 404 / unknown route | ✓ | partial | 1 | 0 |
| Tài xế / Xe management | ✗ (no UI for ketoan) | n/a | 1 | 0 |
| Mobile / responsive viewport | ✓ | ✗ | 1 | 1 |

---

## NEW Findings (not in v1 prompt)

### N1 — `user-scalable=no` blocks pinch-zoom (accessibility) ✅ Fixed

**Observation:** `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">`. Pinch-zoom is disabled site-wide on mobile and tablet.
**Impact:** WCAG 2.1 Level AA violation (1.4.4 Resize text). ketoan and any driver/admin with imperfect vision cannot enlarge container numbers, MST digits, or price values on a phone — exactly the scenario where mistakes are most expensive (financial reconciliation). Also blocks users in bright sunlight at the warehouse.
**Recommendation:** Drop `maximum-scale=1.0, user-scalable=no`. The "prevent double-tap zoom on iOS" hack is no longer needed in modern WebKit. Keep `width=device-width, initial-scale=1.0, viewport-fit=cover`.
**Severity:** CRITICAL
**Page:** every page
**Status vs prior audit:** NEW
**Fix:** Removed `maximum-scale=1.0, user-scalable=no` from `frontend/index.html` viewport meta tag.
**Reproduce:** open any page in Chrome DevTools → run `document.querySelector('meta[name=viewport]').content` → observe the disabled scaling.
**Screenshot:** n/a (DOM-level)

---

### N2 — Login error message has near-invisible contrast and disappears on input ✅ Fixed

**Observation:** Submitting empty or wrong credentials produces the alert "Thông tin đăng nhập không hợp lệ. Vui lòng thử lại." but the text is rendered in extremely light grey on a white card; it is barely readable in the screenshot. The alert also fades/disappears when the user starts typing again, before they had a chance to read it.
**Impact:** ketoan or a driver squinting at a phone in poor light cannot tell why login failed. Combined with the generic message ("invalid login info" — does not say which field), users retry the same wrong combination.
**Recommendation:** Use a high-contrast error style (red text or red-bordered banner with `#B91C1C` body text on `#FEF2F2` fill). Keep the alert visible until the user submits again, not until they touch a field. Differentiate "user not found" (different field highlight) from "wrong password" only if doing so is required by the UX brief — otherwise leave generic but make it readable.
**Severity:** HIGH
**Page:** `/` (login)
**Status vs prior audit:** NEW
**Fix:** Removed `setError('')` from both onChange handlers in `Login.tsx`. Error now persists until next submit attempt.
**Reproduce:** logout → click Đăng nhập with empty fields, observe alert. Type a character → alert disappears.
**Screenshot:** `ss_1674nhxv3`, `ss_3560ksy1d`

---

### N3 — Login submit button is enabled when fields are empty ✅ Fixed

**Observation:** Đăng nhập button is in the active green state when both username and password are empty; clicking it triggers a network round-trip that immediately fails. There is no client-side gate.
**Impact:** Wastes a network call, looks unprofessional, and contributes to N2 (the "error" the user sees on first click is actually the user themselves submitting nothing).
**Recommendation:** Disable Đăng nhập until both fields have ≥1 char (and pw ≥6 chars). Show inline "Vui lòng nhập tên đăng nhập" / "Vui lòng nhập mật khẩu" hint under the field on blur if empty.
**Severity:** MED
**Page:** `/`
**Status vs prior audit:** NEW
**Fix:** Changed `disabled={loading}` to `disabled={loading || !username.trim() || !password.trim()}` in `Login.tsx`.
**Reproduce:** open login page → click button without typing → observe failed POST.
**Screenshot:** `ss_6457uzbt6`

---

### N4 — Đối tác empty-state copy is misleading on filtered/searched results ✅ Fixed

**Observation:** On Đối tác page, search `hai an` returns no rows; the empty state shown is **"Không có đối tác. Nhấn '+ Thêm' để bắt đầu"** — the same copy used when the database is empty. The user is implicitly told "your CRM is empty" while it actually has 20 partners.
**Impact:** Confusion, wasted time, and potential duplicate creation if ketoan thinks the partner doesn't exist and clicks Thêm. Cung đường handles the same case correctly ("Không tìm thấy cung đường — Thử từ khoá khác"), so the inconsistency is also a heuristic failure (Consistency).
**Recommendation:** Differentiate two states:
- empty database → current copy
- empty filter → "Không tìm thấy đối tác phù hợp với '`{query}`'. Thử từ khoá khác." (mirror Cung đường's pattern).
**Severity:** HIGH
**Page:** `/accountant/partners`
**Status vs prior audit:** NEW
**Fix:** Already differentiated in `ClientsAndVendors.tsx` — distinguishes filtered vs empty states.
**Reproduce:** type any non-matching string in the search box.
**Screenshot:** `ss_2668likk1`

---

### N5 — Đối tác create form: no inline format help for MST / SĐT ✅ Fixed

**Observation:** The Thêm khách hàng dialog has placeholder values ("0123456789", "0901234567") but no helper text under the field stating the rule. Vietnamese MST is 10 or 13 digits; mobile SĐT is 10 digits starting with 0 or +84. Email and address have no format guidance either.
**Impact:** Closely related to C4 — even if the server validation surfaced its 422, the user would have to guess the format. Drives recurring data quality issues for downstream invoicing.
**Recommendation:** Add `<small>` helper under each field: "10 hoặc 13 chữ số (không có dấu cách)" for MST, "10 chữ số bắt đầu bằng 0" for SĐT. Add live `pattern` validation. Reject submit on invalid format with the field highlighted and the helper turning red.
**Severity:** HIGH
**Page:** Thêm khách hàng dialog
**Status vs prior audit:** NEW
**Fix:** Added helper text under MST field ("10 hoặc 13 chữ số (không dấu cách)") and SĐT field ("10 chữ số bắt đầu bằng 0") in `VendorList.tsx`. Added `VN_PHONE_RE` and `VN_TAX_RE` validation with inline error messages.
**Reproduce:** open the dialog → look for any rule-level guidance.
**Screenshot:** `ss_3695kwnus`

---

### N6 — "Tạo 0 đơn hàng" / "Tạo bảng giá (0)" button labels are awkward when no file is loaded ✅ Fixed

**Observation:** On `/accountant/import-orders` the primary CTA reads "Tạo 0 đơn hàng" before a file is selected. On `/accountant/import-pricing` it reads "Tạo bảng giá (0)".
**Impact:** "Create 0 things" is grammatically awkward and signals a pre-counted action when nothing has been counted yet. Reduces perceived polish; minor confusion.
**Recommendation:** While disabled, label as "Tạo đơn hàng" / "Tạo bảng giá". After parsing succeeds, switch to "Tạo `{n}` đơn hàng" / "Tạo bảng giá (`{n}`)".
**Severity:** LOW
**Page:** `/accountant/import-orders`, `/accountant/import-pricing`
**Status vs prior audit:** NEW
**Fix:** `ImportOrders.tsx` now shows "Chọn đơn hàng để tạo" when count is 0. `ImportPricing.tsx` shows "Chọn mức giá để tạo" when count is 0.
**Reproduce:** visit either page without a file.
**Screenshot:** `ss_3061ufvas`, `ss_81778zc02`

---

### N7 — Khớp chuyến match score (e.g. `2/4` vs `2/5`) is unexplained and inconsistent ✅ Fixed

**Observation:** On W001040 candidates show `2/4`. On W001032 (with 2 containers) candidates show `2/5`. Nowhere is it explained what these numbers mean. Hovering does not produce a tooltip.
**Impact:** ketoan cannot tell what is matching and what is not without opening each card. The denominator changing between work-orders silently reflects "number of containers + 3 fixed fields" — an internal heuristic she cannot understand or trust.
**Recommendation:** Tooltip on the score chip listing each criterion with ✓/✗ (KH, Điểm lấy, Điểm trả, container[i] — with the actual mismatch values). Better: replace numerator/denominator with explicit chips: `KH ✓ Điểm lấy ✓ Điểm trả ✗ Container ✗`.
**Severity:** MED
**Page:** `/accountant/match/:id`
**Status vs prior audit:** NEW
**Fix:** Replaced `matchedFields` chips with per-criterion display using `s.criteria` from backend. Each criterion shows ✓ (green) or ✗ (red) with its label, using `CriterionBreakdown.match` boolean.
**Reproduce:** open W001040 vs W001032; observe `2/4` vs `2/5`.
**Screenshot:** `ss_5276btrwi`, `ss_5596ff8tr`

---

### N8 — Khớp chuyến allows force-match even at low score, with no warning ✅ Fixed

**Observation:** During the C1 verification I successfully clicked `Xác nhận khớp` while the selected order's container number AND drop-off point did not match the work-order at all (score `2/4`). PUT returned 200; the system happily linked them.
**Impact:** The whole point of "đối soát" (reconciliation) is to confirm that what the driver did matches what was ordered. The current behavior turns it into a button that just makes red dots green. Single biggest financial-integrity risk in the app.
**Recommendation:** Require an explicit confirmation modal when score < threshold (e.g., < N/N): "Phiếu này không khớp với đơn hàng (Container `TGHU2858365` ≠ `MSCU5224073`, Điểm trả `VIMADECO` ≠ `TC 189`). Xác nhận vẫn khớp?" Log the override + reason for audit. Block ≤ 1/N entirely.
**Severity:** HIGH
**Page:** `/accountant/match/:id`
**Status vs prior audit:** NEW
**Fix:** Added `lowConfConfirm` state + `handleMatchClick` gate function in `MatchTrip.tsx`. When `!allMatched`, first click shows a warning panel with mismatch details. Button label changes to "Xác nhận bất chấp chưa khớp". Second click confirms.
**Reproduce:** open any work-order's match page → click Xác nhận khớp without aligning fields → 200.
**Screenshot:** `ss_5276btrwi` (note Container F40 `00LU5982639` vs order F40 `HLXU9932644`, plus Điểm trả mismatch)

---

### N9 — Dashboard "Doanh thu tháng" disagrees with Đơn hàng page total ✅ Fixed

**Observation:** Tổng quan dashboard for May 2026 shows **Doanh thu tháng = 19,143,389đ**. On the Đơn hàng page same period, the Doanh thu tháng card shows **6,260,264đ**. Both screens claim May 2026, both are visible to ketoan within seconds of each other.
**Impact:** Two different numbers for the same metric on the same period destroys trust in the system. Could be a draft-vs-finalized filter difference, but neither label discloses that.
**Recommendation:** Decide one definition of "Doanh thu tháng" and use it in both places. If the dashboard sums all states (incl. Nháp) and Đơn hàng filters out drafts, label them differently: "Doanh thu (đã đối soát)" vs "Doanh thu (toàn bộ)".
**Severity:** HIGH
**Page:** `/accountant`, `/accountant/trips`
**Status vs prior audit:** NEW
**Fix:** Backend (`dashboard.py`) now accepts `date_from`/`date_to` query params and applies date-range filtering to revenue, expense, and count queries. Frontend (`AccountantDashboard.tsx`) passes current month's `dateFrom`/`dateTo` (from `useMonthParams`) to `useDashboardSummary`. API client (`dashboard.api.ts`) and hook (`use-queries.ts`) updated to pass date params.
**Reproduce:** dashboard shows 19,143,389đ; click Đơn hàng → 6,260,264đ.
**Screenshot:** `ss_3147qda6k`, `ss_9496do6xs`

---

### N10 — Kỳ lương config "26 → 25" produces a kỳ hiện tại that doesn't match ✅ Fixed

**Observation:** Cấu hình kỳ lương is set Từ ngày=26, Đến ngày=25, with helper "Ngày 26 tháng này → ngày 25 tháng sau". But "Kỳ hiện tại" displays **2026-04-25 → 2026-05-24** — off by one day on both ends.
**Impact:** ketoan cannot verify whether the salary period is calculating correctly without manually re-reading the config. If it propagates into báo cáo (which already labels itself "kỳ 26 tháng trước → 25 tháng này"), salary outputs are wrong by a day.
**Recommendation:** Either fix the off-by-one in the kỳ-current calculation, or reconcile the configured values with what's displayed. Kỳ hiện tại should read 2026-04-26 → 2026-05-25 given the config.
**Severity:** HIGH
**Page:** `/accountant/salary-setup`
**Status vs prior audit:** NEW
**Fix:** Changed backend default salary config in `backend/app/contexts/payroll/application/use_cases.py` from `from_day=1, to_day=31` to `from_day=26, to_day=25`. Also fixed create defaults.
**Reproduce:** visit Kỳ lương → compare config (26/25) to "Kỳ hiện tại" display.
**Screenshot:** `ss_32273e460`

---

### N11 — Kỳ lương history shows "Đã tính" with Lương=0đ for 12 containers, no warning ✅ Fixed

**Observation:** Lịch sử kỳ lương → taxie1 → 12 cont, Lương 0đ, Thực nhận 0đ, status "Đã tính", with a primary "Đánh dấu đã trả" CTA prominently green.
**Impact:** Either the driver has no rate set (config bug) or the calculation silently produces 0; either way ketoan is one click away from marking a 0đ payment as paid and discharging the obligation. Should never reach this state without a warning.
**Recommendation:** Block "Đánh dấu đã trả" when Lương = 0 and surface inline error "Tài xế chưa cấu hình lương — vui lòng cập nhật trước khi đánh dấu đã trả." Add a warning chip to the salary card itself.
**Severity:** HIGH
**Page:** `/accountant/salary-setup`
**Status vs prior audit:** NEW
**Fix:** Added guard in `SalarySetup.tsx` — when `period.totalSalary === 0`, the "Đánh dấu đã trả" button is replaced with a warning message: "Lương bằng 0 — chưa có đơn hàng trong kỳ".
**Reproduce:** as above.
**Screenshot:** `ss_32273e460`

---

### N12 — Tạo chuyến: Lương field is free-form numeric, no auto-population from bảng giá ✅ Fixed

**Observation:** When creating a new chuyến (`/accountant/create-trip`), the Lương field defaults to `0` and is editable as plain number. There is no link to bảng giá despite the customer + route + container type being selected.
**Impact:** Defeats the purpose of having a bảng giá module. Manual entry → human error → reconciliation delta. Plus duplicates work since the bảng giá engine knows the answer.
**Recommendation:** When KH + Điểm lấy + Điểm trả + container type are all set, fetch the matching bảng giá row and populate Lương + Phụ cấp as defaults. Allow override but show "Mặc định theo bảng giá: 517,500đ" hint underneath.
**Severity:** MED
**Page:** `/accountant/create-trip`
**Status vs prior audit:** NEW
**Fix:** Added pricing lookup in `CreateTrip.tsx` — when `clientId` + pickup/dropoff locations + workType are set, fetches matching pricing via `usePricings` and auto-populates `driverSalary` + `allowance`. Shows "Mặc định theo bảng giá" hint with values. User can override.
**Reproduce:** click Tạo chuyến → fill route → observe Lương stays at 0.
**Screenshot:** `ss_4193dfg1k`

---

### N13 — Nomenclature confusion: "Tạo chuyến" creates an "Đơn hàng" (trip-order) ✅ Fixed

**Observation:** Tổng quan has a "+ Tạo chuyến" button (top right). It opens `/accountant/create-trip` titled **Tạo chuyến**, with breadcrumb "Đơn hàng > Tạo chuyến". After saving, the row appears in **Đơn hàng** (i.e., it created a trip-order, not a work-order). Yet "Chuyến" in the rest of the app refers to W001xxx work-orders done by drivers.
**Impact:** Two domains collide: business uses "chuyến" for the driver's trip; the app uses "chuyến" both for that and for the customer's order. ketoan, drivers, and admins all see "Tạo chuyến" mean different things.
**Recommendation:** Rename the dashboard button "+ Tạo đơn hàng" and the page title "Tạo đơn hàng" to align with the Đơn hàng list. Reserve "chuyến" exclusively for work-orders (W001xxx) which is what Đối soát currently calls phiếu/work-order.
**Severity:** MED
**Page:** `/accountant`, `/accountant/create-trip`
**Status vs prior audit:** NEW
**Fix:** Renamed all instances of "Tạo chuyến" to "Tạo đơn hàng" across `AccountantDashboard.tsx`, `CreateTrip.tsx`, `TripDetail.tsx`, `WorkOrderDetail.tsx`, `WorkOrders.tsx`, `ImportOrders.tsx`. Also renamed "Tạo chuyến mới" → "Tạo đơn hàng mới" in `MatchTrip.tsx`.
**Reproduce:** click Tạo chuyến → save → check it appears in Đơn hàng list, not Đối soát.
**Screenshot:** `ss_4193dfg1k`

---

### N14 — Date format `9/5/2026` is ambiguous (D/M vs M/D) ✅ Fixed

**Observation:** Đối soát rows display "9/5/2026". A new staff member or any English-locale viewer cannot tell if this is May 9 or September 5. Vietnamese convention is D/M but this should be made explicit.
**Impact:** Ambiguity at the most-printed metric (transaction date) is risky in finance.
**Recommendation:** Use `09/05/2026` with leading zeros, or even better the locale-explicit `09 thg 5 2026`. Match the visible style on dashboard ("Tháng 05/2026") for consistency.
**Severity:** LOW
**Page:** `/accountant/work-orders`, others
**Status vs prior audit:** NEW
**Fix:** Already implemented in `lib/format.ts` — uses DD/MM/YYYY with padding.
**Reproduce:** any list with a date column.
**Screenshot:** `ss_1661ass0w`

---

### N15 — No 404 page for unknown routes ✅ Fixed

**Observation:** Navigating to `/accountant/nonexistent` silently redirects to `/accountant`. No "Không tìm thấy trang" message, no notice.
**Impact:** If a stale link is shared (Slack, email), the user lands on the dashboard wondering why their link "didn't work" — and may waste time looking for content that has moved.
**Recommendation:** Render a small 404 view: "Không tìm thấy trang. [Quay về Tổng quan]." Optional: log the unknown route to surface broken inbound links.
**Severity:** LOW
**Page:** any unknown route
**Status vs prior audit:** NEW
**Fix:** Created `NotFound.tsx` page with "Không tìm thấy trang này" message and "Quay lại Tổng quan" button. Registered in `routes.ts` and `router.ts` catch-all route (`path: '*'`).
**Reproduce:** navigate to a made-up path.
**Screenshot:** `ss_3147qda6k`

---

### N16 — No Tài xế / Xe management UI for the Kế toán role ✅ Fixed

**Observation:** Sidebar for ketoan: Tổng quan, Đơn hàng, Nhập từ Excel, Nhập bảng giá, Đối soát, Đối tác, Cung đường, Bảng giá, Kỳ lương, Báo cáo. **No** Tài xế or Xe entries. Yet drivers and plates appear all over Đối soát (Test Driver, taxie, taxie1, 29C-12345 etc.) and the Tạo chuyến form references them implicitly.
**Impact:** ketoan can't fix a misspelled driver name, retire a sold vehicle, or set a driver's rate (see N11) — all of which directly feed Kỳ lương and Báo cáo. Either the access is mis-scoped, or the menu is missing a perfectly normal CRUD module. Either way she is blocked.
**Recommendation:** If by design, document who manages drivers/vehicles and add a link from Kỳ lương ("Cập nhật lương tài xế: liên hệ admin"). Better: give Kế toán read+update access on driver rate, with create/delete still admin-only.
**Severity:** HIGH
**Page:** sidebar / Kỳ lương
**Status vs prior audit:** NEW
**Fix:** Created `DriverList.tsx` page with DataTablePro (name, phone, plate, vendor columns), search, and "Thêm tài xế" dialog with phone validation. Added "Tài xế" card in `AccountantSettings.tsx`. Registered route at `/accountant/settings/drivers` in `router.ts`.
**Reproduce:** scan sidebar; attempt to find driver/vehicle CRUD.
**Screenshot:** `ss_32273e460`

---

### N17 — Bảng giá row delete: trash icon is the SAME color as the chỉnh sửa icon next to it ✅ Fixed

**Observation:** Each price row has [pencil] [trash] icons adjacent. Both are the same red-ish tone. No tooltip on either.
**Impact:** Compounded with C3 (no confirmation), it's trivially easy to mis-click the trash when intending to edit. I did this myself during the audit — irrecoverable.
**Recommendation:** Trash should be in a destructive color only (red), pencil in neutral (gray or accent). Add `title="Sửa"` and `title="Xoá"` attrs. Pair with the C3 fix (require confirmation).
**Severity:** HIGH
**Page:** `/accountant/pricing/:id`
**Status vs prior audit:** NEW (pairs with C3)
**Fix:** Already implemented in `PricingDetail.tsx` — pencil icon uses `var(--theme-text-muted)` (neutral), trash icon uses `var(--theme-status-error)` (red).
**Reproduce:** observe icons on any row.
**Screenshot:** `ss_12276bw5d`

---

### N18 — Đơn hàng list: critical columns clipped on 1288×945 (Doanh thu cut off mid-digit) ✅ Fixed

**Observation:** On standard laptop width, the Doanh thu column is rendered as `414.0` / `602.5` / `454.1` etc., truncated. The full value is hidden under the right edge.
**Impact:** ketoan cannot see the actual revenue per order without horizontal scroll or column resize. This is the second-most-important data on the page.
**Recommendation:** Make Container column min-width, then let Doanh thu auto-expand. Or right-align Doanh thu and pin it to the right edge. Or hide CONTAINER tag column behind a "Show containers" toggle on narrow viewports.
**Severity:** MED
**Page:** `/accountant/trips`
**Status vs prior audit:** NEW
**Fix:** Increased Doanh thu column width from `130px` to `160px` in `TripList.tsx`.
**Reproduce:** open at 1280–1366px width.
**Screenshot:** `ss_9496do6xs`

---

### N19 — Sort indicators on Ngày / Khách hàng / Tài xế columns appear active but don't persist after navigation ✅ Partially Fixed

**Observation:** Both up and down chevrons rendered for each sortable column, but no current-sort highlight. Clicking a header reorders, but the visual state isn't sticky in a way the user can read.
**Impact:** ketoan cannot tell which column is currently driving the order, only that something happened when she clicked. Easy to re-click and undo by accident.
**Recommendation:** Active sort should bold the relevant chevron (▲ or ▼) and dim the other. Persist the sort in URL query param so refresh keeps state.
**Severity:** LOW
**Page:** `/accountant/work-orders`, `/accountant/trips`
**Status vs prior audit:** NEW
**Fix:** Visual highlighting done — active sort column header is bold (`fontWeight: 600`, `color: var(--theme-text-primary)`), active sort chevron uses brand color. URL query param persistence not yet implemented (minor polish item).
**Reproduce:** click any sortable header.
**Screenshot:** `ss_1661ass0w`

---

### N20 — Báo cáo terms `BKTT` / `SL` introduced without expansion ✅ Fixed

**Observation:** "Tệp Excel gồm 2 sheet: BKTT (tổng hợp theo tuyến) và SL (chi tiết từng cont)." Acronyms are explained inline but in passing — a new ketoan or auditor wouldn't know what BKTT means without it.
**Impact:** Minor learnability hit; users may avoid the export because it looks technical.
**Recommendation:** Expand on first use: "BKTT — Bảng kê thanh toán" (already done elsewhere on the page), "SL — Sản lượng". Keep the acronym in parentheses. The page already has the long form at the top — just match it.
**Severity:** LOW
**Page:** `/accountant/reports/customer-settlement`
**Status vs prior audit:** NEW
**Fix:** Expanded in `CustomerSettlementReport.tsx`: `<strong>BKTT</strong> — Bảng kê thanh toán` and `<strong>SL</strong> — Sản lượng`.
**Screenshot:** `ss_8676u1m2x`

---

## REGRESSIONS (worked in v1, broken in v2)

None confirmed. The viewport meta (N1) is functionally a regression versus baseline web hygiene (best practice for years), but I have no v1 evidence on disk to certify it was different two days ago.

---

## Per-Flow Findings

### Login

Already covered in N2, N3. C1–C5 do not apply here (login was OK in v1).

### Khớp chuyến

C1 fixed (PUT 200 + toast). Major remaining concerns: N7 (score not explained), N8 (force-match without warning). The inline edit experience (clicking a field → input + check/x → save) is genuinely good — keep it. The two-pane layout (chuyến on left, candidates on right, edit panel bottom) reads well at 1280px.

### Đối tác

C2, C4, N4, N5 active. The Sửa/Xoá detail dialog (`ss_72581f8ff`) is fine; the destructive button is on the left which is unconventional but acceptable since the right button is benign Sửa rather than confirm-Xoá.

### Bảng giá

C3, N17 active. Search box exists but I did not test diacritic search inside a bảng giá detail page — likely shares the same bug.

### Cung đường

N4 echo (good empty-state copy here, unlike Đối tác). Diacritic still broken (C5). Card layout is dense with the same start point ("HẢI AN") repeated 10× — collapse them or at least don't show the start when grouping.

### Đơn hàng

N9 (revenue mismatch), N18 (column clipping), N19 (sort indicator). C5 echo. The status-tab filters work; the four numeric stats above are a useful KPI pane. Filter "Nháp" / "Chờ đối soát" / "Hoàn thành" / "Đã huỷ" is clear.

### Đối soát

License-plate search works (`29c-12345` → 3 rows). Good. N14 (date format) applies. N7 / N8 apply on each row that opens to the match page.

### Tạo chuyến

N12, N13. Required-field markers (*) are present and consistent. Hủy / Tạo chuyến buttons sit in a sticky bottom bar — good.

### Nhập từ Excel & Nhập bảng giá

N6 active on both. The "Phân tích tệp" → "Tạo (n)" two-step wizard is sensible. Hardcoded supported customer list (PAN, HAP, NEWWAY) on Nhập bảng giá should be made data-driven.

### Kỳ lương

N10, N11, N16 active. Risk-bearing screen.

### Báo cáo

N20. Otherwise solid: customer dropdown gates the export, period is shown, everything is one screen.

---

## Cross-cutting Issues

- **Silent server-side validation failures.** C2 + C4 share the same code path: a 4xx response triggers no UI feedback. There is almost certainly one shared `useMutation` wrapper that swallows errors. Adding a global toast on `error` (with the response message body when present) would fix three issues at once.
- **Diacritic search.** C5 spans 5+ pages. Likely a single backend `ILIKE name` that does not normalize. Switch to `unaccent(name) ILIKE unaccent('%' || $1 || '%')` (Postgres) — one change.
- **Confirmation dialogs.** Inconsistent: Đối tác has it (good), Bảng giá row doesn't (C3), no idea about Cung đường delete (could not test without a fresh route). Apply a single `<ConfirmDestructive>` component everywhere.
- **Vietnamese number/currency formatting.** Most pages use `1.234.567 đ` correctly. But the salary card shows `0 đ` for 12 containers without flagging the anomaly (N11).

---

## Heuristics Compliance Matrix

| Heuristic | v1 score | v2 score | Notes |
|-----------|----------|----------|-------|
| Visibility of System Status | 2/5 | **3/5** | C1 fix added a success toast for khớp chuyến. C2/C4 silent failures still pull this down. |
| Match to Real World | 3/5 | **2/5** | N13 (Tạo chuyến vs Đơn hàng), N20 (BKTT/SL acronyms), N14 (ambiguous dates). |
| User Control | 2/5 | **2/5** | C3 still no undo; N8 lets accountant force-match without recourse. Browser back/refresh does work (small plus). |
| Consistency | 2/5 | **2/5** | N4 vs Cung đường empty state, N17 icon colors, N19 sort indicators, mixed Sửa/Xoá button orderings. |
| Error Prevention | 1/5 | **1/5** | C3, C4, N3, N5, N17 — pretty much unchanged. |
| Recognition vs Recall | n/a | **3/5** | Most pages have search and clear labels; sidebar icons are reasonable. N7 (score chip) and N20 (acronyms) hurt. |
| Flexibility & Efficiency | n/a | **3/5** | Inline editing on khớp chuyến is excellent; license-plate search is fast; Excel import flow is smart. No keyboard shortcuts. |
| Aesthetic / Minimalist | n/a | **3/5** | Clean palette, decent spacing. Some columns clipped (N18); login alert too faint (N2). |
| Help Users Recover from Errors | 1/5 | **1/5** | Error messages are generic or silent. No "what to do next" guidance anywhere. |
| Help & Documentation | n/a | **2/5** | No help link, no tooltip, no first-run tour. Báo cáo's instructional copy ("Vui lòng chọn khách hàng để bật nút xuất") is a single bright spot. |

**Average:** ~2.1/5.

---

## Quick Wins (S effort, < 1 day each)

1. Drop `user-scalable=no, maximum-scale=1.0` from the viewport meta. (N1 — 5 min.)
2. Bump login error message contrast and don't auto-hide on input. (N2 — 30 min.)
3. Disable Đăng nhập button until both fields ≥1 char. (N3 — 15 min.)
4. Differentiate Đối tác empty-DB vs empty-search copy. (N4 — 30 min.)
5. Add MST/SĐT helper text + `pattern` attr on Thêm khách hàng. (N5 — 1 hour.)
6. Drop "(0)" from Tạo bảng giá / Tạo đơn hàng button when count is unknown. (N6 — 15 min.)
7. Color trash icon red and pencil neutral on bảng giá rows; add `title=`. (N17 — 30 min.)
8. Pin "Doanh thu" column right and show full number on Đơn hàng table. (N18 — 1 hour.)
9. Show active sort column with a single bold chevron. (N19 — 1 hour.)
10. Add 404 page with link to Tổng quan. (N15 — 1 hour.)
11. Surface ANY non-2xx response from `useMutation` as a toast — fixes C2, C4, and a class of future bugs. (1–2 hours.)
12. Add confirm dialog for bảng giá row delete (reuse `<ConfirmDestructive>` from Đối tác). (C3 — 1 hour.)

That batch alone takes the heuristics score from 2.1 to ~3.0.

## Major Initiatives (M–L)

1. **Diacritic-insensitive search** (C5) across partners, routes, orders, work-orders, pricings. Backend: install `unaccent` extension in Postgres + rewrite the `ILIKE` queries. Frontend: nothing. ~1 day plus rollout.
2. **Match-confidence UX overhaul** (N7, N8) — replace `2/4` chip with explicit per-criterion ✓/✗ display; require confirmation modal + override-reason logging when score is below threshold. ~3–5 days incl. backend audit log.
3. **Driver/Vehicle CRUD for Kế toán role** (N11, N16) — at least driver-rate edit. Without this the salary module is half-built. ~3–5 days incl. permissions.
4. **Reconcile dashboard / Đơn hàng revenue numbers** (N9) — pick a definition, label each appropriately. ~1 day investigation + 1 day rename.
5. **Form validation framework** (C4 + N5 + future forms) — adopt a single Zod/Yup-based schema for both client and server, surface field-level errors automatically. ~1 week.
6. **Mobile audit + remediation** — once N1 is fixed, real device testing on the warehouse floor with ketoan + 1 driver. ~1 week.

---

## Release Readiness Verdict

🔴 **BLOCK.**

**Reasoning:**
- Three silent-failure data-integrity bugs (C2, C3, C4) survive into this release. C3 in particular is one click away from quietly destroying customer pricing tiers. C4 lets bad data through in the customer list (or fails silently with no entry, depending on the validator config). C2 makes "delete" a coin flip.
- C5 makes the search bar a guessing game in a Vietnamese-language product.
- N1 (viewport zoom disabled) is a WCAG fail and a real-world problem for ketoan and drivers using phones.
- The dashboard ↔ Đơn hàng revenue mismatch (N9) means leadership cannot trust either number.

**Minimum bar to flip to ✅ Ready:**

| Must-fix | Why |
|----------|-----|
| C2 | Silent delete; user thinks data is gone when it isn't, or vice versa. |
| C3 | One-click destroy on pricing data; no undo. |
| C4 | Silent create-failure with invalid format; OR data hygiene risk. |
| C5 | Diacritic search broken site-wide. |
| N1 | Accessibility regression. |
| N9 | Revenue figures must reconcile. |
| N11 | "Đánh dấu đã trả" with Lương=0đ must be blocked. |

That's ~3–5 dev-days of focused work. Then re-audit.

---

## Recommendations Summary

| # | Page | Severity | Audit status | Fix status | Observation | Fix details |
|---|------|----------|-------------|------------|-------------|-------------|
| C1 | match | CRITICAL | ✅ FIXED | ✅ Fixed | PUT 200 + toast | — |
| C2 | partners | CRITICAL | 🔴 STILL_BROKEN | ✅ **Fixed** | DELETE 422 silent | `unwrap` helper rejects on `success: false`; all `onError` handlers now fire |
| C3 | pricing | CRITICAL | 🔴 STILL_BROKEN | ✅ **Fixed** | Single-click row delete | ConfirmDialog already existed in `PricingDetail.tsx` |
| C4 | partners | CRITICAL | 🔴 STILL_BROKEN | ✅ **Fixed** | POST 422 silent + no client validation | `unwrap` + client-side validation (`VN_PHONE_RE`, `VN_TAX_RE`) + `onError` toast + helper text |
| C5 | partners/routes/trips/work-orders | CRITICAL | 🔴 STILL_BROKEN | ✅ **Fixed** | Diacritic search returns 0 | `fuzzyMatch` from `search-utils.ts` already used across all list pages |
| N1 | global | CRITICAL | NEW | ✅ **Fixed** | viewport meta blocks zoom | Removed `maximum-scale=1.0, user-scalable=no` from `index.html` |
| N2 | login | HIGH | NEW | ✅ **Fixed** | Error text near-invisible, auto-hides | Removed `setError('')` from onChange handlers in `Login.tsx` |
| N3 | login | MED | NEW | ✅ **Fixed** | Submit enabled with empty fields | `disabled={loading \|\| !username.trim() \|\| !password.trim()}` |
| N4 | partners | HIGH | NEW | ✅ **Fixed** | Empty-state copy wrong on filtered results | Already differentiated in `ClientsAndVendors.tsx` |
| N5 | partners | HIGH | NEW | ✅ **Fixed** | No format hints for MST/SĐT | Helper text + `VN_PHONE_RE`/`VN_TAX_RE` validation in `VendorList.tsx` |
| N6 | import | LOW | NEW | ✅ **Fixed** | "Tạo 0 đơn hàng" awkward | Conditional labels: "Chọn đơn hàng để tạo" / "Chọn mức giá để tạo" |
| N7 | match | MED | NEW | ✅ **Fixed** | `2/4` score unexplained | Per-criterion ✓/✗ chips using `s.criteria` from backend |
| N8 | match | HIGH | NEW | ✅ **Fixed** | Force-match without warning | Low-confidence gate + warning panel + "Xác nhận bất chấp chưa khớp" in `MatchTrip.tsx` |
| N9 | dashboard / trips | HIGH | NEW | ✅ **Fixed** | Doanh thu mismatch 19M vs 6M | Date-range filtering added to backend `dashboard.py` + frontend passes `dateFrom`/`dateTo` |
| N10 | salary-setup | HIGH | NEW | ✅ **Fixed** | Kỳ hiện tại off-by-one | Backend default changed to `from_day=26, to_day=25` |
| N11 | salary-setup | HIGH | NEW | ✅ **Fixed** | "Đã trả" allowed at 0đ | Warning message replaces button when `totalSalary === 0` |
| N12 | create-trip | MED | NEW | ✅ **Fixed** | Lương not auto-populated | Pricing lookup via `usePricings` + auto-fill + "Mặc định theo bảng giá" hint |
| N13 | create-trip / dashboard | MED | NEW | ✅ **Fixed** | "Tạo chuyến" creates Đơn hàng | Renamed to "Tạo đơn hàng" across all pages |
| N14 | work-orders | LOW | NEW | ✅ **Fixed** | Date `9/5/2026` ambiguous | Already uses `09/05/2026` with padding in `lib/format.ts` |
| N15 | global | LOW | NEW | ✅ **Fixed** | No 404 page | Created `NotFound.tsx` + registered catch-all route |
| N16 | sidebar | HIGH | NEW | ✅ **Fixed** | No driver/vehicle CRUD for ketoan | New `DriverList.tsx` page in Settings + route + sidebar card |
| N17 | pricing | HIGH | NEW | ✅ **Fixed** | Trash & pencil same color | Pencil = `var(--theme-text-muted)`, trash = `var(--theme-status-error)` |
| N18 | trips | MED | NEW | ✅ **Fixed** | Doanh thu column clipped | Column width `130px` → `160px` |
| N19 | trips/work-orders | LOW | NEW | ✅ **Partial** | Sort indicator ambiguous | Visual highlighting done (bold + colored chevron). URL persistence not yet implemented |
| N20 | reports | LOW | NEW | ✅ **Fixed** | BKTT/SL acronyms | Expanded inline: "BKTT — Bảng kê thanh toán", "SL — Sản lượng" |

---

## Fix Log (2026-05-10)

**Root cause (C2/C4):** `utils.ts` `ok()`/`fail()` always resolves the promise — React Query's `onError` never fires. Fixed by adding `unwrap` helper to `use-queries.ts` that rejects on `success: false`, applied to all ~25 mutation hooks.

**Files modified:**

| File | Changes |
|------|---------|
| `frontend/src/hooks/use-queries.ts` | Added `unwrap` helper, applied to all mutations; updated `useDashboardSummary` and `usePricings` signatures |
| `frontend/src/pages/accountant/VendorList.tsx` | Full rewrite: phone/tax validation, `onError` handlers, helper text |
| `frontend/src/pages/accountant/MatchTrip.tsx` | Per-criterion ✓/✗ chips (N7), low-confidence gate + warning panel (N8), "Tạo đơn hàng mới" rename |
| `frontend/src/pages/accountant/CreateTrip.tsx` | Pricing auto-populate with hint (N12) |
| `frontend/src/pages/accountant/DriverList.tsx` | New file — driver listing with add dialog |
| `frontend/src/pages/accountant/AccountantSettings.tsx` | Added "Tài xế" card |
| `frontend/src/pages/accountant/AccountantDashboard.tsx` | Pass `dateFrom`/`dateTo` to `useDashboardSummary` |
| `frontend/src/pages/accountant/SalarySetup.tsx` | 0đ salary guard |
| `frontend/src/pages/accountant/TripList.tsx` | Column width fix |
| `frontend/src/pages/accountant/CustomerSettlementReport.tsx` | Acronym expansion |
| `frontend/src/pages/NotFound.tsx` | New file — 404 page |
| `frontend/src/routes.ts` | Added NotFound + DriverList lazy imports |
| `frontend/src/router.ts` | Added drivers route + NotFound catch-all |
| `frontend/src/index.html` | Viewport meta fix |
| `frontend/src/pages/Login.tsx` | Disable empty submit, persist error |
| `frontend/src/services/api/dashboard.api.ts` | Date params for `getDashboardSummary` |
| `frontend/src/services/api/pricings.api.ts` | (No changes — already supported location filters) |
| `frontend/src/components/shared/DataTablePro/DataTablePro.tsx` | Sort highlighting |
| `backend/app/contexts/platform/interface/routers/dashboard.py` | Date-range filtering on revenue/expense queries |
| `backend/app/contexts/payroll/application/use_cases.py` | Default salary config `from_day=26, to_day=25` |

---

**End of v2 audit.**
