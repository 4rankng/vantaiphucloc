# MULTI-MATCH-02 — Broken Navigation: `/accountant/match/:id` Hits 404

**Severity:** 🔴 Critical
**Type:** Routing Bug
**Layer:** Frontend
**Affected Role/Flow:** ketoan — `AccountantDashboard` → click unmatched WO row
**Status:** ❌ Open — Multi-select multi-match page is unreachable from main nav.

---

## Issue

The legacy MatchTrip page (`pages/accountant/MatchTrip.tsx`) is the **only** UI in the app that exposes a checkbox-style multi-select to match N TripOrders to 1 WorkOrder for partial-score suggestions. But the navigation link to it is **broken**.

`frontend/src/pages/accountant/AccountantDashboard.tsx`:
- Lines 298, 420: `navigate(`/accountant/match/${wo.id}`)`

`frontend/src/router.ts`:
- Line 90: `{ path: 'match-trip/:tripId', element: ... MatchTrip ... }`

The route is registered as `match-trip/:tripId` but the dashboard navigates to `match/:id` — different paths. Clicking an unmatched WO row in the Tổng Quan tab routes to the catch-all `*` → 404 NotFound.

---

## Impact

Combined with `MULTI-MATCH-01` (MatchDetailPanel hides suggestions for MATCHED WOs), this means:

**Today's UI does not provide ANY working path for an accountant to match 2+ partial-score (e.g. 2/6, 3/6) TOs to 1 WO.**

The only multi-match paths that DO work in production today are:
1. **Perfect match bulk button** — only fires when 2+ suggestions are ALL 6/6. Rare in practice.
2. **Auto-match for full-score TOs** — `POST /reconcile/auto-match` iterates all `full_matches`. Same constraint.

Partial-score multi-match (the realistic case in the screenshot) has no UI entry point.

---

## Recommendation

Pick ONE of:

**Option A — Fix the route mismatch (minimal change).**
- Update `AccountantDashboard.tsx` lines 298, 420 to use `/accountant/match-trip/${wo.id}` instead of `/accountant/match/${wo.id}`.
- Verify the legacy `MatchTrip` page still works (it was refactored for 1:N — see `use-match-trip.ts:30 selectedTripIds[]`).
- Add an entry point from `WorkOrderMasterList` too (button "Ghép nhiều đơn cùng lúc" → navigate to `/accountant/match-trip/${wo.id}`).

**Option B — Inline the multi-select into MatchDetailPanel (better UX, more work).**
- See `task-MULTI-MATCH-03-checkbox-multiselect-in-panel.md`.
- Deprecate the standalone `/match-trip/:tripId` page.

Recommend B (better mental model — user stays on the master list). But A unblocks user immediately while B is being built.

---

## Acceptance Criteria

- [ ] Clicking an unmatched WO row in AccountantDashboard navigates to a working page (not 404).
- [ ] On that page, user can checkbox-select 2+ partial-score TOs and click one button to match all to a single WO.
- [ ] After match, navigation returns to dashboard/master list and the WO shows the badge `N ĐH`.

---

## Related

- See also `MULTI-MATCH-01` (suggestions hidden for MATCHED WO).
- Backend route is fine; only FE navigation is broken.
