# Task 0039 — Restore Director Sidebar Navigation

**Type:** Bug (Regression)
**Severity:** 🟡 Major
**Reporter:** UX Audit v6 (2026-05-11) — finding UX-04

## Problem

The director role (`giamdoc`) has no sidebar navigation in this build. In v5, a sidebar with 3 items (Tổng quan, Thông báo, Quản lý tài khoản) was present. The director is now trapped on the dashboard with no in-app navigation to other pages.

**Verified:** `giamdoc` login → `/director` — only header buttons (Thông báo, Tài khoản icon) present, no sidebar.

## Root Cause

The `DIRECTOR_MENU` configuration in `AppSidebar.tsx` was either removed or the sidebar rendering condition was changed to exclude the director role.

## Affected Files

- `frontend/src/components/shared/AppSidebar.tsx` (lines ~212-216 per v5 audit)
- `frontend/src/config/navConfig.ts` (or equivalent) — director menu items

## Acceptance Criteria

1. Logged in as `giamdoc`, a persistent sidebar is visible
2. Sidebar contains at minimum: Tổng quan (`/director`), Thông báo (`/director/notifications`), Quản lý tài khoản (`/director/users` or equivalent)
3. The active route is highlighted in the sidebar
4. Sidebar is consistent with the design used for the ketoan sidebar (same visual style)

## Implementation Notes

The director menu from v5 code (reference):
```ts
const DIRECTOR_MENU = [
  { label: 'Tổng quan', href: '/director', icon: LayoutDashboard },
  { label: 'Thông báo', href: '/director/notifications', icon: Bell },
  { label: 'Quản lý tài khoản', href: '/director/users', icon: Users },
];
```

- Restore this config and ensure the sidebar renders it for role="director"
- The sidebar should NOT render for the driver role (mobile-app style — this is correct)
- Estimated effort: 15 minutes once root cause is located
