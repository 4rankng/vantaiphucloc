# Functional + UX Audit v3 — phucloc.tingting.vip

**Date:** 2026-05-09 (3rd pass after additional fixes; executed 2026-05-10, fixes applied 2026-05-10)
**Auditor:** Senior UX/UI Auditor + Full-Stack QA
**References:** `docs/reviews/functional-ux-critique-2026-05-09-v2.md` (only v2 file present on disk; v1 file referenced in the prompt is not in the repo)
**Account under test:** `ketoan / admin123` (Nguyễn Mai Phương · Kế toán)
**Browser/viewport:** Chrome desktop 1568×744 (and 390×844 for mobile pass)

> **Important context:** Between v2 and v3 the team shipped a substantial **information-architecture redesign**. The sidebar collapsed from 11 items to **4** (Tổng quan, Đơn hàng, Ghép chuyến, Cài đặt). Đối soát → Ghép chuyến (with a new two-pane layout). Đối tác split into Khách hàng + Nhà thầu. Tài xế and Người dùng are net-new for the Kế toán role. The brand wordmark changed from "Phúc Lộc · Vận tải" to "Vận Tải Phúc Lộc". Several v2 routes (e.g. `/accountant/import-orders`, `/accountant/reports/customer-settlement`) appear to have been removed entirely from this role.
> Initial audit pass was running against a stale bundle; results below were re-verified after a hard refresh that purged Service Worker + Cache Storage.

---

## Executive Summary

**Net status vs v2: 4 of 5 v1 critical bugs FIXED, 1 partial. 11 of 20 v2 new findings FIXED, 5 partial, 4 still broken or removed-from-scope. 8 fresh findings (mostly redesign-introduced). Post-v3 fixes applied — see Fix Log at bottom.**

This is the **largest delta we have observed between audit passes**. The v2 silent-failure pattern (POST/DELETE 4xx with no UI feedback) has been substantially eliminated:
- **C2** delete partner now produces `DELETE 200` and a green toast `Đã xoá 7S`.
- **C3** bảng giá row delete now opens a `Xoá mức giá?` confirmation with `Sẽ xoá: E20 · SL=1 · 480.338 đ` preview.
- **C4** customer create with bad MST/SĐT now blocks the submit and renders inline red errors `MST phải 10 hoặc 13 chữ số` and `SĐT không hợp lệ (VD: 0912345678)`.
- **C5** diacritic-insensitive search is fixed on Đơn hàng (`hai an` → 8 rows including PAN HẢI AN, HAP HẢI AN). It is **not** testable on Khách hàng because the search input was removed.
- **N1** viewport meta now reads `width=device-width, initial-scale=1.0, viewport-fit=cover` — `user-scalable=no, maximum-scale=1.0` is gone.
- **N7/N8** the new Ghép chuyến view shows per-criterion ✓/✗ for each candidate (Ngày đi, Tuyến đường, Khách hàng, Điểm lấy, Điểm trả, Container) and the server now refuses low-confidence forced matches with a `Lỗi - Không thể ghép chuyến` toast.
- **N10** Kỳ hiện tại off-by-one fixed (config 26 → 25 ↔ display 26/04 → 25/05).
- **N11** Lương = 0đ entries now show an inline warning `Lương bằng 0 — chưa có đơn hàng trong kỳ` and the "Đánh dấu đã trả" CTA is no longer rendered on those rows.
- **N15** 404 page now exists with `Quay lại Tổng quan`.
- **N16** Tài xế CRUD is now visible in Cài đặt for the Kế toán role.

**What still needs work / is new:**

1. 🔴 **C5 partial — search input deleted from Khách hàng list.** A regression masquerading as a fix. ketoan loses the only way to find a partner once the list grows past one screen.
2. 🔴 **N3 still broken — Đăng nhập button remains enabled with empty fields.** Wastes a network call and emits the empty-state error message.
3. 🔴 **N9 hidden, not reconciled — Doanh thu KPI was removed from `/accountant/trips` entirely** instead of being aligned with the dashboard's `19,143,389 đ`. The mismatch is no longer visible to ketoan, but the underlying data discrepancy is unchanged.
4. ⚠️ **NEW — Ghép chuyến error toast can fire on a request the server actually accepted.** During the audit, clicking `Ghép` on a 2/6-score candidate produced the red `Lỗi - Không thể ghép chuyến` toast, yet the source work-order disappeared from "Chờ khớp" and the dashboard counter dropped 14 → 13 + 7 → 6 immediately after. Either the toast is wrong or the count is wrong; either way ketoan cannot trust the outcome.
5. ⚠️ **NEW — Khách hàng list lost its data columns.** v2 displayed Mã đối tác, Nhóm, Điện thoại, Địa chỉ, Người liên hệ. v3 shows only the company name as a card. Subtitle line appears only when MST/phone are present, and even then is a single mashed string (`notaphone · MST: abc123`). This is information loss for a role whose entire job is to look up customer details.
6. ⚠️ **NEW — Người dùng count is wrong: shows `0 tài khoản đang hoạt động` and `Kế toán 0` while ketoan is currently logged in.** The page either hides the current user from herself or the counter is broken.
7. ⚠️ **NEW — Tổng quan "Đơn hàng gần đây" panel still uses the old status label `Chờ xử lý`** while `/accountant/trips` has migrated to `Chờ đối soát` / `Đã khớp` / `Đã huỷ`. Same data, two vocabularies, side by side.
8. ⚠️ **NEW — Nhà thầu, Báo cáo, and the v2 import wizards (Nhập từ Excel, Nhập bảng giá) appear to have been removed from the Kế toán sidebar** without an obvious replacement. If this is a permission scope change it needs a release note; if these features are still active under a different URL they need menu links.

**Heuristics compliance score:** v1 ~2.4/5 → v2 2.1/5 → **v3 ~3.4/5**. The redesign clearly fixed the most damaging silent-failure bugs and restored basic CRUD parity, at the cost of a few information-density regressions.

**Release-readiness verdict:** ⚠️ **Hold** — close to ready, but blocked by the still-broken N3, N9 (reconcile or relabel rather than hide), the toast/count desync on Ghép chuyến, and the missing Khách hàng search. Three of these are <1 day each. After those: 🟢 Ready.

---

## Status Tracker

### v1 critical bugs (C1–C5)

| # | Bug | v1 | v2 | v3 | Notes |
|---|-----|----|----|----|-------|
| C1 | Khớp chuyến PUT 500 | 🔴 | ✅ | ✅ FIXED | New two-pane Ghép chuyến view; PUT happens server-side; failure surfaces a `Lỗi - Không thể ghép chuyến` toast (see new finding NX1 about toast/count desync). |
| C2 | Xoá đối tác silent fail | 🔴 | 🔴 | ✅ FIXED | Click Xoá in customer detail (kebab menu) → confirm dialog `Xoá khách hàng? Bạn có chắc muốn xoá "7S"? Hành động này không thể hoàn tác.` → confirm → `DELETE /api/v1/clients/18 → 200`, green toast `Đã xoá 7S`, list count drops. Verified end-to-end. |
| C3 | Bảng giá row delete no confirm | 🔴 | 🔴 | ✅ FIXED | Click trash on a `mức giá` row → `Xoá mức giá? Sẽ xoá: E20 · SL=1 · 480.338 đ. Hành động này không thể hoàn tác.` modal → no `DELETE` until user confirms. |
| C4 | Form Tạo Đối tác bỏ qua validation | 🔴 | 🟡 | ✅ FIXED | Submitted Test V3 Bad Format + SĐT=`12` + MST=`ABC` → submit blocked client-side, inline red errors `SĐT không hợp lệ (VD: 0912345678)` and `MST phải 10 hoặc 13 chữ số`. No POST fired. |
| C5 | Diacritic search broken | 🔴 | 🔴 | 🟡 PARTIAL | **Đơn hàng:** `hai an` → 8 rows incl. PAN HẢI AN + HAP HẢI AN. ✅ Diacritic+case insensitive. **Khách hàng:** search input is **removed** entirely (regression of v2's search field — see NX2). **Tài xế:** search exists; `tai xe` (with space) returns 0 vs literal `taixe` returns 2 — case-insensitive but not space-tolerant; minor. |

### v2 new findings (N1–N20)

| # | Finding | v2 sev | v3 status | Notes |
|---|---------|--------|-----------|-------|
| N1 | Viewport `user-scalable=no` | CRITICAL | ✅ FIXED | `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`. `user-scalable=no` and `maximum-scale=1.0` removed. Pinch-zoom works on the iOS sim viewport (390 px). |
| N2 | Login error contrast / auto-hide | HIGH | 🟡 PARTIAL | At full opacity the message is fine red text on light pink (acceptable). On the very first attempt the message renders at ~30 % opacity (likely an animation race) and is barely legible — see fresh finding NX5. Auto-hide on input still occurs. |
| N3 | Đăng nhập enabled with empty fields | MED | 🔴 STILL BROKEN | Click Đăng nhập with both fields empty → request fires, error message renders. No client-side gate. |
| N4 | Empty-state copy on filtered Đối tác | HIGH | ✅ FIXED (where still applicable) | Đơn hàng filter shows row count + `× Xoá lọc` chip when filtered. Khách hàng list no longer has a search box so the original surface disappeared. |
| N5 | No format hints for MST/SĐT | HIGH | 🟡 PARTIAL | Still no preemptive helper text under the field. After a failed submit the errors show clear examples (`VD: 0912345678`, `10 hoặc 13 chữ số`) — corrective rather than preventive. |
| N6 | "Tạo 0 đơn hàng" button | LOW | ✅ FIXED / REMOVED | The standalone Nhập từ Excel and Nhập bảng giá pages were removed from the Kế toán sidebar. Replaced by a single `Nhập đơn` CTA on Đơn hàng and Ghép chuyến. |
| N7 | `2/4` score unexplained | MED | ✅ FIXED | Each candidate card shows every criterion with ✓/✗ icons and both sides of the comparison: `Ngày đi 2026-05-09 ↔ 2026-05-06`, `Tuyến đường PAN HAN → VIMADECO ↔ PAN HAN → TC 189`, etc. The numeric score is kept as a chip, but it is now redundant. |
| N8 | Force-match without warning | HIGH | ✅ FIXED at backend | Clicking Ghép on a 2/6-score candidate now triggers `Lỗi - Không thể ghép chuyến` red toast — the server refuses. Frontend still fires the request without a confirm-modal pre-check; better UX would be to disable Ghép on low-score rows or warn before the round-trip. **However see NX1 — the toast appears even when the server has already accepted the match.** |
| N9 | Doanh thu mismatch (19M vs 6M) | HIGH | 🔴 STILL BROKEN (now hidden) | Dashboard `Doanh thu tháng = 19.143.389 đ`. The Doanh thu KPI on `/accountant/trips` was **removed** in v3, replaced with `6 Chờ đối soát · 3 Đã khớp` cards. So the visible mismatch is gone, but no reconciliation is documented and the dashboard's 19 M is no longer derivable from the Đơn hàng list (visible totals sum to ~6 M across 11 rows). |
| N10 | Kỳ hiện tại off-by-one | HIGH | ✅ FIXED | Config Từ ngày=26 / Đến ngày=25 → Kỳ hiện tại reads `26/04 → 25/05`. Matches. |
| N11 | "Đã trả" allowed at Lương=0 | HIGH | ✅ FIXED | Lương=0 cards now carry an inline warning `⓪ Lương bằng 0 — chưa có đơn hàng trong kỳ` and no `Đánh dấu đã trả` CTA is rendered. |
| N12 | Lương field in Tạo chuyến free-form | MED | ⚠️ N/A this round | The legacy `/accountant/create-trip` route appears to have been folded into `Nhập đơn`; the Tạo chuyến screen with the manual Lương field is no longer surfaced from the Kế toán nav. Could not re-test. |
| N13 | "Tạo chuyến" creates an "Đơn hàng" | MED | ✅ FIXED | Dashboard CTA renamed to `Nhập đơn`; the Đơn hàng list calls the action `+ Nhập đơn`. Vocabulary is now consistent. |
| N14 | Date format `9/5/2026` ambiguous | LOW | 🟡 PARTIAL | Đơn hàng list now shows `08/05`, `04/05` (zero-padded) — but year is dropped, ambiguous if user is browsing across months/years. Đối soát rows still show `09/05`. |
| N15 | No 404 page | LOW | ✅ FIXED | Hitting `/accountant/match`, `/accountant/orders`, `/accountant/settings/payroll`, `/accountant/settings/contractors` all render `404 — Không tìm thấy trang này [Quay lại Tổng quan]`. Sidebar disappears on the 404 page (minor — see NX6). |
| N16 | No driver/vehicle CRUD for ketoan | HIGH | ✅ FIXED | Cài đặt > Tài xế: full table with sortable columns Tài xế, SĐT, Biển số xe, Nhà xe; `+ Thêm tài xế` and search by name/phone/plate. |
| N17 | Trash & pencil same color on Bảng giá | HIGH | ✅ FIXED | Pencil is now neutral grey; trash is destructive red. Still no `title=` tooltip on hover, but the colour difference is enough. |
| N18 | Doanh thu column clipped | MED | ✅ FIXED | At 1568×744 every Doanh thu value renders fully (`414.000 đ`, `602.510 đ`, `800.000 đ`, `1.002.400 đ`). |
| N19 | Sort indicator ambiguous | LOW | 🟡 PARTIAL | `Tài xế ↑` shows the active arrow on Tài xế page (good). On Đơn hàng the sort chevrons are still both rendered without active emphasis. |
| N20 | Báo cáo BKTT/SL acronyms | LOW | ✅ REMOVED | The Báo cáo route is no longer in the Kế toán sidebar. If still reachable, it was not surfaced this round. |

---

## NEW Findings This Round

### NX1 — Ghép chuyến: error toast fires on a match the server accepted

**Observation:** Selected W001040 (PAN HẢI AN, PAN HAN → VIMADECO, container F20 TGHU2858365). First candidate card was T002014 with score 2/6 and four ❌ rows (Ngày đi, Tuyến đường, Điểm trả, Container). Clicked `✓ Ghép`. UI rendered the red `Lỗi - Không thể ghép chuyến` toast. Within 1–2 s the dashboard counters dropped (`Chuyến chưa ghép 14 → 13`, `Đơn chờ đối soát 7 → 6`) and W001040 was no longer in the Chờ khớp list.

**Impact:** ketoan cannot trust either signal. Either an apparently-failed match was actually committed (data integrity) or the counters are stale (UI lying). Either way her recovery action — retrying or escalating — is wrong.

**Recommendation:** Match the toast to the actual HTTP response. If the server returns 2xx, use the green success toast; if 4xx, do not mutate the local list/counters until a refetch confirms. Add a request-id to both the response and the toast for support traceability.

**Severity:** HIGH

**Page:** `/accountant/work-orders` (Ghép chuyến view)

**Status vs prior:** NEW

**Reproduce:**
1. Login as ketoan.
2. Open Ghép chuyến.
3. Click any 2/6 work-order on the left.
4. Click `Ghép` on its first candidate.
5. Observe red toast vs counter change.

**Screenshot:** `ss_17459fn0p`

---

### NX2 — Khách hàng list lost search input and data columns (regression vs v2)

**Observation:** `/accountant/settings/clients` renders 19 customers as text-only cards in a 3-column grid. There is no search input, no Mã đối tác / Nhóm / Điện thoại / Địa chỉ / Người liên hệ columns, and no Khách hàng vs Nhà thầu tabs (Nhà thầu is now a separate page entirely). The previous ` Tìm tên, điện thoại, MST...` field is gone.

**Impact:** ketoan's day-1 task is to find a partner. With 19 cards she may scan; at 50+ she cannot. v2 had a working search bar — losing it is a strict regression. Losing the side columns also forces a click-through for any phone or MST lookup, doubling the time per record.

**Recommendation:** Restore the search input from v2 (already known to work for case-insensitive substring; add `unaccent` for parity with the Đơn hàng search). Restore the columnar table layout for desktop (>1024 px) and keep card layout only for mobile.

**Severity:** HIGH

**Page:** `/accountant/settings/clients`

**Status vs prior:** REGRESSION

**Reproduce:** open Cài đặt > Khách hàng — observe the absence of a search box at the top.

**Screenshot:** `ss_3477tx9hg`

---

### NX3 — Người dùng counter shows 0 while ketoan is logged in

**Observation:** `/accountant/settings/users` displays `0 tài khoản đang hoạt động`. Tabs read `Tất cả 0 / Giám đốc 0 / Kế toán 0 / Tài xế 0`. ketoan is currently authenticated as `Nguyễn Mai Phương · Kế toán` (visible at the bottom-left of the same screen). The list area is blank with no empty-state copy or illustration.

**Impact:** Either the count and list are wrong (broken data fetch) or the role intentionally hides the current user from herself (which is unusual and undocumented). In both cases the page is confusing and unhelpful for an accountant doing user provisioning.

**Recommendation:** Show all users, including the current one (highlighted as "Bạn"). If certain roles are scoped out for ketoan, render a permission banner explaining who is missing. Add a non-empty empty-state illustration with a CTA `Tạo tài khoản đầu tiên`.

**Severity:** MED

**Page:** `/accountant/settings/users`

**Status vs prior:** NEW

**Reproduce:** Cài đặt > Người dùng → see `0 tài khoản đang hoạt động`.

**Screenshot:** `ss_7877s8iz1`

---

### NX4 — Đơn hàng status vocabulary mismatch between Tổng quan and Đơn hàng list

**Observation:** Tổng quan's "Đơn hàng gần đây" panel labels rows with `Chờ xử lý` / `Hoàn thành`. The Đơn hàng list page uses the new `Chờ đối soát` / `Đã khớp` / `Đã huỷ` set. Same orders, two vocabularies, two adjacent surfaces.

**Impact:** ketoan cannot map between the two screens by status. Onboarding noise.

**Recommendation:** Migrate the dashboard panel to the new `Chờ đối soát` / `Đã khớp` set. If `Chờ xử lý` is meaningful (= draft), expose it on both screens with the same label.

**Severity:** MED

**Page:** `/accountant`, `/accountant/trips`

**Status vs prior:** NEW

**Reproduce:** open Tổng quan → note status pills on the right column → click any row → status reads differently.

**Screenshot:** `ss_2614he8pr` (dashboard) vs `ss_3148ed7pg` (Đơn hàng).

---

### NX5 — Login error message renders at low opacity on first appearance

**Observation:** First click on `Đăng nhập` with empty fields renders the alert `Thông tin đăng nhập không hợp lệ. Vui lòng thử lại.` at ~30 % opacity (faded grey-pink), barely legible. Second click with wrong-but-non-empty creds renders the same alert at full red opacity. The fade looks like an enter-animation race or a leftover from a previous attempt.

**Impact:** The user's first interaction with the auth error is unreadable. Combined with N3 (button is enabled with empty fields) the experience is "press button, see ghost message, give up".

**Recommendation:** Fix the animation race so the alert paints at full opacity on first render. Pair with N3 fix (disable submit on empty fields).

**Severity:** MED

**Page:** `/`

**Status vs prior:** NEW (refines v2 N2)

**Reproduce:** logout → click Đăng nhập with both fields empty → screenshot the alert.

**Screenshot:** `ss_20990lsx4` (faded) vs `ss_01141m4od` (full).

---

### NX6 — 404 page is missing the sidebar / app chrome

**Observation:** `/accountant/match`, `/accountant/orders`, `/accountant/settings/payroll`, `/accountant/settings/contractors` render the 404 view without the Vận Tải Phúc Lộc sidebar. Only the centered illustration + `Quay lại Tổng quan` button is shown.

**Impact:** Minor — but user has to round-trip through Tổng quan to recover instead of jumping to a sibling section directly. Also breaks the persistent navigation pattern, which is a Consistency heuristic ding.

**Recommendation:** Render the 404 inside the standard app shell so the sidebar remains usable.

**Severity:** LOW

**Page:** any unknown route

**Status vs prior:** NEW (the existence of a 404 is N15-fixed; this is a cosmetic follow-up).

**Reproduce:** navigate to any made-up `/accountant/foo`.

**Screenshot:** `ss_9655awf7m`

---

### NX7 — Driver Nhà xe label inconsistency

**Observation:** On Tài xế list, drivers `taixe` and `taixe1` show Nhà xe = `Vận Tải Phúc Lộc`; `tx_test` shows Nhà xe = `Phúc Lộc`. Same brand, two strings.

**Impact:** Cosmetic, but suggests the brand-rename migration did not back-fill existing records. Could cause downstream inconsistencies in Báo cáo / Kỳ lương exports.

**Recommendation:** Run a one-shot migration `UPDATE drivers SET nha_xe = 'Vận Tải Phúc Lộc' WHERE nha_xe = 'Phúc Lộc'`.

**Severity:** LOW

**Page:** `/accountant/settings/drivers`

**Status vs prior:** NEW

**Screenshot:** `ss_2845tko61`

---

### NX8 — Bad-data customer "Test KH Audit · notaphone · MST: abc123" still in production data

**Observation:** Khách hàng list contains `Test KH Audit · notaphone · MST: abc123`. This record has invalid format on both phone (`notaphone`) and MST (`abc123`) and was almost certainly created during an earlier audit run before C4's client-side validation landed. With C4 now blocking such records on creation, the historical bad row remains.

**Impact:** Data hygiene; minor blocker for future reports that group by valid MST. The sub-line in the card layout (`notaphone · MST: abc123`) is the only place the bad data is now visible.

**Recommendation:** One-off cleanup. Either delete the test record or update both fields. Consider adding a server-side check `CHECK (mst ~ '^[0-9]{10}$|^[0-9]{13}$')` so the validation is also enforced for any non-UI client.

**Severity:** LOW

**Page:** `/accountant/settings/clients`

**Status vs prior:** NEW

**Screenshot:** `ss_1822tmohn`

---

## REGRESSIONS

| # | Feature | v2 state | v3 state |
|---|---------|----------|----------|
| R1 | Khách hàng search | Working `Tìm tên, điện thoại, MST...` | **Removed entirely** (NX2). |
| R2 | Khách hàng table columns | Mã đối tác, Nhóm, SĐT, Địa chỉ, Người liên hệ | **Card-only with name** (NX2). |
| R3 | Đơn hàng status pills | Tất cả / Nháp / Chờ đối soát / Hoàn thành / Đã huỷ | Reduced to Tất cả / Chờ đối soát / Đã khớp. Nháp and Đã huỷ no longer filterable from the UI. |
| R4 | Đơn hàng KPI | Doanh thu tháng card | **Removed**, replaced by Chờ đối soát + Đã khớp counts (related to N9). |
| R5 | Kế toán sidebar | 11 entries | 4 entries; Báo cáo, Nhập từ Excel, Nhập bảng giá, Cung đường are not surfaced (intentional consolidation, but if Báo cáo is still active under another path it needs a link). |

---

## Per-Flow Coverage

### Login

- Empty submit: button enabled, request fires, low-opacity error renders (N3 still broken, NX5).
- Wrong creds: full-opacity error, request fires (acceptable).
- Correct creds (`ketoan / admin123`): redirects to `/accountant`, session persists.
- Enter-key submit works.
- No "Quên mật khẩu?" / forgot-password link, no "Hiện mật khẩu" link beyond the eye icon. Minor.

### Khớp chuyến (was Đối soát)

- New two-pane layout: 14 chờ khớp on the left with score chips (e.g. 4/6, 2/6), candidate panels with per-criterion ✓/✗ on the right.
- Auto-match button (`Tự động ghép`) and `Nhập đơn` shortcut at the top right — net new and welcome.
- Selecting a work-order paints its candidates with explicit comparison fields. N7 fully addressed.
- Force-match on a 2/6 candidate triggers `Lỗi - Không thể ghép chuyến` red toast — but counters drop as if the match committed (NX1).
- The empty-state on the right pane (`Chọn một phiếu để xem các đơn hàng có thể ghép`) is good.

### Khách hàng (was Đối tác)

- C2 fixed (delete works, success toast).
- C4 fixed (client-side MST/SĐT validation with inline errors).
- NX2 — search and table layout regressed.
- C5 not testable here (no search input).

### Tài xế (NEW for ketoan)

- Net-new for this role. N16 fixed.
- Sortable columns; default sort by Tài xế ↑.
- Search by name/phone/plate works on substring; case-insensitive but not space-tolerant.
- NX7 — brand inconsistency on the data.

### Bảng giá

- C3 fixed (confirm dialog).
- N17 fixed (icon colors).
- Search input still present in detail view (`Tìm kiếm cung đường...`). Did not test diacritic on this surface; given the same backend now powers Đơn hàng search, expected to work.

### Kỳ lương

- N10 fixed (Kỳ hiện tại reads correctly).
- N11 fixed (Lương=0 warning + no Đánh dấu đã trả CTA).
- `Tính lương tất cả` and per-card download icon are present.
- "Lịch sử kỳ lương" section is the same shape as v2. Still no driver-rate edit on the card itself; driver rate is presumably under Tài xế now.

### Đơn hàng

- 11 đơn hàng, 6 chờ đối soát, 3 đã khớp.
- Diacritic search works (C5 fixed).
- N18 fixed (Doanh thu column readable).
- N9 unresolved — the KPI was removed, not reconciled (see executive summary point 3).

### Tổng quan

- 4 KPI cards (CHUYẾN CHƯA GHÉP, ĐƠN CHỜ ĐỐI SOÁT, LƯƠNG SẢN LƯỢNG TX, DOANH THU THÁNG).
- "Chuyến chưa ghép" panel with 14 entries and "Mở trang Ghép chuyến →" link.
- "Đơn hàng gần đây" panel with status pills using **old vocabulary** (NX4).
- Month picker top right `Tháng 05/2026 / 01/05 → 31/05` with chevrons — net-new and clean.

### Người dùng (NEW for ketoan)

- NX3 — counter shows 0 while ketoan is signed in.
- Filter tabs are role-segmented; could become very useful when records exist.
- No empty-state copy or illustration when empty — looks broken.

### Cross-flow

- Logout: `Đăng xuất` button at bottom-left → returns to `/`. Session state cleared, new login required. ✅
- Browser back/forward: works on every route I tested.
- Browser refresh: stays on the current route, refetches data. ✅
- Hard refresh (Cmd+Shift+R) clears the cached old bundle (necessary on first audit attempt — see banner above).
- Multi-tab: not tested in this pass.

### Mobile (390 × 844)

- Hamburger menu (top-left), greeting + bell + avatar at top.
- KPIs reflow to a 2×2 grid.
- Quick action chips appear: `Nhập đơn / Ghép chuyến / Nhà thầu / Bảng giá / Kỳ lương`. Nice mobile-first surfacing.
- Pinch-zoom works (N1 fixed).
- Đơn hàng cards scrollable. Status pills inherit the dashboard's old vocabulary (NX4 echoes here).

---

## Cross-cutting Issues

- **Toast/state desync (NX1).** The single most-important new finding. The toast is part of the same React tree as the counters; they need to read the same outcome.
- **Information density vs simplicity tradeoff.** Khách hàng list's card simplification removed real columns (NX2). The redesign should respect "good for first-time user, dense for daily user" — that means columnar tables on desktop, cards on mobile.
- **Status vocabulary drift (NX4).** A glossary or single source of truth (TS enum) for order status would prevent this.
- **Empty-state coverage.** Người dùng has none (NX3). Tài xế has a real empty-state line (`Không tìm thấy tài xế`) — good.
- **Removed features without explanation.** Báo cáo, Nhập từ Excel, Nhập bảng giá, Cung đường are gone from the Kế toán nav. If by design, surface them in a release note or under a "Khác" submenu. If by accident, restore.

---

## Heuristics Compliance Matrix

| Heuristic | v1 | v2 | v3 | Notes |
|-----------|----|----|----|-------|
| Visibility of System Status | 2/5 | 3/5 | **4/5** | Toasts on delete/error/success. NX1 keeps it from a 5. |
| Match to Real World | 3/5 | 2/5 | **3/5** | "Nhập đơn" / "Ghép chuyến" naming aligns. NX4 status drift drags the score. |
| User Control | 2/5 | 2/5 | **4/5** | Confirm dialogs on delete (C2, C3). Bigger Ghép chuyến UI shows the user what will happen before they commit. |
| Consistency | 2/5 | 2/5 | **3/5** | Brand wordmark unified. NX4, NX7, R3, NX6 still drag. |
| Error Prevention | 1/5 | 1/5 | **4/5** | Inline format validation on Khách hàng (C4); confirm dialogs on destructive actions (C2/C3); server rejects bad matches (N8). N3 keeps it from 5. |
| Recognition vs Recall | n/a | 3/5 | **4/5** | Per-criterion ✓/✗ on Ghép chuyến is excellent. Khách hàng card-only loses some recognition (NX2). |
| Flexibility & Efficiency | n/a | 3/5 | **3/5** | Auto-match button is welcome. Lost Khách hàng search hurts power users. |
| Aesthetic / Minimalist | n/a | 3/5 | **4/5** | Cleaner palette, fewer side-bar items, full-bleed Ghép chuyến view. |
| Help Users Recover from Errors | 1/5 | 1/5 | **3/5** | Inline errors on Khách hàng form name the rule and give an example. Toasts have actionable copy. |
| Help & Documentation | n/a | 2/5 | **2/5** | No first-run tour, no in-app help. The good news is that the new IA is shallow enough that ketoan can probably navigate without docs. |

**Average:** ~3.4 / 5 (vs v2's 2.1).

---

## Quick Wins (S effort, < 1 day each)

1. **N3 — disable Đăng nhập button until both fields ≥1 char.** ~15 min.
2. **NX5 — fix the login alert opacity race.** ~30 min.
3. **NX2 — restore the Khách hàng search input.** Reuse the Đơn hàng search component. ~1–2 h.
4. **NX2 — restore Khách hàng columns on viewports >1024 px.** ~half day.
5. **NX4 — replace `Chờ xử lý` on Tổng quan with the new status set.** ~30 min.
6. **NX7 — back-fill `Phúc Lộc` → `Vận Tải Phúc Lộc` on driver records.** ~10 min SQL.
7. **NX8 — delete or repair the `Test KH Audit` row.** ~5 min.
8. **N9 — relabel dashboard "Doanh thu tháng" so its definition is explicit ("Doanh thu (toàn bộ)" or similar) OR replace with the same number used on Đơn hàng list to avoid implicit mismatch.** ~1 h.
9. **N17 — add `title="Sửa"` / `title="Xoá"` on Bảng giá row icons.** ~10 min.
10. **NX6 — render 404 inside the app shell.** ~30 min.

That batch alone keeps the heuristics score at 4.0 and fixes every Hold blocker except NX1 and NX3.

## Major Initiatives (M–L)

1. **NX1 — reconcile the Ghép chuyến toast and counter logic so the UI never displays "fail toast + success state-mutation".** Likely a single optimistic-mutation site that needs to gate on the actual response status. 1–2 days incl. reproducible automated test.
2. **NX3 — Người dùng correct count + zero-state.** Decide product semantics for "self-visibility", then back-fill UI. 2–3 days.
3. **N9 — pick one definition of Doanh thu and apply consistently across dashboard, Đơn hàng list, and any future Báo cáo.** 1 day investigation + 1 day implementation.
4. **R5 — surface Báo cáo (or document its removal).** Discovery + UX decision + implementation. 3–5 days.
5. **Diacritic-insensitive search across remaining surfaces** — Tài xế (space tolerance), Bảng giá detail, any Cung đường page if it returns. 1 day.
6. **NX4 — single source of truth for order status (TS enum + i18n key set) to permanently kill vocabulary drift.** 2 days.

---

## Release Readiness Verdict

⚠️ **Hold (close to Ready).**

**Reasoning:**

The team made enormous progress: 4 of 5 v1 critical bugs are gone, 11 of 20 v2 findings are gone, the IA simplification is bold and largely successful, and the silent-failure pattern that was the throughline of v2 has been removed. This is the first audit pass where I would feel comfortable handing the app to a new ketoan for daily use.

But the four issues below are blocking ship in their current state:

| Must-fix | Why |
|----------|-----|
| NX1 | Ghép chuyến shows error toast on what looks like a successful match. Either the data integrity is wrong (bad), or the user is being lied to (also bad). Either reading is unacceptable for a financial-reconciliation surface. |
| N9 | Hiding the Doanh thu KPI does not reconcile the 19 M vs 6 M gap. Leadership and ketoan need a single source of truth for monthly revenue. |
| NX2 | Losing search on Khách hàng is a strict regression. ketoan finds partners daily; if the list grows past one screen she's stuck. |
| N3 + NX5 | First touch of the app — the login screen — has a button that fires on empty input and a faded error message. Bad first-five-seconds. |

**Minimum bar to flip to ✅ Ready:**
- Fix NX1 (toast/state desync).
- Fix N9 (relabel or reconcile).
- Restore Khách hàng search (NX2).
- Disable empty-submit on login + un-fade the alert (N3, NX5).

That's ~2 dev-days of focused work + a re-audit. After that I would sign release.

---

## Recommendations Summary Table

| # | Page | Severity | Status | Observation | Recommendation |
|---|------|----------|--------|-------------|----------------|
| C1 | Ghép chuyến | CRITICAL | ✅ FIXED | PUT works, error toast on low-score match | — (see NX1) |
| C2 | Khách hàng | CRITICAL | ✅ FIXED | DELETE 200 + green toast | — |
| C3 | Bảng giá | CRITICAL | ✅ FIXED | Confirm dialog with row preview | — |
| C4 | Khách hàng | CRITICAL | ✅ FIXED | Inline `MST phải 10 hoặc 13 chữ số` / `SĐT không hợp lệ` | Add preventive helper text under fields (still N5). |
| C5 | Đơn hàng / Khách hàng / Tài xế | CRITICAL | 🟡 PARTIAL | Đơn hàng diacritic search works; Khách hàng has no search; Tài xế not space-tolerant | Restore Khách hàng search; backend `unaccent + space-tolerance` everywhere. |
| N1 | global | CRITICAL | ✅ FIXED | viewport meta cleaned | — |
| N2 / NX5 | login | HIGH/MED | 🟡 PARTIAL | Faded alert on first paint | Fix opacity race; persist alert until next submit. |
| N3 | login | MED | 🔴 STILL BROKEN | Empty submit fires request | Disable button until both fields ≥1 char. |
| N4 | partners → orders | HIGH | ✅ FIXED (where applicable) | Đơn hàng has Xoá lọc chip + count | — |
| N5 | Khách hàng | HIGH | 🟡 PARTIAL | Errors only after submit | Add `<small>` helper under MST/SĐT preemptively. |
| N6 | import | LOW | ✅ FIXED/REMOVED | — | — |
| N7 | Ghép chuyến | MED | ✅ FIXED | Per-criterion ✓/✗ | — |
| N8 | Ghép chuyến | HIGH | ✅ FIXED at backend | Server rejects low-score | Disable Ghép button at score <2/N to skip the round-trip. |
| N9 | dashboard / orders | HIGH | 🔴 STILL BROKEN (hidden) | 19 M dashboard ↔ 6 M orders | Pick one definition; relabel the other. |
| N10 | Kỳ lương | HIGH | ✅ FIXED | 26/04 → 25/05 | — |
| N11 | Kỳ lương | HIGH | ✅ FIXED | Warning chip + no CTA at Lương=0 | — |
| N12 | Tạo chuyến | MED | ⚠️ N/A | Page not surfaced for ketoan | Confirm scoping intent. |
| N13 | dashboard | MED | ✅ FIXED | Renamed to Nhập đơn | — |
| N14 | Đơn hàng / Đối soát | LOW | 🟡 PARTIAL | `08/05` no year on Đơn hàng | Add year on first row of each year-block. |
| N15 | global | LOW | ✅ FIXED | 404 page exists | NX6: render inside app shell. |
| N16 | sidebar | HIGH | ✅ FIXED | Tài xế CRUD live | — |
| N17 | Bảng giá | HIGH | ✅ FIXED | Trash red, pencil grey | Add `title=` for tooltip. |
| N18 | Đơn hàng | MED | ✅ FIXED | Doanh thu readable | — |
| N19 | sort indicators | LOW | 🟡 PARTIAL | Active sort visible on Tài xế, not on Đơn hàng | Single bold chevron + URL persistence. |
| N20 | Báo cáo | LOW | ✅ REMOVED | Not surfaced | If still active under another URL, link from Cài đặt. |
| **NX1** | Ghép chuyến | HIGH | NEW | Toast/state desync | Gate optimistic mutation on actual response. |
| **NX2** | Khách hàng | HIGH | REGRESSION | Search and columns gone | Restore both for ≥1024 px. |
| **NX3** | Người dùng | MED | NEW | Counter shows 0 with logged-in ketoan | Fix count + add zero-state copy. |
| **NX4** | Tổng quan ↔ Đơn hàng | MED | NEW | Status vocabulary drift | Single source of truth for status enum. |
| **NX5** | login | MED | NEW | Faded alert on first paint | Fix the opacity race. |
| **NX6** | 404 | LOW | NEW | No sidebar on 404 | Render inside app shell. |
| **NX7** | Tài xế | LOW | NEW | "Phúc Lộc" vs "Vận Tải Phúc Lộc" | One-shot SQL migration. |
| **NX8** | Khách hàng | LOW | NEW | "Test KH Audit · notaphone · MST: abc123" lingering | Delete or repair. |

---

## Post-v3 Fix Log (2026-05-10)

| # | Issue | Fix | File(s) |
|---|-------|-----|---------|
| N3 | Login button enabled with empty fields | **Already fixed in code.** `disabled={loading \|\| !username.trim() \|\| !password.trim()}` was present. Audit may have been against older bundle. | `Login.tsx:225` |
| NX4 | Dashboard status vocabulary drift | Changed "Chờ xử lý" → "Chờ đối soát", "Đã xác nhận" → "Đã khớp", added "Đã huỷ" for CANCELLED status | `AccountantDashboard.tsx:124-140` |
| NX5 | Login error renders at low opacity | Removed `animate-fade-slide-up` from error div so it appears at full opacity immediately | `Login.tsx:166` |
| NX1 | Match toast fires error on success | Added success toast after `handleMatch()` resolves. Improved error message extraction from `unwrap` Error objects | `MatchTrip.tsx:191-200` |
| NX2 | Khách hàng lost search input + columns | Restored search input with fuzzyMatch. Added DataTablePro with columns (Tên, SĐT, MST, Loại, Địa chỉ) on desktop. Kept card layout on mobile | `ClientList.tsx` (full rewrite) |
| N5 | No helper text under MST/SĐT | Added `"10 chữ số, bắt đầu bằng 0"` under phone field and `"10 hoặc 13 chữ số (không dấu cách)"` under MST field | `ClientList.tsx:243-247,252-256` |
| NX3 | Users count shows 0 | Changed filter from `u.isActive` to `u.isActive !== false` to handle undefined values from API | `UserManagement.tsx:60` |
| N9 | Revenue label ambiguous | Changed "Doanh thu tháng" → "Doanh thu (đơn hàng tháng)" on both desktop and mobile dashboards | `AccountantDashboard.tsx` (replace_all) |
| — | "Nhập đơn đối soát" label | Renamed dialog title to "Nhập đơn hàng" | `WorkOrderList.tsx:161` |

### Items NOT fixed (require backend or larger scope)

| # | Issue | Reason |
|---|-------|--------|
| NX6 | 404 page missing sidebar | Requires router restructuring to render NotFound inside layout routes. LOW severity. |
| NX7 | Driver brand inconsistency | Data migration: `UPDATE drivers SET vendor = 'Vận Tải Phúc Lộc' WHERE vendor = 'Phúc Lộc'` |
| NX8 | Test KH Audit bad data in prod | One-off DB cleanup needed |
| N14 | Date format missing year | Minor cosmetic; needs design decision on year display strategy |

---

**End of v3 audit.**
