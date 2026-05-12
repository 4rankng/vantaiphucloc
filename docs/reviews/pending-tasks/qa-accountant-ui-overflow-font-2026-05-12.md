# QA — Accountant UI Overflow + Font Inconsistency — Pending Task Spec

**Date:** 2026-05-12
**For:** Next SWE pickup
**Priority:** P1-P2 mix (HIGH overflow/clipping = P1, font polish = P2)
**Effort:** ~1-2 dev-days total
**QA agent:** Visual walkthrough at 1440px viewport (Chrome on macOS prevented sub-700px resize; mobile/tablet behaviour audited via code) + targeted code grep.

---

## Summary

**Total issues found:** 11 (HIGH 4 / MED 5 / LOW 2)

**Most common pattern:** Two `truncate` siblings competing for space inside a flex row without dominance hierarchy. Whichever side gets allocated less space ends up showing 5-10 readable chars before the ellipsis. The result: partner/location names degenerate to `IT_Partne...` / `IT_Location_19763d39 → I...`, which destroys scanability for the page that ketoan uses most (Ghép chuyến, Tổng quan).

**Root structural cause:** When seed/demo data uses long synthetic prefixes (`IT_Partner_<hex>`, `IT_Location_<hex>`), every row exceeds the design budget. In production the prefixes won't be there, but the layouts should still degrade gracefully — long Vietnamese company names ("Công ty TNHH Vận tải Container Sài Gòn") will hit the same boundary.

**Heuristics impact:** visual consistency, scanability, and trust (clipped currency = "did the system lose digits?").

---

## Issues by Page

### /accountant (Tổng quan)

- [ ] **TASK-Q01** [HIGH]: KPI value "137.900.000 ₫" clipped by 4th card's right edge
  - **Observation:** Screenshot zoom of the "DOANH THU THÁNG" card shows the trailing `₫` symbol cut off mid-glyph by the card boundary. Reproduces at 1440px desktop with the seeded May 2026 dataset (`make dev` + login `ketoan / admin123`).
  - **Impact:** Looks like a data-loss bug to the user. Ketoan staring at this card 50× a day will lose trust in the dashboard. Worst-case: a 9-digit number like `1.234.567.890 ₫` (1.2B VND) would clip even more on a smaller laptop.
  - **Fix:** In `frontend/src/components/shared/StatsGrid/StatsGrid.tsx:108` the value `<p>` uses `font-display text-lg lg:text-xl font-700 leading-tight whitespace-nowrap tabular-nums`. The `whitespace-nowrap` + fixed font scale guarantees overflow once the number grows. Options (pick one):
    1. Drop `whitespace-nowrap`, allow wrap on `.` separator — safest, no info loss
    2. Switch to compact format (`137,9 tr ₫` or `137,9M`) when length > 11 chars — preserves single-line shape
    3. Use `text-base lg:text-lg` (one step smaller) on cards whose value length > 10 chars — preserves uniformity
  - **Severity:** HIGH

- [ ] **TASK-Q02** [HIGH]: Tuyến truncates with ellipsis on every row of the right-column list
  - **Observation:** "Đơn hàng gần đây" rows render `12/05 | IT_Location_8fbe7f68 → IT_Location...`. The destination location is never visible — only origin is. Same on left column "Chuyến chưa ghép": `IT_Partner_1a48e291 | IT_Location_19763d39 → IT...`.
  - **Impact:** Defeats the purpose of showing route at all. Ketoan can't differentiate two rows whose only difference is destination.
  - **Fix:** `frontend/src/pages/accountant/AccountantDashboard.tsx`:
    - `TripRow` line 156-158: change `<p className="mt-0.5 text-xs truncate">` to `<p className="mt-0.5 text-xs line-clamp-2">` so the second half of the route wraps onto line 2.
    - `UnmatchedRow` line 188-190: same fix.
    - Alternatively, separate the date from the route onto two lines so the full route always shows.
  - **Severity:** HIGH

- [ ] **TASK-Q03** [MED]: KPI label heights inconsistent — values not vertically aligned across the 4 cards
  - **Observation:** "CHUYẾN CHƯA GHÉP", "ĐƠN CHỜ ĐỐI SOÁT", "DOANH THU THÁNG" wrap to 2 lines; "LƯƠNG TX" stays on 1 line. The numeric value below appears at different baselines per card.
  - **Impact:** The 4-card row looks ragged.
  - **Fix:** In `StatsGrid.tsx:104`, the label has `typo-label mb-2 leading-tight line-clamp-2`. Either:
    1. Force 2-line height always: replace `line-clamp-2` with `min-h-[2.5em] line-clamp-2` so single-line labels still occupy a 2-line box
    2. Or force 1-line + `truncate` + tooltip — but then the longer labels lose information
    Recommended: option 1, min-height guarantee.
  - **Severity:** MED

- [ ] **TASK-Q04** [LOW]: Bottom row of left column ("ITEED60001 · Trần Minh Đức") is half-clipped by the card's overflow
  - **Observation:** The card has `maxHeight: 320px` (line 293) with `overflow-y-auto`. With 4-5 rows in May data, the last row's container line gets visually cut at mid-text "KSOJ6886341". The user has to scroll a tiny range to reveal it.
  - **Impact:** Looks unfinished; ketoan may not realise more rows exist.
  - **Fix:** Either show only 3 fully-rendered rows (`slice(0, 3)`), or remove the `maxHeight` cap and let the card grow. Or add a subtle fade-out at the bottom edge to signal "scroll".
  - **Severity:** LOW

---

### /accountant/trips (Đơn hàng)

- [ ] **TASK-Q05** [LOW]: Mixed-case table headers — `Ngày`, `Khách hàng`, `Doanh thu` are sentence-case, but `CONTAINER`, `TRẠNG THÁI` are uppercase
  - **Observation:** Inconsistent visual treatment of column headers within the same table. Likely cause: some columns use the default `header` accessor with raw text, others apply CSS uppercase via a wrapper. Need to grep `DataTablePro` and the column definitions.
  - **Impact:** Tiny but noticeable. Reads as unfinished design system.
  - **Fix:** Pick one convention (recommend uppercase + `tracking-wide` for tabular headers, consistent with the design system's `typo-label` pattern). Apply globally to `DataTablePro` defaults.
  - **Severity:** LOW

- [ ] **TASK-Q06** [LOW]: `/accountant/orders` 404s but the page lives at `/accountant/trips`
  - **Observation:** Typing `/accountant/orders` (a plausible URL given the sidebar label "Đơn hàng") returns 404. No redirect.
  - **Impact:** A user who bookmarks `/orders` (or types it from memory) hits a dead end.
  - **Fix:** Add a redirect in `frontend/src/router.ts` similar to the existing line 90 pattern: `{ path: 'orders', element: h(Navigate, { to: '/accountant/trips', replace: true }) }`.
  - **Severity:** LOW

---

### /accountant/work-orders (Ghép chuyến)

- [ ] **TASK-Q07** [HIGH]: Master list rows truncate partner to ~7 chars (`IT_Partne...`)
  - **Observation:** `frontend/src/pages/accountant/work-orders/WorkOrderMasterList.tsx:160-167` puts partner name, a `·` separator, and the resolved route side-by-side in a single flex row, both flagged `truncate`. Two truncating flex children with no growth priority means each gets ~50% of available width — and the partner ends up showing `IT_Partne...` even though there is 40-50px of free space if route gave it up.
  - **Impact:** Partner name is the highest-priority identifier; route is secondary. Today the user sees neither clearly.
  - **Fix:** Stack the two onto two lines instead of one. Replace lines 160-168 with:
    ```tsx
    <div className="min-w-0 text-xs">
      <p className="font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
        {wo.partner.name}
      </p>
      <p className="truncate text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
        {resolveRoute(wo) || '—'}
      </p>
    </div>
    ```
    Adds one line of row height (~14px), but partner becomes legible.
  - **Severity:** HIGH

- [ ] **TASK-Q08** [MED]: Score chip `4/5` reads as ratio not score — ambiguous on hover
  - **Observation:** Top-left chip is `4/5` (best score / max criteria). Without context, a new user reads this as "4 of 5 trips matched" or similar. No tooltip.
  - **Impact:** Onboarding friction. Existing users have learned what it means.
  - **Fix:** Add a `title="X tiêu chí khớp trên Y"` attribute on the chip element (`WorkOrderMasterList.tsx:107-114`).
  - **Severity:** MED

---

### /accountant/settings/clients (Khách hàng)

- [ ] **TASK-Q09** [MED]: "Loại" column wraps "Cá nhân" → "Cá" / "nhân" on two lines
  - **Observation:** `frontend/src/pages/accountant/ClientList.tsx:134` accessor returns plain text `isCompany(c) ? 'Công ty' : 'Cá nhân'`. DataTablePro auto-allocates a narrow column for it; the space inside the value breaks the line, producing an ugly stacked render. Same bug at `VendorList.tsx:115`.
  - **Impact:** Visible on every row. Looks unprofessional in the settings panel.
  - **Fix:** Wrap the accessor result in `<span className="whitespace-nowrap">`. Apply in both files.
  - **Severity:** MED

- [ ] **TASK-Q10** [MED]: Địa chỉ truncates aggressively at `max-w-[200px]` — large blank space remains in column
  - **Observation:** `ClientList.tsx:135` hard-codes `max-w-[200px]`. The column physically has ~280px of slack — addresses cut off mid-street ("Số 6, Đường số 3, KCN Hiệp ...").
  - **Impact:** User has to open the detail dialog to read the full address — extra clicks for info that could fit.
  - **Fix:** Increase to `max-w-[320px]` or replace with `line-clamp-2 max-w-[280px]` to show two lines when content is long.
  - **Severity:** MED

---

### /accountant/settings/users (Người dùng)

- [ ] **TASK-Q11** [MED]: Counter discrepancy — "2 tài khoản đang hoạt động" but tab sums = 1
  - **Observation:** Top label says "2 tài khoản". Role tabs: Giám đốc 1, Kế toán 0, Tài xế 0. Sum is 1. Table renders Super Admin + Giám Đốc Test, so the visible total IS 2 — but Super Admin isn't in any of the role tab counts. Also, the currently logged-in Kế Toán Test user does not appear in any list, so the "Kế toán 0" tab is misleading.
  - **Impact:** Confusing counts undermine trust in the page. A SuperAdmin tab is missing entirely.
  - **Fix:** Either add a `SuperAdmin` tab with its count, or fold SuperAdmin into "Tất cả" but expose it in a separate filter row. Verify whether the logged-in user is intentionally hidden — if so, label the count "Tài xế 0 (excl. you)" or simply include yourself.
  - **Severity:** MED — data/UI consistency, not visual polish

---

### /accountant/settings/drivers (Tài xế list)

- [ ] **TASK-Q12** [LOW]: Page returns 404 — orphan code in repo
  - **Observation:** `frontend/src/pages/accountant/DriverList.tsx` exists (per CLAUDE.md task-0104, intentionally read-only) but no route in `frontend/src/router.ts` references `DriverList`. The page is unreachable. Any tooltip/quick-link still referencing this path silently fails.
  - **Impact:** Dead code. Confusing to next developer.
  - **Fix:** Decide: either register the route (e.g. `{ path: 'settings/drivers', element: <DriverList /> }` and add a card to the settings landing page), or delete `DriverList.tsx` and remove unused imports.
  - **Severity:** LOW

---

## Cross-cutting Issues

- [ ] **TASK-OVERFLOW-01** [HIGH]: Audit every `truncate` usage to ensure no row has 2+ siblings competing
  - **Action:** Grep `frontend/src/pages/accountant -r "truncate"`. Anywhere two `truncate` siblings live in the same flex without `flex-shrink-0` or width caps, stack them vertically OR assign priorities. Pattern table:

    | Pattern | Fix |
    |---|---|
    | `<flex> <span truncate>A</span><sep/><span truncate>B</span> </flex>` | Convert to 2-line stack OR mark one shrink-0 |
    | `<span truncate>VeryLongOne</span>` alone | OK |
    | Truncate inside a fixed-width container (`w-32`, `max-w-[...]`) | OK if the width is generous; tighten only if width <= 120px and content rarely longer |

- [ ] **TASK-FONT-01** [MED]: Normalise table-cell text for label-like values (`Cá nhân`, `Công ty`, status labels)
  - **Action:** Create a small helper component `<NowrapBadge>` or `<TableLabel>` that always applies `whitespace-nowrap` + truncate-at-overflow. Use it for any string that conceptually represents an enum value rather than a free-form text. Replace the ad-hoc text returns in ClientList/VendorList accessor functions.

- [ ] **TASK-CURRENCY-01** [HIGH]: Don't use `whitespace-nowrap` on numbers that can grow > 11 chars in a fixed-width box
  - **Action:** Audit usages in `frontend/src/components/shared/StatsGrid/StatsGrid.tsx`, `SalarySetup.tsx`, `TripDetail.tsx`, and any other KPI/summary card. Switch to one of: compact format, allow wrap on dot separators, or responsive font scale.

---

## Acceptance Criteria

- [ ] No KPI card on Tổng quan clips its value at any viewport ≥ 360px
- [ ] All four KPI cards on Tổng quan share the same vertical alignment of value (top of digit)
- [ ] On Tổng quan rows, both origin AND destination are visible without horizontal scroll (line wrap allowed)
- [ ] On `/accountant/work-orders` master list, partner name is fully readable (no `IT_Partne...`) for any partner whose name fits ≤ 30 chars
- [ ] "Cá nhân" / "Công ty" / similar enum labels never wrap mid-word
- [ ] User count label and tab counts agree (Σ tabs = visible total)
- [ ] Either `/accountant/orders` redirects to `/accountant/trips` OR is removed from the routing layer entirely
- [ ] No console warnings about CSS issues
- [ ] Lighthouse a11y score ≥ 90 on Tổng quan and Ghép chuyến pages

---

## Files Likely Changed

**Components:**
- `frontend/src/components/shared/StatsGrid/StatsGrid.tsx` — value class fix (TASK-Q01, TASK-Q03)
- `frontend/src/components/shared/DataTablePro/DataTablePro.tsx` — header case unification (TASK-Q05) if defaults are there

**Pages:**
- `frontend/src/pages/accountant/AccountantDashboard.tsx` — TripRow + UnmatchedRow line-clamp (TASK-Q02), card max-height (TASK-Q04)
- `frontend/src/pages/accountant/work-orders/WorkOrderMasterList.tsx` — stack partner/route (TASK-Q07), tooltip on score chip (TASK-Q08)
- `frontend/src/pages/accountant/ClientList.tsx` — Loại whitespace-nowrap (TASK-Q09), Địa chỉ max-w bump (TASK-Q10)
- `frontend/src/pages/accountant/VendorList.tsx` — same Loại fix (TASK-Q09)
- `frontend/src/pages/identity/UserManagement.tsx` (or equivalent) — counter consistency (TASK-Q11)
- `frontend/src/pages/accountant/DriverList.tsx` — either route it or delete (TASK-Q12)

**Routing:**
- `frontend/src/router.ts` — add `/accountant/orders` → `/accountant/trips` redirect (TASK-Q06), optionally register `/accountant/settings/drivers` (TASK-Q12)

---

## Severity Justification

Text overflow on KPI cards / list entries directly degrades ketoan's daily workflow (8h/day at this screen). Numbers truncating = visible data loss = trust erosion → HIGH. Truncated route names on the workbench means the operator cannot triage at a glance and has to click into each row → HIGH. Font inconsistency, mixed-case headers, and dead routes are visible polish issues that don't block work → LOW/MED. Counter discrepancy on the Users page is a data-integrity concern (the page is supposed to be the source of truth for who has access) → MED.

---

## Out of Scope (Confirmed Non-Issues)

- The `₫` glyph appearing "underlined" in many places (e.g. table revenue, salary card) is the U+20AB Vietnamese đồng character itself — its lower stroke is part of the glyph design, not a CSS underline. Standard Vietnamese typography. **Do not "fix".**
- Sidebar collapse behaviour on viewport < 1024px — not visually testable due to Chrome on macOS minimum window width (~700px). Worth a follow-up QA pass on a real iPhone or with DevTools mobile emulation if available to the developer.
