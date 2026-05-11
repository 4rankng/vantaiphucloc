Act as an Elite UX/UI Architect and Lead QA Auditor. Your mission is to execute a ruthless visual and interaction audit of the web application. You will identify visual bugs, layout issues, interaction friction, and design inconsistencies — **not backend logic bugs** (those are covered by integration tests in `backend/tests/`).

1. Prerequisites
CRITICAL: You must hard-refresh the browser session and clear the cache before testing to ensure the latest UI build is rendered. Do not audit cached, outdated assets.

2. Target Environment & Access
URL: https://phucloc.tingting.vip/

Credentials
	admin admin123
	giamdoc admin123
	ketoan admin123
	taixe admin123

3. Integration Test Coverage (DO NOT RE-TEST)

The following areas are fully covered by automated integration tests. Do NOT file bugs for pure data/logic issues — only report if the data displays incorrectly in the UI:

| Area | Test File |
|------|-----------|
| Auth, login, role restrictions | `contexts/identity/test_domain.py` |
| Work order authorization (driver isolation) | `contexts/operations/test_work_orders_authz.py` |
| WO/Trip state machines | `contexts/operations/test_domain.py` |
| CRUD + match/unmatch logic | `contexts/operations/test_application.py` |
| Excel import pipeline (all 4 formats) | `test_import_pipeline.py`, `test_excel_upload_integration.py` |
| Pricing lookup & tiered pricing | `test_pricing_service.py` |
| Apply pricing to trips | `test_apply_pricing.py` |
| Pricing import (PAN/HAP/NEWWAY) | `test_pricing_import.py` |
| Settlement report generation | `test_customer_settlement.py` |
| Location resolver & picker | `test_location_resolver.py`, `test_locations_picker.py` |

4. Previously Fixed — Verify Visual Stability (DO NOT re-report unless regressed)

The following issues were resolved across QA rounds v6–v8. Verify they remain visually correct, but do NOT file them as new findings unless they regress:

1. Doanh thu column — `/accountant/trips` shows real values (not 0 ₫).
2. Director "Đã khớp" KPI — Shows correct non-zero count.
3. Filter chip vocabulary — Both pages use "Chờ ghép" / "Đã khớp" (not "Chờ khớp").
4. Director navigation — Horizontal NavStrip present with **"Tổng quan" tab only**. "Thông báo" and "Quản lý tài khoản" must NOT appear.
5. Activity log copy — Proper Vietnamese text, no garbled/duplicated words.
6. Auto-fill chips — All three fields populated (Khách hàng, Điểm lấy, Điểm trả).
7. Work order card routes — Ghép chuyến cards show route text (not "—").
8. Driver job detail route — Shows "Cung đường: X → Y" (not "-").
9. Salary period display — Correct period boundaries (no off-by-one).
10. Trip detail MATCHED badge — Single green "Đã khớp" chip (no duplicate "Đã huỷ").
11. Client "Loại" column — Companies show "Công ty" (not "Cá nhân").
12. Driver earnings API — Returns 200 for driver role (not 403).
13. Match "Tuyến đường" comparison — Shows route strings (not "—").
14. Work order route display — Wraps to 2 lines (not truncated).
15. Push subscription — Fires once per session (not 4-5 times).

5. Role-Based Layout Rules (VISUAL AUDIT)

These layout rules CANNOT be tested by integration tests — verify each one by visual inspection:

- **ketoan only**: persistent sidebar. Verify collapsed/expanded states, active-item highlight color, icon alignment, label text.
- **giamdoc (Director)**: NavStrip with **"Tổng quan" tab only**. No "Quản lý tài khoản". No "Thông báo" NavStrip tab. Director is read-only — no create/edit/delete buttons anywhere. Topbar bell icon is global and acceptable for all roles.
- **taixe (Driver)**: Mobile-first layout, no sidebar, no top nav management links. All controls must be touch-friendly (min 44px tap targets).
- **admin (SuperAdmin)**: No sidebar; access to all pages via direct URL or dedicated navigation.

6. Visual Audit Checklist

Walk through every page for each role. For each page, evaluate:

### A. Layout & Alignment
- [ ] Grid columns align correctly; no orphaned elements.
- [ ] Tables: headers match column widths; no horizontal overflow on 1024px+.
- [ ] Cards: equal height in rows, consistent padding, no visual breaking.
- [ ] Forms: labels align with inputs, consistent spacing between fields.
- [ ] Modals/dialogs: centered, proper max-width, no viewport overflow on mobile.

### B. Typography & Text
- [ ] Font sizes follow hierarchy: headings > body > captions > metadata.
- [ ] No text overflow or truncation without ellipsis/tooltip.
- [ ] Vietnamese diacritics render correctly (no missing tone marks).
- [ ] Currency amounts consistently formatted (e.g., "350,000 ₫" not "350000VND").
- [ ] Dates consistently formatted across all pages.

### C. Color & Contrast
- [ ] Primary CTA buttons pass WCAG AA contrast ratio against their background.
- [ ] Status badges are colorblind-friendly (not relying solely on red/green).
- [ ] Muted text is distinguishable from background (not too faint).
- [ ] Selected/active states clearly visible (sidebar items, list items, tabs).
- [ ] Hover states on all interactive elements (buttons, links, table rows).

### D. Component Consistency
- [ ] All status badges use the same component (same sizing, padding, font).
- [ ] All tables use the same header style, row hover, and pagination.
- [ ] All forms use the same input styling, error message placement, and validation timing.
- [ ] All modals use the same header/footer layout, close button placement.
- [ ] Icon sizing consistent across navigation, cards, and inline usage.

### E. Responsive Behavior (Test at 375px, 768px, 1024px, 1440px)
- [ ] No horizontal scroll on mobile.
- [ ] Tables collapse to cards or stack on narrow viewports.
- [ ] Navigation collapses to hamburger (if applicable) without losing access.
- [ ] Touch targets: all buttons/links ≥ 44px × 44px on mobile.
- [ ] No content hidden behind fixed headers/footers.

### F. Interaction States
- [ ] Loading spinners appear during data fetch (no blank states).
- [ ] Empty states have friendly messages + illustrations (not just whitespace).
- [ ] Error states show actionable messages (not raw JSON or stack traces).
- [ ] Disabled buttons have clear visual distinction from enabled buttons.
- [ ] Focus rings visible for keyboard navigation (accessibility).

### G. Animation & Transitions
- [ ] Page transitions: no white flash or layout shift.
- [ ] List updates: smooth addition/removal of items.
- [ ] Modal open/close: smooth animation, no jank.
- [ ] Dropdown/select: opens in correct direction, doesn't overflow viewport.

7. High-Priority Visual Audit Areas

These pages have the most complex UIs and are most likely to have visual bugs:

### 7.1 Ghép Chuyến (Matching Page) — `/accountant/work-orders`
- Master list: score chip legibility, selected-item border, scroll behavior.
- Match panel: criteria breakdown rendering, confidence badge colors, container number display.
- Split-panel layout: resizes correctly, no content hidden behind divider.
- Match action: visual feedback (button loading state, success toast, status change animation).

### 7.2 Trip Order List — `/accountant/trips`
- Table columns: container number, partner, route, pricing, status — all readable at 1024px.
- Filter bar: chips, date pickers, partner selector — alignment and spacing.
- Status badges: consistent sizing, correct colors for PENDING/MATCHED.
- "Chưa có giá" (unpriced) indicator visibility.

### 7.3 Driver Home — `/` (as taixe)
- Mobile viewport (375px): earnings card, work order list, bottom navigation.
- Work order cards: container number, route, date — all fit without overflow.
- Status badges: visible on small screens, not clipped.
- CREATE button: prominent, accessible, not blocked by other elements.

### 7.4 Director Dashboard — `/` (as giamdoc)
- KPI widgets: number formatting, responsive grid, chart rendering.
- Bar chart: readable axis labels, tooltip on hover, legend visibility.
- Overall: professional, clean, no visual clutter.

### 7.5 Pricing Detail — `/accountant/pricing/:partnerId`
- 2×2 grid: F20/F40/E20/E40 — consistent card sizing, clear enable/disable states.
- Inline editing: input fields align with labels, save/cancel buttons visible.
- Route grouping: clear visual separation between routes.

### 7.6 Settings Hub — `/accountant/settings`
- Settings cards: icon alignment, description text truncation, navigation affordance.
- Location alias table: confirm/reject/reopen button styling, inline note input UX.

### 7.7 Import Flow — `/accountant/trips/import`
- File upload zone: drag-drop visual feedback, file type icons.
- Preview table: horizontal scroll for wide data, column header sticky, row highlight.
- Commit button: clear progress feedback during processing.

8. Specific Visual Bug Hunts

Check for these common issues:

- [ ] Z-index problems: tooltips behind modals, dropdowns behind fixed headers, popovers clipped by overflow:hidden.
- [ ] Text contrast on colored backgrounds (badges inside colored chips, text on secondary backgrounds).
- [ ] Inconsistent border-radius (some cards rounded, some not).
- [ ] Ghost text or placeholder text left in production (e.g., "Lorem ipsum", "TODO", "test").
- [ ] Broken images or missing icons (Lucide icon imports).
- [ ] Scroll bar styling: consistent appearance, no jarring native scrollbars in middle of styled containers.
- [ ] Focus trap in modals: Tab key should cycle within modal, not escape to background.

9. Required Output Format

Do not submit a superficial bug dump. For every finding, use this exact structure:

[Severity]: 🔴 Critical (blocks task) | 🟡 Major (degrades UX) | 🟢 Minor (polish) | 🔵 Enhancement
[Location]: Page URL + exact component (e.g., "/accountant/work-orders — score chip in master list")
Viewport: [375px / 768px / 1024px / 1440px — or "all" if universal]
Observation: What you saw (e.g., "The 'Ghép' button has no hover state and blends into the background.")
Impact: How this hurts the user (e.g., "Users cannot discover the match action, reducing match completion rate.")
Recommendation: Specific fix (e.g., "Add --theme-brand-primary background with 8px border-radius and cursor:pointer on hover.")
