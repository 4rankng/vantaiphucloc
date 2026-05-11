# UX-OPEN-11 — Director Nav Shows "Quản Lý Tài Khoản" and "Thông Báo" — Must Be Removed

**Severity:** 🟡 Major  
**Type:** Bug / Role Scope Violation  
**Layer:** Frontend  
**Affected Role/Flow:** giamdoc — NavStrip / top navigation  
**Status:** 🆕 New (reported 2026-05-11, product owner instruction)

---

## Issue

The Director (giam doc) NavStrip currently shows 3 tabs:

```
[ Tổng quan ]   [ Quản lý tài khoản ]   [ Thông báo ]
```

**The Director role is dashboard-only.** "Quản lý tài khoản" and the "Thông báo" **NavStrip tab** must be removed from the Director's horizontal navigation.

> **Note:** The global bell icon in the topbar is fine and stays for all roles (taixe, admin, giamdoc). Only the dedicated "Thông báo" page tab in the NavStrip is out of scope for giam doc.

Screenshot evidence: product owner screenshot showing the 3-tab nav for giamdoc (2026-05-11).

---

## Required Behavior

Director NavStrip should show **only**:

```
[ Tổng quan ]
```

No other tabs. No sidebar. No management links anywhere on the page.

---

## Access Restriction (Backend)

In addition to hiding the UI links, verify that the Director role is also blocked at the API level from accessing user management endpoints. Hiding links in the frontend is not sufficient — the backend must enforce role permissions.

> The topbar bell icon and the underlying notifications API can remain accessible to all roles. It is only the dedicated "Thông báo" NavStrip tab (page-level navigation) that must be removed for giam doc.

---

## Recommendation

1. In the Director NavStrip component, remove the `Quản lý tài khoản` and `Thông báo` tab entries — keep only `Tổng quan`
2. If these tabs are rendered from a shared config/array, filter by role — only include those tabs for roles that have permission
3. Ensure the backend `GET /api/v1/users` returns 403 for the director role (user management API)
4. Add a QA check: log in as giamdoc, verify only "Tổng quan" tab is visible and no management pages are reachable by direct URL

---

## Files Likely to Change

- `frontend/src/pages/director/` — NavStrip or layout component
- `frontend/src/components/layout/DirectorLayout.tsx` (or similar)
- `backend/app/identity/` — role permission definitions
