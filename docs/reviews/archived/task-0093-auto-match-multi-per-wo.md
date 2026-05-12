# task-0093: Update auto-match to support multi-match per WorkOrder

| Field       | Value                                    |
|-------------|------------------------------------------|
| **Priority**| P1 — Enhances auto-match                 |
| **Area**    | Backend > Operations > Reconciliation    |
| **Source**  | REQ-001 (Ghép chuyến 1:N)               |
| **Depends** | task-0092                                |

## Scope & Why

Current `auto_match()` in `reconcile.py` matches each WO with only the **best** scoring TO (score >= 1.0). For multi-container runs, one WO should match **all** TOs whose containers are subsets of the WO's containers. This is FR-4 in the requirement.

## Technical Implementation

### File: `backend/app/contexts/operations/interface/routers/reconcile.py`

In the `auto_match()` endpoint, change the inner loop per WO:

**Current logic (per WO):**
```python
best = suggestions[0]  # only takes the best
if best.score >= 1.0:
    # match one pair
```

**New logic (per WO):**
```python
# Find ALL suggestions with score == 1.0
full_matches = [s for s in suggestions if s.score >= 1.0]
if not full_matches:
    # check for partial, else unmatched
    ...

for match in full_matches:
    to = await match_use_case(ReconcileInput(
        work_order_id=wo.id,
        trip_order_id=match.trip_order.id,
        user_id=current_user.id,
    ))
    # audit log per pair
    # add to matched_to_ids to prevent double-matching
    matched_to_ids.add(match.trip_order.id)
    auto_matched.append(AutoMatchResult(...))
```

**Key considerations:**
- After each successful match, add the TO id to `matched_to_ids` so it's excluded from subsequent WOs
- The WO stays MATCHED after the first match (already handled by use case)
- Log each pair individually in audit
- A WO is "fully matched" when all its containers have corresponding matched TOs — but this is informational, not a status change (no PARTIALLY_MATCHED status)

## Testing Criteria

1. **Unit/integration test:** WO-201 with containers [TGHU, MSKU]. Two TOs: TO-101 [TGHU] score 1.0, TO-102 [MSKU] score 1.0. Run auto_match → both pairs auto-matched.
2. **Unit/integration test:** WO-201 with containers [TGHU, MSKU, OOLU]. TO-101 [TGHU] score 1.0, TO-102 [MSKU] score 1.0, TO-103 [OOLU] score 0.5. Auto-match matches TO-101 + TO-102 only, TO-103 goes to partial_matches.
3. **Regression:** Single-container WO + single TO still auto-matches as before.
