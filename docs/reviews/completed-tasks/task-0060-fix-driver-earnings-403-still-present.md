# Task 0060: Driver earnings API returns 403 for all requests (regression)

**Type:** Bug (Regression — previously reported as task-0043, task-0048, task-0058; still not fixed)
**Layer:** Backend
**Severity:** High
**Affected Role/Flow:** Tài xế — Dashboard (earnings summary)

## Description

The `/api/v1/driver/earnings` endpoint consistently returns HTTP 403 Forbidden for the currently logged-in driver (`taixe`). This affects both the current salary period and the previous period. The driver's dashboard cannot show their earnings breakdown.

Observed network requests during driver session:
- `GET /api/v1/driver/earnings?start_date=2026-05-01&end_date=2026-05-31` → **403**
- `GET /api/v1/driver/earnings?start_date=2026-04-26&end_date=2026-05-25` → **403**
- `GET /api/v1/driver/earnings?start_date=2026-03-26&end_date=2026-04-25` → **403**

The driver CAN access their own work orders (`/api/v1/work-orders?driver_id=4` returns 200), so authentication itself is fine. The 403 is a permissions check failure specific to the earnings endpoint.

## Steps to Reproduce

1. Login as taixe / admin123
2. Navigate to the driver dashboard
3. Check network requests in browser dev tools

## Expected

`GET /api/v1/driver/earnings` returns 200 with the driver's earnings data, allowing the dashboard to show a breakdown of income per trip.

## Actual

All requests to `/api/v1/driver/earnings` return 403. The earnings summary widget on the driver dashboard likely shows an error or empty state.

## Fix Hint

Check the backend permission guard on the earnings endpoint. The driver role (`taixe`) must be granted the `read:earnings` (or equivalent) permission for their own records. The endpoint likely requires a role that is missing from the driver's permission set.

Key files to check:
- `backend/app/contexts/payroll/` or `backend/app/contexts/operations/interface/routers/` — find the earnings route
- `backend/app/identity/` — check role-permission mapping for the `driver` role
- Ensure the earnings endpoint allows a driver to query only their own earnings (not all drivers)
