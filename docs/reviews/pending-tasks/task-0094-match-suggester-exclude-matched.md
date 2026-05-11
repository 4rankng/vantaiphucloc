# task-0094: Update match suggester to handle already-matched containers

| Field       | Value                                    |
|-------------|------------------------------------------|
| **Priority**| P1 — Improves suggestion quality         |
| **Area**    | Backend > Operations > Match Suggester   |
| **Source**  | REQ-001 (Ghép chuyến 1:N)               |

## Scope & Why

When a WO is partially matched (e.g., 2 of 3 containers already linked to TOs), `suggest_trip_matches()` should:
1. Exclude already-matched TOs from suggestions
2. Score remaining TOs based on **unclaimed** containers only
3. Indicate which containers are already "claimed"

This ensures the suggester doesn't recommend TOs that are already linked, and scores reflect only available container capacity.

## Technical Implementation

### File: `backend/app/contexts/operations/infrastructure/match_suggester.py`

In `suggest_trip_matches(db, wo)`:

1. **Fetch already-matched TO IDs** for this WO:
```python
from app.models.domain import Reconciliation
matched_to_ids = set(r[0] for r in (await db.execute(
    select(Reconciliation.trip_order_id).where(
        Reconciliation.work_order_id == wo.id,
        Reconciliation.is_active == True,
    )
)).all())
```

2. **Filter out matched TOs** from candidate pool before scoring.

3. **Build set of "claimed" container numbers** from already-matched TOs:
```python
claimed_containers = set()
for to_id in matched_to_ids:
    to_containers = (await db.execute(
        select(TripOrderContainer).where(TripOrderContainer.trip_order_id == to_id)
    )).scalars().all()
    for c in to_containers:
        claimed_containers.add(_normalize(c.container_number))
```

4. **Adjust container scoring:** When checking container overlap between WO and candidate TO, exclude WO containers that are in `claimed_containers`.

### Optional enhancement: Add `claimed_containers` field to `MatchSuggestion` schema

```python
class MatchSuggestion(BaseModel):
    # ... existing fields ...
    already_claimed_containers: list[str] = []  # containers in WO already matched elsewhere
```

## Testing Criteria

1. **Unit test:** WO-201 partially matched with TO-101 (container TGHU). Call `suggest_trip_matches` for WO-201 → TO-101 not in results, TO-102 (container MSKU) scores based on unclaimed container MSKU.
2. **Unit test:** WO-201 fully matched (all containers claimed) → returns empty suggestions.
3. **Regression:** WO with no matches → suggestions work as before.
