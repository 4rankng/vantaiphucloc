
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
