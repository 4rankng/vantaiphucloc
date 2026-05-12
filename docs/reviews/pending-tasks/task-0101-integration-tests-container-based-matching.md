# Task 0101 — Integration Tests: Container-Based Matching Validation

## Scope — What & Why

**Problem:** The existing integration tests in `test_multi_match_reconciliation.py` were written for the inverted (wrong) model: 1 WO → N TOs. All tests must be rewritten to validate the correct TO-centric model: 1 TO → N WOs, limited by container count.

Additionally, `test_reconcile.py` has tests that may assert `COMPLETED` status for TripOrders — these must be updated to assert `MATCHED`.

## Technical Implementation

### File: `tests/integration/test_multi_match_reconciliation.py`

**Rewrite all tests to be TO-centric:**

1. **test_ac1_to_with_1_container_matches_1_wo:**
   - Create TO with 1 container, WO with matching container
   - Match succeeds
   - TO status = MATCHED, WO status = MATCHED
   - Attempt to match a 2nd WO → 409 conflict (capacity exceeded)

2. **test_ac2_to_with_2_containers_matches_2_wos:**
   - Create TO with 2 containers (twin lift E20)
   - Create 2 WOs each matching a container
   - Match both → both succeed
   - Attempt to match a 3rd WO → 409 conflict

3. **test_ac3_unmatch_one_of_two_reopens_capacity:**
   - TO with 2 containers, matched with 2 WOs
   - Unmatch 1st WO → TO stays MATCHED, capacity = 1
   - Match a new WO → succeeds
   - TO still MATCHED

4. **test_ac4_unmatch_last_wo_resets_to_pending:**
   - TO with 1 container, matched with 1 WO
   - Unmatch → TO status = PENDING, WO status = PENDING
   - TO can be matched again

5. **test_ac5_already_matched_wo_rejected:**
   - WO already matched to TO-A
   - Attempt to match same WO to TO-B → 409 conflict

6. **test_ac6_status_is_matched_not_completed:**
   - After match, explicitly assert TO.status == "MATCHED" (not "COMPLETED")
   - After match, assert WO.status == "MATCHED"

7. **test_ac7_pricing_accumulation_multi_wo:**
   - TO with 2 containers, match 2 WOs
   - Verify pricing on TO accumulates correctly
   - Unmatch 1 WO → pricing decremented correctly

8. **test_batch_for_to_validates_capacity:**
   - Batch match 3 WOs to a TO with 2 containers
   - 2 succeed, 1 fails with capacity error

### File: `tests/integration/test_reconcile.py`

**Update existing tests:**

1. `test_reconcile_match`: Assert TO status = "MATCHED" (not "COMPLETED")
2. `test_reconcile_match_idempotent`: Ensure re-matching the same WO fails
3. `test_unmatch`: Verify both TO and WO return to PENDING
4. `test_auto_match`: Update to TO-centric flow if needed
5. `test_bulk_match`: Update assertions

### File: `tests/integration/test_workflows.py`

Check if any tests assert TripOrder COMPLETED status from matching and update.

## Files to Modify

1. `tests/integration/test_multi_match_reconciliation.py` — full rewrite
2. `tests/integration/test_reconcile.py` — update status assertions
3. `tests/integration/test_workflows.py` — check and fix if needed

## Testing Criteria

These ARE the tests. Success = all new tests pass with the corrected backend logic from task-0099.

- All tests must be runnable with `pytest tests/integration/test_multi_match_reconciliation.py -v`
- All tests must be runnable with `pytest tests/integration/test_reconcile.py -v`
- Zero test failures after backend changes from task-0099 are applied
