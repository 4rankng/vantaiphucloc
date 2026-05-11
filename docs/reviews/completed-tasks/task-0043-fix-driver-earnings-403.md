# Task 0043 — Fix Driver Earnings API Returns 403 for Driver Role

**Type:** Bug
**Severity:** 🔴 High
**Reporter:** BizFlow QA v6 (2026-05-11) — finding BF-03

## Problem

`GET /api/v1/driver/earnings?start_date=...&end_date=...` returns `403 Forbidden` when called by a session authenticated as the `taixe` role. This fires twice per driver session with two different date ranges.

**Network evidence:**
```
GET /api/v1/driver/earnings?start_date=2026-04-30&end_date=2026-05-30  403
GET /api/v1/driver/earnings?start_date=2026-04-25&end_date=2026-05-24  403
```

Drivers cannot fetch their own earnings summary. Some trip cards show "— đ" income, possibly caused by this 403 preventing the earnings calculation from completing.

## Impact

- Driver cannot see their earnings history or breakdown
- The "3.270.000 ₫" lương displayed on the driver home may be sourced from a different (less complete) API call and may be inaccurate
- This is the same RBAC category of bug as the v5 NX16 finding (users page 403), now on the driver side

## Affected Files

- `backend/app/contexts/payroll/routes.py` (or `driver_routes.py`) — the RBAC role check on `GET /driver/earnings`
- The backend middleware or dependency that enforces role-based access

## Acceptance Criteria

1. `GET /api/v1/driver/earnings` returns `200` when called by a session with role="driver"
2. The response scopes to only the authenticated driver's own earnings (not all drivers)
3. The driver home page correctly shows earnings for matched trips
4. No "— đ" appears for trips that have been matched and have a valid price

## Implementation Notes

```python
# Backend fix: ensure driver role is allowed to call their own earnings
# The route likely has a role guard that only allows 'accountant' or higher
# Fix: add 'driver' to the allowed roles, AND add a scope check:
#   if role == 'driver': filter earnings to current_user.id only
#   if role in ('accountant', 'admin'): allow all drivers or filter by query param

@router.get("/driver/earnings")
async def get_driver_earnings(
    ...,
    current_user: User = Depends(get_current_user)
):
    # Allow driver to query their own earnings
    if current_user.role == 'driver':
        driver_id = current_user.driver_profile_id  # or equivalent
    elif current_user.role in ('accountant', 'superadmin'):
        driver_id = request.query_params.get('driver_id')
    else:
        raise HTTPException(403)
```

- Also fix the two different date ranges being called — the frontend likely needs to use only one date range (the current salary period)
