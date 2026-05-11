Act as a Senior QA Engineer. Your task is to evaluate the **visual, interaction, and cross-role flow quality** of the logistics web application at https://phucloc.tingting.vip/ (test env).

> **IMPORTANT:** Backend logic (CRUD, authz, matching algorithm, pricing, import pipeline, state machines) is covered by integration tests in `backend/tests/`. DO NOT manually test pure backend behavior. Focus exclusively on what automated tests CANNOT catch: visual bugs, layout issues, multi-step UX friction, cross-role flow seamlessness, and real-browser behavior.

Context & Resources:

Target URL: https://phucloc.tingting.vip/ (test env)
User Roles: SuperAdmin, Giam doc (Director), Ke toan (Accountant), Tai xe (Driver)
Test Data: Customer Excel files for creating don hang are located in `/Users/dev/Documents/projects/vantaiphucloc/docs/don-hang/`. Files include:
- `Phúc Lộc - Shipside T4.26 HAP.xlsx` — Invoice + CUOC pricing (4 sheets: "Bảng kê SS" = containers, "CUOC" = pricing catalog with volume tiers)
- `2.GLORY SHANGHAI- 2612N.xlsx` — Bay Plan
- `8.CONSCIENCE 2615N.xlsx` — Bay Plan
- `Loading list of HAIAN BETA 062S.xls` — Loading List (.xls format)

---

## TESTING CREDENTIALS

| Username  | Password  | Role       |
|-----------|-----------|------------|
| admin     | admin123  | SuperAdmin |
| giamdoc   | admin123  | Director   |
| ketoan    | admin123  | Accountant |
| taixe     | admin123  | Driver     |

---

## INTEGRATION TEST COVERAGE (DO NOT RE-TEST)

The following areas are fully covered by integration tests. Verify them only as part of cross-role visual flows — do NOT file standalone bugs for these:

| Area | Test File | What's Covered |
|------|-----------|----------------|
| Auth & roles | `contexts/identity/test_domain.py` | Login, password, role promotion restrictions, user deactivation |
| Work order authz | `contexts/operations/test_work_orders_authz.py` | Driver isolation, cross-driver 404 |
| State machines | `contexts/operations/test_domain.py` | WO/Trip status transitions, container rules, pricing snapshots |
| CRUD + matching | `contexts/operations/test_application.py` | Create/list/update WO/Trip, match/unmatch, pagination, filters |
| Import pipeline | `test_import_pipeline.py` | All 4 Excel patterns, header synonyms, container parsing, date parsing |
| Excel upload E2E | `test_excel_upload_integration.py` | Preview + commit for all 4 files, role-based access |
| Pricing lookup | `test_pricing_service.py` | Exact match, tiered pricing, cache behavior |
| Apply pricing | `test_apply_pricing.py` | Tiered application, idempotency, unpriced reporting |
| Pricing import | `test_pricing_import.py` | PAN/HAP/NEWWAY format detection, row extraction, commit |
| Domain pricing | `test_customer_pricing_domain.py` | Work type normalization, pricing tiers, alias idempotency |
| Location resolver | `test_location_resolver.py` | Exact/fuzzy matching, alias creation, haversine |
| Location picker | `test_locations_picker.py` | GPS pin, nearby ordering, trip pinning |
| Settlement report | `test_customer_settlement.py` | Number-to-words, container splitting, period calculation, Excel generation |
| DB models | `test_models.py` | Monetary fields, cascades, nullability constraints |

---

## PREVIOUSLY FIXED (DO NOT RE-REPORT)

The following issues were fixed across QA rounds v6–v8. Verify they remain fixed but do NOT file new bugs for them unless they regress:

1. **Doanh thu column** — `/accountant/trips` shows real values (not 0 ₫). Verify still working.
2. **Director "Đã khớp" KPI** — Shows correct count (not 0). Verify still working.
3. **Filter chip vocabulary** — Both pages use "Chờ ghép" / "Đã khớp" (not "Chờ khớp"). Verify still working.
4. **Director navigation** — Uses horizontal NavStrip with **"Tổng quan" tab only** (no sidebar, no "Quản lý tài khoản", no "Thông báo"). Verify still working.
5. **Activity log copy** — Shows proper Vietnamese ("Kế toán đã ghép chuyến #1"). Verify still working.
6. **Auto-fill chips** — Clicking a chip fills Khách hàng, Điểm lấy, Điểm trả. Verify still working.
7. **Work order card routes** — Ghép chuyến shows routes (not "—"). Verify still working.
8. **Driver job detail route** — Shows "Cung đường: X → Y" (not "-"). Verify still working.
9. **Salary period display** — Kỳ lương shows correct period (e.g. "26/04 → 25/05"). Verify still working.
10. **Trip detail MATCHED badge** — Matched orders show single green "Đã khớp" chip (not duplicate "Đã huỷ"). Verify still working.
11. **Client "Loại" column** — Companies show "Công ty" (not "Cá nhân"). Verify still working.
12. **Driver earnings API** — `/api/v1/driver/earnings` returns 200 (not 403). Verify still working.
13. **Match "Tuyến đường"** — Match comparison shows route strings (not "—"). Verify still working.
14. **Work order route display** — Route text wraps to 2 lines (not truncated with "..."). Verify still working.
15. **Push subscription loop** — `POST /api/v1/push/subscriptions` fires once per session (not 4-5 times). Verify still working.

---

## ROLE-BASED NAVIGATION & LAYOUT (VISUAL QA)

These cannot be tested by integration tests — they require real browser inspection.

### NAV-1: Sidebar Rules
- **ketoan**: Persistent sidebar present. Verify correct collapsed/expanded states, active-item highlighting, icons, labels.
- **giamdoc**: NO sidebar. Horizontal NavStrip with **"Tổng quan" tab only**. No "Quản lý tài khoản". No "Thông báo" NavStrip tab. Topbar bell icon is acceptable.
- **taixe**: NO sidebar, NO top nav management links. Mobile-first layout.
- **admin**: NO sidebar. Access pages via direct URL or dedicated navigation.

### NAV-2: Responsive Layout
- Test each role's primary pages at 375px, 768px, 1024px, 1440px widths.
- Check for: broken grids, clipped text, overflowing tables, inaccessible controls, touch-target sizes on mobile.

### NAV-3: Page Transitions
- Navigate between pages within each role → verify no blank flashes, correct scroll position, smooth transitions.
- Back-button behavior: press browser back → verify correct page loads, no stale data.

---

## FLOW 1: DRIVER (Tai xe) — Mobile-First UX

Focus on mobile interaction quality, not backend logic.

### 1.1 Login UX
- Verify login form: placeholder text, error message styling, keyboard type (phone/email), auto-focus.
- After login → verify home screen loads without jank. Check skeleton/spinner behavior.

### 1.2 Home Dashboard Visual
- Verify earnings summary card layout: spacing, font sizes, color coding for amounts.
- Verify work order list: card design, status badges, date formatting, route text truncation.
- Test pull-to-refresh (if implemented) → verify spinner and data refresh.

### 1.3 Create Work Order UX
- Test the full form flow on mobile: field ordering, input types, select dropdowns.
- **GPS Location Picker**: Verify map renders, nearby list scrolls smoothly, pin drop animation.
- **Container OCR**: Verify camera trigger, loading state during OCR, result display. Test with poor lighting/angle.
- **Form validation**: Submit with missing fields → verify inline error messages appear next to the right fields. Verify error messages are in Vietnamese.
- **Success state**: After submit → verify toast/redirect behavior, new order appears in list.

### 1.4 Work Order Detail & Edit UX
- Open a PENDING work order → verify edit affordance is clear.
- Edit → change container number → verify live validation feedback.
- Open a MATCHED work order → verify edit controls are disabled/hidden (visual clarity that it's locked).

### 1.5 History & Earnings Visual
- Verify history list: filter chips, date picker, empty state messaging.
- Verify earnings page: period selector UX, amount display, breakdown readability.

### 1.6 Push Notification UX
- Register → verify permission prompt appears, success feedback.
- Verify notification badge behavior in topbar.

---

## FLOW 2: ACCOUNTANT (Ke toan) — Operational UX

Focus on interaction friction and multi-step flow quality.

### 2.1 Dashboard Visual
- Verify dashboard cards: stat numbers, trend indicators, click targets.
- Verify quick-action buttons are prominent and clearly labeled.

### 2.2 Import Customer Orders — UX Flow
- Upload page: drag-drop zone styling, file type feedback, progress indicator.
- Preview table: column alignment, scroll behavior for wide tables, row selection.
- **Commit flow**: Confirm dialog? Success toast? Error handling for partial failures?
- **Apply pricing button**: Location, styling, feedback after click.

### 2.3 Ghép Chuyến (Matching) — Core UX Flow
This is the highest-value area for manual QA. Integration tests verify the algorithm; you verify the UX.

- **Master list**: Score chip colors legible? Score numbers readable at a glance? Selected-item highlighting visible?
- **Suggest matches panel**:
  - Verify match criteria breakdown renders correctly: green checkmarks, red X marks, value comparison columns.
  - Verify confidence badges (full/partial/none) are visually distinct.
  - Test scrolling when many suggestions exist.
- **Match action**: Click "Ghép" → verify confirmation flow (or lack thereof — see OPEN-01).
  - After match → verify both panels update (WO status changes, match count updates).
- **Unmatch action**: Click unmatch → verify confirmation dialog, status reverts visually.
- **Auto-match button**: Click → verify loading state, result toast ("Đã ghép N cặp").
- **Edge case UX**: WO with 0 candidates → what does the user see? Empty state message? (See OPEN-02)

### 2.4 Pricing UX — 2x2 Grid
- Verify the F20/F40/E20/E40 grid layout: spacing, checkbox toggles, input alignment.
- Verify enabling/disabling a work type: smooth transition, no layout shift.
- Verify inline editing in client detail view: input focus, save/cancel buttons.

### 2.5 Partners CRUD UX
- Create partner form: field ordering, validation feedback, partner_type selector.
- Partner list: sort/filter, "Loại" column display, action buttons.
- Edit vs Delete affordances.

### 2.6 Location Alias Management UX
- Navigate to Settings → Địa điểm → verify alias table renders.
- **Confirm action**: Click confirm → verify status badge changes, row updates.
- **Reject action**: Click reject → verify inline note input appears, submit → status changes.
- **Reopen action**: Click reopen on rejected → verify returns to PENDING.
- **Empty states**: No pending aliases → verify friendly message.

### 2.7 Settings Hub Visual
- Verify settings cards: icon consistency, description text, navigation.
- Verify nested settings pages load correctly with proper breadcrumb/back navigation.

### 2.8 Export UX
- Click export buttons → verify download starts, filename is correct, loading feedback.
- Verify exports work with active filters applied.

---

## FLOW 3: DIRECTOR (Giam doc) — Dashboard Visual QA

The director role is **read-only dashboard access**. Focus on KPI display quality.

### 3.1 Dashboard Visual
- Verify KPI widgets: number formatting (VND currency), chart rendering, responsive sizing.
- Verify bar chart: axis labels, tooltip on hover, color coding.
- Verify no stale data: compare dashboard numbers with actual data.

### 3.2 Access Restriction Visual Feedback
- Attempt to navigate to `/accountant/...` → verify the redirect/403 page is user-friendly (not a raw error).
- Verify no sidebar, no management links, no create/edit buttons anywhere.

---

## FLOW 4: SUPERADMIN — Navigation Completeness

### 4.1 Navigation Coverage
- Verify superadmin can reach all pages accessible to accountant + director + driver.
- Verify no broken links or 404s in navigation elements.

### 4.2 User Management UX
- Create user form: role selector, validation, success feedback.
- Edit user: pre-populated fields, role change confirmation.
- Delete user: confirmation dialog, row removal animation.

---

## OPEN ISSUES — FOCUS TESTING AREAS

These are known UX/usability issues. Test each one and report current status.

### OPEN-01 — Manual Ghép allows low-confidence matches with no confirmation (High)
**Flow:** Kế toán — Ghép chuyến
**Issue:** Clicking "Ghép" on a 2/6 score match succeeds instantly with no confirm dialog. No warning about mismatched fields, no free-text reason logged.
**Test:** Match a work order to a trip order with score 2/6 or 3/6 → verify no confirm dialog appears.
**Expected:** A confirm dialog should appear when score < 5/6, listing mismatched fields and requiring a reason.

### OPEN-02 — No manual fallback when 0 candidates suggested (High)
**Flow:** Kế toán — Ghép chuyến
**Issue:** When a work order has 0 candidate trip orders, the accountant has no way to browse all orders, search by container, or cross-month pick. They must give up.
**Test:** Find a work order that shows 0 candidates → verify there is no "Ghép thủ công" or search option.
**Expected:** A "Tìm đơn hàng" search box should allow browsing all trip orders by container number or PO.

### OPEN-03 — Auto-match threshold unreachable with current data (Medium)
**Flow:** Kế toán — Ghép chuyến
**Issue:** Auto-match requires a 6/6 (1.0) score, but no pair achieves this with current data. Auto-match is effectively a no-op.
**Test:** Click "Tự động ghép" → verify result feedback. Does the UI explain WHY 0 matches happened?
**Expected:** Auto-match should show a toast explaining the outcome, even if n=0.

### OPEN-04 — Location alias management UI (Previously Missing — NOW IMPLEMENTED)
**Flow:** Kế toán — Settings → Địa điểm
**Test:** Navigate to the new alias management page → verify it works as described in FLOW 2.6 above.
**Report any bugs or UX issues found.**

### OPEN-05 — Container validation inconsistency between Excel import and driver form (Medium)
**Flow:** Kế toán import vs Tài xế Tạo chuyến
**Test:** Note a container number from a trip order → try typing it in the driver Tạo chuyến form → verify if it's accepted or rejected.
**Expected:** Both paths should use the same validation.

### OPEN-06 — Excel import default-date lacks time (Low)
**Flow:** Kế toán — Nhập đơn hàng
**Test:** Open the import modal → verify the date input is `type="date"` with no time selector.
**Expected:** At minimum a datetime-local input; ideally per-row date override.

### OPEN-07 — "Chờ ghép" badge clipped behind sibling card (Low)
**Flow:** Tài xế — Lịch sử
**Test:** Login as taixe → History → look for a row with two cards side-by-side → check badge clipping.
**Expected:** Badge fully visible, no overlap.

---

## CROSS-CUTTING FLOWS (Multi-Role UX)

These flows span multiple roles and require real-browser session switching. Integration tests cover the logic; you verify the UX seamlessness.

### C1: End-to-End Order Lifecycle UX
1. **Accountant**: Import customer Excel → verify Trip Orders appear in list with correct preview data.
2. **Driver**: Create Work Order from mobile viewport → verify smooth form submission.
3. **Accountant**: Match Work Order to Trip Order → verify match panel updates live, status badges change.
4. **Director**: Refresh dashboard → verify KPIs reflect the new matched trip (numbers updated).
5. **Driver**: View work order → verify MATCHED status is visible, earnings are now shown.
6. **Accountant**: Export settlement report → verify it downloads with correct filename.

### C2: Multi-Container Matching UX
1. **Accountant**: Open a work order with multiple containers → verify all containers visible in detail.
2. **Accountant**: Suggest matches → verify multi-container trip order appears with correct score.
3. **Accountant**: Match → verify "N ĐH" badge appears on the WO card in master list (if >1 trip linked).
4. **Accountant**: Unmatch one link → verify badge updates, status may remain MATCHED if other links exist.

### C3: Salary Period Visual Flow
1. **Accountant**: Configure salary period → verify period display format.
2. **Driver**: Complete work orders → verify earnings update in real-time (or on refresh).
3. **Accountant**: View driver earnings → verify period totals, per-trip breakdown readability.
4. **Accountant**: Export salary report → verify download works, Excel has correct formatting.

### C4: Pricing Grid Visual Flow
1. **Accountant**: Open pricing detail for a client → verify 2x2 grid (F20/F40/E20/E40) renders.
2. **Accountant**: Click to enable a work type → verify input fields appear smoothly.
3. **Accountant**: Save → verify success feedback, grid updates.
4. **Accountant**: View a work type with no pricing → verify "Chưa có giá" placeholder.

---

## REQUIRED OUTPUT

Produce a structured list of issues categorized for the development team. For every item, use the following format:

Type: [Visual Bug / UX Friction / Interaction Bug / Missing Feature / Usability Issue]
Layer: [Frontend / Both]
Affected Role/Flow: [e.g., Ke toan - Ghép chuyến, Tai xe - Create Work Order, Director - Dashboard]
Description: [Clear explanation of what you saw — include viewport size if relevant]
Severity: [High / Medium / Low]
Screenshot: [If possible, describe what a screenshot would show]
