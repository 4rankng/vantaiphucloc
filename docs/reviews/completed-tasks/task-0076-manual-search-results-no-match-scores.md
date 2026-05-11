# task-0076: Manual Trip Search Results Show No Match Scores or Route Info

**Type:** UX Friction
**Severity:** 🟡 Major
**Layer:** Frontend
**Affected Role/Flow:** ketoan - Ghép chuyến / Manual search fallback
**URL:** https://phucloc.tingting.vip/accountant/work-orders
**Viewport:** all

## Observation
When a work order has 0 auto-matched candidates, a "Tìm đơn hàng thủ công" (Manual search) button appears. Clicking it loads a list of trip orders (e.g., "Tìm thấy 16 đơn hàng") showing only: order ID, date, customer name, and a "Ghép" button. No route, no container type, no match score, and no criteria breakdown are shown.

In contrast, the auto-matched candidate cards (for work orders with 2/6 or 3/6 scores) show the full criteria comparison grid (Ngày đi, Tuyến đường, Khách hàng, Điểm lấy, Điểm trả, Container with ↔ comparisons and score badge).

## Impact
Accountants using manual search have no contextual information to decide which order to match. They see 16 orders with just an ID, date, and company name — no route, no container type. They are forced to remember or look up work order details externally, increasing cognitive load and matching errors.

## Recommendation
The manual search results should display the same criteria comparison grid used for auto-matched candidates, including:
- Route (Điểm lấy → Điểm trả)
- Container type
- A match score computed on-the-fly (even if below threshold)
- Criteria breakdown showing which fields match/mismatch

At minimum, add the route and container type to the manual search result rows.

## Resolution
Already fixed in current code. ManualSearchResults in MatchDetailPanel.tsx (lines 277-287) already shows route (pickup → dropoff) and container types for each result. Match scores are not computed for manual search (intentional — only auto-suggestions get scored).
