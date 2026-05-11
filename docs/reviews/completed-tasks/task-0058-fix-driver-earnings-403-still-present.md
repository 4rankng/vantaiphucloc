# Task 0058: Driver earnings API still returns 403

**Type:** Bug (Regression — listed as fixed in tasks 0043 and 0048 but still present)
**Layer:** Backend
**Severity:** High
**Affected Role/Flow:** Tài xế — Dashboard (salary display)

## Description

The endpoint `GET /api/v1/driver/earnings?start_date=...&end_date=...` returns HTTP 403 "Bạn không có quyền thực hiện thao tác này" when called by a user with `role = "driver"`.

This was reported and marked as fixed twice (tasks 0043, 0048) but is still occurring on the live server as of 2026-05-11.

**Evidence:**
- Logged in as `taixe` (JWT confirms `role: "driver"`, `id: 4`)
- Network requests show two 403 responses:
  - `GET /api/v1/driver/earnings?start_date=2026-05-01&end_date=2026-05-31` → 403
  - `GET /api/v1/driver/earnings?start_date=2026-04-26&end_date=2026-05-25` → 403

**Code review shows the policy is correct:**

`backend/app/policy.polar` line 82:
```
allow(user, "read_own_salary", "Salary") if role_allow(user, "driver");
```

`backend/app/contexts/payroll/interface/routers/salary.py` line 49-53:
```python
@router.get("/driver/earnings", response_model=DriverEarningsOut)
async def get_my_earnings(
    ...
    current_user: User = Depends(require_permission("read_own_salary", "Salary")),
```

The `oso.py` policy parser and HIERARCHY dict look correct for the driver role. The 403 may be caused by a **deployment issue** — the live server may be running an old version of `oso.py` or `policy.polar` that predates the fix.

**Impact:** The driver dashboard still displays a salary total (3.270.000 ₫) which appears to be computed locally from work-orders as a fallback, but this is fragile. The proper earnings API call silently fails.

## Steps to Reproduce

1. Login as taixe / admin123
2. Open browser devtools → Network tab
3. Navigate to the driver dashboard
4. Observe two requests to `/api/v1/driver/earnings` — both return 403

## Expected

`GET /api/v1/driver/earnings` should return HTTP 200 with the driver's earnings data for the requested period.

## Actual

HTTP 403 "Bạn không có quyền thực hiện thao tác này".

## Fix Hint

1. **Check if deployment is current:** Confirm the live Docker container has the latest `policy.polar` and `oso.py`. Run `docker compose up -d --build backend` to force a rebuild.

2. **Check the singleton cache:** `_policy` is a module-level singleton. If the policy file was updated without restarting the process, the old cached policy (without the `read_own_salary` rule) may still be active. Restarting the backend process will force a reload.

3. **Verify the fix is deployed:** The fix (adding `allow(user, "read_own_salary", "Salary") if role_allow(user, "driver");` to `policy.polar`) exists in the local codebase but the live server may not have it.

Key files:
- `backend/app/policy.polar` line 82
- `backend/app/core/oso.py` — singleton policy cache
- `backend/app/contexts/payroll/interface/routers/salary.py` lines 49-68
