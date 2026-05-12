# Task 0067 — Add Redirect from /contractors to /vendors

**Type:** Bug
**Severity:** Low
**Source:** QA v9 Finding 2 (2026-05-11)

## Problem

Navigating to `/accountant/settings/contractors` returns a 404 page. The actual URL is `/accountant/settings/vendors`. If any bookmark or link uses the old path, users hit a dead end.

## Affected Files

- `frontend/src/App.tsx` or router config — add redirect route

## Acceptance Criteria

1. `/accountant/settings/contractors` redirects to `/accountant/settings/vendors`
2. The redirect is a client-side redirect (React Router)

## Resolution

Added a `Navigate` route in `router.ts` that redirects `/accountant/settings/contractors` → `/accountant/settings/vendors`.

**Files changed:**
- `frontend/src/router.ts` — added `{ path: 'contractors', element: h(Navigate, { to: '/accountant/settings/vendors', replace: true }) }` in the settings children array
