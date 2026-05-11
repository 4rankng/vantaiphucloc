# Task-0086: Accountant KPI Cards Navigate to Unfiltered Lists (No Pre-Applied Filter)

**Type:** UX Friction
**Severity:** 🟡 Major
**Role/Flow:** ketoan - Tổng quan (/accountant)
**Location:** https://phucloc.tingting.vip/accountant (KPI cards)
**Viewport:** all

## Observation
The accountant dashboard shows 4 KPI cards, two of which are clickable:
- **"CHUYẾN CHƯA GHÉP" (19)** — clicking navigates to `/accountant/work-orders` (unfiltered)
- **"ĐƠN CHỜ ĐỐI SOÁT" (9)** — clicking navigates to `/accountant/trips` showing all 19 trips with filter "Tất cả"

In both cases, the destination page opens without pre-applying the filter implied by the KPI card:
- "Chuyến chưa ghép" (19) → should open work-orders filtered to "Chờ ghép" only
- "Đơn chờ đối soát" (9) → should open trips filtered to "Chờ ghép" only (showing the 9, not all 19)

The user clicks a card expecting to see exactly those 9 (or 19) items, but arrives at an unfiltered view with different counts.

## Impact
Accountants use the KPI cards to jump directly to actionable items. When the destination page shows all items (not just the KPI subset), the user must manually re-apply the filter — adding friction and creating confusion about why the count changed ("the card said 9, but I see 19").

## Recommendation
Pass a filter parameter when navigating from KPI cards:
- "Chuyến chưa ghép" → navigate to `/accountant/work-orders?filter=cho-ghep`
- "Đơn chờ đối soát" → navigate to `/accountant/trips?filter=cho-ghep`

The destination page should read this query param and pre-select the corresponding filter tab on mount. Alternatively, use React Router state to pass the filter intent without exposing it in the URL.
