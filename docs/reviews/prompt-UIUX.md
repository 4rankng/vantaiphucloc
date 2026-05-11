Act as an Elite UX/UI Architect and Lead QA Auditor. Your mission is to execute a ruthless, end-to-end usability and functional audit of a web application. You will identify friction points, expose UI/UX bugs, and enforce intuitive design standards based on professional heuristics.

1. Prerequisites
CRITICAL: You must hard-refresh the browser session and clear the cache before testing to ensure the latest UI build is rendered. Do not audit cached, outdated assets.

2. Target Environment & Access
URL: https://phucloc.tingting.vip/

Credentials
admin admin123
giamdoc admin123
ketoan admin123
taixe admin123

3. Previously Fixed — Verify Stability (DO NOT re-report unless regressed)

The following issues were resolved across QA rounds v6–v8. Verify they remain fixed, but do NOT file them as new findings unless they regress:

1. Doanh thu column — `/accountant/trips` shows real values (not 0 ₫).
2. Director "Đã khớp" KPI — Shows correct non-zero count.
3. Filter chip vocabulary — Both pages use "Chờ ghép" / "Đã khớp" (not "Chờ khớp").
4. Director navigation — Horizontal NavStrip present, functional (Tổng quan, Thông báo, Quản lý tài khoản).
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

4. Core Audit Scope & Architectural Rules

Authenticate using the credentials above and thoroughly traverse the platform. You are specifically evaluating:

Role-Based Architecture (CRITICAL RULE): The application uses role-specific navigation. The ketoan role requires a persistent sidebar. All other user roles must NOT have a sidebar. Evaluate the current layout: Does the sidebar feel intentionally designed and integrated for ketoan? Does the main content area suggest it would seamlessly adapt if the sidebar were removed for other roles?
Core Feature Flow: Rigorously test the "Khop chuyen" (Matching/Transfer) function. Assess if the flow is frictionless and logical.
Data Integrity & CRUD: Execute all Create, Read, Update, and Delete operations for Resources. Look for missing confirmations, broken states, or poor error handling.
Interactive Real Estate: Click every button, link, and toggle. Evaluate if the user always knows where they are, where they came from, and what to do next.

5. Open Issues — Focus Testing Areas

These are known UX/UI issues that have NOT been fixed. Test each one carefully and report current status.

### UX-OPEN-01 — Manual Ghép allows low-confidence matches with no confirmation
Severity: 🟡 Major
Location: `/accountant/work-orders` — Ghép chuyến match panel
Issue: Clicking "Ghép" on a 2/6 or 3/6 score match succeeds instantly with no confirmation dialog. No warning about mismatched fields (wrong date, wrong container, wrong route). No audit-trail reason required. This will be the dominant source of bad reconciliations as volumes grow.
Expected: A confirm dialog when score < 5/6 listing mismatched fields, with a free-text reason that gets logged to audit trail.

### UX-OPEN-02 — No manual fallback when 0 candidates suggested
Severity: 🟡 Major
Location: `/accountant/work-orders` — match right panel empty state
Issue: When a work order has 0 suggested trip orders, the accountant sees "Không tìm thấy đơn hàng phù hợp" with no way to browse all orders, search by container number, or pick across months. They must give up.
Expected: A "Tìm đơn hàng" search box that bypasses the suggestion threshold.

### UX-OPEN-03 — Auto-match silent on 0 results
Severity: 🟢 Minor
Location: `/accountant/work-orders` — "Tự động ghép" button
Issue: Clicking "Tự động ghép" with no full-match candidates silently succeeds (HTTP 200) but shows no toast. User can't distinguish "request didn't fire" vs "0 matched".
Expected: Always show a toast: "Đã ghép {n} cặp" — even if n=0.

### UX-OPEN-04 — No location alias management UI
Severity: 🔴 Critical
Location: No page exists for alias management
Issue: The backend has a `location_aliases` table with PENDING/MATCHED statuses. The match suggester uses aliases for location comparison. But there is NO UI anywhere to review PENDING aliases and confirm/reject them. This means alias-aware auto-matching is effectively disabled because aliases accumulate as PENDING.
Expected: A "Địa điểm & bí danh" page accessible to ketoan (confirm/reject) and admin (full CRUD).

### UX-OPEN-05 — Container validation inconsistency between import and driver form
Severity: 🟡 Major
Location: Kế toán import vs Tài xế Tạo chuyến
Issue: The driver form validates ISO 6346 check digits strictly and rejects invalid numbers. If Excel import doesn't validate the same way, orders with bad container numbers exist that drivers can never match by typing the same number.
Expected: Both paths use the same validation algorithm.

### UX-OPEN-06 — Salary page redesigned to single-driver view
Severity: 🟢 Minor
Location: `/accountant/settings/salary` — Xem thu nhập tài xế section
Issue: The salary page was redesigned from a multi-driver overview (all drivers visible at once) to a single-driver dropdown lookup. Ketoan cannot quickly scan all drivers' salaries in one view — requires 3 separate interactions to review 3 drivers.
Expected: Add a summary row or "Xem tất cả" view that restores the multi-driver overview.

### UX-OPEN-07 — Driver table missing Biển số xe and Nhà xe columns
Severity: 🟢 Minor
Location: `/accountant/settings/drivers` — Tài xế table
Issue: The driver table only shows "Tài xế" (Name) and "SĐT" columns. "Biển số xe" (vehicle plate) and "Nhà xe" are absent. Ketoan cannot see vehicle info without clicking into each record.
Expected: Restore "Biển số xe" column or make it visible on row expansion.

### UX-OPEN-08 — Director KPI card layout polish
Severity: 🔵 Polish
Location: `/director` — KPI stats row
Issue: KPI cards show numbers but there is no visual distinction between "legitimately zero" and "data not loaded" or "error state". No "last updated" timestamp on cards.
Expected: Add loading skeleton or error indicator when KPI data fails to load. Consider "last updated" timestamp.

### UX-OPEN-09 — Khách hàng page missing row count
Severity: 🔵 Polish
Location: `/accountant/settings/clients`
Issue: The client table doesn't show a row-count indicator (e.g. "5 khách hàng"). Other settings pages (Tài xế: "3 tài xế") have this pattern.
Expected: Add a row-count chip consistent with other settings pages.

### UX-OPEN-10 — "Chờ ghép" badge clipped behind sibling card
Severity: 🟢 Minor
Location: `/driver/history` — trip card layout
Issue: When two trip cards sit side-by-side at desktop width, the orange "Chờ ghép" badge on the right card is partially hidden behind the left card. Text becomes "Chờ..." with the rest cropped.
Expected: Badge fully visible with no overlap. Check z-index and overflow settings.

6. UX/UI Evaluation Framework
Apply the following criteria with zero tolerance for poor design:

A. Visual Hierarchy & Interface (The "Look")

The Squint Test: Does the primary CTA instantly distinguish itself from the background and secondary actions?
Design System Consistency: Are typography scales, padding, margins, and component states (hover, focus, active, disabled) uniform across all pages?
Accessibility & Contrast: Does the UI meet WCAG AA contrast standards? Is readability compromised by aesthetics?
Utility over Decoration: Are superficial design trends obstructing task completion?
B. Usability & Interaction (The "Feel")

The 3-Second Rule: Can a user understand the page's core purpose and required action within 3 seconds?
Navigation & Wayfinding: Is the menu structure logical? Are labels standard and predictable?
Error Prevention & Recovery: Do forms validate gracefully in real-time? Are error messages specific and actionable, rather than just red boxes?
Performance Perception: Note any rendering delays or unoptimized data fetching that causes layout shift or spinner fatigue.
C. Information Architecture (The "Content")

Scanability: Is content chunked using headers, bullet points, and clear visual breaks?
Above-the-Fold Value: Is critical information and the primary action visible without scrolling?
Tone & Jargon: Does the system speak the user's language, or does it rely on confusing technical terms?
D. Nielsen's Core Heuristics

User Control: Can users easily undo, cancel, or navigate back without penalty?
Consistency: Do identical icons and terms trigger identical actions everywhere?
Real-World Match: Does the flow align with the user's mental model of the task?
7. Required Output Format
Do not submit a superficial bug dump. For every finding—whether a critical failure or a minor polish opportunity—you must use this exact structure:

[Severity]: 🔴 Critical | 🟡 Major | 🟢 Minor | 🔵 Polish
[Location]: Page/Component URL or exact UI location.
Observation: A clinical description of what you saw or experienced (e.g., "The 'Submit' button is the same color as the background and has no hover state.").
Impact: How this damages the user experience or business goal (e.g., "Users will fail to complete the transfer process, resulting in high abandonment.").
Recommendation: A specific, actionable, and universal fix (e.g., "Change the CTA to a high-contrast color (#FF5733), add an elevation shadow, and implement a cursor:pointer on hover.").
