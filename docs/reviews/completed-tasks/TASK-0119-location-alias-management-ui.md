# TASK-0119: Build location alias management UI (UX-OPEN-04)

## Severity: Critical
## Area: fullstack
## Files: New page `LocationAliasManager.tsx`, backend location_alias endpoints

### Problem
The backend has a `location_aliases` table with PENDING/CONFIRMED statuses. The match suggester uses aliases for location comparison. But there is NO UI anywhere to review PENDING aliases and confirm/reject them. This means alias-aware auto-matching is effectively disabled because aliases accumulate as PENDING and never get confirmed.

### Solution
1. Create "Địa điểm & Bí danh" page under Settings (accessible to ketoan + admin)
2. List all PENDING aliases with match count
3. Allow confirm/reject actions
4. Show confirmed aliases grouped by canonical location
5. Backend endpoints already exist — just need frontend

### Acceptance Criteria
- [ ] New page under Settings → "Địa điểm & Bí danh"
- [ ] Can view PENDING aliases
- [ ] Can confirm/reject aliases
- [ ] Confirmed aliases immediately improve match suggestions
- [ ] Ketoan and admin roles can access
