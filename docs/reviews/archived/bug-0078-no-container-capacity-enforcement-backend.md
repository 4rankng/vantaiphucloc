# bug-0078 — Backend: No container capacity enforcement on batch-for-wo

**Type:** Logic Bug  
**Layer:** Backend  
**Severity:** 🔴 High — data integrity violation; users can create logically impossible matches  
**Affected Flow:** Kế toán — Ghép chuyến (`POST /reconcile/batch-for-wo`)

---

## Description

The `POST /reconcile/batch-for-wo` endpoint accepts any number of Trip Order IDs and matches them all to a single Work Order without validating whether the number of TOs exceeds the container capacity of the WO.

**Business rule (from requirements):**  
A Work Order represents one physical truck trip. Each container on that trip maps to exactly one Order (Don Hang / Trip Order). Therefore:

> `len(trip_order_ids) ≤ work_order.containers.count`

**Current (wrong):** A WO with 1 container can be matched to 5 Trip Orders — impossible in the real world.  
**Expected (correct):** If `len(trip_order_ids) > WO.container_count`, the endpoint must return `422 Unprocessable Entity`.

---

## Steps to Reproduce

1. Find a Work Order with 1 container (e.g. `PwdTest` — F40 CMAU2149597).
2. `POST /api/v1/reconcile/batch-for-wo` with `{ "work_order_id": <id>, "trip_order_ids": [id1, id2] }` (2 TOs for a 1-container WO).
3. **Actual:** 200 OK, both TOs matched.  
4. **Expected:** 422 — "Số đơn hàng vượt quá số lượng container của chuyến (max: 1)"

---

## Fix Required

**File:** `backend/app/contexts/operations/interface/routers/reconcile.py`  
**Endpoint:** `POST /reconcile/batch-for-wo` (around the `batch_for_wo` handler)

Add validation before the loop:

```python
from fastapi import HTTPException

# Inside batch_for_wo handler, after fetching the work order:
container_count = len(work_order.containers)
if len(request.trip_order_ids) > container_count:
    raise HTTPException(
        status_code=422,
        detail=f"Số đơn hàng ({len(request.trip_order_ids)}) vượt quá số container của chuyến (tối đa: {container_count})"
    )
```

Also apply the same validation in the single `POST /reconcile` endpoint — if the WO is already matched to N TOs where N equals its container count, reject any new match attempt.

---

## Integration Tests Required

See `bug-0082` for the test plan.
