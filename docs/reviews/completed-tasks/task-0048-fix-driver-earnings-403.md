# Task 0048 — Fix Driver Earnings 403 on GET /driver/earnings

**Type:** Bug
**Severity:** 🔴 High
**Source:** BizFlow QA v6 BF-03

## Problem

`GET /api/v1/driver/earnings?start_date=...&end_date=...` returns `403 Forbidden`
when called by the `taixe` session (role="driver"). This causes salary summary to be
broken for drivers.

## Investigation Steps

1. Check `backend/app/policy.polar` — the policy has:
   ```polar
   allow(user, "read_own_salary", "Salary") if role_allow(user, "driver");
   ```
   This looks correct. Verify the Polar OSO engine is evaluating this rule correctly.

2. Check `backend/app/contexts/payroll/interface/routers/salary.py` line 53:
   ```python
   current_user: User = Depends(require_permission("read_own_salary", "Salary")),
   ```
   Verify the User model passed to Polar has `role = "driver"` (not a different string).

3. Check `backend/app/core/oso.py` — verify the `User` class is registered correctly
   with Polar so that `user.role` is accessible.

4. Check the frontend call in `frontend/src/hooks/use-queries.ts` around line 200 —
   verify the endpoint path and parameters are correct.

5. Try adding a debug log: print `user.role` in the `require_permission` dependency
   to see what role value is being evaluated.

## Likely Fix

If the User model's role field uses a different string (e.g., "taixe" instead of "driver"),
update the `policy.polar` to match OR normalize the role string in the User model.

Alternatively, if the OSO Polar engine isn't loading the policy file, ensure `get_oso()`
returns a correctly initialized Oso instance that has loaded `policy.polar`.

## Acceptance Criteria

- `GET /api/v1/driver/earnings` returns 200 for a driver role user
- Driver home shows correct salary amount
