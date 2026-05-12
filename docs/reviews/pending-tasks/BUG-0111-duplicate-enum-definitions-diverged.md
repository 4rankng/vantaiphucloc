# BUG-0111: Duplicate enum definitions diverged across files

## Severity: Major
## Area: backend
## Files: `backend/app/models/enums.py`, `backend/app/contexts/operations/domain/value_objects.py`

### Problem
`WorkOrderStatus` and `TripOrderStatus` are defined in both `enums.py` and `value_objects.py`. The value_objects versions include `MATCHED` and `CONFIRMED` states that don't exist in the enums.py versions. If any code imports from `enums.py`, it gets an incomplete status set.

### Solution
1. Make `value_objects.py` the single source of truth (it's closer to the domain)
2. In `enums.py`, re-export from value_objects: `from app.contexts.operations.domain.value_objects import WorkOrderStatus, TripOrderStatus`
3. Grep all imports of these enums and ensure they point to one location
4. Run full test suite

### Acceptance Criteria
- [ ] Only one definition of each status enum exists
- [ ] `enums.py` re-exports from `value_objects.py` for backward compat
- [ ] No imports point to the old definitions
- [ ] All existing tests pass
