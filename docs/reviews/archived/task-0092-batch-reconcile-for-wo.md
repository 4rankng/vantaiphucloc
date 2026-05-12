# task-0092: Add `batch_reconcile_for_wo` endpoint (1 WO → N TripOrders)

| Field       | Value                                    |
|-------------|------------------------------------------|
| **Priority**| P0 — Core new capability                 |
| **Area**    | Backend > Operations > Reconciliation    |
| **Source**  | REQ-001 (Ghép chuyến 1:N)               |
| **Depends** | task-0090                                |

## Scope & Why

The accountant needs to match one WorkOrder with multiple TripOrders in a single action (e.g., twin-lift: 1 truck, 2 containers, 2 TripOrders). Currently `POST /reconcile` only handles 1:1. We need a batch endpoint that accepts one `work_order_id` and an array of `trip_order_ids`.

## Technical Implementation

### File: `backend/app/schemas/domain.py`

Add request/response schemas:

```python
class BatchMatchForWORequest(BaseModel):
    work_order_id: int
    trip_order_ids: list[int]  # min 1 item

class BatchMatchForWOResult(BaseModel):
    trip_order_id: int
    success: bool
    error: str | None = None

class BatchMatchForWOResponse(BaseModel):
    work_order_id: int
    results: list[BatchMatchForFOResult]
```

### File: `backend/app/contexts/operations/interface/routers/reconcile.py`

Add new endpoint:

```python
@router.post("/reconcile/batch-for-wo", response_model=BatchMatchForWOResponse)
async def batch_reconcile_for_wo(
    body: BatchMatchForWORequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    match_use_case: MatchTripToWorkOrder = Depends(get_match_trip_to_work_order),
):
```

**Logic:**
1. Validate `work_order_id` exists and has containers.
2. For each `trip_order_id` in `trip_order_ids`:
   a. Call `match_use_case(ReconcileInput(work_order_id=body.work_order_id, trip_order_id=to_id, user_id=current_user.id))`
   b. On success: log audit, append success result
   c. On error: append error result, continue to next (partial success allowed)
3. Commit once after all pairs.
4. Return per-TO success/failure results.

**Important:** The `MatchTripToWorkOrder` use case already handles the case where WO is already MATCHED (it doesn't block it — see comment "WO may already be MATCHED"). It correctly blocks only if the TO is already linked.

### Register in router imports

Add new schemas to the import block at top of `reconcile.py`.

## Testing Criteria

1. **Integration test:** WO-201 with containers [TGHU, MSKU], TO-101 [TGHU], TO-102 [MSKU]. POST `/reconcile/batch-for-wo` with `{work_order_id: 201, trip_order_ids: [101, 102]}` → both succeed, WO MATCHED, both TOs MATCHED.
2. **Integration test:** Same WO, but TO-101 is already matched → TO-101 fails with "already matched", TO-102 succeeds. Response shows mixed results.
3. **Integration test:** Empty `trip_order_ids` → 422 validation error.
4. **Integration test:** Nonexistent `work_order_id` → 404 or appropriate error.
5. **Verify** existing `POST /reconcile` (1:1) still works unchanged.
