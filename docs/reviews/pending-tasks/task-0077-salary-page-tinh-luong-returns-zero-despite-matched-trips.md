# task-0077: Salary Page "Tính lương tất cả" Returns Zero Despite Matched Trips Existing

**Type:** Interaction Bug
**Severity:** 🔴 Critical
**Layer:** Both
**Affected Role/Flow:** ketoan - Kỳ lương (/accountant/settings/salary)
**URL:** https://phucloc.tingting.vip/accountant/settings/salary
**Viewport:** all

## Observation
The accountant dashboard (Tổng quan) shows "LƯƠNG SẢN LƯỢNG TX: 11.030.000 ₫" for Tháng 05/2026 (01/05 → 31/05). However, navigating to the salary settings page (Kỳ lương) and clicking "Tính lương tất cả" results in all zeros:
- Tổng đơn đã khớp: 0
- Tổng lương: 0 ₫
- Tổng phụ cấp: 0 ₫
- Tổng thu nhập: 0 ₫
- Table: "Chưa có dữ liệu kỳ 26/04 → 25/05"

The discrepancy occurs because:
1. The dashboard KPI uses calendar month (01/05 → 31/05)
2. The salary period is configured as 26/04 → 25/05
3. The majority of matched trips have dates 08–11 May, which fall inside both periods

The salary calculation should find matched trips in the 26/04 → 25/05 period but returns 0.

## Impact
Accountants cannot generate payroll from the salary page — the primary payroll tool shows no data. The "Tải Excel" export would also produce an empty sheet. This breaks the payroll workflow entirely.

## Recommendation
1. Investigate why the salary calculation API returns 0 matched trips for the period 26/04 → 25/05 when there are 10 matched work orders in the system.
2. Check if the salary calculation filters on trip status (e.g., requires a specific "completed" status rather than "matched").
3. If the API is correct, verify that the dashboard KPI "LƯƠNG SẢN LƯỢNG TX" uses the same data source and period — if they differ, document why and add a period label to the dashboard KPI card.
4. Add a loading/success/failure notification when "Tính lương tất cả" completes so the user knows the operation ran (currently there is no feedback toast).
