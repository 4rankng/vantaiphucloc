# task-0071: Director KPI "Chờ xử lý" Missing Percentage Delta

**Type:** Visual Bug
**Severity:** 🟡 Major
**Layer:** Frontend
**Affected Role/Flow:** giamdoc - Director Dashboard
**URL:** https://phucloc.tingting.vip/director
**Viewport:** all

## Observation
The Director dashboard shows 4 KPI cards: Tổng chuyến (+12%), Đã khớp (+8%), Chờ xử lý (no %), Doanh thu (+15%). Three of the four KPI cards display a percentage delta badge showing month-over-month change. The "Chờ xử lý" (Pending) card is the only one without a delta badge — it shows just the raw count "9" with no percentage change indicator.

## Impact
The accountant and director use the percentage delta to quickly gauge trends. "Chờ xử lý" is arguably the most important operational KPI (pending work orders needing action), yet it's the only one missing trend context. Directors cannot tell at a glance whether pending work is increasing or decreasing.

## Recommendation
Add a percentage delta to the "Chờ xử lý" KPI card consistent with the other three cards. If the backend does not return a delta for this field, either (a) compute it from prior-month data or (b) explicitly show "—" to signal the delta is unavailable rather than simply omitting the element.

## Resolution
Already fixed in current code. DirectorDashboard.tsx already computes `delta(pendingThisMonth, prevPending)` on line 229 and passes it as `trend` prop to the StatCard. The delta may not display when both current and previous month have zero pending trips (delta returns undefined for 0→0).
