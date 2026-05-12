# BUG-0114: Users endpoint returns 403 for ketoan role (TASK-006)

## Severity: Major
## Area: backend
## Files: `backend/app/core/oso/` (RBAC policy), user list endpoint

### Problem
`GET /api/v1/users` returns 403 Forbidden for ketoan role. The frontend shows empty state with misleading "Chưa có tài khoản" copy, suggesting no users exist when really the API rejects the request.

Confirmed broken across v1→v5 audits. RBAC policy in `policy.polar` does not grant ketoan permission to list users, but the Settings → Người dùng page is accessible to ketoan.

### Solution
1. Decide: should ketoan see users? If yes → add ketoan read permission for user list in `policy.polar`
2. If no → hide Người dùng nav item for ketoan in frontend
3. Either way, frontend should distinguish 403 (no permission) from empty array (no data)

### Acceptance Criteria
- [ ] Ketoan can view user list (or the nav item is hidden)
- [ ] If 403 → frontend shows "Không có quyền" not "Chưa có tài khoản"
- [ ] RBAC policy explicitly handles ketoan + users endpoint
