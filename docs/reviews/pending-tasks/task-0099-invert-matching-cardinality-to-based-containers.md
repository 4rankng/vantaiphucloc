# Task 0099 — Invert Matching Cardinality: TO-based Container Limits

## Scope — What & Why

**Problem:** The current reconciliation model is fundamentally inverted. It treats 1 WorkOrder (đơn hàng) as owning multiple containers and matching N TripOrders (chuyến đã đi). The correct business model is:

- **TripOrder (chuyến đã đi)** has N containers (e.g., a truck carries 1 or 2 containers)
- **WorkOrder (đơn hàng)** has 1 container (one order = one container)
- Therefore: 1 TripOrder can match N WorkOrders, **limited by the TripOrder's container count**
- A TripOrder with 2 containers can match at most 2 WorkOrders
- A TripOrder with 1 container can match at most 1 WorkOrder

**Impact:** This is a core architectural change touching backend reconciliation logic, suggestion algorithm, API endpoints, and frontend matching UI.

## Technical Implementation

### Backend: `backend/app/contexts/operations/application/reconciliation.py`

**`MatchTripToWorkOrder` use case — invert the direction:**

1. **Container count limit must be on the TripOrder side**, not the WorkOrder side:
   - Count active links for the **TripOrder** (not WO)
   - Compare against `len(to.containers)` — this is the max matches allowed
   - Raise `ReconciliationConflict` if already at container limit

2. **Remove the "WO may match multiple TOs" assumption.** A WO matches exactly 1 TO (one container = one trip). Validate that the WO is not already matched.

3. **Status transitions after match:**
   - WO: `PENDING → MATCHED` (unchanged)
   - TO: `PENDING → MATCHED` (NOT COMPLETED — this was wrong)
   - Remove the line `to.status = TripOrderStatus.COMPLETED`

4. **Pricing snapshot:** Copy from TO to WO only on first match. On subsequent WO matches to the same TO, accumulate pricing.

**`UnmatchTripFromWorkOrder` use case — invert:**

1. Check remaining links for the **TripOrder** (not WO)
2. If this was the last link on the TO → reset TO to PENDING, reset pricing
3. If other links remain on the TO → only subtract this WO's contribution from accumulated values
4. WO always goes back to PENDING on unmatch (WO is 1:1 with TO)

### Backend: `backend/app/contexts/operations/infrastructure/link_queries.py`

Add or modify:

```python
async def count_links_for_to(session: AsyncSession, trip_order_id: int) -> int:
    """Count active reconciliations for a TripOrder."""
```

This is needed for the container limit check.

### Backend: `backend/app/contexts/operations/infrastructure/match_suggester.py`

**`suggest_trip_matches()` — currently finds TOs for a WO. Reframe:**

The function name stays but the semantics change:
- When a user selects a TO and wants to find WOs to match: find PENDING WOs whose container matches TO's unclaimed containers
- Container limit: max WOs = TO's total containers minus already-matched WO count
- Exclude WOs that are already MATCHED

**`suggest_wo_matches()` — currently finds WOs for a TO. This becomes the primary flow:**

- When user picks a TO (chuyến đã đi), find PENDING WOs (đơn hàng) to match
- Score based on unclaimed containers on the TO side
- Limit suggestions to respect TO's container capacity

### Backend: `backend/app/contexts/operations/domain/value_objects.py`

Simplify statuses (for matching workflow):
- `TripOrderStatus`: Keep only `PENDING` and `MATCHED` as valid matching states. `COMPLETED` should not be set during match. Other statuses (DRAFT, CONFIRMED, CANCELLED) remain for other workflows.
- `WorkOrderStatus`: Keep only `PENDING` and `MATCHED`. `COMPLETED` and `CANCELLED` remain for other workflows.

**Important:** Don't remove the enum values (that would break DB rows), just ensure the reconciliation use cases only transition between PENDING ↔ MATCHED.

### Backend: `backend/app/contexts/operations/interface/routers/reconcile.py`

- `batch_reconcile_for_wo` endpoint: Rename/repurpose to `batch_reconcile_for_to` — match multiple WOs to a single TO
- The batch endpoint must validate: `len(wo_ids) <= TO's container count - already_matched_count`
- `reconcile` single match endpoint: Validate WO is PENDING, TO has capacity

### Backend: `backend/app/contexts/operations/application/dto.py`

- Update `ReconcileInput` / `BatchMatchForWORequest` or create new DTOs for TO-centric matching:
  - `BatchMatchForTORequest`: `{ trip_order_id: int, work_order_ids: list[int] }`

## Files to Modify

1. `backend/app/contexts/operations/application/reconciliation.py` — invert cardinality, status transitions
2. `backend/app/contexts/operations/infrastructure/link_queries.py` — add `count_links_for_to`
3. `backend/app/contexts/operations/infrastructure/match_suggester.py` — TO-centric container capacity
4. `backend/app/contexts/operations/interface/routers/reconcile.py` — new batch endpoint, validation
5. `backend/app/contexts/operations/application/dto.py` — new request DTOs
6. `backend/app/contexts/operations/domain/entities.py` — ensure entities support TO-centric matching
7. `backend/app/schemas/domain.py` — update response schemas if needed

## Testing Criteria

Integration tests must verify:
1. TO with 1 container can match exactly 1 WO; 2nd WO match is rejected
2. TO with 2 containers can match exactly 2 WOs; 3rd WO match is rejected
3. WO that is already MATCHED cannot be matched again
4. After unmatching a WO from a TO with 2 containers, TO stays MATCHED, capacity opens up
5. After unmatching the last WO, TO returns to PENDING
6. Status of TO on match is MATCHED (not COMPLETED)
7. Status of WO on match is MATCHED
