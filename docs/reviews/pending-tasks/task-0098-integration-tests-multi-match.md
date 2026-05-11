# task-0098: Integration tests for multi-match reconciliation flows

| Field       | Value                                    |
|-------------|------------------------------------------|
| **Priority**| P0 — Must validate before release        |
| **Area**    | Testing > Integration                    |
| **Source**  | REQ-001 (Ghép chuyến 1:N)               |
| **Depends** | task-0090, task-0091, task-0092, task-0095 |

## Scope & Why

Multi-match reconciliation is a critical business feature (P0 requirement). Comprehensive integration tests must cover all acceptance criteria from REQ-001 before this goes live. Tests validate the full stack: API endpoint → use case → DB → response.

## Technical Implementation

### Directory: `tests/integration/`

Create test file: `test_multi_match_reconciliation.py`

### Test fixtures needed:

```python
# Shared fixtures for creating test data
async def create_test_partner(db) -> int: ...
async def create_test_trip_order(db, partner_id, container_number, work_type, ...) -> int: ...
async def create_test_work_order(db, partner_id, container_numbers, driver_id, ...) -> int: ...
```

### Test cases (maps to REQ-001 Acceptance Criteria):

**AC-1: Multi-Match Happy Path**
```python
async def test_multi_match_happy_path(client, db):
    """WO with 2 containers matched to 2 TripOrders in one batch call."""
    wo_id = await create_test_work_order(db, containers=["TGHU1234567", "MSKU9876543"])
    to_1 = await create_test_trip_order(db, container="TGHU1234567")
    to_2 = await create_test_trip_order(db, container="MSKU9876543")
    
    resp = await client.post("/reconcile/batch-for-wo", json={
        "work_order_id": wo_id, "trip_order_ids": [to_1, to_2]
    })
    assert resp.status_code == 200
    assert all(r.success for r in resp.json()["results"])
    # Verify statuses: WO=MATCHED, both TOs=MATCHED
```

**AC-2: Partial Match**
```python
async def test_partial_match(client, db):
    """WO with 2 containers, only 1 matching TO — match succeeds."""
    wo_id = await create_test_work_order(db, containers=["TGHU1234567", "MSKU9876543"])
    to_1 = await create_test_trip_order(db, container="TGHU1234567")
    
    resp = await client.post("/reconcile/batch-for-wo", json={
        "work_order_id": wo_id, "trip_order_ids": [to_1]
    })
    assert resp.status_code == 200
    # WO=MATCHED, TO=MATCHED, other container unmatched
```

**AC-3: Unmatch One of Many**
```python
async def test_unmatch_one_of_many(client, db):
    """Unmatching one TO from multi-matched WO — WO stays MATCHED."""
    # Setup: WO matched with TO-1 + TO-2
    resp = await client.post("/reconcile/unmatch", json={
        "work_order_id": wo_id, "trip_order_id": to_1
    })
    assert resp.status_code == 200
    # TO-1=PENDING, WO=MATCHED (still has TO-2), TO-2=MATCHED
```

**AC-4: Unmatch Last One**
```python
async def test_unmatch_last_one(client, db):
    """Unmatching the only TO — WO goes to PENDING."""
    # Verify both WO and TO become PENDING
```

**AC-5: Block Duplicate Match**
```python
async def test_block_duplicate_match(client, db):
    """TO already matched with WO-1 cannot match with WO-2."""
    resp = await client.post("/reconcile/batch-for-wo", json={
        "work_order_id": wo_2, "trip_order_ids": [to_1]  # already matched
    })
    # Verify error response for that pair
```

**AC-6: Auto-Match Multi-Container**
```python
async def test_auto_match_multi_container(client, db):
    """Auto-match links WO to all matching TOs, not just the best one."""
    resp = await client.post("/reconcile/auto-match", json={...})
    # Verify WO matched with both TOs
```

**AC-7: Salary Calculation**
```python
async def test_salary_accumulation(client, db):
    """Driver salary = sum of all matched TO salaries."""
    # Match TO-1 (500k) + TO-2 (500k) to WO
    # Verify WO.driver_salary == 1_000_000
    # Unmatch TO-1 → verify WO.driver_salary == 500_000
```

## Testing Criteria

All 7 test cases pass. No regressions in existing 1:1 reconciliation tests.
