# TASK-0118: Add manual search fallback when 0 candidates (UX-OPEN-02)

## Severity: Major
## Area: fullstack
## Files: MatchDetailPanel.tsx (right panel empty state)

### Problem
When a work order has 0 suggested trip orders, accountant sees "Không tìm thấy đơn hàng phù hợp" with no way to browse all orders, search by container number, or pick across months. They must give up entirely.

### Solution
1. Add "Tìm đơn hàng" search box in the empty state panel
2. Search bypasses the suggestion threshold — searches all trip orders by container number, route, date range
3. Results show match score but allow selection regardless of score
4. Backend: add `GET /api/v1/trip-orders/search?q=...` endpoint (bypasses match suggester)

### Acceptance Criteria
- [ ] Empty match panel shows search input
- [ ] Search by container number works
- [ ] Can ghép a manually-found trip order
- [ ] Results include match scores for reference
