# task-0095: Update salary calculation for multi-matched WorkOrders

| Field       | Value                                    |
|-------------|------------------------------------------|
| **Priority**| P1 — Ensures correct driver pay          |
| **Area**    | Backend > Payroll                        |
| **Source**  | REQ-001 (Ghép chuyến 1:N), Open Q #1    |
| **Depends** | task-0092                                |

## Scope & Why

**Product decision (from REQ-001 Open Questions):** When a WorkOrder matches multiple TripOrders, the driver earns the **sum** of `driver_salary` from all matched TripOrders. Each TripOrder has independent pricing.

Currently, `apply_pricing_snapshot()` on the WorkOrder overwrites salary values each time a new TO is matched. For multi-match, it should **accumulate** instead.

## Technical Implementation

### File: `backend/app/contexts/operations/domain/entities.py` (or wherever `WorkOrder.apply_pricing_snapshot` lives)

**Current behavior (likely):**
```python
def apply_pricing_snapshot(self, unit_price, driver_salary, allowance, pricing_id):
    self.unit_price = unit_price       # overwrites
    self.driver_salary = driver_salary # overwrites
    self.allowance = allowance         # overwrites
```

**New behavior:**
```python
def apply_pricing_snapshot(self, unit_price, driver_salary, allowance, pricing_id):
    # Accumulate for multi-match: add this TO's values to existing
    self.unit_price = (self.unit_price or 0) + (unit_price or 0)
    self.driver_salary = (self.driver_salary or 0) + (driver_salary or 0)
    self.allowance = (self.allowance or 0) + (allowance or 0)
    # Keep latest pricing_id for reference
    self.pricing_id = pricing_id
```

### File: `backend/app/contexts/operations/application/reconciliation.py`

In `UnmatchTripFromWorkOrder.__call__()`, when unmatching one of many:
- **Subtract** the unlinked TO's salary values from the WO:
```python
# When remaining > 1 (not the last link):
wo.driver_salary = max(0, (wo.driver_salary or 0) - (to.driver_salary or 0))
wo.allowance = max(0, (wo.allowance or 0) - (to.allowance or 0))
wo.unit_price = max(0, (wo.unit_price or 0) - (to.unit_price or 0))
```

- When remaining <= 1 (last link): reset all to 0 (existing behavior is correct — already sets `wo.driver_salary = 0`).

### File: `backend/app/contexts/payroll/` (salary calculation)

Verify the payroll use case reads `wo.driver_salary` (which is now the accumulated sum). No change needed if it already reads from WO — the accumulated value is the total.

## Testing Criteria

1. **Unit test:** WO matched with TO-101 (salary 500k) → WO.driver_salary = 500k. Then match TO-102 (salary 500k) → WO.driver_salary = 1,000k.
2. **Unit test:** WO matched with TO-101 (500k) + TO-102 (500k). Unmatch TO-101 → WO.driver_salary = 500k. Unmatch TO-102 → WO.driver_salary = 0.
3. **Integration test:** Verify salary display in the frontend/accountant view shows accumulated total.
