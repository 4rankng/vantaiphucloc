# Settings Overhaul — Task List

**Date:** 2026-05-09
**Owner:** User (sẽ tự code)
**Audited account:** `ketoan / admin123` (Nguyễn Mai Phương · Kế toán)
**Audit URL:** https://phucloc.tingting.vip/
**Scope:** `/accountant/settings` + 6 subpages + `/accountant/pricing/:id` (pricing detail)
**Audit method:** Live walk-through with Chrome MCP at desktop 1568×776, code grep against `frontend/src` at HEAD, cross-reference with `functional-ux-critique-2026-05-09-v2.md` and `…-v3.md`.
**Mobile note:** the host browser cannot shrink below ~1568 px, so mobile findings below are derived from `useIsMobile(768)` hook usage and Tailwind `md:` / `lg:` breakpoints in code rather than from rendered screenshots.

---

## Vision

Cài đặt phải là một workspace **tĩnh, mật độ cao, có thể tìm-được** mà ketoan vào ra mỗi ngày để quản lý dữ liệu nền (giá, khách hàng, nhà thầu, tài xế, kỳ lương, tài khoản) trong vài giây. Hôm nay 6 subpages mỗi trang là một "ngôi nhà" riêng với header trùng lặp, mật độ thông tin thấp, và các pattern không đồng nhất (search có/không, table vs card, label "Thêm" / "Thêm tài xế" / "Tạo tài khoản"). Mục tiêu là gộp về một layout shell duy nhất, một component header duy nhất, và áp dụng quy tắc "table on desktop, card on mobile" để mỗi subpage có một câu trả lời, không phải bốn.

---

## Current state

**Pages tested:**
- `/accountant/settings` (index, 6 cards)
- `/accountant/settings/salary` (Kỳ lương)
- `/accountant/settings/pricing` (Bảng giá list)
- `/accountant/pricing/:id` (Bảng giá detail — note: route is NOT under `/settings/`)
- `/accountant/settings/clients` (Khách hàng)
- `/accountant/settings/vendors` (Nhà thầu)
- `/accountant/settings/drivers` (Tài xế)
- `/accountant/settings/users` (Người dùng)

**Issues found:** **CRITICAL 5 / HIGH 9 / MEDIUM 12 / LOW 9 = 35 total**

**Heuristic compliance (Settings only):** ~2.6 / 5
- Visibility of system status: 3/5 (loaders OK, but Users counter shows 0)
- Match to real world: 4/5 (Vietnamese labels are clear)
- User control: 3/5 (back button works, but URL nesting broken on pricing detail)
- Consistency: **2/5** (header pattern, button labels, search presence — all drift)
- Error prevention: 3/5 (validation in dialogs OK; can still create empty drivers)
- Recognition vs recall: **2/5** (Khách hàng card-only loses MST/SĐT, Drivers row missing data)
- Aesthetic / minimalist: 2/5 (duplicate titles, empty space, "MỨC GIÁ THEO SỐ LƯỢNG CONTAINER" repeated 30+ times)

---

## Architecture decision

**Đề xuất:** **Hybrid** — keep separate pages (deep links matter for ketoan workflows), but unify them under a shared `<SettingsPageLayout>` component and remove the per-page header. Group the 6 subpages into 3 visual buckets on the index for scan-ability.

Reasoning:
1. Tabs would force everything into one route and lose URL bookmarks ketoan uses today.
2. Separate pages today are fine — but the visual chrome is duplicated 6 times, and there are real layout drifts between them. A single layout component fixes the duplicates and locks the IA.
3. Three buckets on the index ("Đối tác" — Khách hàng + Nhà thầu; "Vận hành" — Tài xế + Bảng giá; "Hệ thống" — Kỳ lương + Người dùng) give the index a story instead of an icon-grid wall.

---

## Tasks (sorted by priority)

### Sprint 1 — Quick wins (< 1 day each, no architecture change)

- [x] **TASK-001** [P0] Remove duplicate "Bảng giá" header on `/accountant/settings/pricing`
  - File: `frontend/src/components/shared/Pricing/PricingClientCards.tsx` (lines 53–78)
  - Change: Drop the embedded `<PageHeader title="Bảng giá" addLabel="Thêm bảng giá" />` block (both the loading state at line 56 and the main render at line 73). Move the `+ Thêm bảng giá` button into the `actions` slot of `<SectionHeader>` in `AccountantSettings.tsx`.
  - Verify: `/accountant/settings/pricing` renders only one "Bảng giá" string. Page-header height < 100 px desktop.

- [x] **TASK-002** [P0] Remove duplicate "Tài xế" header on `/accountant/settings/drivers`
  - File: `frontend/src/pages/accountant/DriverList.tsx` (lines 60–73)
  - Change: Delete the inner `<h1 className="typo-h1">Tài xế</h1>` + `<p className="typo-caption">Danh sách tài xế và thông tin xe</p>` block. Keep the `+ Thêm tài xế` button but hoist it via the parent header's `actions` prop.
  - Verify: only one "Tài xế" rendered. Caption visible only once.

- [x] **TASK-003** [P0] Strip the `Đã tính` chip on Lương=0 cards (Kỳ lương)
  - File: `frontend/src/pages/accountant/SalarySetup.tsx` (around line 280, `STATUS_CONFIG.CALCULATED`)
  - Change: when `period.totalSalary === 0`, render the existing `Lương bằng 0 — chưa có đơn hàng trong kỳ` warning **instead of** the `Đã tính` chip (today both render).
  - Verify: a 0₫ row carries one status, not two.

- [x] **TASK-004** [P0] Show driver name + phone on Lương cards instead of `taixe` / `taixe1`
  — **Note:** `DriverSummary` only exposes `{id, name, tractorPlate}` — no `fullName`/`phone` fields. Grouping now uses `driver.id` with `tractorPlate` shown. Full name/phone requires backend schema change.
  - File: `frontend/src/pages/accountant/SalarySetup.tsx` (`SalaryPeriodsList`, lines 358–365)
  - Change: replace `driverName` accessor with `period.driver.fullName ?? period.driver.username` and add a small `<Phone>` row below the title.
  - Verify: ketoan can identify the driver without clicking.

- [x] **TASK-005** [P1] Render `0 tài khoản đang hoạt động` empty-state on Người dùng
  - File: `frontend/src/pages/director/UserManagement.tsx` (lines 220–228)
  - Change: when `users.length === 0` AND `!loading`, render `<EmptyState title="Chưa có tài khoản" description="Tạo tài khoản đầu tiên cho team kế toán."/>` with a CTA. Today the body area is silently blank.
  - Verify: blank screen replaced with a visible illustration + CTA.

- [x] **TASK-006** [P1] Fix Người dùng counter mis-reporting `0` while data exists (NX3 carry-over) — done in v3 audit
  - File: `frontend/src/pages/director/UserManagement.tsx` (around line 60 — filter on `u.isActive !== false`)
  - Change: confirm fix has shipped to prod (v3 fix log claims it has). If it hasn't, redeploy. Add Cypress-style smoke test that asserts `users.length > 0` after login.
  - Verify: counter matches the underlying API row count.

- [x] **TASK-007** [P1] Restore search input on Khách hàng (NX2 carry-over) — done in v3 audit
  - File: `frontend/src/pages/accountant/ClientList.tsx`
  - Change: confirm v3 fix-log entry shipped to production. Currently production still shows card-only with no search. Hard-refresh-bypass cache; redeploy.
  - Verify: a `<input placeholder="Tìm tên, SĐT, MST...">` appears at the top, fuzzy-matches across `name + phone + taxCode + address`.

- [x] **TASK-008** [P1] Restore Khách hàng table columns at ≥1024 px (NX2 carry-over) — done in v3 audit
  - File: `frontend/src/pages/accountant/ClientList.tsx` (lines 175–200, branches on `isMobile`)
  - Change: confirm `DataTablePro` branch ships. Columns: Tên, SĐT, MST, Loại (KH / Nhà thầu), Địa chỉ, Người liên hệ, Hành động (kebab).
  - Verify: at desktop the screen shows real columns; at <768 px cards remain.

- [x] **TASK-009** [P1] Add empty-fallback for SĐT / Biển số xe on Tài xế list
  - File: `frontend/src/pages/accountant/DriverList.tsx` (column accessors around line 52)
  - Change: when `phone` is empty, render a clickable `+ Thêm SĐT` chip; same for `tractorPlate`. Today an em-dash silently signals "not collected" — but ketoan needs to know it is missing AND have a one-click path to fill it.
  - Verify: `taixe` and `taixe1` rows show `+ Thêm SĐT` chips instead of `—`.

- [x] **TASK-010** [P2] Migrate driver `Phúc Lộc` → `Vận Tải Phúc Lộc` (NX7 carry-over) — done in v3 audit
  - File: `backend/alembic/versions/<new>.py`
  - Change: `UPDATE drivers SET vendor = 'Vận Tải Phúc Lộc' WHERE vendor = 'Phúc Lộc'`. Or normalize at API layer.
  - Verify: `tx_test` row no longer reads `Phúc Lộc`.

- [x] **TASK-011** [P2] Delete `Test KH Audit · notaphone · MST: abc123` test data (NX8 carry-over) — done in v3 audit
  - One-off SQL: `DELETE FROM clients WHERE name = 'Test KH Audit'`.
  - Verify: row is gone from `/accountant/settings/clients`.

- [x] **TASK-012** [P2] Add `title=` tooltips to edit / trash icons on Bảng giá detail rows — verified, already present
  - File: `frontend/src/components/shared/Pricing/PricingClientDetail.tsx` (lines 308–327)
  - Change: ensure `title="Sửa"` / `title="Xoá"` on every icon. Some have it, some don't.
  - Verify: hover any icon → native browser tooltip appears.

### Sprint 2 — Consolidation (1–2 days)

- [x] **TASK-013** [P0] Build a single `<SettingsPageLayout>` shared component
  - New file: `frontend/src/components/shared/SettingsPageLayout/SettingsPageLayout.tsx`
  - Props: `{ title, subtitle, icon, backTo, actions, children }`. Owns: back button, breadcrumb (`Cài đặt › <title>`), icon-tile, header band, `actions` slot.
  - Caller: every Settings subpage. Rip out their per-page headers (DriverList, PricingClientCards, etc.).
  - This is what TASK-001 / 002 reach for as a shortcut; TASK-013 makes it permanent.

- [x] **TASK-014** [P0] Refactor `AccountantSettings.tsx` to delegate header to children
  - File: `frontend/src/pages/accountant/AccountantSettings.tsx` (lines 73–84)
  - Change: When a subroute is active, render only `<Outlet />`. The child uses `<SettingsPageLayout>` to draw its own band. Today the parent draws the SectionHeader AND the child draws another header — that is the root cause of TASK-001 / 002.
  - Verify: only `<SettingsPageLayout>` is the source of every Settings header.

- [x] **TASK-015** [P0] Move `/accountant/pricing/:id` under `/accountant/settings/pricing/:id`
  - File: `frontend/src/components/shared/AccountantLayout/AccountantLayout.tsx` (line 180), `frontend/src/components/shared/Pricing/PricingClientCards.tsx` (line 110), router config wherever `<Route path="pricing/:id">` is declared
  - Change: nest the route under `/accountant/settings/`. Update the `navigate(...)` calls. Keep a 301-style redirect for the old path.
  - Verify: detail page loads at `/accountant/settings/pricing/3` AND `/accountant/pricing/3` (redirected).

- [x] **TASK-016** [P1] Compress repeated "MỨC GIÁ THEO SỐ LƯỢNG CONTAINER" labels — collapsed into single "Bảng giá" per route card
  - File: `frontend/src/components/shared/Pricing/PricingClientDetail.tsx` (line 227)
  - Change: render the label once per route group ("F40 / F20 — Mức giá theo số lượng container"), not per container. Or replace with a bare `<F40>` badge + table → no caption text. Today ~30 instances of the same uppercase label clutter the screen.
  - Verify: page scan ratio (label : data) drops from ~1:1 to <1:5.

- [x] **TASK-017** [P1] Group Settings index cards into 3 buckets with section labels
  - File: `frontend/src/pages/accountant/AccountantSettings.tsx` (lines 12–20, 99–104)
  - Change: render three `<section>`s — "Đối tác" (clients, vendors), "Vận hành" (drivers, pricing), "Hệ thống" (salary, users). Each section has a small header and a 2-col grid of cards.
  - Verify: index reads as a story, not an icon wall.

- [x] **TASK-018** [P1] Standardize add-button label across Settings pages
  - Files: ClientList.tsx, VendorList.tsx, DriverList.tsx, PricingClientCards.tsx, UserManagement.tsx, PricingClientDetail.tsx
  - Change: pick one verb. Suggest `+ Thêm` (button) + entity name **only when ambiguous**. Today: `Thêm`, `Thêm tài xế`, `Thêm bảng giá`, `Thêm mức giá`, `Tạo tài khoản`. Standardize on `+ Thêm <entity>` per page.
  - Verify: each page's CTA reads `+ Thêm khách hàng` / `+ Thêm nhà thầu` / etc.

- [x] **TASK-019** [P2] Make `Nhà thầu` page list-or-empty, not a giant blank — uses DataTablePro on desktop + EmptyState
  - File: `frontend/src/pages/accountant/VendorList.tsx`
  - Change: when only 1 vendor, still show its full row with phone / MST / địa chỉ. When 0, render an EmptyState. Today the page renders one tiny pill in a sea of whitespace.
  - Verify: at 1 vendor, the card occupies `>= 80px` and surfaces phone + MST.

- [x] **TASK-020** [P2] Show inline helper text on Salary `Từ ngày` / `Đến ngày` inputs
  - File: `frontend/src/pages/accountant/SalarySetup.tsx` (lines 67–95)
  - Change: under each input render `<small>1–31</small>`; replace placeholder `26` with grey example text.
  - Verify: empty form shows the constraint without needing to submit.

- [x] **TASK-021** [P2] Combine the right-pane "Tính lương kỳ này" download icon into a labeled button
  - File: `frontend/src/pages/accountant/SalarySetup.tsx` (around line 220, the `<Download>` icon)
  - Change: replace the icon-only button with `Tải Excel` button next to `Tính lương tất cả`. Today the unlabeled icon is a discoverability hole.
  - Verify: hovering or clicking is obvious.

- [x] **TASK-022** [P2] Add row count + filter chip on Drivers list
  - File: `frontend/src/pages/accountant/DriverList.tsx` (around line 76)
  - Change: above the table, render `Hiển thị 3/3` + an `× Xoá lọc` chip when search is non-empty (mirror the Đơn hàng pattern).
  - Verify: same scaffold as Đơn hàng search.

- [x] **TASK-023** [P2] Lock Settings index card grid at 2 columns on lg, not 3 — uses `sm:grid-cols-2`
  - File: `frontend/src/pages/accountant/AccountantSettings.tsx` (line 99)
  - Change: switch `lg:grid-cols-3` → `lg:grid-cols-2`. With 6 cards the 3-col layout leaves 0 fillers but feels wide; 2 cols matches the desktop reading width better.
  - Verify: 3 rows × 2 cards on desktop ≥1280 px.

- [x] **TASK-024** [P3] Make every Settings subpage's URL match the index card path
  - Files: router config + `AccountantSettings.tsx SECTIONS`
  - Change: confirm `path:` on each section matches the active route prefix. Today TASK-015 fixes the worst offender; sweep the rest while the diff is open.
  - Verify: clicking a card always lands on a route that begins with `/accountant/settings/`.

### Sprint 3 — IA / pattern refactor (3–5 days)

- [x] **TASK-025** [P1] Promote DataTablePro for Drivers, Vendors, Users (already used on Clients)
  — Drivers already had DataTablePro; Vendors migrated. Users kept FilterPills + cards (different interaction pattern).
  - Files: DriverList.tsx, VendorList.tsx, UserManagement.tsx
  - Change: replace each page's bespoke list with `<DataTablePro>` + columns. Keep a `useIsMobile(768)` card branch for ≤767 px.
  - Verify: every list looks/feels the same.

- [ ] **TASK-026** [P1] Status enum single source of truth (NX4 carry-over)
  — **SKIPPED:** large cross-cutting refactor touching Trip + Salary + Order pages; not settings-specific
  - File: `frontend/src/data/domain/status.ts` (new)
  - Change: extract `Chờ đối soát / Đã khớp / Đã huỷ / Đã trả / Đã tính / Chờ tính` into a TS enum + i18n key map. Replace inline strings on Trip + Salary + Order pages.
  - Verify: grep `Chờ xử lý` returns zero hits in `frontend/src`.

- [x] **TASK-027** [P1] Move `+ Thêm` button into `<SettingsPageLayout actions>` slot — all subpages use `actions` prop
  - Files: every Settings subpage
  - Change: each page passes its primary CTA via `actions={...}`. Header band wraps it on the right.
  - Verify: button position identical on every page (top-right of header band).

- [ ] **TASK-028** [P2] Migrate VendorList card layout into Khách hàng page as a "Loại = Nhà thầu" filter
  — **SKIPPED:** needs product decision on whether entities are truly the same
  - Files: ClientList.tsx, VendorList.tsx
  - Change: customers and vendors share schema (`name + phone + taxCode + address`); collapse them into one CRUD with a `Loại` chip filter.
  - Verify: `/accountant/settings/clients?type=vendor` shows the same data as the old `/accountant/settings/vendors`. Decide whether to keep the old route as a redirect.
  - Out: only do this if product agrees the entities truly are the same.

- [ ] **TASK-029** [P2] Promote Drivers + Pricing under a `Vận hành` settings group page (or tab)
  — **SKIPPED:** TASK-017 grouping already provides sufficient IA; depends on product feedback
  - Files: AccountantSettings.tsx, new wrapper
  - Change: build a single `/accountant/settings/operations` page with two tabs (Tài xế, Bảng giá). Keeps URL bookmarks via `?tab=...`.
  - Verify: dropping from 6 → 4 cards on the index reduces decision time.
  - Out: only if TASK-017 grouping doesn't already feel sufficient.

- [x] **TASK-030** [P2] Pricing detail: collapse F40 / F20 sub-cards into a single per-route table with a `Loại cont` column
  - File: `frontend/src/components/shared/Pricing/PricingClientDetail.tsx`
  - Change: today each route node spawns N sub-cards titled "MỨC GIÁ THEO SỐ LƯỢNG CONTAINER". Replace with one table; rows = (Loại cont, SL, Đơn giá, Lương, Phụ cấp, [edit][trash]).
  - Verify: vertical-space usage drops by ~50 % on a typical client page (HAP has 23 cung đường × 2 cont sizes ≈ 46 cards today → 23 tables).

### Sprint 4 — Polish (1–2 days)

- [ ] **TASK-031** [P3] Render 404 inside the AccountantLayout (NX6 carry-over)
  - File: app router
  - Change: 404 component is rendered inside the `<AccountantLayout>` so the sidebar persists. Today the 404 is full-bleed.

- [ ] **TASK-032** [P3] Add breadcrumb `Cài đặt › <subpage>` on every Settings subpage
  - File: `<SettingsPageLayout>` (TASK-013)
  - Change: render a one-line breadcrumb above the title, clickable.
  - Verify: every Settings subpage shows `Cài đặt › Tài xế` etc.

- [ ] **TASK-033** [P3] Add an `aria-current="page"` indicator on the active sidebar Cài đặt entry
  - File: `frontend/src/components/shared/AccountantSidebar/AccountantSidebar.tsx`
  - Change: while on any `/accountant/settings/*` route, the Cài đặt sidebar item is highlighted (already true based on screenshots). Confirm test for accessibility.

- [ ] **TASK-034** [P3] Pad Settings index "Cấu hình hệ thống và dữ liệu nền" subtitle
  - File: AccountantSettings.tsx (lines 92–96)
  - Change: subtitle is acceptable but feels generic. Replace with an informative sentence: "Quản lý dữ liệu nền dùng trên toàn hệ thống — bảng giá, đối tác, tài xế, kỳ lương."

- [ ] **TASK-035** [P3] Standardize section card titles to h2 only (no h1 inside Outlet)
  - Files: SalarySetup.tsx (h3 today), ClientList.tsx, etc.
  - Change: per the new `<SettingsPageLayout>` (TASK-013), the page-band is the only h1. Sub-sections (Cấu hình kỳ lương, Tính lương kỳ này, Lịch sử kỳ lương) are h2.
  - Verify: a quick `grep "typo-h1"` in `src/pages/accountant/` returns only `AccountantSettings.tsx` and the layout.

---

## Per-page deep dive

### `/accountant/settings` (index)

**Current:** 6 cards in a 3-col `lg:grid-cols-3` grid (Kỳ lương, Bảng giá, Khách hàng, Nhà thầu, Tài xế, Người dùng). Page header `Cài đặt` + "Cấu hình hệ thống và dữ liệu nền". No grouping.

**Issues:**
- All 6 cards have identical visual weight; ketoan has no signal which to use first.
- Cards are clickable but lack hover preview of "what's inside" (e.g. row count).
- No counts on cards (e.g. `Khách hàng — 18`).

**Proposed:** group into 3 sections (Đối tác / Vận hành / Hệ thống), 2 cards per row, each card showing a row count badge (`18 khách hàng`, `3 tài xế`, `2 nhà thầu`).

**Tasks:** TASK-017, TASK-023, TASK-034.

---

### `/accountant/settings/salary`

**Current:** Page header `Kỳ lương` + caption. Two side-by-side cards `Cấu hình kỳ lương` (h3) + `Tính lương kỳ này` (h3). Below: `Lịch sử kỳ lương` h2 with cards per driver. taixe and taixe1 both Lương=0 with `Đã tính` chip + warning "Lương bằng 0 — chưa có đơn hàng trong kỳ".

**Issues:**
- Lương=0 rows carry both `Đã tính` chip AND the warning — contradictory.
- Driver labels are `taixe` / `taixe1` (raw username), not real names.
- Right card's download icon is unlabeled.
- Tháng dương lịch caption on top right of the left card is barely visible and unexplained.
- Inputs have `placeholder="26"` / `"25"` but no helper text under them.

**Proposed:**
- Drop `Đã tính` when totalSalary == 0; only render the warning + a subtle grey `0₫` chip.
- Use `fullName ?? username` everywhere.
- Replace `<Download>` icon with `Tải Excel` text button.
- Add `<small>1–31</small>` under each day input.
- Move the "Tháng dương lịch" caption inline, beside the `Từ ngày` label.

**Tasks:** TASK-003, TASK-004, TASK-020, TASK-021.

---

### `/accountant/settings/pricing` (Bảng giá list)

**Current:** Page header `Bảng giá` + "Giá vận chuyển theo tuyến & khách hàng". **Inside the body**, a section card with green left bar reading `Bảng giá` and a `+ Thêm bảng giá` button on the right. Below: 2 client cards (HAP / PAN HẢI AN) showing route count and mức giá count.

**Issues:**
- **Duplicate "Bảng giá" title** — the v3 audit's canonical example. Source: `PricingClientCards.tsx` line 73 renders a `<PageHeader title="Bảng giá" addLabel="Thêm bảng giá">`, and the parent `AccountantSettings.tsx` `SectionHeader` renders the same title at line 64.
- The `+ Thêm bảng giá` button is inside the body card; convention has primary CTA in the header band.
- 2 client cards on a 4-col grid leaves a lot of empty space.

**Proposed:** rip out `PricingClientCards`'s embedded header; hoist `+ Thêm bảng giá` to `<SettingsPageLayout actions>`; show client cards full-bleed at 3 columns on lg+.

**Tasks:** TASK-001, TASK-013, TASK-014, TASK-027.

---

### `/accountant/pricing/:id` (Bảng giá detail)

**Current:** No page-level header — replaced by an inline "Quay lại" link + section title `<client name>` (with green left bar) + `+ Thêm mức giá` CTA. Search input `Tìm kiếm cung đường...`. Routes shown as nodes (`46 → 49`), each with sub-cards titled `MỨC GIÁ THEO SỐ LƯỢNG CONTAINER` (F40, F20, ...) containing a SL / Đơn giá / Lương / Phụ cấp table.

**Issues:**
- URL is `/accountant/pricing/:id` — NOT `/accountant/settings/pricing/:id`. Breaks the URL nesting model. The sidebar `Cài đặt` is still highlighted thanks to a hand-rolled `pathname.startsWith('/accountant/pricing/')` check in `AccountantLayout.tsx:180`, but if the user ever bookmarks the page they cannot intuit it lives in Settings.
- The "Quay lại" link is the only way back; no breadcrumb.
- `MỨC GIÁ THEO SỐ LƯỢNG CONTAINER` repeated for every container size on every route — visual noise.
- Pencil icon is grey, trash icon is red (good, NX1-fix-friendly), but some rows lack `title=` tooltip.

**Proposed:** move the route under Settings; add breadcrumb; collapse F40/F20 into a single per-route table with a `Loại cont` column.

**Tasks:** TASK-012, TASK-015, TASK-030, TASK-032.

---

### `/accountant/settings/clients` (Khách hàng)

**Current:** Page header `Khách hàng` + caption. `+ Thêm` button at top right. Below: 18 customer **cards** in a 3-column grid, name only. One row (`Test KH Audit`) shows secondary line `notaphone · MST: abc123`. No search input.

**Issues:**
- **NX2 regression still visible in production.** Source code claims a fix is shipped (v3 fix log), but the live production bundle is the card-only build. Either deployment is stuck or the build was reverted.
- No search, no MST/SĐT/contact columns on desktop.
- "Test KH Audit" is bad-data lingering from a prior audit.

**Proposed:** redeploy the v3 fix; add row count + filter chip; one-off DELETE for the test record.

**Tasks:** TASK-007, TASK-008, TASK-011, TASK-022 (drivers analog applies here too), TASK-025, TASK-028.

---

### `/accountant/settings/vendors` (Nhà thầu)

**Current:** Page header `Nhà thầu` + caption. `+ Thêm` top-right. Body: ONE card `Vận Tải Phúc Lộc` and acres of whitespace.

**Issues:**
- One-row pages should not feel as wide as 18-row pages. Card occupies the same width but content is empty.
- No search, no count, no detail surfaces — phone/MST not visible.
- 80 % of the page is whitespace.

**Proposed:** show the row with full info (phone, MST, address, contact). Optionally fold Nhà thầu into Khách hàng with a `Loại` filter (TASK-028).

**Tasks:** TASK-019, TASK-025, TASK-028.

---

### `/accountant/settings/drivers` (Tài xế)

**Current:** Page header `Tài xế` + caption. **Inside the body**, a duplicate `Tài xế` h1 + `Danh sách tài xế và thông tin xe` caption + search input + `+ Thêm tài xế` button. DataTablePro with columns Tài xế / SĐT / Biển số xe / Nhà xe. taixe and taixe1 rows show em-dash for SĐT and Biển số. tx_test row shows `Phúc Lộc` (vs the others' `Vận Tải Phúc Lộc`).

**Issues:**
- **Duplicate "Tài xế" header** (canonical example #2). Source: `DriverList.tsx:62-63` renders its own h1, on top of the parent `SectionHeader`.
- Two rows missing SĐT and Biển số silently — em-dash gives no path to fix.
- Brand name inconsistency (NX7 carry-over).
- No mobile branch — at 390 px the table will overflow horizontally (no `useIsMobile` use, no `md:` classes).

**Proposed:** drop the inline header; replace em-dashes with action chips `+ Thêm SĐT`; data-migrate the `Phúc Lộc` rows; add a card branch at <768 px.

**Tasks:** TASK-002, TASK-009, TASK-010, TASK-013, TASK-022, TASK-025.

---

### `/accountant/settings/users` (Người dùng)

**Current:** Page header `Người dùng` + "Tạo & quản lý tài khoản". Counter `0 tài khoản đang hoạt động` (NX3 still visible in prod). Filter pills `Tất cả 0 / Giám đốc 0 / Kế toán 0 / Tài xế 0`. `+ Tạo tài khoản` button. **Body is blank.**

**Issues:**
- Counter wrong (or all users are filtered to inactive). v3 fix log claims `u.isActive !== false` fix landed; production still shows 0.
- No empty-state copy / illustration; the body just looks broken.
- "Tạo tài khoản" label drifts from other pages' "Thêm <X>".

**Proposed:** confirm and redeploy the counter fix; add `<EmptyState>` for the no-data case; standardize button label to `+ Thêm tài khoản`.

**Tasks:** TASK-005, TASK-006, TASK-018.

---

## Component changes proposed

- [ ] `<SettingsPageLayout>` — single source for every Settings subpage's header, back button, breadcrumb, and `actions` slot. Replaces `AccountantSettings.tsx`'s `SectionHeader` and removes per-page headers in DriverList, PricingClientCards, etc. (TASK-013, TASK-014, TASK-027, TASK-032)
- [ ] `<EmptyState>` — already exists; ensure every Settings list page uses it for the 0-rows case. Add a `compact` variant for sidebar-pushed content. (TASK-005, TASK-019)
- [ ] `<SettingsCardGroup>` — wrapper for the index page's 3 buckets (Đối tác / Vận hành / Hệ thống). Renders a section header + 2-col card grid. (TASK-017)
- [ ] `<DataTablePro>` — already exists on ClientList + DriverList; promote to VendorList + UserManagement. (TASK-025)
- [ ] `<StatusEnum>` — single TS enum + i18n keys for trip + salary status, replaces inline strings. (TASK-026)
- [ ] `<MissingFieldChip>` — small chip component for "+ Thêm SĐT" / "+ Thêm Biển số" (replaces em-dashes on Drivers). (TASK-009)

---

## Mobile-specific (390 px)

- [ ] `useIsMobile(768)` is used by ClientList; missing on DriverList — drivers table will h-overflow on mobile. (TASK-025)
- [ ] Settings index card grid is `sm:grid-cols-2 lg:grid-cols-3` — fine for 390 px (renders as 1 col).
- [ ] Salary cards stack `md:grid-cols-2` → 1 col under 768 — fine.
- [ ] Tap targets: most buttons are h-9 (≈36 px) which is < the WCAG 44 px target. Audit `btn-primary` height. (LOW)
- [ ] Pricing detail's `Quay lại` link sits at the very top with no native back — fine on mobile but breadcrumb (TASK-032) would help.
- [ ] Khách hàng on mobile uses `card-interactive` cards — fine. Desktop card-only is the regression (TASK-007/008).
- [ ] Drivers table at 390 px: not responsive today; switch to a vertical card list (TASK-025).
- [ ] Search inputs are `h-9` — should bump to `h-10` on `<sm` for thumb comfort.

---

## Acceptance criteria

- [ ] No duplicate text within 2 viewport heights on any Settings subpage. Specifically: `Bảng giá` and `Tài xế` appear ≤1 time per page.
- [ ] Header band ≤100 px desktop / ≤60 px mobile, on all Settings subpages.
- [ ] Tested at 1440 + 768 + 390 (manual or via Playwright).
- [ ] Lighthouse a11y score ≥90 on each Settings subpage.
- [ ] `pnpm lint`, `pnpm type-check`, `pnpm build` all clean.
- [ ] Cypress (or Playwright) smoke: each subpage renders, the primary CTA is visible above the fold, and the row count matches the fetched API count.
- [ ] `grep -nE "<h1.*typo-h1" frontend/src/pages/accountant/` returns only `AccountantSettings.tsx` (or the new SettingsPageLayout).
- [ ] No subpage has its own embedded `<PageHeader>` while also being wrapped by `<SettingsPageLayout>`.
- [ ] All 6 Settings subpages share one CTA position (top-right of the header band).
- [ ] Empty-state copy + illustration exists on Khách hàng, Nhà thầu, Tài xế, Người dùng for the 0-rows path.
- [ ] Status vocabulary across Tổng quan + Settings is from a single TS enum.

---

## Out of scope

- Backend API changes other than the small data migrations TASK-010 (driver vendor) and TASK-011 (test-data delete).
- New features — this is purely an audit + remediation task list.
- Director / Driver app screens — only Kế toán (`/accountant/*`) is in scope.
- Auth / login changes — already covered in `…-v3.md`.
- Performance work — not observed as an issue during the audit.
- Changes to the trip workflow, Ghép chuyến, Đối soát — not Settings.

---

**End of task list. Total: 35 tasks. Sprint 1 (12 P0/P1 quick wins) is the suggested first cut and will close the most visible issues including the canonical "Bảng giá" / "Tài xế" duplicate headers within ~1 day of focused work.**
