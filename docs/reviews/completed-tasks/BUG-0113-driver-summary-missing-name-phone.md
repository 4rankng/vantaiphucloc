# BUG-0113: DriverSummary schema missing fullName and phone (TASK-004)

## Severity: Major
## Area: backend
## Files: Salary endpoint schema, `backend/app/contexts/operations/interface/routers/` salary routes

### Problem
The `DriverSummary` API schema returns raw `username` (e.g., "taixe", "taixe1") instead of `fullName` and `phone`. The Kỳ lương page displays these raw usernames to ketoan, making it impossible to identify which driver is which.

Confirmed broken across 5 audit rounds (v1→v5). Documented as backend-blocked.

### Solution
1. Extend `DriverSummary` response schema to include `fullName` (from `users.full_name`) and `phone` (from `users.phone`)
2. Update the SQL query / ORM join to pull these fields
3. Frontend: display `fullName` as primary label, `phone` as secondary
4. Keep `username` in response for reference but don't display as primary

### Acceptance Criteria
- [ ] `DriverSummary` API returns `fullName` and `phone` fields
- [ ] Kỳ lương page shows driver's full name, not raw username
- [ ] Works for ketoan and director roles
