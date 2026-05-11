# UX-OPEN-06 — Salary Page Redesigned to Single-Driver View

**Severity:** 🟢 Minor  
**Type:** Usability Issue  
**Layer:** Frontend  
**Affected Role/Flow:** ketoan — `/accountant/settings/salary`  
**Status:** ⚠️ Still Present (verified QA v9, 2026-05-11)

---

## Issue

The salary page was redesigned from a multi-driver overview table (all drivers visible at once) to a single-driver dropdown lookup. To review 3 drivers' salaries, the accountant must:
1. Open the page
2. Select driver A from dropdown → read values
3. Change dropdown to driver B → read values
4. Change dropdown to driver C → read values

This does not match the payroll mental model, where the accountant needs to review and compare all drivers side-by-side before approving the period.

**QA v9 evidence:** Page has a single `combobox` labelled "Chọn tài xế". 3 drivers total. No tabular multi-driver view.

---

## Expected Behavior

Restore or augment with a **summary overview** that shows all drivers for the current period in a single table:

| Tài xế | Số chuyến | Lương cơ bản | Phụ cấp | Tổng |
|--------|-----------|--------------|---------|------|
| Nguyễn Văn A | 12 | 3,000,000 | 500,000 | 3,500,000 |
| Trần Thị B | 8 | 2,200,000 | 300,000 | 2,500,000 |
| ...| | | | |

Clicking a row expands or navigates to the existing single-driver detail view.

---

## Recommendation

1. Add a "Tất cả tài xế" default view above (or replacing) the dropdown
2. Render a summary table with one row per driver for the selected period
3. Retain the single-driver detail view as a drill-down (click row or use dropdown)
4. "Xuất Excel" in summary mode should export all drivers (not just selected one)
