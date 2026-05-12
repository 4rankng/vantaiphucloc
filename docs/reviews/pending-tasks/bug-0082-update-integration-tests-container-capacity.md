# bug-0082 — Update integration tests: container capacity constraints + state simplification

**Type:** Test Coverage Gap  
**Layer:** Backend (tests)  
**Severity:** 🟡 Major — without tests, capacity regressions will go undetected  
**Affected Flow:** `tests/integration/test_reconcile.py`, `test_multi_match_reconciliation.py`, `test_workflows.py`

---

## Description

The integration test suite must be updated to cover:

1. **Container capacity constraint** (from bug-0078)
2. **State simplification** — COMPLETED → MATCHED (from bug-0081)

---

## Required Test Cases

### A. Positive Tests (should pass)

```python
def test_match_2_orders_to_2_container_trip():
    """
    Positive: A WO with 2 containers can be matched to exactly 2 TOs.
    Expected: 200 OK, both TOs status → MATCHED, WO status → MATCHED.
    """

def test_match_1_order_to_1_container_trip():
    """
    Positive: A WO with 1 container can be matched to exactly 1 TO.
    Expected: 200 OK, TO status → MATCHED, WO status → MATCHED.
    """
```

### B. Negative Tests (should be rejected)

```python
def test_over_capacity_match_2_orders_to_1_container_trip():
    """
    Negative: A WO with 1 container cannot be matched to 2 TOs.
    Expected: 422 Unprocessable Entity.
    Body: { "detail": "Số đơn hàng (2) vượt quá số container của chuyến (tối đa: 1)" }
    """

def test_over_capacity_match_3_orders_to_2_container_trip():
    """
    Negative: A WO with 2 containers cannot be matched to 3 TOs.
    Expected: 422 Unprocessable Entity.
    """
```

### C. State Transition Tests

```python
def test_status_transitions_pending_to_matched_on_match():
    """
    After match: WO.status == 'MATCHED', TO.status == 'MATCHED'.
    Neither should be 'COMPLETED'.
    """

def test_status_reverts_to_pending_on_unmatch():
    """
    After unmatch: WO.status == 'PENDING', TO.status == 'PENDING'.
    """

def test_matched_wo_not_in_pending_pool():
    """
    After matching a WO, it must not appear in the unmatched list.
    GET /work-orders?status=PENDING → WO not present.
    """

def test_matched_to_not_in_pending_pool():
    """
    After matching a TO, it must not appear in the pending/unmatched list.
    """
```

### D. Route Integrity Tests (future)

```python
def test_match_fails_if_route_mismatch():
    """
    WO pickup=CatLai, dropoff=BinhDuong.
    TO pickup=TanCang, dropoff=BinhDuong.
    Expected: matching is blocked or scored 0/6 route fields.
    Note: Route mismatch is currently a scoring factor (not a hard block).
    If a hard block is desired, implement and test here.
    """
```

---

## Files to Update

- `tests/integration/test_reconcile.py` — add capacity tests, fix `COMPLETED` → `MATCHED` assertions
- `tests/integration/test_multi_match_reconciliation.py` — fix status assertions AC-1 through AC-7
- `tests/integration/test_workflows.py` — fix status assertions in full E2E workflow tests

---

## Run Command

```bash
cd backend
pytest tests/integration/test_reconcile.py tests/integration/test_multi_match_reconciliation.py tests/integration/test_workflows.py -v
```
