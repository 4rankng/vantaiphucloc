# task-0096: Frontend — Redesign MatchTrip page for 1:N (WorkOrder → N TripOrders)

| Field       | Value                                    |
|-------------|------------------------------------------|
| **Priority**| P0 — Primary user-facing change          |
| **Area**    | Frontend > Accountant > MatchTrip        |
| **Source**  | REQ-001 (Ghép chuyến 1:N)               |
| **Depends** | task-0092 (batch endpoint)               |

## Scope & Why

The MatchTrip page currently enforces 1:1 selection (one WO, one TO). It must support selecting **one WorkOrder and multiple TripOrders** for batch matching. This is the core UX change for the ghép chuyến feature.

## Technical Implementation

### File: `frontend/src/hooks/use-match-trip.ts`

Major refactor — replace single selection with multi-TO selection:

1. **Replace single trip selection with multi-select:**
```typescript
const [selectedJobId, setSelectedJobId] = useState(0)
const [selectedTripIds, setSelectedTripIds] = useState<number[]>([])
```

2. **Add toggle function for trip selection:**
```typescript
const toggleTripSelection = useCallback((id: number) => {
  setSelectedTripIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )
}, [])
```

3. **Update `handleMatch()` to call batch endpoint:**
```typescript
const handleMatch = async () => {
  if (!selectedJob || selectedTripIds.length === 0 || submitting) return
  setSubmitting(true)
  try {
    // Apply any edits first (same as current logic)
    // ...
    
    // Call batch endpoint
    await batchReconcileForWO({
      work_order_id: selectedJobId,
      trip_order_ids: selectedTripIds,
    })
    navigate(-1)
  } catch (err) { setSubmitting(false); throw err }
}
```

4. **Add API function for batch endpoint** in the API client:
```typescript
// In appropriate API file
export async function batchReconcileForWO(data: {
  work_order_id: number
  trip_order_ids: number[]
}) {
  return api.post('/reconcile/batch-for-wo', data)
}
```

5. **Remove single `selectedTrip` / `selectedTripId`** references — replace with derived data from `selectedTripIds`.

6. **Keep `selectedJob` (WorkOrder) as single-select** — the flow is: pick 1 WO → pick N TOs.

7. **Container matching:** For each candidate TO, check if its containers exist in the selected WO. Return per-TO match indicators:
```typescript
const getTripMatchStatus = (tripId: number) => {
  const trip = trips.find(t => t.id === tripId)
  if (!trip || !selectedJob) return 'none'
  const tripContainers = trip.containers ?? []
  const woContainers = selectedJob.containers
  const allMatch = tripContainers.every(tc =>
    woContainers.some(jc => jc.workType === tc.workType && jc.containerNumber === tc.containerNumber)
  )
  if (allMatch) return 'full'
  const someMatch = tripContainers.some(tc =>
    woContainers.some(jc => jc.workType === tc.workType && jc.containerNumber === tc.containerNumber)
  )
  if (someMatch) return 'partial'
  return 'none'
}
```

8. **Return interface:** Export `selectedTripIds`, `toggleTripSelection`, `getTripMatchStatus` instead of single trip fields.

### File: `frontend/src/pages/accountant/MatchTrip.tsx`

1. **TripOrder list:** Add checkboxes for multi-select. Use `toggleTripSelection` on click.

2. **Container match indicators** per TripOrder row:
   - ✅ Green: all containers match WO containers + route matches
   - ⚠️ Yellow: container matches but route/partner differs
   - ❌ Red: container not found in WO
   - 🔵 Blue/gray: already matched to another WO

3. **Confirm button text:** Show count — "Xác nhận ghép {N} đơn hàng"

4. **WorkOrder list:** Show partially-matched WOs (don't filter them out entirely). Add a badge showing matched/total containers: "2/3"

5. **Results display after match:** Show per-TO success/failure from the batch response.

### Hook query for batch endpoint

Add a `useBatchReconcileForWO` mutation hook (or use `useMutation` inline).

## Testing Criteria

1. **Manual test:** Select WO-201 (2 containers), select TO-101 + TO-102, click confirm → both matched, page navigates back.
2. **Manual test:** Select WO-201, select TO-101 only → works (1:N with N=1 is valid).
3. **Manual test:** Container indicators show correctly — green for matching containers, red for non-matching.
4. **Manual test:** Partial match result (one TO fails) → error shown for failed TO, successful ones still saved.
5. **Verify** existing TripOrder-first flow (select TO → pick WO) still works if that path exists.
