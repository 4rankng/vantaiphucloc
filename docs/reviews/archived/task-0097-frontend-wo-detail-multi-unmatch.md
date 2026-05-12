# task-0097: Frontend — Show linked TripOrders in WorkOrder detail with per-TO unmatch

| Field       | Value                                    |
|-------------|------------------------------------------|
| **Priority**| P1 — Detail view enhancement             |
| **Area**    | Frontend > Accountant > WorkOrder Detail |
| **Source**  | REQ-001 (Ghép chuyến 1:N)               |
| **Depends** | task-0091 (unmatch requires both IDs)    |

## Scope & Why

When viewing a WorkOrder detail, the accountant must see all linked TripOrders (not just one). Each linked TO needs its own "Unmatch" button so the accountant can selectively unlink individual TOs from a multi-matched WO.

## Technical Implementation

### File: `frontend/src/pages/accountant/work-orders/TripDetailCard.tsx` (or equivalent detail component)

1. **Fetch all linked TripOrders for the WorkOrder.** Either:
   a. Use an existing API endpoint that returns matched TOs for a WO, or
   b. Add a new lightweight endpoint `GET /reconcile/links/{work_order_id}` that returns the list of linked TOs.

2. **Render linked TripOrders as a list:**
```tsx
{linkedTripOrders.map(to => (
  <div key={to.id} className="flex items-center justify-between border rounded p-3">
    <div>
      <span className="font-medium">{to.id}</span>
      <span className="text-muted-foreground ml-2">
        {to.containers.map(c => c.containerNumber).join(', ')}
      </span>
      <Badge variant="success" className="ml-2">Đã ghép</Badge>
    </div>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleUnmatch(to.id)}
      disabled={unmatching}
    >
      Bỏ ghép
    </Button>
  </div>
))}
```

3. **Unmatch handler** calls `POST /reconcile/unmatch` with both IDs:
```typescript
const handleUnmatch = async (tripOrderId: number) => {
  await unmatch({ work_order_id: workOrderId, trip_order_id: tripOrderId })
  // Refetch linked TOs
  queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] })
}
```

### Backend: Add endpoint to list linked TOs for a WO (if not existing)

**File:** `backend/app/contexts/operations/interface/routers/reconcile.py`

```python
@router.get("/reconcile/links/{work_order_id}", response_model=LinkedTripOrdersResponse)
async def get_linked_trip_orders(
    work_order_id: int,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
):
```

Uses `find_all_links_for_wo()` from `link_queries.py` + loads the corresponding TripOrder details.

## Testing Criteria

1. **Manual test:** WO-201 matched with TO-101 + TO-102. Open WO-201 detail → see both TOs listed.
2. **Manual test:** Click "Bỏ ghép" on TO-101 → TO-101 unlinked, TO-102 still linked, WO stays MATCHED.
3. **Manual test:** Click "Bỏ ghép" on TO-102 (last one) → WO goes to PENDING, both TOs PENDING.
4. **Verify** unmatch audit log records the correct pair.
