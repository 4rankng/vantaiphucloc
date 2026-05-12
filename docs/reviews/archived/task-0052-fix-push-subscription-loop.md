# Task 0052 — Fix Push Subscription Firing 4-5x Per Session

**Type:** Bug (Regression)
**Severity:** 🟡 Major
**Source:** BizFlow QA v6 NX11 / UIUX v6 UX-05

## Problem

`POST /api/v1/push/subscriptions → 201` fires 4-5 times per session across page navigations.
This was fixed in v5 (0 POSTs) but regressed in v6.

## Context

`frontend/src/contexts/AuthContext.tsx` already has a sessionStorage guard at lines 66-81:
```ts
// Auto-subscribe to push on login — runs at most once per browser session.
if (sessionStorage.getItem('push_registered')) return
// ...
sessionStorage.setItem('push_registered', '1')
```

The guard exists but push is still firing repeatedly. This suggests either:
1. The guard code path is not being reached (early return before it)
2. `AuthContext` is being unmounted/remounted multiple times (context re-initialization)
3. There is a second push subscription call site outside of AuthContext

## Investigation Steps

1. Search for ALL places that call `subscribeToPush`:
   ```
   grep -rn "subscribeToPush" frontend/src/
   ```

2. Check if `AuthContext` remounts on route changes — look at how it's wrapped in
   `frontend/src/App.tsx` or the router setup.

3. Check `frontend/src/components/shared/ProfileDialog/ProfileDialog.tsx` — it imports
   `subscribeToPush` and may call it on profile dialog open.

4. Verify the sessionStorage guard is not being bypassed by a race condition
   (e.g., async `await` before `setItem`).

## Fix

Ensure `subscribeToPush` is called at most once per browser session:
- The `sessionStorage.getItem('push_registered')` guard in AuthContext should fire BEFORE
  any async operation.
- If ProfileDialog also calls subscribeToPush independently, add the same guard there.
- If AuthContext remounts, consider using `localStorage` instead of `sessionStorage`
  (persists across component remounts within the same tab session).

## Acceptance Criteria

- Only 1 `POST /api/v1/push/subscriptions` per browser session
- Navigating between pages does not trigger additional push registrations
