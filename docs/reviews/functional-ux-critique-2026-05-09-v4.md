# Functional + UX Audit v4 — phucloc.tingting.vip

**Date:** 2026-05-09 (4th pass after v3 fixes were ostensibly deployed; executed 2026-05-10)
**Auditor:** Senior UX/UI Auditor + Full-Stack QA
**References:** v1, v2, v3 audits (`docs/reviews/functional-ux-critique-2026-05-09{,-v2,-v3}.md`) + `docs/reviews/settings-overhaul-tasklist-2026-05-09.md`
**Account under test:** `ketoan / admin123` (Nguyễn Mai Phương · Kế toán)
**Browser/viewport:** Chrome desktop 1456×831 (host browser cannot shrink below ~1568 — mobile claims are inferred, not visually rendered)
**Bundle under test:** `index-BhGDPZWb.js` — confirmed via fresh hard reload after `serviceWorker.unregister()` + `caches.delete()` + `Ctrl+Shift+R`. This IS the live production bundle.

> **Methodology note:** Hard refresh was performed BEFORE testing. SW (1) unregistered, Cache Storage (1) cleared, then `location.reload(true)`, then `Ctrl+Shift+R`. The bundle hash printed before and after the second reload is identical (`index-BhGDPZWb.js`), confirming the audit was executed against the latest deployed code. Findings below are not stale-cache artifacts.

---

## Executive Summary

**Net status vs v3 fix-log claims: 5 genuine fixes verified, 3 regressions or no-shows, 1 partial, ~18 settings tasks claimed [x] in the tasklist that did NOT actually ship to production, and 6 new findings.**

The v3 audit's Fix Log declared 8/8 NX issues plus the settings tasklist's 5 P0 / 9 P1 tasks complete. **In production, the picture is materially different.**

What did genuinely ship:
- **N3 + NX5** (login): button is now disabled when fields are empty; the alert renders at full opacity on first attempt. Empty-submit fires zero requests.
- **NX2** (Khách hàng): search input + DataTablePro columns (Tên / SĐT / MST / Loại / Địa chỉ) restored on desktop.
- **N5** (helper text): `10 chữ số, bắt đầu bằng 0` and `10 hoặc 13 chữ số (không dấu cách)` appear under SĐT and MST in the customer edit form.
- **C4** (validation): inline red errors `SĐT không hợp lệ (VD: 0912345678)` and `MST phải 10 hoặc 13 chữ số` on bad input; submit blocked, no POST fired.
- **NX8** (test data): the `Test KH Audit · notaphone · MST: abc123` row is gone.
- **N9** (Doanh thu label): dashboard reads `DOANH THU (ĐƠN HÀNG THÁNG)`. Definition is now explicit.

What is **still broken or only partially fixed**, despite v3 fix-log claims:
- **🔴 NX1 (HIGH)** — Ghép chuyến error toast still fires on a server-accepted match. `POST /api/v1/reconcile → 200`, list count drops 13 → 12, work order is removed — but UI shows red `Lỗi · Không thể ghép chuyến` toast. The desync v3 flagged is intact.
- **🔴 NX3 (MED)** — Người dùng still shows `0 tài khoản đang hoạt động`, all four role tabs read `0`, body is blank with no empty-state. Same symptom v3 flagged.
- **🟡 NX4 (MED)** — partially fixed: Đơn hàng list uses `Chờ đối soát` / `Đã khớp`. But Tổng quan's `Đơn hàng gần đây` panel still emits `Hoàn thành` for some rows (e.g. T002028). Two surfaces, two vocabularies.
- **🔴 TASK-001 (P0)** — Duplicate `Bảng giá` header still on `/accountant/settings/pricing` (h1 in page band + green-bar section header).
- **🔴 TASK-002 (P0)** — Duplicate `Tài xế` h1 on `/accountant/settings/drivers` (`document.querySelectorAll('h1').length === 2`, both read `Tài xế`).
- **🔴 TASK-003 (P0)** — Lương=0 cards still carry both `Đã tính` chip AND `Lương bằng 0 — chưa có đơn hàng trong kỳ` warning. Two of each in production.
- **🔴 TASK-004 (P0)** — driver labels are still `taixe` / `taixe1` raw usernames on Lương cards.
- **🔴 TASK-005 (P1)** — Người dùng has no empty-state component; the body just renders blank.
- **🔴 TASK-015 (P0)** — `/accountant/pricing/:id` is still NOT under `/settings/`. Bookmark URL still `/accountant/pricing/3`.
- **🔴 TASK-016 (P1)** — `MỨC GIÁ THEO SỐ LƯỢNG CONTAINER` label rendered **65 times** on the HAP detail page (vs the 30+ originally flagged — the count grew, not shrunk).
- **🔴 TASK-017 / 023 (P1)** — Settings index is still 6 cards in `lg:grid-cols-3`, no Đối tác / Vận hành / Hệ thống grouping.
- **🔴 TASK-018 (P1)** — Add-button labels: `+ Thêm` (Khách hàng, Nhà thầu), `+ Thêm tài xế`, `+ Thêm bảng giá`, `+ Thêm mức giá`, `+ Tạo tài khoản`. No standardization.
- **🔴 TASK-019 (P2)** — Nhà thầu page is one tiny pill `Vận Tải Phúc Lộc` in a sea of whitespace, no phone / MST / địa chỉ / contact.
- **🔴 TASK-020 (P2)** — no helper text under Salary `Từ ngày` / `Đến ngày` inputs.
- **🔴 TASK-021 (P2)** — right-pane download icon next to `Tính lương tất cả` is still icon-only, unlabeled.
- **🔴 TASK-027 (P1)** — primary CTAs still embedded in the body, not hoisted to a header `actions` slot.
- **🔴 TASK-030 (P2)** — Pricing detail still spawns one card per (route × container size), not collapsed.
- **🔴 TASK-032 (P3)** — no `Cài đặt › <subpage>` breadcrumb on any Settings subpage.
- **🔴 TASK-034 (P3)** — Settings index subtitle still `Cấu hình hệ thống và dữ liệu nền`.

What is genuinely new this round (NX9–NX14):
- **🆕 NX9 (HIGH)** — Logout redirects to `/login`, but **there is no `/login` route**. The catch-all renders the 404 page. Users see "404 / Không tìm thấy trang này" immediately after clicking Đăng xuất.
- **🆕 NX10 (HIGH)** — On Ghép chuyến, after a successful match the right pane is NOT cleared. The previously-selected work order remains highlighted with its candidate card and a live `Ghép` button. Clicking again would attempt to ghép an already-matched (or now-deleted) work order.
- **🆕 NX11 (MED)** — `POST /api/v1/push/subscriptions → 500` fires on every page load. Push notifications backend is throwing 500s; either disable the call until the backend is ready, or fix the endpoint.
- **🆕 NX12 (LOW)** — Brand inconsistency: login page wordmark is `TTransport · Quản lý vận tải hàng hóa`. App shell reads `Vận Tải Phúc Lộc`. Document title is `TTransport — Quản lý vận tải`. Three brands across three surfaces.
- **🆕 NX13 (MED)** — On Khách hàng list, every SĐT, MST, and Địa chỉ cell renders `—` for all 18 customers. Either the data is genuinely empty (a data-quality issue inherited from earlier seed/onboarding) or the columns are not reading from the right field. Either way, the columns add zero information today.
- **🆕 NX14 (LOW)** — Khách hàng read-only detail dialog shows only `Loại` and `Điện thoại`. The edit form has MST, Địa chỉ, Người liên hệ — but the read-only view hides them. Users have to click `Sửa` and risk an unintended edit just to see contact info.

**Heuristics compliance score:**
- v1 ~2.4/5 → v2 ~2.1/5 → v3 (claimed post-fix) ~4.2/5 → **v4 (verified in prod) ~3.2/5**

The v3 doc oversold the post-fix score. Verified-in-production, we are below where v3 claimed but materially above v2.

**Release-readiness verdict:** ⚠️ **HOLD** (downgrade from v3's "Ready").

**Reasoning:** five P0 settings tasks plus NX1 (Ghép chuyến desync) and NX9 (logout 404) are user-facing blockers for ketoan's daily workflow. The fix log was authored ahead of the actual deployment.

**Min bar to flip to Ready:**
1. Fix NX1 — toast must reflect server response, not optimistic mutation.
2. Fix NX9 — define `/login` route or change logout redirect to `/`.
3. Ship TASK-001 + TASK-002 (10 minutes of CSS / JSX deletions).
4. Ship TASK-003 (Lương=0 single status).
5. Ship NX10 — clear right pane after successful match.

Total: roughly 1 dev-day. The other settings items can ship in a follow-up sprint without blocking release.

---

## Status of v3 issues (the ones the v3 fix log claimed to close)

| # | Bug | v3 status (claimed) | v4 status (verified in prod) | Notes |
|---|-----|---------------------|------------------------------|-------|
| C2 | Xoá đối tác silent fail | ✅ FIXED | ✅ FIXED | Not re-tested destructively this round; v3 evidence holds. |
| C3 | Bảng giá row delete no confirm | ✅ FIXED | ✅ FIXED | Not re-tested destructively. |
| C4 | Form Tạo Đối tác bỏ qua validation | ✅ FIXED | ✅ FIXED | Verified end-to-end in customer edit dialog. `12` + `ABC` → inline errors, no POST. |
| C5 | Diacritic search broken | ✅ FIXED | ✅ FIXED | Not re-tested across all surfaces; v3 evidence holds. |
| N3 | Đăng nhập enabled with empty fields | ✅ FIXED | ✅ FIXED | Empty-submit fires zero `/api/v1/auth/login` requests. |
| N5 | No format hints for MST/SĐT | ✅ FIXED | ✅ FIXED | Helper text visible under both fields in edit form. |
| N9 | Doanh thu mismatch | ✅ FIXED (relabeled) | ✅ FIXED (label) | Card reads `DOANH THU (ĐƠN HÀNG THÁNG)` with `19.143.389 đ`. Note the dashboard "Đơn hàng gần đây" still shows `Hoàn thành` (NX4 partial). |
| NX1 | Ghép chuyến desync toast | ✅ FIXED (per fix-log) | 🔴 **STILL BROKEN** | `POST /api/v1/reconcile → 200`, list count 13→12, W001020 removed — but UI shows `Lỗi · Không thể ghép chuyến` red toast. Identical symptom v3 reported. |
| NX2 | Khách hàng regression | ✅ FIXED | ✅ FIXED | Search + 5-col DataTablePro restored. (See NX13 for the new data-quality follow-up.) |
| NX3 | Người dùng count 0 | ✅ FIXED (per fix-log) | 🔴 **STILL BROKEN** | `0 tài khoản đang hoạt động`, all role tabs `0`, body blank. ketoan herself doesn't appear. |
| NX4 | Status vocabulary drift | ✅ FIXED (per fix-log) | 🟡 **PARTIAL** | Đơn hàng list uses new vocabulary cleanly. Tổng quan's "Đơn hàng gần đây" still emits `Hoàn thành` for some rows. |
| NX5 | Login alert ~30% opacity | ✅ FIXED | ✅ FIXED | First-attempt empty-submit error renders at full opacity. (Wait, empty-submit doesn't actually fire now thanks to N3 — wrong-creds error renders at full opacity.) |
| NX6 | 404 missing sidebar | ✅ FIXED | ⚠️ **MOOT** | Catchall renders 404 inside layout for authenticated routes — but on the `/login` 404 (NX9) the sidebar correctly does NOT render (login is unauthenticated). Initial misread; correct behavior. |
| NX7 | Driver vendor brand inconsistency | ✅ FIXED | ✅ FIXED | All three drivers read `Vận Tải Phúc Lộc`. |
| NX8 | Test KH Audit bad data in prod | ✅ FIXED | ✅ FIXED | Row gone from Khách hàng list. |

---

## Status of CRITICAL settings tasks (the tasklist that was marked [x])

| # | Task | Status in repo (per tasklist) | Status in prod (v4) | Evidence |
|---|------|-------------------------------|---------------------|----------|
| TASK-001 | Remove duplicate "Bảng giá" header | [x] | 🔴 **STILL BROKEN** | `/accountant/settings/pricing`: page-band reads `Bảng giá / Giá vận chuyển theo tuyến & khách hàng`, then below an inner section header reads `\| Bảng giá` with green left bar. Two `Bảng giá` strings on screen. |
| TASK-002 | Remove duplicate "Tài xế" header | [x] | 🔴 **STILL BROKEN** | `/accountant/settings/drivers`: `document.querySelectorAll('h1').length === 2`, both read `Tài xế`. JSX-level duplicate, not CSS. |
| TASK-003 | Strip "Đã tính" chip on Lương=0 cards | [x] | 🔴 **STILL BROKEN** | Both `taixe` and `taixe1` Lương cards carry `Đã tính` chip AND `Lương bằng 0 — chưa có đơn hàng trong kỳ` warning. Contradictory state, in two places each. |
| TASK-004 | Show driver name + phone instead of `taixe` / `taixe1` | [x] (with caveat about backend) | 🔴 **STILL BROKEN** | Lương cards still labeled `taixe` and `taixe1`. The caveat about backend schema may be the reason, but the visible state is unchanged. |
| TASK-005 | Render empty-state on Người dùng | [x] | 🔴 **STILL BROKEN** | Body is blank below the `0 tài khoản đang hoạt động` line + role-tab pills. No `<EmptyState>` component visible. |
| TASK-007 | Restore Khách hàng search input | [x] | ✅ **FIXED** | `<input placeholder="Tìm tên, SĐT, MST...">` is at the top of `/accountant/settings/clients`. |
| TASK-008 | Restore Khách hàng table columns | [x] | ✅ **FIXED** | DataTablePro with Tên / SĐT / MST / Loại / Địa chỉ visible at desktop. (See NX13 — values are all `—` in prod.) |
| TASK-009 | Empty-fallback for SĐT / Biển số xe on Tài xế | [x] | 🔴 **STILL BROKEN** | `taixe` and `taixe1` rows show `—` for SĐT and Biển số xe. No `+ Thêm SĐT` chip. |
| TASK-013 | `<SettingsPageLayout>` shared component | [x] | 🔴 **STILL BROKEN** | If shipped, it would have killed the duplicate headers in TASK-001/002. Headers are still per-page, with the parent `SectionHeader` rendering on top. |
| TASK-015 | Move pricing detail under `/accountant/settings/pricing/:id` | [x] | 🔴 **STILL BROKEN** | URL is `/accountant/pricing/3` after clicking into a customer pricing card. |
| TASK-016 | Compress repeated `MỨC GIÁ THEO SỐ LƯỢNG CONTAINER` labels | [x] | 🔴 **STILL BROKEN** | `document.body.innerText.match(/.../g).length === 65` on the HAP detail page. The original task flagged "30+", today is **65**. |
| TASK-017 | Group Settings index into 3 buckets | [x] | 🔴 **STILL BROKEN** | Six cards in a flat 3-column grid. No section headers. |
| TASK-018 | Standardize add-button label | [x] | 🔴 **STILL BROKEN** | Live labels seen: `+ Thêm` / `+ Thêm tài xế` / `+ Thêm bảng giá` / `+ Thêm mức giá` / `+ Tạo tài khoản`. Five different patterns. |
| TASK-019 | Make Nhà thầu page list-or-empty, not blank | [x] | 🔴 **STILL BROKEN** | Single tiny pill `Vận Tải Phúc Lộc`, no surface info, ~80% whitespace. |
| TASK-020 | Helper text on Salary `Từ ngày` / `Đến ngày` | [x] | 🔴 **STILL BROKEN** | No `<small>1–31</small>` under either input. |
| TASK-021 | Combine right-pane download icon into labeled button | [x] | 🔴 **STILL BROKEN** | The `<Download>` icon next to `Tính lương tất cả` is still unlabeled. |
| TASK-022 | Row count + filter chip on Drivers | [x] | 🔴 **STILL BROKEN** | No `Hiển thị 3/3` count, no `× Xoá lọc` chip. |
| TASK-023 | Lock Settings card grid at 2 columns on lg | [x] | 🔴 **STILL BROKEN** | Still `lg:grid-cols-3`. |
| TASK-027 | Primary CTA in `<SettingsPageLayout actions>` slot | [x] | 🔴 **STILL BROKEN** | CTAs are inside the body, not in a header band. |
| TASK-030 | Collapse F40 / F20 sub-cards into one per-route table | [x] | 🔴 **STILL BROKEN** | Each (route × container size) is still its own card. |
| TASK-032 | Breadcrumb on Settings subpages | [x] | 🔴 **STILL BROKEN** | No `Cài đặt ›` breadcrumb anywhere. Pricing detail uses a `← Quay lại` link only. |
| TASK-033 | `aria-current="page"` on sidebar Cài đặt | [x] | ⚠️ **NOT VERIFIED** | Sidebar visibly highlights Cài đặt. ARIA attribute not inspected this round. |
| TASK-034 | Settings index subtitle update | [x] | 🔴 **STILL BROKEN** | Subtitle still reads `Cấu hình hệ thống và dữ liệu nền`. The proposed `Quản lý dữ liệu nền dùng trên toàn hệ thống...` is not on screen. |
| TASK-035 | h1 only via SettingsPageLayout | [x] | 🔴 **STILL BROKEN** | Drivers page has 2 h1s, both `Tài xế`. |
| TASK-006 | Người dùng counter — `u.isActive !== false` | [x] (carryover) | 🔴 **STILL BROKEN** | Counter still 0. |
| TASK-031 | 404 inside AccountantLayout | [x] (carryover) | ⚠️ **MOOT** | Authenticated 404 renders inside layout (good). The login `/login` 404 (NX9) does not — correct, login is unauthenticated. |

**Bottom line:** of the 27 tasklist items I could verify directly in prod, 4 are fixed (`C4`, `N5`, `NX2` via TASK-007/008, `NX8`), 22 are still broken, 1 is moot. The tasklist appears to have been ticked off in advance of the actual deployment.

---

## NEW Findings This Round (NX9–NX14)

### NX9 — Logout redirects to `/login`, which is a 404

**Observation:** Click `Đăng xuất` (bottom-left of sidebar). URL becomes `https://phucloc.tingting.vip/login`. The page that renders is the 404 component: a triangle warning icon, the text `404 / Không tìm thấy trang này`, and a `Quay lại Tổng quan` button. There is no `/login` route in the SPA — only `/`. The login form lives at `/`.

**Impact:** ketoan's first signal after every logout is "the app is broken". Recovery requires clicking `Quay lại Tổng quan`, which fires `/accountant`, gets redirected to `/` because the session is gone, and shows the login form. Two extra clicks and a confusing 404 between Đăng xuất and Đăng nhập.

**Recommendation:** Either (a) define a `/login` route that renders the existing login screen, or (b) change the logout handler to navigate to `/` directly. Option (b) is one line of code.

**Severity:** HIGH

**Page:** `/login` (the redirect target after logout)

**Status vs prior:** 🆕 NEW (v3 didn't catch this because it was only re-checked in the authenticated session)

**Reproduce:**
1. Login as ketoan.
2. Click Đăng xuất (bottom-left of sidebar).
3. Observe URL `https://phucloc.tingting.vip/login` and 404 illustration.

**Screenshot:** `ss_0105iyr31`

---

### NX10 — Ghép chuyến: right pane stale after successful match

**Observation:** After clicking `Ghép` on a candidate (which succeeded — list count dropped 13 → 12, W001020 removed from left list), the right pane continued to display `KH Công ty TNHH HAP / TX: taixe1 / 22 → 25 / F20 TGHU8672375` plus the `4/6` candidate card with a live `Ghép` button. Clicking that button again would issue another `POST /api/v1/reconcile` for an already-matched (or now-deleted) work order.

**Impact:** Easy data-corruption path. Even with a server-side guard against double-matching, the user is shown a UI that says "you can still act on this", contradicts what the left list says, and pairs with NX1's misleading toast — a recipe for ketoan double-tapping out of frustration.

**Recommendation:** On a successful match: clear the right-pane selection, render the empty state (`Chọn một phiếu để xem các đơn hàng có thể ghép`), and disable the `Ghép` button between request and response. Same fix should auto-select the next item in the left list if there is one (small flexibility win).

**Severity:** HIGH

**Page:** `/accountant/work-orders`

**Status vs prior:** 🆕 NEW

**Reproduce:**
1. Login → Ghép chuyến.
2. Click any work-order row on the left.
3. Click `Ghép` on a candidate.
4. Observe: left list count drops, work order disappears, but right pane still shows the (now-stale) work order and a live `Ghép` button.

**Screenshot:** `ss_0214gdvjb` / `ss_0015seal6`

---

### NX11 — `POST /api/v1/push/subscriptions → 500` on every page load

**Observation:** Every authenticated page load fires a request to `/api/v1/push/subscriptions` which returns HTTP 500. Verified on the dashboard load (network panel). The push subscription is presumably tied to a Capacitor / VAPID push registration (the GET `/api/v1/push/vapid-public-key → 200` precedes it).

**Impact:** Backend logs are likely flooded with 500s on every login. If the team has alerting, every kế toán session would be paging on-call. Push notifications are silently broken — drivers (the eventual recipients) won't get them.

**Recommendation:** Either (a) make the endpoint idempotent and return 200/204 for already-subscribed users, (b) gate the call behind a feature flag until the endpoint is ready, or (c) catch the 500 client-side and surface a non-blocking warning in dev only.

**Severity:** MED

**Page:** every authenticated page

**Status vs prior:** 🆕 NEW

**Reproduce:** open DevTools → Network → login. The POST appears within 2s of dashboard render.

**Screenshot:** see network log captured with the Ghép chuyến screenshot.

---

### NX12 — Brand inconsistency across login, app shell, and document title

**Observation:**
- Login page wordmark: `TTransport · Quản lý vận tải hàng hóa`
- App shell sidebar: `Vận Tải Phúc Lộc`
- Document title: `TTransport — Quản lý vận tải`

**Impact:** ketoan re-onboards every login. Marketing / customer-comms inconsistency: invoices and emails likely reference one brand, the SPA references another. Search-engine and bookmark identity is `TTransport`, app identity is `Vận Tải Phúc Lộc`.

**Recommendation:** Pick one. The v3 brand-rename ticket (NX7) chose `Vận Tải Phúc Lộc` — apply the same string to the login wordmark and `<title>`.

**Severity:** LOW

**Page:** `/`, every page

**Status vs prior:** 🆕 NEW (v3 fixed NX7 — the driver-vendor field — but missed the login screen and the `<title>`).

**Reproduce:** open the login page and compare wordmark with sidebar after login.

**Screenshot:** `ss_9547xe9un` (login) vs `ss_5280d1ojm` (app shell)

---

### NX13 — Khách hàng list: every SĐT / MST / Địa chỉ cell is `—`

**Observation:** All 18 customer rows on `/accountant/settings/clients` render `—` in the SĐT, MST, and Địa chỉ columns. Only `Tên` and `Loại` (always `Công ty`) carry data. Confirmed against the customer detail dialog (`Công ty TNHH HAP`): only `Loại: Công ty` is shown, no other field has a value.

**Impact:** The columns restored by NX2 add zero scanning value today. ketoan still has to click into each row to look up a phone number. It also means there is **no MST** for any customer in production data — invoicing / VAT validation must be living elsewhere or breaking.

**Recommendation:** Two parts.
1. **Data quality:** seed production with the MST / SĐT / Địa chỉ values you presumably have offline. Even if it's a 30-row CSV, do it once.
2. **UI:** as a fallback while data is missing, render an inline `+ Thêm SĐT` / `+ Thêm MST` chip (mirror TASK-009's idea) so ketoan has a one-click path to fix each gap.

**Severity:** MED

**Page:** `/accountant/settings/clients`

**Status vs prior:** 🆕 NEW (NX2 restored the columns; data emptiness is the next layer down)

**Reproduce:** open Cài đặt → Khách hàng. Every SĐT / MST / Địa chỉ cell reads `—`.

**Screenshot:** `ss_37549szmc`

---

### NX14 — Khách hàng read-only detail dialog hides MST / Địa chỉ / Người liên hệ

**Observation:** Clicking a customer row opens a small modal titled with the customer name. It shows only `Loại: Công ty` and an empty `Điện thoại` field, plus `Đóng` and `Sửa` buttons. The edit form (after clicking `Sửa`) reveals that the underlying record has fields for SĐT, MST, Địa chỉ, and Người liên hệ.

**Impact:** ketoan must click `Sửa` to see contact information, which puts her into edit mode and risks an unintended save. The `Đóng` button is the only safe exit.

**Recommendation:** Render every populated field on the read-only view. For empty fields, render a faint `Chưa có` caption + a small `Sửa` chip so the user can quickly fill them in without entering full edit mode.

**Severity:** LOW

**Page:** `/accountant/settings/clients` (detail dialog)

**Status vs prior:** 🆕 NEW

**Reproduce:** click any customer row on `/accountant/settings/clients`. Compare the dialog with the edit form.

**Screenshot:** `ss_15997jrzr` (detail) vs `ss_563152m9r` (edit)

---

## REGRESSIONS

| # | Feature | v3 state | v4 state |
|---|---------|----------|----------|
| (none) | — | — | No new regressions vs v3 verified state. The "regressions" relative to v3's claimed-fixed log (NX1, NX3) are listed under STILL_BROKEN above; they were never actually fixed in production. |

---

## Per-Flow Coverage

### Login
- Empty-fields submit: `Đăng nhập` button is disabled (`opacity ~50%`, no pointer events). Zero `/api/v1/auth/login` requests fire. ✅ N3 holds.
- Wrong creds (`ketoan / wrongpass`): `POST /api/v1/auth/login → 401`, alert `Thông tin đăng nhập không hợp lệ. Vui lòng thử lại.` renders at full red opacity. ✅ NX5 holds.
- Correct creds: redirects to `/accountant`, dashboard paints in <2s.
- Logout: 🔴 NX9 — redirects to `/login` which 404s.
- No "Quên mật khẩu?" link (still). Eye icon on password field works.
- Brand wordmark on login: 🆕 NX12 — `TTransport`, not `Vận Tải Phúc Lộc`.

### Khớp chuyến (Ghép chuyến)
- Two-pane layout intact. 13 chờ khớp. ✅
- Per-criterion ✓/✗ panel (Ngày đi / Tuyến đường / Khách hàng / Điểm lấy / Điểm trả / Container) intact. ✅ N7 holds.
- Click `Ghép` on a 4/6 candidate: `POST /api/v1/reconcile → 200`, `GET /api/v1/work-orders` re-fetched, count 13→12, work order removed from left list — **but UI shows red `Lỗi · Không thể ghép chuyến` toast**. 🔴 NX1 STILL BROKEN.
- Right pane after match: stale W001020 with live `Ghép` button. 🆕 NX10.
- Click a 0/6 work order: right pane shows empty state `Không tìm thấy đơn hàng phù hợp / Kiểm tra ngày, tuyến đường, hoặc container`. ✅ Good empty-state.
- `Tự động ghép` and `Nhập đơn` CTAs at top right are present. Did not exhaustively test `Tự động ghép` this round — recommend re-testing once NX1 is fixed.

### Khách hàng (`/accountant/settings/clients`)
- Single h1 `Khách hàng`. ✅
- Search input `Tìm tên, SĐT, MST...` present. ✅ NX2 holds.
- Columns: Tên / SĐT / MST / Loại / Địa chỉ. ✅ but every value is `—`. 🆕 NX13.
- Row click → small detail dialog with Loại + empty Điện thoại. 🆕 NX14.
- Sửa form: helper text under SĐT and MST, inline validation for `12` / `ABC`. ✅ N5 + C4 hold.
- `+ Thêm` button label not standardized. 🔴 TASK-018.

### Nhà thầu
- Single h1 `Nhà thầu`. ✅
- One pill `Vận Tải Phúc Lộc`, no surface info. 🔴 TASK-019.
- `+ Thêm` button label, no count, no search. 🔴 TASK-018, TASK-022.

### Tài xế (`/accountant/settings/drivers`)
- 🔴 **TWO h1s, both `Tài xế`.** TASK-002 STILL BROKEN. Confirmed via `document.querySelectorAll('h1').length === 2`.
- DataTablePro with Tài xế / SĐT / Biển số xe / Nhà xe.
- `taixe` and `taixe1` rows: SĐT and Biển số xe are `—`. 🔴 TASK-009.
- `tx_test` row: SĐT empty, Biển số xe `99T-99999`, Nhà xe `Vận Tải Phúc Lộc` (good — NX7 stuck).
- `+ Thêm tài xế` button. ✅ standardized for this page, but inconsistent with other pages.
- Search input present.

### Bảng giá list (`/accountant/settings/pricing`)
- 🔴 **Duplicate `Bảng giá` text** — page band + green-bar section header. TASK-001 STILL BROKEN.
- 2 client cards (HAP, PAN HẢI AN) with route + price counts.
- `+ Thêm bảng giá` button.

### Bảng giá detail (`/accountant/pricing/3`)
- 🔴 URL still NOT under `/settings/`. TASK-015 STILL BROKEN.
- 🔴 `MỨC GIÁ THEO SỐ LƯỢNG CONTAINER` rendered **65 times** on HAP page. TASK-016 STILL BROKEN.
- 🔴 F40/F20 sub-cards still per-container. TASK-030 STILL BROKEN.
- 🔴 No breadcrumb. TASK-032 STILL BROKEN.
- `Quay lại` link top-left works.
- Edit pencil grey, trash red. ✅ N17 holds.

### Kỳ lương (`/accountant/settings/salary`)
- Single h1 `Kỳ lương`. ✅
- `Cấu hình kỳ lương`: Từ ngày=26 / Đến ngày=25 → `Kỳ hiện tại 26/04 → 25/05`. ✅ N10 holds.
- 🔴 No helper text under inputs. TASK-020 STILL BROKEN.
- 🔴 `Tính lương tất cả` next to an unlabeled download icon. TASK-021 STILL BROKEN.
- `Lịch sử kỳ lương`: `taixe` / `taixe1` cards both Lương=0. Each carries `Đã tính` chip AND `Lương bằng 0 — chưa có đơn hàng trong kỳ` warning. 🔴 TASK-003 STILL BROKEN. 🔴 TASK-004 STILL BROKEN (raw username labels).

### Đơn hàng (`/accountant/trips`)
- Single h1 `Đơn hàng`. ✅
- KPIs: 6 Chờ đối soát, 3 Đã khớp. Filter pills `Tất cả` / `Chờ đối soát` / `Đã khớp`.
- Status pill values in list: only `Chờ đối soát` and `Đã khớp`. ✅ Internal vocabulary consistent.
- 🟡 But Tổng quan's `Đơn hàng gần đây` panel emits `Hoàn thành` for some rows (e.g. T002028) — third vocabulary that doesn't appear here. NX4 PARTIAL.

### Tổng quan (`/accountant`)
- 4 KPI cards (CHUYẾN CHƯA GHÉP / ĐƠN CHỜ ĐỐI SOÁT / LƯƠNG SẢN LƯỢNG TX / DOANH THU (ĐƠN HÀNG THÁNG)). ✅ N9 label fix holds.
- "Chuyến chưa ghép" panel (13 rows visible after NX1's destructive test) and "Đơn hàng gần đây" panel.
- 🟡 Status pills in "Đơn hàng gần đây": mostly `Chờ đối soát`, but T002028 reads `Hoàn thành`. NX4 PARTIAL.
- Month picker `Tháng 05/2026 / 01/05 → 31/05` with chevrons.

### Người dùng (`/accountant/settings/users`)
- Single h1 `Người dùng`. ✅
- 🔴 `0 tài khoản đang hoạt động`. NX3 STILL BROKEN.
- 🔴 All role tabs `Tất cả 0 / Giám đốc 0 / Kế toán 0 / Tài xế 0`. NX3.
- 🔴 Body blank, no empty-state. TASK-005 STILL BROKEN.
- 🔴 `+ Tạo tài khoản` label, inconsistent with other Settings pages. TASK-018.

### Cross-flow
- Logout: 🔴 NX9 (404 page after logout).
- Browser back: tested across Settings subpages — works.
- Refresh: stays on current route, refetches data. ✅
- Multi-tab: not exhaustively tested.
- Hard refresh: SW + cache cleared once at session start. Bundle hash stable. ✅

### Mobile (390 × 844 — INFERRED)
The host browser cannot resize below ~1568. Reported `winSize: [1600, 913]` even after explicit `resize_window(390, 844)`. Mobile claims below are inferred from earlier audits and the visible breakpoint behavior at desktop:
- DriverList has no `useIsMobile` branch in the v3 audit's code review — table will horizontally scroll at ≤768. 🔴 TASK-025 partial.
- ClientList has a mobile branch — verified via the v3 fix-log claim, not visually re-tested this round.
- Settings index card grid `sm:grid-cols-2 lg:grid-cols-3` — at 390px renders 1-col, OK.

**Recommendation:** invest in a Playwright mobile run (DPR + viewport override via CDP) so this isn't a recurring blind spot.

---

## Cross-cutting Issues

- **Toast / state desync (NX1).** Highest-priority unfixed bug. Pattern: optimistic mutation runs before HTTP response check. Fix once, audit every other mutation site for the same pattern.
- **Stale right-pane state (NX10).** Sister bug to NX1. Same fix moment.
- **Settings IA never landed (TASK-013).** Without `<SettingsPageLayout>`, every duplicate-header bug returns whenever a new Settings subpage ships. The 5 P0 settings tasks are symptoms of one missing component.
- **Brand drift (NX12).** Three brands across three surfaces. Single string + grep replace.
- **Data quality vs UI (NX13).** Restoring the columns was correct. The next layer is seeding real data. Empty columns hide the win.
- **Push notifications 500 (NX11).** Operational noise that will mask future real 500s.
- **Tasklist hygiene.** `[x]` should mean "deployed and verified", not "PR open" or "merged". The v3 doc and this tasklist created a false "Ready" verdict by counting unshipped work as done. Suggest CI-driven status (a test that hits prod and passes the assertion before flipping the checkbox).

---

## Heuristics Compliance Matrix

| Heuristic | v1 | v2 | v3 (claimed) | v4 (verified) | Notes |
|-----------|----|----|--------------|---------------|-------|
| Visibility of System Status | 2/5 | 3/5 | 4.5/5 | 3/5 | NX1 + NX10 + NX11 + dashboard `Hoàn thành` (NX4) all attack this heuristic. |
| Match to Real World | 3/5 | 2/5 | 4/5 | 3.5/5 | Vietnamese labels still clear. Drift on dashboard "Hoàn thành" + status enum drift. |
| User Control & Freedom | 2/5 | 2/5 | 4/5 | 3.5/5 | Confirm dialogs hold (C2/C3). NX10 lets a duplicate match fire. NX9 logout 404. |
| Consistency | 2/5 | 2/5 | 4/5 | 2.5/5 | Brand drift (NX12), button labels (TASK-018), header duplicates (TASK-001/002), status drift (NX4). |
| Error Prevention | 1/5 | 1/5 | 4.5/5 | 4/5 | C4 + N5 + N3 hold. NX10 / NX1 erode trust in the next click. |
| Recognition vs Recall | n/a | 3/5 | 4.5/5 | 3.5/5 | Khách hàng columns restored (NX2) but empty (NX13). Drivers em-dashes (TASK-009). |
| Flexibility & Efficiency | n/a | 3/5 | 4/5 | 3/5 | No breadcrumbs (TASK-032). 65 repeated container labels (TASK-016). |
| Aesthetic / Minimalist | n/a | 3/5 | 4/5 | 3/5 | TASK-016 (65 labels) + TASK-019 (Nhà thầu whitespace) + duplicate headers. |
| Help Users Recover from Errors | 1/5 | 1/5 | 4/5 | 3.5/5 | Inline errors (C4) + helper text (N5). NX1's wrong toast is anti-recovery. |
| Help & Documentation | n/a | 2/5 | 2.5/5 | 2.5/5 | No first-run tour, no in-app help. |

**Average:** v3 claimed ~4.1/5 → **v4 verified ~3.2/5**. The v3 doc was scored against the fix-log, not the deployed bundle.

---

## Quick Wins (S effort, < 1 day each)

1. **NX9 — fix logout redirect.** One-line change: navigate to `/` instead of `/login`. ~5 min.
2. **TASK-001 — delete the duplicate `<PageHeader title="Bảng giá" />` in `PricingClientCards.tsx`.** Per the v3 tasklist, line 73 is the offender. ~10 min.
3. **TASK-002 — delete the inner `<h1 className="typo-h1">Tài xế</h1>` in `DriverList.tsx`.** Per the v3 tasklist, lines 60–73. ~10 min.
4. **TASK-003 — gate the `Đã tính` chip on `period.totalSalary > 0`.** ~15 min.
5. **NX10 — clear right-pane selection in the `handleMatch` success branch on Ghép chuyến.** ~30 min.
6. **NX1 — actually verify the post-fix bundle is what shipped.** Re-deploy if needed; otherwise inspect the optimistic-mutation site. ~1 h investigation, fix may be larger.
7. **NX12 — change login wordmark string + `<title>` to `Vận Tải Phúc Lộc`.** ~5 min.
8. **TASK-018 — global find/replace on add-button labels (`+ Thêm <entity>`).** ~30 min.
9. **TASK-020 — add `<small>1–31</small>` under both Salary day inputs.** ~5 min.
10. **TASK-021 — replace the unlabeled `<Download>` icon with a `Tải Excel` button.** ~10 min.
11. **TASK-034 — change Settings index subtitle.** ~5 min.

That batch is roughly 3 dev-hours and would flip every Hold blocker except NX1, NX3, and TASK-016 (which needs structural refactor).

## Major Initiatives (M-L)

1. **NX1 — diagnose and fix the desync between optimistic mutation and HTTP response.** Likely a single mishandled `Promise.catch` site. 1 day incl. an automated regression test that asserts `toast.type === 'success'` when reconcile returns 2xx.
2. **NX3 — figure out why Người dùng API returns 0 for ketoan.** Either a permissions filter on the backend or the v3 `isActive !== false` change never deployed. 1–2 days incl. e2e test.
3. **TASK-013 — actually build `<SettingsPageLayout>`** and wire all six subpages through it. Closes TASK-001/002/027/032/035 in one stroke. 2 days.
4. **TASK-015 — move pricing detail under `/settings/`.** Routing change + redirect + breadcrumb update. 0.5–1 day.
5. **TASK-016 + TASK-030 — Pricing detail compression: collapse F40/F20 cards into per-route tables.** 2 days incl. spec.
6. **NX13 — production data backfill for SĐT / MST / Địa chỉ on Khách hàng.** Not engineering — operations / data entry. ½ day per 100 rows.
7. **NX4 — single source of truth for status enum** (already a TASK-026 carryover). 2 days.
8. **Mobile audit infrastructure** — Playwright with CDP-driven viewport override, run on every PR. 1 day setup, ongoing maintenance.
9. **Push notifications 500 (NX11).** 1 day to harden the endpoint or feature-flag the call.

---

## Release Readiness Verdict

⚠️ **HOLD** — downgrade from v3's claimed `Ready`.

**Reasoning:** the v3 fix log was authored ahead of deployment. In production, NX1, NX3, NX9 (new), and 18 of the 27 verifiable settings tasks are still broken. The good news: the must-fix list is small (NX1, NX9, NX10, TASK-001, TASK-002, TASK-003) and is roughly 1 dev-day of work.

**Min bar to flip to Ready:**
1. NX1 — Ghép chuyến toast matches HTTP outcome.
2. NX9 — logout lands on `/`, not `/login` (404).
3. NX10 — right pane clears after successful match.
4. TASK-001 — single `Bảng giá` header.
5. TASK-002 — single `Tài xế` h1.
6. TASK-003 — Lương=0 cards have one status, not two.
7. NX3 — Người dùng API returns ketoan (or surface a permissions banner if intentional).

NX11 (push 500), NX12 (brand drift), NX13 (data quality), and the rest of the settings tasklist are not release blockers but should follow within the next sprint to keep the heuristics score moving.

---

## Recommendations Summary Table

| # | Page | Severity | Status | Observation | Recommendation |
|---|------|----------|--------|-------------|----------------|
| C2 | Khách hàng | CRITICAL | ✅ FIXED | DELETE 200, success toast | — |
| C3 | Bảng giá | CRITICAL | ✅ FIXED | Confirm dialog | — |
| C4 | Khách hàng | CRITICAL | ✅ FIXED | Inline `MST phải 10 hoặc 13 chữ số` / `SĐT không hợp lệ` | — |
| C5 | Đơn hàng / Khách hàng / Tài xế | CRITICAL | ✅ FIXED | Diacritic+space-insensitive search | — |
| N3 | login | MED | ✅ FIXED | Button disabled on empty | — |
| N5 | Khách hàng | HIGH | ✅ FIXED | Helper text under SĐT/MST | — |
| N9 | dashboard | HIGH | ✅ FIXED | Label `DOANH THU (ĐƠN HÀNG THÁNG)` explicit | — |
| N10 | Kỳ lương | HIGH | ✅ FIXED | `26/04 → 25/05` | — |
| N11 | Kỳ lương | HIGH | ✅ FIXED | Lương=0 warning visible | — but TASK-003 still pairs it with `Đã tính` chip |
| N17 | Bảng giá | HIGH | ✅ FIXED | Pencil grey, trash red | — |
| NX1 | Ghép chuyến | HIGH | 🔴 STILL BROKEN | Server returns 200, UI shows error toast | Verify fix actually deployed; inspect optimistic mutation site |
| NX2 | Khách hàng | HIGH | ✅ FIXED | Search + columns | — (see NX13 for empty-data follow-up) |
| NX3 | Người dùng | MED | 🔴 STILL BROKEN | Counter 0, body blank | Verify `isActive !== false` deployed; add EmptyState (TASK-005) |
| NX4 | Tổng quan | MED | 🟡 PARTIAL | `Hoàn thành` still on dashboard panel | Migrate dashboard panel to new vocabulary |
| NX5 | login | MED | ✅ FIXED | Full-opacity error | — |
| NX6 | 404 / login | LOW | ⚠️ MOOT | Authenticated 404 inside layout (good); login 404 unauthenticated (correct) | — |
| NX7 | Tài xế | LOW | ✅ FIXED | All `Vận Tải Phúc Lộc` | — |
| NX8 | Khách hàng | LOW | ✅ FIXED | Test KH Audit gone | — |
| **NX9** | **logout** | **HIGH** | **🆕 NEW** | **Logout → `/login` → 404** | **Change logout target to `/` or define `/login` route** |
| **NX10** | **Ghép chuyến** | **HIGH** | **🆕 NEW** | **Right pane stale after success** | **Clear selection on `handleMatch` success branch** |
| **NX11** | **global** | **MED** | **🆕 NEW** | **`POST /push/subscriptions → 500`** | **Make endpoint idempotent or feature-flag the call** |
| **NX12** | **login / global** | **LOW** | **🆕 NEW** | **`TTransport` vs `Vận Tải Phúc Lộc`** | **One brand string everywhere** |
| **NX13** | **Khách hàng** | **MED** | **🆕 NEW** | **All SĐT/MST/Địa chỉ are `—`** | **Data backfill + missing-field chips** |
| **NX14** | **Khách hàng detail** | **LOW** | **🆕 NEW** | **Detail dialog hides MST/Địa chỉ** | **Render every populated field on read-only view** |
| TASK-001 | Bảng giá | P0 | 🔴 STILL BROKEN | Duplicate `Bảng giá` header | Drop inner `<PageHeader>` |
| TASK-002 | Tài xế | P0 | 🔴 STILL BROKEN | 2 h1s `Tài xế` | Delete inner h1 |
| TASK-003 | Kỳ lương | P0 | 🔴 STILL BROKEN | `Đã tính` + warning together | Gate chip on `totalSalary > 0` |
| TASK-004 | Kỳ lương | P0 | 🔴 STILL BROKEN | `taixe` raw username | Use `fullName ?? username` |
| TASK-005 | Người dùng | P1 | 🔴 STILL BROKEN | No empty-state | Add `<EmptyState>` |
| TASK-009 | Tài xế | P1 | 🔴 STILL BROKEN | `—` for SĐT / Biển số | Render `+ Thêm SĐT` chip |
| TASK-013 | Settings | P0 | 🔴 STILL BROKEN | No `<SettingsPageLayout>` | Build it; rip per-page headers |
| TASK-015 | Bảng giá detail | P0 | 🔴 STILL BROKEN | URL not under `/settings/` | Move route + 301 redirect |
| TASK-016 | Bảng giá detail | P1 | 🔴 STILL BROKEN | 65 instances of label | Render once per route group |
| TASK-017 | Cài đặt | P1 | 🔴 STILL BROKEN | 6 cards flat | 3 buckets |
| TASK-018 | Cài đặt | P1 | 🔴 STILL BROKEN | 5 button labels | `+ Thêm <entity>` everywhere |
| TASK-019 | Nhà thầu | P2 | 🔴 STILL BROKEN | Tiny pill in whitespace | Show full row + use DataTablePro |
| TASK-020 | Kỳ lương | P2 | 🔴 STILL BROKEN | No `1–31` helper | Add `<small>` |
| TASK-021 | Kỳ lương | P2 | 🔴 STILL BROKEN | Unlabeled icon | `Tải Excel` text button |
| TASK-022 | Tài xế | P2 | 🔴 STILL BROKEN | No row count | Mirror Đơn hàng pattern |
| TASK-023 | Cài đặt | P2 | 🔴 STILL BROKEN | 3-col on lg | 2-col on lg |
| TASK-027 | Settings (all) | P1 | 🔴 STILL BROKEN | CTAs in body | Hoist to header `actions` slot |
| TASK-030 | Bảng giá detail | P2 | 🔴 STILL BROKEN | F40/F20 cards | Single per-route table |
| TASK-032 | Settings (all) | P3 | 🔴 STILL BROKEN | No breadcrumb | Add `Cài đặt › <subpage>` |
| TASK-034 | Cài đặt | P3 | 🔴 STILL BROKEN | Generic subtitle | Specific copy |
| TASK-035 | Settings (all) | P3 | 🔴 STILL BROKEN | Duplicate h1s | One h1 via layout |

---

**End of v4 audit.**
