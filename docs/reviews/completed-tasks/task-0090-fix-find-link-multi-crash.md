# task-0090: Fix `find_link()` crash when WO has multiple active reconciliations

| Field       | Value                                    |
|-------------|------------------------------------------|
| **Priority**| P0 — Production bug, blocks multi-match  |
| **Area**    | Backend > Operations > Reconciliation    |
| **Source**  | REQ-001 (Ghép chuyến 1:N)               |

## Scope & Why

`link_queries.py:find_link()` uses `scalar_one_or_none()` which raises `MultipleResultsFound` when a WorkOrder has >1 active reconciliation row. This already crashes in production for any WO that accidentally got multi-matched. The unmatch flow depends on this function.

## Technical Implementation

### File: `backend/app/contexts/operations/infrastructure/link_queries.py`

**Change `find_link()` signature and behavior:**

```python
async def find_link(
    session: AsyncSession,
    *,
    work_order_id: int | None = None,
    trip_order_id: int | None = None,
) -> ReconciliationORM | None:
    """Find a single active reconciliation link.
    
    When both work_order_id AND trip_order_id are provided, returns the
    specific link row (unique composite). When only one is provided,
    returns the first match (useful for legacy 1:1 flows).
    """
    q = select(ReconciliationORM).where(
        ReconciliationORM.is_active == True,
    )
    if work_order_id is not None:
        q = q.where(ReconciliationORM.work_order_id == work_order_id)
    if trip_order_id is not None:
        q = q.where(ReconciliationORM.trip_order_id == trip_order_id)
    res = await session.execute(q)
    # Use scalars().first() instead of scalar_one_or_none() to avoid
    # MultipleResultsFound when a WO has multiple active links.
    return res.scalars().first()
```

**Key change:** Replace `res.scalar_one_or_none()` → `res.scalars().first()`. This prevents the crash while keeping the return type the same.

## Testing Criteria

1. **Unit test:** Create a WO with 2 active reconciliation rows. Call `find_link(work_order_id=X)` → returns first row, no exception.
2. **Unit test:** Call `find_link(work_order_id=X, trip_order_id=Y)` with both IDs → returns exact match.
3. **Unit test:** Call `find_link(work_order_id=nonexistent)` → returns `None`.
4. **Regression:** Existing 1:1 unmatch flow still works (find_link returns the single row).
