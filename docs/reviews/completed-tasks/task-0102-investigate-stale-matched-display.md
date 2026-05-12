# Task 0102: Investigate & Fix Stale "Đã khớp" with 0 Đơn Hàng

## Scope
The work-orders page (`/accountant/work-orders`) shows WOs with "Đã khớp" status but the right panel (MatchDetailPanel) shows 0 đơn hàng (trip orders). The backend has an auto-heal in `_load_many()` that resets stale MATCHED→PENDING, but the user is still seeing this issue. Need to find and fix the root cause.

## Background
- Backend auto-heal exists in `work_orders.py:_load_many()` (line ~140): detects MATCHED WOs with 0 active Reconciliation links, resets to PENDING.
- Frontend has `isStaleMatched` fallback in `MatchDetailPanel.tsx` (line 239): shows error state with manual "Đặt lại trạng thái PENDING" button.
- Despite both defenses, the user reports seeing "Đã khớp" with 0 orders.

## Investigation Areas

### 1. Frontend `matchedTrips` derivation (MOST LIKELY)
`MatchDetailPanel.tsx` line 233-237:
```tsx
const matchedTrips = useMemo(() => {
  if (!isMatched || !workOrder) return []
  return allTripOrders.filter(t => t.matchedWorkOrderIds?.includes(workOrder.id))
}, [isMatched, workOrder, allTripOrders])
```
The `matchedWorkOrderIds` field on TripOrders must be populated correctly. If `useTripOrders()` returns TOs without this field populated, the filter finds nothing even when links exist in DB.

**Check:** 
- How is `matchedWorkOrderIds` populated on the frontend TO domain type?
- Does `GET /trip-orders` (or equivalent list endpoint) include reconciliation link data?
- Is `matchedWorkOrderIds` only populated by a separate call that might fail silently?

### 2. Auto-heal timing race
The auto-heal runs when `_load_many()` is called. If the WO list loads before the reconciliation links are deleted/updated, the heal won't trigger. If the detail panel uses a different API call that doesn't go through `_load_many`, the heal is bypassed.

**Check:**
- Does the WO detail GET endpoint (`_load_many(session, [w])`) also trigger auto-heal? Yes (line 112).
- Is there a caching layer (Redis, React Query stale-while-revalidate) serving stale WO status?

### 3. Frontend `isMatched` derivation
`isMatched` is likely derived from `wo.status === 'MATCHED'`. If the auto-heal runs but React Query doesn't refetch, the stale status persists on screen.

**Check:**
- After auto-heal resets WO to PENDING, does the next GET return PENDING? If so, React Query should update.
- But if `allTripOrders` is a separate query with different cache timing, the `matchedTrips` filter may return empty for a MATCHED WO that hasn't been healed yet.

## Technical Implementation

### Files to Investigate
1. `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx` — `matchedTrips` derivation, `isStaleMatched` detection
2. `frontend/src/hooks/use-queries.ts` — `useTripOrders()` implementation, `matchedWorkOrderIds` population
3. `frontend/src/data/domain.ts` — `TripOrder` type, `matchedWorkOrderIds` field
4. `backend/app/contexts/operations/interface/routers/work_orders.py` — auto-heal logic in `_load_many`
5. `backend/app/contexts/operations/interface/routers/` — trip orders list endpoint, how it populates match data

### Fix Strategy (after investigation)
The most likely fix is one of:
- **A)** Ensure the trip orders list API returns `matchedWorkOrderIds` by joining Reconciliation data
- **B)** Add a direct query in MatchDetailPanel that fetches reconciliation links for the selected WO (rather than relying on TO list having the cross-reference)
- **C)** Ensure the auto-heal runs on the WO list endpoint that the master list calls, and force React Query to refetch after healing

### Acceptance Criteria
- **AC1:** When a WO has MATCHED status but 0 active reconciliation links, the master list shows "Chờ ghép" (not "Đã khớp") after page load
- **AC2:** When a WO is legitimately MATCHED (has active links), the detail panel shows the linked trip orders
- **AC3:** No manual "Đặt lại trạng thái" button needed for legitimate auto-healed cases — it should be seamless
- **AC4:** If auto-heal can't prevent the flash (race condition), ensure the frontend gracefully handles the transition without showing empty state
