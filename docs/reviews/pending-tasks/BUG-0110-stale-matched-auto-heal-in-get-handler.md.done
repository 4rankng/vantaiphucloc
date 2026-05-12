# BUG-0110: GET handler mutates DB (stale MATCHED auto-heal)

## Severity: Critical
## Area: backend
## Files: `backend/app/contexts/operations/interface/routers/work_orders.py` (~line 141)

### Problem
The `_load_many()` helper in the WO list endpoint auto-heals stale MATCHED work orders (MATCHED status but 0 active reconciliation links) by resetting them to PENDING. This is a **side-effect in a GET request**, violating HTTP semantics. 

Multiple concurrent GET requests could race on the same stale WO, causing double-heal or inconsistent state.

### Solution
1. Move stale-MATCHED cleanup to a dedicated background task (arq worker) that runs periodically (e.g., every 5 min)
2. The cleanup task should use `SELECT ... FOR UPDATE` to prevent races
3. Remove the auto-heal logic from `_load_many()` entirely
4. Optionally add a manual "cleanup stale" admin endpoint

### Acceptance Criteria
- [ ] `_load_many()` has zero write side-effects
- [ ] Stale MATCHED WOs are cleaned by arq worker task
- [ ] Concurrent requests to WO list never mutate state
- [ ] Existing integration tests still pass
