# MULTI-MATCH-00 — Summary: How a User Can Multi-Match Today (Reality Check)

**Severity:** 🔴 Critical (documentation / decision)
**Type:** Gap analysis
**Layer:** —
**Affected Role/Flow:** ketoan — multi-match feature on `/accountant/work-orders`
**Status:** ❌ Open — feature is NOT usable end-to-end in production today.

---

## Question

> "How can a user match multiple đơn hàng (TripOrders) to one chuyến (WorkOrder) on the current production page?"

## Honest Answer

**On `https://phucloc.tingting.vip/accountant/work-orders`, a user CAN multi-match in exactly one scenario, and CANNOT in the realistic case shown in screenshot.**

### Path A — Works only when all suggestions are 6/6 perfect match

1. Select a PENDING WO in the master list.
2. The right panel (`MatchDetailPanel`) fetches suggestions.
3. If ≥ 2 suggestions are score `6/6`, a green banner appears:
   *"Có {N} cặp 100% match — Ghép tất cả ngay"*
4. Click the banner → calls `POST /api/v1/reconcile/bulk-match` with all perfect pairs.
5. Done.

**Limitation:** This banner does not appear when suggestions are partial (2/6, 3/6, 5/6 — the realistic case for cross-system reconciliation). The screenshot (`W001022` ↔ `T002002`, `T002017`, both 2/6) cannot use this path.

### Path B — Auto-match button (header "Tự động ghép")

Calls `POST /api/v1/reconcile/auto-match` which scans all PENDING WOs and **auto-confirms every TO with score ≥ 1.0**. Per `interface/routers/reconcile.py:413-441`, it does iterate ALL `full_matches` for each WO (not just top 1) — so this IS multi-match capable, but again only for 6/6 scores.

### Path C — Legacy `MatchTrip` page at `/accountant/match-trip/:tripId`

This page has the proper checkbox multi-select via `use-match-trip.ts` (`selectedTripIds: number[]`, `toggleTripSelection`, `handleMatch → batchReconcile`). It IS the right UI for partial-score multi-match.

**However** — `AccountantDashboard.tsx:298,420` navigates to `/accountant/match/${wo.id}` (without `-trip`), which does NOT match the registered route `match-trip/:tripId` in `router.ts:90`. The route hits the `*` catch-all → 404 NotFound. See `MULTI-MATCH-02`.

So Path C is dead code from the user's perspective. They cannot reach it.

### Path D — Manual "Ghép" click, repeat

User could click "Ghép" on the first suggestion. WO becomes MATCHED. Then they'd want to add a second TO… but `MatchDetailPanel.tsx:22` disables the suggestions query when `isMatched`, so the panel switches to a list of already-linked TOs only — no way to add more. See `MULTI-MATCH-01`.

---

## Net Conclusion

For the realistic case (partial-score suggestions, e.g. 2/6 in the screenshot):
- **There is no working UI path for multi-match on production today.**
- Backend supports it fully (`POST /reconcile/batch-for-wo`, accumulating `apply_pricing_snapshot`, partial unmatch with salary subtraction).
- The 3 FE blockers are documented in:
  - `task-MULTI-MATCH-01-allow-adding-tos-to-matched-wo.md` — panel hides suggestions for MATCHED WO
  - `task-MULTI-MATCH-02-broken-match-trip-route.md` — broken `/match/:id` navigation (route mismatch)
  - `task-MULTI-MATCH-03-checkbox-multiselect-in-panel.md` — no inline checkbox multi-select
- Plus the deployment gap:
  - `task-MULTI-MATCH-04-deploy-pending-commits.md` — 10 commits ahead origin, not deployed

---

## Priority Order

1. **MULTI-MATCH-04** (deploy) — push & deploy what's already coded so we're not chasing two versions of bugs.
2. **MULTI-MATCH-02** (route fix) — 1-line change unblocks Path C immediately for partial-score multi-match.
3. **MULTI-MATCH-01** (suggestions for MATCHED WO) — fixes the "add more after first match" gap on the main panel.
4. **MULTI-MATCH-03** (checkbox in panel) — better UX, larger refactor; do after 1 & 2 prove the backend works.

Estimated total: ~1 dev-day of FE + 30 min deploy.

---

## Recommendation — Quickest Path to Unblock User

If user needs multi-match working **today**:

1. Apply the 1-line fix in `AccountantDashboard.tsx` (`match/` → `match-trip/`).
2. Deploy.
3. Test on prod: click an unmatched WO in dashboard → arrives at `/accountant/match-trip/:id` → checkbox-select N TOs → "Ghép" button submits all.

This requires no new code beyond the route correction.

---

## Open Questions for User

- [ ] Q1: Are you OK leaving the legacy `/match-trip/:tripId` page as the multi-match entry point (Option A in `MULTI-MATCH-02`), or do you want the multi-select inlined into the main `/accountant/work-orders` panel (Option B)?
- [ ] Q2: For partial-score multi-match (e.g. 2/6) — should the UI force a confirmation step (typed reason, low-conf checkbox) like the legacy page does?
- [ ] Q3: After deployment of pending commits, is there any data on prod where one TO is linked to multiple WOs (which the backend currently still blocks)? If yes, we have a separate cleanup task.
