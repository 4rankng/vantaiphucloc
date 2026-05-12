# Task 0103: Integration Test — Stale MATCHED WO Scenarios

## Scope
Add integration tests to cover the "WO shows MATCHED but has 0 linked trip orders" scenario and the auto-heal mechanism in `work_orders.py:_load_many()`.

## Why
The auto-heal logic was added ad-hoc without test coverage. The user is still seeing stale MATCHED states, which suggests the auto-heal either has a gap or a race condition. Integration tests will:
1. Verify the auto-heal works correctly when WO is MATCHED with 0 active links
2. Catch regressions if the heal logic is accidentally removed
3. Document the expected behavior as executable specs

## Technical Implementation

### File to Create/Modify
- `tests/integration/test_stale_matched_heal.py` (new file)

### Test Cases

#### TC1: Auto-heal resets MATCHED WO with 0 active links to PENDING
```
Setup:
  - Create a WO (status=PENDING)
  - Create a TO
  - Match them (WO → MATCHED)
  - Directly delete the Reconciliation link row (simulating data corruption / manual DB edit)
  - Or: call unmatch but have it fail silently on one side

Action:
  - GET /work-orders (list endpoint)

Assert:
  - The WO is returned with status=PENDING (not MATCHED)
  - matchedTripCount is 0
```

#### TC2: Auto-heal does NOT affect legitimately MATCHED WO
```
Setup:
  - Create a WO (status=PENDING)
  - Create a TO with container
  - Match them (WO → MATCHED, reconciliation link active)

Action:
  - GET /work-orders

Assert:
  - WO status remains MATCHED
  - matchedTripCount is 1
```

#### TC3: Auto-heal works on individual GET endpoint
```
Setup:
  - Create stale MATCHED WO (same as TC1)

Action:
  - GET /work-orders/{id}

Assert:
  - Returns status=PENDING
  - Subsequent list also shows PENDING
```

#### TC4: Frontend-facing — matchedTripCount is accurate after heal
```
Setup:
  - Create 3 WOs: 1 stale MATCHED (no links), 1 legit MATCHED (1 link), 1 PENDING
  
Action:
  - GET /work-orders

Assert:
  - WO1 (stale): status=PENDING, matchedTripCount=0
  - WO2 (legit): status=MATCHED, matchedTripCount=1
  - WO3: status=PENDING, matchedTripCount=0
```

#### TC5: Unmatch last TO resets WO via normal flow (not auto-heal)
```
Setup:
  - Create matched WO+TO pair
  - Unmatch them

Action:
  - GET /work-orders/{id}

Assert:
  - WO status=PENDING
  - No reconciliation links for this WO
```

### Test Fixtures Needed
- Reuse existing fixtures from `test_multi_match_reconciliation.py` and `test_work_orders.py`:
  - `api_client`, `accountant_headers`
  - `create_work_order`, `create_partner`, `create_location`, `create_driver`
- Add helper to create and match a TO to a WO
- Add helper to directly manipulate Reconciliation rows (set `is_active=False` or delete)

### Implementation Notes
- Use existing `conftest.py` fixtures
- Follow naming convention: `test_stale_matched_<scenario>`
- Use `@pytest.mark.asyncio` if async test client is needed
- Keep tests independent (no shared mutable state between tests)
- After auto-heal, the DB commit happens inside `_load_many` — verify this doesn't interfere with test transaction isolation

### Acceptance Criteria
- **AC1:** All 5 test cases pass
- **AC2:** Tests can run independently (`pytest tests/integration/test_stale_matched_heal.py` passes standalone)
- **AC3:** Tests are deterministic — no flaky failures from race conditions
- **AC4:** Full test suite still passes (169+ tests, 0 failures)
