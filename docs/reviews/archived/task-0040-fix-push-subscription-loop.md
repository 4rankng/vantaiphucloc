# Task 0040 — Fix Push Subscription Re-Registration Loop

**Type:** Bug (Regression)
**Severity:** 🟡 Major
**Reporter:** BizFlow QA v6 (2026-05-11) — finding NX11 regression / UX-05

## Problem

`POST /api/v1/push/subscriptions → 201` fires 4–5 times per browser session. This was confirmed fixed in v5 (0 POSTs in 689 requests) but has regressed. Each re-registration creates a duplicate subscription record on the backend.

**Network evidence (one session):**
```
POST /api/v1/push/subscriptions 201
POST /api/v1/push/subscriptions 201
POST /api/v1/push/subscriptions 201
POST /api/v1/push/subscriptions 201
```

The pattern correlates with page navigation — each route change triggers a new subscription registration.

## Root Cause

The push subscription hook is being called inside a component that remounts on every route change. Likely a `useEffect(() => { registerPush() }, [])` inside a component that is not at the top app level, or inside a component rendered by each page layout.

## Affected Files

- `frontend/src/hooks/usePushNotifications.ts` (or similar) — the subscription registration logic
- The component that invokes this hook (likely inside a per-page layout or per-page component rather than the root `App.tsx`)

## Acceptance Criteria

1. `POST /api/v1/push/subscriptions` fires exactly **once** per browser session, not once per page navigation
2. If the user is already subscribed (same browser endpoint), the POST is skipped entirely using `sessionStorage` or a check against the existing subscription
3. Verified: navigate through all 4+ pages in the ketoan role — 0 additional subscription POSTs after the initial one

## Implementation Notes

```ts
// Guard pattern to prevent re-registration:
async function registerPushOnce() {
  if (sessionStorage.getItem('push_registered')) return;
  
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    sessionStorage.setItem('push_registered', '1');
    return;
  }
  
  // ... subscribe and POST to backend ...
  sessionStorage.setItem('push_registered', '1');
}
```

- Move the hook invocation to `App.tsx` or the root authenticated layout component
- Use `useEffect(() => { registerPushOnce() }, [])` with empty deps at the app root level
- Do not invoke the hook in per-page components
