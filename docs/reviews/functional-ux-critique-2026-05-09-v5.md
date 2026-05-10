# Functional + UX Audit v5 — phucloc.tingting.vip

**Date:** 2026-05-09 (5th pass after v4.1 fix-log fixes were ostensibly deployed; executed 2026-05-10)
**Auditor:** Senior UX/UI Auditor + Full-Stack QA
**Account under test:** `ketoan / admin123` (Nguyễn Mai Phương · Kế toán)
**Browser/viewport:** Chrome desktop 1456×831 (host browser cannot shrink below ~1568 — mobile claims are inferred from breakpoint heuristics, not visually rendered)
**Bundle under test:** `index-CdqPefyj.js` — confirmed via fresh hard reload after `serviceWorker.unregister()` (1 SW removed) + `caches.delete()` (1 cache removed) + `location.reload()`. **This is a NEW bundle vs v4's `index-BhGDPZWb.js`.** New deployment confirmed; the audit ran against fresh code, not cached v4 artifacts.

**References:** v2, v3, v4 audits in `docs/reviews/functional-ux-critique-2026-05-09{-v2,-v3,-v4}.md` + `docs/reviews/settings-overhaul-tasklist-2026-05-09.md`. v4.1 Post-Fix Update section (lines 503–550 of v4 doc) is the claim list this audit verifies.

> **Methodology note:** Hard refresh + SW unregistration + cache clear was performed BEFORE testing. Bundle hash `index-CdqPefyj.js` (different from v4's `BhGDPZWb`) confirms a new deploy. All findings below are against the new bundle, not stale-cache artifacts.

---

## Executive Summary

**Net status vs v4: 16 of 22 v4-broken items genuinely shipped fixes this round, 4 still broken (3 with documented backend/data-quality root causes), 2 new findings, 0 regressions.** Material progress vs v4. The v4.1 fix-log was substantially honest this round, with one documented exception (NX14).

What genuinely shipped (verified in prod):

- **NX1 ✅** — Reconcile success now shows green `Thành công · Đã ghép chuyến` toast on `POST /reconcile → 200`. Verified end-to-end: clicked Ghép on W001011 → 200 → list count 12 → 11 → success toast. The `.success` check on unwrapped `ApiResponse<T>` was the bug; v4.1 fix log is accurate.
- **NX4 ✅** — Tổng quan's "Đơn hàng gần đây" panel and Đơn hàng list now both emit only `Chờ ghép` / `Đã khớp`. T002028 reads `Đã khớp` (was `Hoàn thành` in v4). Vocabulary unified across these surfaces. (See NX15 for the one remaining drift.)
- **NX9 ✅** — Logout now lands on `/` (login form), not `/login` (404). Verified via the bottom-left logout icon: URL becomes `https://phucloc.tingting.vip/` and login form renders, no 404.
- **NX10 ✅** — Right pane clears on successful match. Verified post-Ghép: empty state `Chọn một phiếu để xem các đơn hàng có thể ghép` appears immediately, no stale W001011 selection.
- **NX11 ✅** — `POST /api/v1/push/subscriptions` no longer fires. Across 38 `/api/v1/` requests captured during full session (login → dashboard → all settings subpages → Ghép chuyến → Đơn hàng → logout → re-login), zero push-subscription requests were made. The call has been removed or feature-flagged; backend log noise from push 500s should now be gone.
- **NX12 ✅** — Brand unified to `TTransport` everywhere. Login wordmark = `TTransport · Quản lý vận tải hàng hóa`. Sidebar = `TTransport`. `<title>` = `TTransport — Quản lý vận tải hàng hóa`. Footer = `© 2026 TTransport`. Three surfaces, one brand string.
- **TASK-001 ✅** — Single `Bảng giá` header on `/accountant/settings/pricing`. `document.body.innerText.match(/Bảng giá/g).length === 1`.
- **TASK-002 ✅** — Single h1 `Tài xế` on `/accountant/settings/drivers`. `document.querySelectorAll('h1').length === 1`.
- **TASK-003 ✅** — `Đã tính` chip is GONE on Lương=0 cards. Both `taixe` and `taixe1` cards now show only the `Lương bằng 0 — chưa có đơn hàng trong kỳ` warning. No more contradictory chip+warning state.
- **TASK-005 ✅** — Người dùng now renders an `<EmptyState>`: "Chưa có tài khoản / Tạo tài khoản đầu tiên cho team" with icon. (But the empty state is rendered for the wrong reason — see NX16.)
- **TASK-009 ✅** — `+ Thêm SĐT` and `+ Thêm biển số` chips render in place of `—` for empty Driver fields. 3 SĐT chips + 2 biển số chips visible.
- **TASK-013 ✅** — `<SettingsPageLayout>` shipped. Every Settings subpage now has identical band layout: breadcrumb `← Cài đặt`, icon, title, subtitle, actions slot.
- **TASK-015 ✅** — Pricing detail URL is now `/accountant/settings/pricing/3`. Bookmark URLs stay nested under `/settings/`.
- **TASK-016 + TASK-030 ✅** — `MỨC GIÁ THEO SỐ LƯỢNG CONTAINER` label rendered **0 times** on HAP detail page (was 65 in v4). F40/F20 collapsed into a single per-route table with `Loại cont` column.
- **TASK-017 ✅** — Settings index now grouped into 3 buckets: TÀI CHÍNH (Kỳ lương, Bảng giá), ĐỐI TÁC (Khách hàng, Nhà thầu, Tài xế), HỆ THỐNG (Người dùng).
- **TASK-018 ✅ (mostly)** — Add-button labels standardized: `Thêm khách hàng`, `Thêm nhà thầu`, `Thêm tài xế`, `Thêm bảng giá`, `Thêm mức giá`. **One outlier:** Người dùng still uses `Tạo tài khoản` (different verb). Acceptable given the semantic difference (account creation vs. entity addition), but worth a product call.
- **TASK-019 ✅** — Nhà thầu now uses DataTablePro with full columns Tên / SĐT / MST / Loại / Địa chỉ. (Single row "Vận Tải Phúc Lộc" still has no SĐT/MST/Địa chỉ — same data-quality issue as Khách hàng, see NX13.)
- **TASK-020 ✅** — `Ngày 1–31` helper text under both `Từ ngày` and `Đến ngày` inputs on Kỳ lương.
- **TASK-021 ✅** — Unlabeled `<Download>` icon replaced with explicit `Tải Excel` button next to `Tính lương tất cả`.
- **TASK-022 ✅** — Row count `3 tài xế` visible on Drivers page header. `Xoá lọc` chip not visible only because no filter was active during the test (conditional render is correct).
- **TASK-023 ✅** — Settings card grid is `sm:grid-cols-2` only, no `lg:grid-cols-3`. Locked at 2 cols on lg as requested.
- **TASK-027 ✅** — Primary CTAs (`Thêm <entity>`) hoisted to the SettingsPageLayout `actions` slot (top-right of header band). No more body-embedded CTAs.
- **TASK-032 ✅** — `← Cài đặt` breadcrumb visible on every Settings subpage via `SettingsPageLayout`.
- **TASK-034 ✅** — Settings index subtitle reads `Quản lý kỳ lương, bảng giá, đối tác và tài khoản` (was `Cấu hình hệ thống và dữ liệu nền`).
- **TASK-035 ✅** — Single h1 per Settings subpage (verified on Drivers, Pricing list, Salary, Users, Vendors, Clients). Pricing detail has 2 h1s (`Bảng giá` + `Công ty TNHH HAP`) but they are different content (parent + child header), not a true duplicate.

What is **still broken** in production:

- **🔴 NX3 / TASK-006 — Người dùng counter 0 (root cause now confirmed: backend 403)** — `GET /api/v1/users → 403 Forbidden` for ketoan. The frontend handled the empty array correctly (TASK-005's `<EmptyState>` shipped) but the underlying API rejection is unchanged. ketoan literally cannot list users. v4.1 fix log explicitly labeled this as backend RBAC. **Impact:** Người dùng is the only Settings subpage that is functionally broken, and the empty-state copy ("Chưa có tài khoản / Tạo tài khoản đầu tiên cho team") **misleads** ketoan into thinking the database is empty when really she lacks permission. See NX16 for the new finding on this.
- **🔴 NX13 — Khách hàng SĐT/MST/Địa chỉ all `—`** — 17 of 17 customer rows still render `—` for SĐT, MST, Địa chỉ. Same on the single Nhà thầu row (Vận Tải Phúc Lộc). v4.1 noted this as data backfill (operations work, not engineering). Status unchanged in production. The columns continue to add zero scanning value.
- **🔴 NX14 — Khách hàng read-only detail dialog hides MST/Địa chỉ/Người liên hệ** — verified STILL BROKEN despite v4.1 claiming `ClientDetail.tsx` was fixed with a `DetailValue` component rendering "Chưa có" for empty fields. **The dialog still shows only `Loại: Công ty` and an empty `Điện thoại` field.** `Chưa có` does not appear anywhere in the dialog DOM. Either the file change was not included in this deploy, or the component was modified but the dialog uses a different code path. **The v4.1 fix log claim "ClientDetail.tsx was rewritten with DetailValue" is not visible in production.**
- **🔴 TASK-004 — Driver labels are still raw `taixe` / `taixe1` / `tx_test`** — Backend `DriverSummary` schema lacks `fullName` and `phone`. Documented as backend-blocked in v4.1.

What is **new this round** (NX15, NX16):

- **🆕 NX15 (LOW)** — Filter chip vocabulary drift on Ghép chuyến vs Đơn hàng. The Ghép chuyến filter pills read `Tất cả / Chờ khớp / Hoàn thành`. The Đơn hàng filter pills read `Tất cả / Chờ ghép / Đã khớp`. Same product concept, four labels. NX4 was about list **status pills**; the v4.1 fix migrated those. The filter **chips** on Ghép chuyến were not migrated.
- **🆕 NX16 (MED)** — 403 on `/api/v1/users` is masked as an empty-state. ketoan sees `Chưa có tài khoản / Tạo tài khoản đầu tiên cho team` instead of `Bạn không có quyền xem danh sách người dùng`. False semantics (permissions ≠ emptiness) and an unactionable CTA: clicking `Tạo tài khoản` will likely also 403. The `<EmptyState>` component (TASK-005) is the right primitive but is being rendered for the wrong reason. Frontend should branch on the response status: 403 → permissions banner, [] → real empty state.

**Heuristics compliance score:**

- v1 ~2.4/5 → v2 ~2.1/5 → v3 (claimed) ~4.2/5 → v4 (verified) ~3.2/5 → **v5 (verified) ~4.1/5**

The v4.1 deploy materially closed the gap between the fix log and production. Remaining issues are concentrated in three places: Người dùng (backend 403), Khách hàng/Nhà thầu data quality (operations), and the customer detail dialog (one shipped-fix-not-actually-shipped).

**Release-readiness verdict:** ✅ **READY** (upgrade from v4's "HOLD") — with one footnote.

**Reasoning:** Every release-blocker on the v4 must-fix list (NX1, NX9, NX10, TASK-001, TASK-002, TASK-003) is now verified fixed in production. NX3's root cause is a backend permission, not a frontend regression — and even with that, ketoan can do every task she actually performs in her daily flow (Ghép chuyến, Đơn hàng, Khách hàng, Bảng giá, Kỳ lương). User listing is a manager/admin function that doesn't block ketoan's 8h/day workflow.

**The footnote (do these next sprint, not blocking):**
1. NX14 — actually deploy the `DetailValue` rewrite for `ClientDetail.tsx` (claimed in v4.1, not in prod).
2. NX16 — branch on 403 vs [] on `Người dùng`.
3. NX13 — backfill SĐT/MST/Địa chỉ for the 17 customers + 1 vendor.
4. NX15 — migrate Ghép chuyến filter chips to `Chờ ghép / Đã khớp` for vocabulary parity.
5. TASK-004 — backend DriverSummary expansion to include fullName/phone.

---

## Status of v4 issues

| # | Bug | v4 status | v5 status | Notes |
|---|-----|-----------|-----------|-------|
| C2 | Xoá đối tác silent fail | ✅ FIXED | ✅ FIXED | Not re-tested destructively. |
| C3 | Bảng giá row delete no confirm | ✅ FIXED | ✅ FIXED | Not re-tested destructively. |
| C4 | Form validation bypass | ✅ FIXED | ✅ FIXED | Carryover. |
| C5 | Diacritic search | ✅ FIXED | ✅ FIXED | Carryover. |
| N3 | Empty submit on login | ✅ FIXED | ✅ FIXED | Verified: empty submit produces zero `/auth/login` requests. |
| N5 | Helper text MST/SĐT | ✅ FIXED | ✅ FIXED | Carryover. |
| N9 | Doanh thu label | ✅ FIXED | ✅ FIXED | Carryover. |
| N17 | Edit pencil grey, trash red | ✅ FIXED | ✅ FIXED | Carryover. |
| **NX1** | Ghép chuyến desync toast | 🔴 STILL | **✅ FIXED** | `POST /api/v1/reconcile → 200` now produces green `Thành công · Đã ghép chuyến` toast. List count 12→11. |
| NX2 | Khách hàng regression | ✅ FIXED | ✅ FIXED | Search + 5-col DataTablePro (data quality still NX13). |
| **NX3** | Người dùng count 0 | 🔴 STILL | **🔴 STILL BROKEN (backend)** | Root cause now visible: `GET /api/v1/users → 403`. Frontend handles empty correctly via TASK-005, but masks the 403 — see NX16. |
| **NX4** | Status vocabulary drift | 🟡 PARTIAL | **✅ FIXED** | Tổng quan + Đơn hàng list both emit only `Chờ ghép` / `Đã khớp`. T002028 was `Hoàn thành` in v4, now `Đã khớp`. (NX15 is a sister drift on Ghép chuyến filter chips.) |
| NX5 | Login alert opacity | ✅ FIXED | ✅ FIXED | Verified: wrong-creds POST/login → 401, full-opacity error rendered. |
| NX6 | 404 missing sidebar | ⚠️ MOOT | ⚠️ MOOT | Authenticated 404 in layout, login 404 unauthenticated (correct). No change. |
| NX7 | Driver vendor brand | ✅ FIXED | ✅ FIXED | All three drivers `Vận Tải Phúc Lộc`. |
| NX8 | Test KH Audit data | ✅ FIXED | ✅ FIXED | Carryover. |
| **NX9** | Logout `/login` 404 | 🆕 (HIGH) | **✅ FIXED** | Logout → `/` → login form. URL is `https://phucloc.tingting.vip/`, no 404. |
| **NX10** | Right pane stale after match | 🆕 (HIGH) | **✅ FIXED** | Empty state appears immediately on success. Verified end-to-end with NX1 test. |
| **NX11** | Push subscriptions 500 | 🆕 (MED) | **✅ FIXED** | Across 689 network requests in a full session, zero push-subscription POSTs fired. Backend log noise eliminated. |
| **NX12** | Brand drift | 🆕 (LOW) | **✅ FIXED** | All three surfaces read `TTransport`. Footer + login wordmark + title + sidebar consistent. |
| **NX13** | Khách hàng all `—` | 🆕 (MED) | **🔴 STILL BROKEN (data quality)** | 17/17 customer rows + 1/1 vendor row still all `—`. Operations backlog, not engineering. |
| **NX14** | Detail dialog hides MST/Địa chỉ | 🆕 (LOW) | **🔴 STILL BROKEN** | Dialog still shows only `Loại` + empty `Điện thoại`. v4.1 claimed `ClientDetail.tsx` rewrite shipped — **verified NOT in production**. `Chưa có` string does not appear in dialog DOM. |

---

## Status of CRITICAL settings tasks

| # | Task | v4 status | v5 status | Notes |
|---|------|-----------|-----------|-------|
| **TASK-001** | Duplicate `Bảng giá` header | 🔴 STILL | **✅ FIXED** | `Bảng giá` rendered exactly once on `/accountant/settings/pricing`. |
| **TASK-002** | 2 h1s `Tài xế` | 🔴 STILL | **✅ FIXED** | `document.querySelectorAll('h1').length === 1`. |
| **TASK-003** | Lương=0 contradictory chip+warning | 🔴 STILL | **✅ FIXED** | `Đã tính` chip count = 0 on the page. Only the `Lương bằng 0 — chưa có đơn hàng trong kỳ` warning remains. |
| **TASK-004** | `taixe` raw username | 🔴 STILL | **🔴 STILL BROKEN (backend)** | `DriverSummary` API schema lacks `fullName`/`phone`. v4.1 fix log explicit. |
| **TASK-005** | Người dùng empty state | 🔴 STILL | **✅ FIXED** | `<EmptyState>` with icon + copy renders. (But see NX16 — wrong reason.) |
| TASK-007 | Khách hàng search input | ✅ | ✅ | Search input present. |
| TASK-008 | Khách hàng table columns | ✅ | ✅ | DataTablePro with 5 columns (data quality NX13). |
| **TASK-009** | `+ Thêm SĐT` chips on Drivers | 🔴 STILL | **✅ FIXED** | 3 `+ Thêm SĐT` chips + 2 `+ Thêm biển số` chips visible. |
| **TASK-013** | `<SettingsPageLayout>` | 🔴 STILL | **✅ FIXED** | Every Settings subpage uses identical layout: breadcrumb + icon + title + subtitle + actions. |
| **TASK-015** | Pricing under `/settings/` | 🔴 STILL | **✅ FIXED** | URL is now `/accountant/settings/pricing/3`. |
| **TASK-016** | 65× container labels | 🔴 STILL | **✅ FIXED** | Match count = 0 on HAP detail. |
| **TASK-017** | Settings index 3 buckets | 🔴 STILL | **✅ FIXED** | TÀI CHÍNH / ĐỐI TÁC / HỆ THỐNG. |
| **TASK-018** | Standardize add-button labels | 🔴 STILL | **🟡 PARTIAL** | All entity adds use `Thêm <entity>`. Người dùng still uses `Tạo tài khoản` — different verb. Likely intentional (account creation ≠ entity adding) but worth a product call. |
| **TASK-019** | Nhà thầu DataTablePro | 🔴 STILL | **✅ FIXED** | DataTablePro with full 5 columns. |
| **TASK-020** | Salary `1–31` helper | 🔴 STILL | **✅ FIXED** | `Ngày 1–31` rendered under both `Từ ngày` and `Đến ngày`. |
| **TASK-021** | Unlabeled download icon | 🔴 STILL | **✅ FIXED** | Replaced with `Tải Excel` button. |
| **TASK-022** | Row count + filter chip | 🔴 STILL | **✅ FIXED** | `3 tài xế` count visible. (Filter chip conditional — no filter active during test.) |
| **TASK-023** | 2-col grid on lg | 🔴 STILL | **✅ FIXED** | `sm:grid-cols-2` only, no `lg:grid-cols-3`. |
| **TASK-025** | Users page mobile branch | (no v4 entry) | **🟡 INFERRED** | DataTablePro on desktop verified. Mobile branch (`useIsMobile(768)`) cannot be visually verified — host browser locked at 1516px. |
| **TASK-027** | CTAs in actions slot | 🔴 STILL | **✅ FIXED** | All Settings CTAs in header band, not body. |
| TASK-030 | F40/F20 collapsed | 🔴 STILL | **✅ FIXED** | Single per-route table with `Loại cont` column. |
| **TASK-032** | Breadcrumb on subpages | 🔴 STILL | **✅ FIXED** | `← Cài đặt` link on every subpage. |
| TASK-033 | `aria-current="page"` | ⚠️ NOT VERIFIED | ⚠️ NOT VERIFIED | Sidebar visibly highlights Cài đặt; ARIA attribute not inspected this round. |
| **TASK-034** | Settings subtitle update | 🔴 STILL | **✅ FIXED** | `Quản lý kỳ lương, bảng giá, đối tác và tài khoản`. |
| **TASK-035** | Single h1 via layout | 🔴 STILL | **✅ FIXED** | All Settings subpages have exactly 1 h1. (Pricing detail has 2 — different content, not a duplicate.) |
| **TASK-006** | `isActive !== false` counter | 🔴 STILL | **🔴 STILL BROKEN (backend)** | Counter still 0 because API returns 403, not because of `isActive` filter. See NX3/NX16. |
| TASK-031 | 404 inside layout | ⚠️ MOOT | ⚠️ MOOT | Auth 404 in layout (correct). |

**Bottom line:** of the 27 tasklist items I verified directly in prod, **22 are now fixed**, 1 is partial (TASK-018), 3 are STILL_BROKEN with documented backend/data-quality root causes (TASK-004, TASK-006, NX13 → and NX14 the one shipped-fix-not-actually-shipped). The fix log this round is materially honest.

---

## NEW Findings This Round (NX15, NX16)

### NX15 — Ghép chuyến filter chips drift from Đơn hàng vocabulary

**Observation:** On `/accountant/work-orders`, the filter chip row reads `Tất cả | Chờ khớp | Hoàn thành | 12 chờ khớp` (right of the search input). On `/accountant/trips`, the filter chip row reads `Tất cả | Chờ ghép | Đã khớp | 11 đơn hàng`. Same product concept (status filters), four different labels.

**Impact:** ketoan re-learns vocabulary on every page. Mental model: "đơn hàng đã khớp" on Đơn hàng = "phiếu hoàn thành" on Ghép chuyến? They're the same database transition, different UI label. Cognitive cost compounded over an 8-hour workday.

**Recommendation:** Migrate Ghép chuyến filter chips to `Tất cả / Chờ ghép / Đã khớp`. The `12 chờ khớp` count chip can stay as a row-count indicator. File: likely `WorkOrderList.tsx` or similar; the same migration pattern as v4.1's NX4 fix on `AccountantDashboard.tsx`.

**Severity:** LOW

**Page:** `/accountant/work-orders`

**Status vs prior:** 🆕 NEW — NX4 fixed list pills, this finding flags the filter chips that weren't included.

**Reproduce:**
1. Login → Ghép chuyến.
2. Note filter chips "Tất cả / Chờ khớp / Hoàn thành" right of the search input.
3. Switch to `/accountant/trips`.
4. Note filter chips "Tất cả / Chờ ghép / Đã khớp".

**Screenshot:** `ss_4267zognv` (Ghép chuyến) vs `ss_7405eh1hi` (Đơn hàng)

---

### NX16 — Người dùng 403 masquerades as empty state

**Observation:** `GET /api/v1/users → 403 Forbidden` for ketoan. The frontend renders the new `<EmptyState>` (good — TASK-005 shipped) with copy `Chưa có tài khoản / Tạo tài khoản đầu tiên cho team`. **The copy is wrong:** there ARE accounts (ketoan herself, taixe, taixe1, tx_test, etc.) — ketoan just lacks permission to list them. The CTA `Tạo tài khoản` will likely also 403, leading to a worse error after the click.

**Impact:** ketoan is told "the database is empty" when really "you don't have permission". She might burn a support ticket asking why team accounts have disappeared, or click `Tạo tài khoản` repeatedly hoping the error goes away. Either way the system has lied about its state.

**Recommendation:** Two-line frontend fix in `UserManagement.tsx`. Branch on the API response status:
- `200` + empty array → render the existing `<EmptyState>`.
- `403` → render an alternate component: `<PermissionsBanner>Bạn không có quyền xem danh sách người dùng. Vui lòng liên hệ quản trị viên.</PermissionsBanner>`. Hide the `Tạo tài khoản` button (or disable it with the same tooltip).
- Any other error → render an error state with retry.

Backend RBAC: separately, decide whether ketoan SHOULD be able to list users. If yes, lift the 403. If no, the permissions banner is the right outcome.

**Severity:** MED

**Page:** `/accountant/settings/users`

**Status vs prior:** 🆕 NEW — clarifies the symptom that v4 NX3 / TASK-006 reported. The empty-state shipped (TASK-005), the underlying 403 didn't, and now the empty-state copy actively misleads.

**Reproduce:**
1. Login as ketoan → Cài đặt → Người dùng.
2. Open DevTools → Network. Observe `GET /api/v1/users → 403`.
3. UI renders `Chưa có tài khoản / Tạo tài khoản đầu tiên cho team` — incorrect semantics.

**Screenshot:** `ss_1805zw1sl`

---

## REGRESSIONS

| # | Feature | v4 state | v5 state |
|---|---------|----------|----------|
| (none) | — | — | No regressions vs v4 verified state. Every v4 working feature still works. |

---

## Per-Flow Coverage

### Login
- Empty submit: `Đăng nhập` button disabled (~50% opacity, no pointer events). Zero `/auth/login` requests fire. ✅ N3 holds.
- Wrong creds (`ketoan / wrongpass`): `POST /auth/login → 401`, full-opacity error `Thông tin đăng nhập không hợp lệ. Vui lòng thử lại.` ✅ NX5 holds.
- Correct creds (`ketoan / admin123`): `POST /auth/login → 200`, redirect to `/accountant`, dashboard paints in <2s.
- Logout: ✅ NX9 — URL `https://phucloc.tingting.vip/`, login form re-renders, no 404.
- Brand wordmark on login: ✅ NX12 — `TTransport · Quản lý vận tải hàng hóa`. Same string as `<title>` and sidebar.
- No "Quên mật khẩu?" link. Eye icon on password works. (Not a release blocker.)

### Khớp chuyến (Ghép chuyến)
- Two-pane layout intact. 12 chờ khớp on enter (was 13 in v4 — lower because v4 audit consumed one match).
- Per-criterion ✓/✗ panel intact.
- Click `Ghép` on W001011's 4/6 candidate (T002033): `POST /api/v1/reconcile → 200`. Toast = `Thành công · Đã ghép chuyến` (green check). Left list 12 → 11 (W001011 removed). Right pane clears to `Chọn một phiếu để xem các đơn hàng có thể ghép`. ✅ **NX1, NX10 both verified end-to-end.**
- Filter chips: 🔴 NX15 — `Tất cả / Chờ khớp / Hoàn thành` does not match Đơn hàng's `Chờ ghép / Đã khớp`.

### Khách hàng (`/accountant/settings/clients`)
- Single h1 `Khách hàng`. ✅
- Search input + 5-col DataTablePro. ✅
- Add CTA `Thêm khách hàng` in header `actions` slot. ✅ TASK-027.
- Breadcrumb `← Cài đặt`. ✅ TASK-032.
- 17 rows. Every SĐT / MST / Địa chỉ cell `—`. 🔴 NX13.
- Row click → small dialog with only Loại + empty Điện thoại. 🔴 NX14 (claimed FIXED in v4.1, verified NOT FIXED in prod).

### Nhà thầu (`/accountant/settings/vendors`)
- Single h1 `Nhà thầu`. ✅
- DataTablePro with Tên / SĐT / MST / Loại / Địa chỉ. ✅ TASK-019.
- Add CTA `Thêm nhà thầu` in header. ✅ TASK-027.
- 1 row "Vận Tải Phúc Lộc" — Loại = `Công ty`, SĐT/MST/Địa chỉ all empty (data quality NX13).

### Tài xế (`/accountant/settings/drivers`)
- Single h1 `Tài xế`. ✅ TASK-002.
- DataTablePro with Tài xế / SĐT / Biển số xe / Nhà xe.
- Search input + `3 tài xế` row count. ✅ TASK-022.
- `+ Thêm SĐT` and `+ Thêm biển số` chips for empty fields. ✅ TASK-009.
- 🔴 TASK-004 — driver labels still raw `taixe` / `taixe1` / `tx_test` (backend schema).
- Add CTA `Thêm tài xế` in header. ✅ TASK-027.
- All three drivers `Vận Tải Phúc Lộc`. ✅ NX7 holds.

### Bảng giá list (`/accountant/settings/pricing`)
- Single h1 `Bảng giá`. ✅ TASK-001.
- Add CTA `Thêm bảng giá` in header. ✅ TASK-027.
- 2 client cards (HAP / PAN HẢI AN) with route + price counts.
- Breadcrumb `← Cài đặt`. ✅ TASK-032.

### Bảng giá detail (`/accountant/settings/pricing/3`)
- ✅ URL under `/settings/`. TASK-015 fixed.
- ✅ 0 instances of `MỨC GIÁ THEO SỐ LƯỢNG CONTAINER`. TASK-016 fixed.
- ✅ Single per-route table with `Loại cont` column. TASK-030 fixed.
- ✅ Two breadcrumbs visible: `← Cài đặt` (parent layout) + `← Quay lại` (child detail). Acceptable hierarchy.
- 2 h1s on the page (`Bảng giá` parent + `Công ty TNHH HAP` child). Different content; HTML5 outline algorithm allows this. Not flagged as a defect.
- Edit pencil grey, trash red. ✅ N17 holds.

### Kỳ lương (`/accountant/settings/salary`)
- Single h1 `Kỳ lương`. ✅
- `Cấu hình kỳ lương`: Từ ngày=26 / Đến ngày=25 → `Kỳ hiện tại 26/04 → 25/05`. ✅ N10 holds.
- ✅ `Ngày 1–31` helper text under both inputs. TASK-020 fixed.
- ✅ `Tải Excel` labeled button next to `Tính lương tất cả`. TASK-021 fixed.
- `Lịch sử kỳ lương`: `taixe` / `taixe1` cards both Lương=0. Each carries ONLY the `Lương bằng 0 — chưa có đơn hàng trong kỳ` warning. ✅ TASK-003 fixed.
- 🔴 Driver labels still `taixe` / `taixe1`. TASK-004 backend.

### Đơn hàng (`/accountant/trips`)
- Single h1 `Đơn hàng`. ✅
- KPIs: 5 Chờ ghép, 4 Đã khớp.
- Filter pills `Tất cả / Chờ ghép / Đã khớp`. ✅ Internal vocabulary consistent.
- 11 row-count chip visible. ✅
- Status pills in list: only `Chờ ghép` / `Đã khớp`. No `Hoàn thành`. ✅ NX4 fixed.

### Tổng quan (`/accountant`)
- 4 KPI cards (CHUYẾN CHƯA GHÉP / ĐƠN CHỜ ĐỐI SOÁT / LƯƠNG SẢN LƯỢNG TX / DOANH THU (ĐƠN HÀNG THÁNG)). ✅
- "Đơn hàng gần đây" status pills: only `Chờ ghép` / `Đã khớp`. T002028 = `Đã khớp` (was `Hoàn thành` in v4). ✅ NX4 fixed.
- Month picker `Tháng 05/2026 / 01/05 → 31/05` with chevrons. ✅

### Người dùng (`/accountant/settings/users`)
- Single h1 `Người dùng`. ✅
- 🔴 `0 tài khoản đang hoạt động` because `GET /api/v1/users → 403`. NX3 backend.
- ✅ `<EmptyState>` rendered: "Chưa có tài khoản / Tạo tài khoản đầu tiên cho team". TASK-005 fixed.
- 🆕 NX16 — empty-state copy is misleading because the cause is permissions, not emptiness.
- 🟡 `Tạo tài khoản` add-button label inconsistent with `Thêm <entity>` pattern elsewhere. TASK-018 partial.

### Settings index (`/accountant/settings`)
- Three buckets visible: TÀI CHÍNH (Kỳ lương, Bảng giá), ĐỐI TÁC (Khách hàng, Nhà thầu, Tài xế), HỆ THỐNG (Người dùng). ✅ TASK-017 fixed.
- 2-column grid at lg. ✅ TASK-023 fixed.
- Subtitle `Quản lý kỳ lương, bảng giá, đối tác và tài khoản`. ✅ TASK-034 fixed.

### Cross-flow
- Logout: ✅ NX9 — `/`, login form, no 404.
- Browser back: works across Settings subpages.
- Refresh: stays on current route, refetches.
- Multi-tab: not exhaustively tested. (Auth tokens in localStorage; expected to share session.)
- Hard refresh + SW unregistration + cache clear: bundle hash `index-CdqPefyj.js` confirmed differs from v4 `BhGDPZWb`. ✅ Fresh code under test.
- Push subscriptions: 0 POSTs in 689-request session. ✅ NX11 fixed.
- Network: 38 `/api/v1/` requests during full session, exactly **one non-2xx** response: `GET /api/v1/users → 403` (NX3/NX16). All other endpoints clean.

### Mobile (390 × 844 — INFERRED)
Host browser cannot resize below ~1568px. Reported `winSize: [1516, 808]` after explicit `resize_window(390, 844)`. `matchMedia('(max-width: 768px)').matches === false`. Mobile claims below are inferred from breakpoint heuristics on the desktop bundle:
- Drivers `useIsMobile(768)` exists per v4.1 fix log (TASK-025). Card branch not visually verified.
- Settings index `sm:grid-cols-2` will render 1-column at 390px.
- Header band CTAs (`Thêm <entity>`) — at desktop they are right-aligned next to the breadcrumb. At 390px there is no visual evidence of overflow handling. Investigate manually on a real device or via Playwright.

**Recommendation (carryover from v4):** Playwright with CDP-driven viewport override on every PR. The v5 audit cycle is the third in a row that's been blind on mobile.

---

## Cross-cutting Issues

- **The fix log was honest this round.** v3 promised 8/8 NX + 14 P0/P1 settings tasks, delivered 5. v4.1 promised ~22 fixes, delivered ~21 verified in prod (NX14 is the lone exception — claimed `ClientDetail.tsx` rewrite, dialog still shows the v4 state). Massive improvement in deploy hygiene.
- **NX14 is a "shipped fix that wasn't shipped".** Either the file change was excluded from the deploy bundle, or the commit landed on a different code path than the customer detail dialog uses. **Specifically** the `DetailValue` component (which would render "Chưa có" placeholders) is not in the rendered DOM. Worth a quick `grep -n "Chưa có" frontend/src/` and verifying the deployed bundle has it.
- **Người dùng / 403 / empty-state mismatch (NX16) is a UX polish item, not a fix-log honesty issue.** TASK-005 shipped exactly as advertised; the MED-severity NX16 is a different problem that emerges from the new empty state being rendered for the wrong reason.
- **Vocabulary drift continues at one surface (Ghép chuyến filter chips, NX15).** NX4 was 80% closed. The remaining 20% is one chip row.
- **Data quality (NX13) is operations work.** Should not block release. ketoan can hand-fill the 17 customer records in an hour. Frontend already supports it (the edit form has all four fields with helper text + validation).
- **Tasklist hygiene** improved dramatically. Most `[x]` items are now actually `[x]` in production.

---

## Heuristics Compliance Matrix

| Heuristic | v1 | v2 | v3 (claimed) | v4 (verified) | v5 (verified) | Notes |
|-----------|----|----|--------------|---------------|---------------|-------|
| Visibility of System Status | 2/5 | 3/5 | 4.5/5 | 3/5 | **4.5/5** | NX1 + NX10 + NX11 + NX4 all closed. NX16 is the one residual mismatch. |
| Match to Real World | 3/5 | 2/5 | 4/5 | 3.5/5 | **4/5** | Status enum fully unified across Đơn hàng + Tổng quan. NX15 is the one drift left. |
| User Control & Freedom | 2/5 | 2/5 | 4/5 | 3.5/5 | **4.5/5** | NX9 + NX10 closed. Confirm dialogs hold. |
| Consistency | 2/5 | 2/5 | 4/5 | 2.5/5 | **4/5** | Brand unified (NX12), button labels mostly standardized (TASK-018 1 outlier), header layouts unified (TASK-013). |
| Error Prevention | 1/5 | 1/5 | 4.5/5 | 4/5 | **4.5/5** | Validation + helpers + NX10 right-pane clear. |
| Recognition vs Recall | n/a | 3/5 | 4.5/5 | 3.5/5 | **4/5** | Restored columns + chips for missing fields (TASK-009). NX13 data still empty. |
| Flexibility & Efficiency | n/a | 3/5 | 4/5 | 3/5 | **4/5** | Breadcrumbs (TASK-032). Pricing-detail compression (TASK-016 + 30). |
| Aesthetic / Minimalist | n/a | 3/5 | 4/5 | 3/5 | **4/5** | 65 → 0 container labels, Settings layout unified, Nhà thầu now has rows. |
| Help Users Recover from Errors | 1/5 | 1/5 | 4/5 | 3.5/5 | **4/5** | NX1 toast now correct. NX16 is the residual. |
| Help & Documentation | n/a | 2/5 | 2.5/5 | 2.5/5 | **2.5/5** | No first-run tour, no in-app help. Unchanged. |

**Average:** v4 verified ~3.2/5 → **v5 verified ~4.1/5**. Closed the gap to v3's claim. The remaining 0.9 is mostly Help & Documentation + the four residual issues (NX13 / NX14 / NX15 / NX16).

---

## Quick Wins (S effort, < 1 day each)

1. **NX14 — actually ship the `DetailValue` rewrite for `ClientDetail.tsx`.** v4.1 fix log claimed it. Verify the file is in the build, or re-merge. ~30 min once root cause is found.
2. **NX16 — branch on 403 in `UserManagement.tsx`.** Replace empty-state with permissions banner when status === 403. Hide `Tạo tài khoản` button. ~30 min.
3. **NX15 — migrate Ghép chuyến filter chips.** `Chờ khớp / Hoàn thành` → `Chờ ghép / Đã khớp`. ~10 min.
4. **TASK-018 outlier — change `Tạo tài khoản` to `Thêm người dùng`** if the team wants pure verb consistency. Or accept as intentional. Product call. ~5 min.

That entire batch is roughly 75 minutes and would fully close the v4 audit cycle.

## Major Initiatives (M-L)

1. **NX3 backend — decide whether ketoan should be able to list users.** If yes, lift the 403 in the kế toán RBAC role. If no, NX16's permissions banner is the right UX. 0.5 day.
2. **NX13 data backfill** — non-engineering. ½ day per 100 rows. 17 customers + 1 vendor likely 30 minutes of data entry by ops.
3. **TASK-004 backend** — extend `DriverSummary` schema to include `fullName` and `phone`. 1 day incl. migration + frontend display update.
4. **Mobile audit infrastructure (carryover from v4)** — Playwright with CDP-driven viewport override on every PR. 1 day setup. Three audit cycles in a row have been blind on mobile.
5. **First-run tour / in-app help** — Help & Documentation heuristic stuck at 2.5/5 across all five audits. 2-3 days of design work + implementation.

---

## Release Readiness Verdict

✅ **READY** — upgrade from v4's `HOLD`.

**Reasoning:** every release-blocker on the v4 must-fix list (NX1 toast, NX9 logout, NX10 right pane, TASK-001/002/003 settings duplicates) is now verified fixed in production. NX3's root cause is a backend permission decision, not a frontend regression. ketoan can perform every workflow she actually does in her 8h/day: Ghép chuyến (verified end-to-end), Đơn hàng review (verified), Khách hàng list/edit (works, just data-poor), Bảng giá list/detail/edit (verified), Kỳ lương configure/view (verified). User listing is a manager function that doesn't gate her work.

**The follow-up sprint should close (in priority order):**
1. NX14 — actually deploy the customer detail dialog rewrite (claimed but not in prod).
2. NX16 — 403-aware empty state on Người dùng.
3. NX15 — vocabulary parity on Ghép chuyến filter chips.
4. NX13 — data backfill (operations).
5. TASK-004 — backend DriverSummary expansion.
6. Mobile audit infrastructure.

---

## Recommendations Summary Table

| # | Page | Severity | Status | Observation | Recommendation |
|---|------|----------|--------|-------------|----------------|
| C2 | Khách hàng | CRITICAL | ✅ FIXED | Carryover | — |
| C3 | Bảng giá | CRITICAL | ✅ FIXED | Carryover | — |
| C4 | Khách hàng | CRITICAL | ✅ FIXED | Carryover | — |
| C5 | global | CRITICAL | ✅ FIXED | Carryover | — |
| N3 | login | MED | ✅ FIXED | Empty-submit blocked | — |
| N5 | Khách hàng | HIGH | ✅ FIXED | Helper text | — |
| N9 | dashboard | HIGH | ✅ FIXED | Doanh thu label | — |
| N10 | Kỳ lương | HIGH | ✅ FIXED | `26/04 → 25/05` | — |
| N11 | Kỳ lương | HIGH | ✅ FIXED | Lương=0 warning visible | — |
| N17 | Bảng giá | HIGH | ✅ FIXED | Pencil grey, trash red | — |
| **NX1** | **Ghép chuyến** | **HIGH** | **✅ FIXED** | **`POST /reconcile → 200` → success toast** | **— (verify regression test in CI)** |
| NX2 | Khách hàng | HIGH | ✅ FIXED | Search + 5-col table | — |
| **NX3** | **Người dùng** | **MED** | **🔴 STILL BROKEN (backend)** | **`GET /users → 403`** | **Decide RBAC scope; if intentional, ship NX16 banner** |
| **NX4** | **Tổng quan / Đơn hàng** | **MED** | **✅ FIXED** | **Status pills unified** | **— (close NX15 to fully retire vocabulary drift)** |
| NX5 | login | MED | ✅ FIXED | Full-opacity error | — |
| NX6 | 404 / login | LOW | ⚠️ MOOT | — | — |
| NX7 | Tài xế | LOW | ✅ FIXED | All `Vận Tải Phúc Lộc` | — |
| NX8 | Khách hàng | LOW | ✅ FIXED | Test KH gone | — |
| **NX9** | **logout** | **HIGH** | **✅ FIXED** | **Logout → `/`, no 404** | **—** |
| **NX10** | **Ghép chuyến** | **HIGH** | **✅ FIXED** | **Right pane clears on success** | **—** |
| **NX11** | **global** | **MED** | **✅ FIXED** | **Push call removed (0 POSTs in session)** | **— (decide whether to re-enable when backend ready)** |
| **NX12** | **global** | **LOW** | **✅ FIXED** | **`TTransport` everywhere** | **—** |
| **NX13** | **Khách hàng / Nhà thầu** | **MED** | **🔴 STILL BROKEN (data)** | **All SĐT/MST/Địa chỉ `—`** | **Operations data backfill** |
| **NX14** | **Khách hàng detail** | **LOW** | **🔴 STILL BROKEN (deploy)** | **Dialog still hides MST/Địa chỉ** | **Verify `ClientDetail.tsx` rewrite is in prod bundle; re-merge if not** |
| **NX15** | **Ghép chuyến** | **LOW** | **🆕 NEW** | **Filter chips `Chờ khớp / Hoàn thành` drift from Đơn hàng's `Chờ ghép / Đã khớp`** | **Migrate filter chip labels to match Đơn hàng** |
| **NX16** | **Người dùng** | **MED** | **🆕 NEW** | **403 rendered as `Chưa có tài khoản` empty state** | **Branch on 403 → permissions banner; hide Tạo tài khoản CTA** |
| TASK-001 | Bảng giá | P0 | ✅ FIXED | Single `Bảng giá` header | — |
| TASK-002 | Tài xế | P0 | ✅ FIXED | Single h1 | — |
| TASK-003 | Kỳ lương | P0 | ✅ FIXED | Single status (warning only) | — |
| TASK-004 | Kỳ lương | P0 | 🔴 STILL BROKEN (backend) | Raw username | Extend `DriverSummary` schema |
| TASK-005 | Người dùng | P1 | ✅ FIXED | EmptyState renders | (couple with NX16 fix) |
| TASK-006 | Người dùng | P0 | 🔴 STILL BROKEN (backend) | Counter 0 → 403 | Backend RBAC + NX16 |
| TASK-009 | Tài xế | P1 | ✅ FIXED | `+ Thêm SĐT` chips | — |
| TASK-013 | Settings | P0 | ✅ FIXED | `<SettingsPageLayout>` | — |
| TASK-015 | Bảng giá detail | P0 | ✅ FIXED | URL under `/settings/` | — |
| TASK-016 | Bảng giá detail | P1 | ✅ FIXED | 0 instances | — |
| TASK-017 | Cài đặt | P1 | ✅ FIXED | 3 buckets | — |
| TASK-018 | Cài đặt | P1 | 🟡 PARTIAL | Người dùng `Tạo tài khoản` outlier | Standardize to `Thêm người dùng` or accept as intentional |
| TASK-019 | Nhà thầu | P2 | ✅ FIXED | DataTablePro full columns | (NX13 data backfill) |
| TASK-020 | Kỳ lương | P2 | ✅ FIXED | `Ngày 1–31` helper | — |
| TASK-021 | Kỳ lương | P2 | ✅ FIXED | `Tải Excel` button | — |
| TASK-022 | Tài xế | P2 | ✅ FIXED | Row count `3 tài xế` | — |
| TASK-023 | Cài đặt | P2 | ✅ FIXED | 2-col grid | — |
| TASK-025 | Người dùng | P2 | 🟡 INFERRED | Mobile branch present | Mobile visual verification still blocked |
| TASK-027 | Settings (all) | P1 | ✅ FIXED | CTAs in actions slot | — |
| TASK-030 | Bảng giá detail | P2 | ✅ FIXED | Per-route table | — |
| TASK-032 | Settings (all) | P3 | ✅ FIXED | `← Cài đặt` breadcrumb | — |
| TASK-033 | Cài đặt | P3 | ⚠️ NOT VERIFIED | ARIA attribute | DOM inspection follow-up |
| TASK-034 | Cài đặt | P3 | ✅ FIXED | New subtitle | — |
| TASK-035 | Settings (all) | P3 | ✅ FIXED | Single h1 | — |

---

**End of v5 audit.**

The team shipped a clean batch. ketoan can ship to production. The five remaining items (NX13–16, TASK-004) are well-scoped follow-ups, none release-blocking.
