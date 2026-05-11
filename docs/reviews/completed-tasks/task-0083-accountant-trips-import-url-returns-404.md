# Task-0083: /accountant/trips/import URL Returns 404

**Type:** Interaction Bug
**Severity:** 🟢 Minor
**Role/Flow:** ketoan - Đơn hàng / Import
**Location:** https://phucloc.tingting.vip/accountant/trips/import
**Viewport:** all

## Observation
Navigating directly to `/accountant/trips/import` (e.g., via browser address bar, direct link, or bookmarked URL) renders a 404 error page:

```
404
Không tìm thấy trang này
```

The actual import functionality is accessed via a dialog triggered by the "Nhập đơn" button on the trips or work-orders pages — it does not have its own route. The route `/accountant/trips/import` is not registered in the React Router configuration.

## Impact
If a user bookmarks, shares, or navigates to this URL, they receive a confusing 404 rather than being redirected to the correct page. Additionally, any deep-link or developer API reference pointing to `/accountant/trips/import` will break. The sidebar navigation does not expose this URL, so the practical impact is low, but it is a rough edge.

## Recommendation
Either:
1. Register the route `/accountant/trips/import` and redirect it to `/accountant/trips` (with the import dialog auto-opened via query param, e.g., `?import=true`), or
2. Remove any internal references to this path to ensure it is never linked.

Option 1 is better UX as it enables bookmarkable and shareable links to the import flow.

## Resolution
Already fixed in current code. router.ts (line 91) registers `{ path: 'trips/import', element: h(Navigate, { to: '/accountant/trips?import=true', replace: true }) }` which redirects to the trips page with the import dialog auto-opened via query param.
