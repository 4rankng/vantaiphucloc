# bug-0081 — Remove COMPLETED status — simplify WO/TO states to PENDING + MATCHED only

**Type:** Logic / State Machine Simplification  
**Layer:** Both (Backend + Frontend)  
**Severity:** 🟡 Major — extra status adds complexity with no current business justification  
**Affected Flow:** All flows involving Work Order and Trip Order status

---

## Description

The system currently has three statuses for Work Orders: `PENDING`, `MATCHED`, `COMPLETED`.  
The user requirement is to simplify to **two states only**: `PENDING` and `MATCHED`.

Per the business owner:
> "The state of chuyen da di / don hang is either pending or matched. I am not sure what is the use case for completed. We should simplify to two states only."

`COMPLETED` should be **removed unless a specific legal or financial audit trail requirement is identified**. No such requirement currently exists.

---

## Current State Machine

**WorkOrder:**  `PENDING → MATCHED → COMPLETED`  
**TripOrder:**  `DRAFT/PENDING → COMPLETED` (skips MATCHED per commit `1d99b22`)

**Target:**  
**WorkOrder:**  `PENDING → MATCHED` (reversible: `MATCHED → PENDING` on unmatch)  
**TripOrder:**  `PENDING → MATCHED` (reversible: `MATCHED → PENDING` on unmatch)

---

## Changes Required

### Backend

1. **`backend/app/contexts/operations/domain/entities.py`**  
   - Remove `COMPLETED` from `WorkOrderStatus` and `TripOrderStatus` enums.  
   - Update state machine transitions to use `MATCHED` as the terminal matched state.

2. **`backend/app/contexts/operations/infrastructure/reconciliation.py`**  
   - Wherever status is set to `COMPLETED` on match → change to `MATCHED`.  
   - On unmatch → revert to `PENDING`.

3. **Database migration**  
   - Add Alembic migration: `UPDATE work_orders SET status='MATCHED' WHERE status='COMPLETED'`  
   - `UPDATE trip_orders SET status='MATCHED' WHERE status='COMPLETED'`  
   - Remove `COMPLETED` from the enum column if using PostgreSQL enum type.

4. **`backend/app/contexts/operations/interface/routers/reconcile.py`**  
   - Remove any references to `COMPLETED` status in filters or response logic.

### Frontend

5. **`frontend/src/data/domain.ts`**  
   - Remove `'COMPLETED'` from `WorkOrderStatus` and `TripOrderStatus` type unions.

6. **`frontend/src/pages/accountant/WorkOrderList.tsx`**  
   - Status filter currently treats `MATCHED | COMPLETED` as "Đã khớp" — simplify to just `MATCHED`.

7. **`frontend/src/pages/driver/DriverHome.tsx`**  
   - `matchedCount` filter checks `w.status === 'MATCHED' || w.status === 'COMPLETED'` → simplify to `w.status === 'MATCHED'`.

8. **All other components** that reference `'COMPLETED'` in status checks — search with:  
   ```bash
   grep -r "COMPLETED" frontend/src --include="*.tsx" --include="*.ts"
   ```

### Tests

9. Update all integration tests that assert `status === 'COMPLETED'` → assert `status === 'MATCHED'` instead.  
   Files to update (from prior fix commit):
   - `tests/integration/test_multi_match_reconciliation.py`
   - `tests/integration/test_reconcile.py`
   - `tests/integration/test_workflows.py`

---

## Note on Future COMPLETED State

If a "Completed / Invoiced / Settled" state is needed in the future (e.g. after the customer settlement report is exported), it should be **re-added with a clear business trigger** and documented here. For now, remove it.
