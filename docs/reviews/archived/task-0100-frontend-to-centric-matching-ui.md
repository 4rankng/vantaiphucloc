# Task 0100 — Frontend: TO-Centric Matching UI with Container Capacity Guard

## Scope — What & Why

**Problem:** The frontend matching UI currently operates from a WorkOrder-centric perspective: user selects a WO, then picks multiple TOs to match. This must be inverted to match the corrected backend model:

- User selects a **TripOrder (chuyến đã đi)** first
- User then selects **N WorkOrders (đơn hàng)** to match, where N ≤ TripOrder's container count
- UI must enforce the container capacity limit — disable checkboxes when limit is reached
- Status labels must show MATCHED (not COMPLETED) for matched items

## Technical Implementation

### Frontend: `frontend/src/hooks/use-match-trip.ts`

**Refactor to be TO-centric:**

1. The primary selection is a **TripOrder** (not WorkOrder)
2. The user picks **WorkOrders** (đơn hàng) from the suggestion list
3. Track `selectedWoIds: number[]` instead of `selectedTripIds`
4. Container capacity: `maxMatches = tripOrder.containers.length`
5. `alreadyMatchedCount` = count of existing active reconciliations for this TO
6. `remainingCapacity = maxMatches - alreadyMatchedCount`
7. Prevent selecting more WOs than `remainingCapacity`

### Frontend: `frontend/src/pages/accountant/MatchTrip.tsx`

**Redesign layout:**

1. **Left panel:** TripOrder selector (chuyến đã đi) — show container count prominently
2. **Right panel:** WorkOrder suggestion list (đơn hàng) with checkboxes, max selectable = remaining capacity
3. Show capacity indicator: "2/2 container đã ghép" or "1/2 container — còn 1 chỗ"
4. When capacity is reached, disable remaining checkboxes with visual feedback
5. Action button text: "Ghép N đơn hàng vào chuyến" (match N orders into trip)

### Frontend: `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx`

**Update for TO-centric view:**

1. When viewing a matched TripOrder's detail, show linked WorkOrders (not linked TripOrders)
2. Each linked WO shows unmatch button
3. "Thêm đơn hàng khác" section: show remaining capacity, enforce limit
4. Batch action bar validates against container count before submitting

### Frontend: API hooks update

1. `useBatchReconcileForWO` → create `useBatchReconcileForTO`:
   - Request: `{ tripOrderId: number, workOrderIds: number[] }`
   - Validate `workOrderIds.length <= remainingCapacity` client-side before calling API
2. Update `useSuggestMatches` / `useSuggestWos` — the primary flow is now "suggest WOs for TO"
3. Remove or repurpose `use-match-trip.ts` functions that were WO-centric

### Status display fix

- All places that show TripOrder status: ensure `COMPLETED` is not shown for matched items
- Show `MATCHED` badge for matched TripOrders
- If any existing data has COMPLETED status from the old logic, display it as MATCHED in the UI

## Files to Modify

1. `frontend/src/hooks/use-match-trip.ts` — TO-centric state, container capacity
2. `frontend/src/pages/accountant/MatchTrip.tsx` — inverted UI layout
3. `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx` — TO-centric detail panel
4. `frontend/src/pages/accountant/work-orders/MatchCard.tsx` — may need prop changes
5. `frontend/src/hooks/use-queries.ts` — new/updated mutation hooks
6. `frontend/src/data/domain.ts` or types — ensure TypeScript types match new DTOs

## Testing Criteria

Manual UI verification (QA):
1. User selects a TO with 1 container → can only check 1 WO → 2nd checkbox is disabled
2. User selects a TO with 2 containers → can check 2 WOs → 3rd checkbox is disabled
3. After matching 1 WO to a 2-container TO, capacity shows "1/2" and allows 1 more
4. Unmatch a WO → capacity opens up again
5. All matched items show "MATCHED" status badge, not "COMPLETED"
6. Match action button shows correct count: "Ghép 2 đơn hàng vào chuyến"
