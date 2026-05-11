# task-0091: Update unmatch to require both WO and TO IDs

| Field       | Value                                    |
|-------------|------------------------------------------|
| **Priority**| P0 — Blocks safe partial unmatch         |
| **Area**    | Backend > Operations > Reconciliation    |
| **Source**  | REQ-001 (Ghép chuyến 1:N)               |
| **Depends** | task-0090                                |

## Scope & Why

When a WorkOrder is matched with multiple TripOrders, unmatching must specify **which** TripOrder to unlink. Currently `UnmatchInput` allows either ID to be `None`. The use case must require both IDs so it can delete the specific reconciliation row and correctly determine if the WO should revert to PENDING.

## Technical Implementation

### File: `backend/app/contexts/operations/application/dto.py`

Change `UnmatchInput` to require both IDs:

```python
@dataclass
class UnmatchInput:
    user_id: int
    reason: str
    work_order_id: int       # was: int | None = None — now required
    trip_order_id: int       # was: int | None = None — now required
```

### File: `backend/app/contexts/operations/application/reconciliation.py`

In `UnmatchTripFromWorkOrder.__call__()`:

1. Remove the `if not data.work_order_id and not data.trip_order_id` guard (both are now always set).
2. Call `find_link(session, work_order_id=data.work_order_id, trip_order_id=data.trip_order_id)` — both IDs always present.
3. The remaining logic (check `count_links_for_wo`, reset WO only if last link) is already correct.

### File: `backend/app/contexts/operations/interface/routers/reconcile.py`

Update `unmatch()` endpoint:

1. Change `UnmatchRequest` schema to require both fields (check `app/schemas/domain.py` for the Pydantic model).
2. Remove the `if not body.work_order_id and not body.trip_order_id` validation block.

### File: `app/schemas/domain.py` (or wherever `UnmatchRequest` is defined)

```python
class UnmatchRequest(BaseModel):
    work_order_id: int       # required, no Optional
    trip_order_id: int       # required, no Optional
    reason: str = ""
```

## Testing Criteria

1. **Unit test:** WO matched with TO-101 + TO-102. Unmatch TO-101 → TO-101 is PENDING, WO stays MATCHED, TO-102 still MATCHED.
2. **Unit test:** WO matched with only TO-101. Unmatch TO-101 → both WO and TO-101 become PENDING.
3. **Unit test:** Call unmatch without `work_order_id` → validation error 422.
4. **Integration test:** Unmatch endpoint returns 200, audit log records which pair was broken.
