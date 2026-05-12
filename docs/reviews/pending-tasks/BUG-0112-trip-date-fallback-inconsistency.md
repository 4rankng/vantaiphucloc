# BUG-0112: trip_date fallback inconsistency in match suggester

## Severity: Major
## Area: backend
## Files: `backend/app/contexts/operations/infrastructure/match_suggester.py` (line 234, 493, 550)

### Problem
The match suggester uses `work_order.created_at.date()` for WO date comparison (lines 234, 493, 550), but salary queries use `COALESCE(WorkOrder.trip_date, func.date(WorkOrder.created_at))`. 

When a WO has `trip_date` set (which is common), the match suggester **ignores it** and compares using `created_at` instead. This causes missed matches where the driver set a different trip_date than their creation time.

### Solution
1. In match_suggester.py, replace `work_order.created_at.date()` with `work_order.trip_date if work_order.trip_date else work_order.created_at.date()` everywhere
2. Add a helper function `get_wo_date(work_order)` to avoid repetition
3. Add unit tests verifying match scoring uses trip_date when available

### Acceptance Criteria
- [ ] Match suggester uses `trip_date` when available, falls back to `created_at.date()`
- [ ] Consistent date resolution across match suggester and salary queries
- [ ] Unit test: WO with trip_date set → match score uses trip_date, not created_at
- [ ] Unit test: WO without trip_date → falls back to created_at
