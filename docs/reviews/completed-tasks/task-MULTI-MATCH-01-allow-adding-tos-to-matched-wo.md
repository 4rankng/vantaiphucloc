# MULTI-MATCH-01 — Cannot Add Trip Orders to Already-Matched Work Order

**Severity:** 🔴 Critical
**Type:** Missing Feature (FE)
**Layer:** Frontend
**Affected Role/Flow:** ketoan — `/accountant/work-orders` — Right-side `MatchDetailPanel`
**Status:** ❌ Open — Backend supports it; UI blocks it.

---

## Issue

On the production page `https://phucloc.tingting.vip/accountant/work-orders`, after the user matches one Trip Order to a Work Order, the right panel switches to "matched mode" and **stops showing suggestions**, so the user cannot add a 2nd, 3rd... TO to the same WO.

Backend supports 1 WO → N TOs (commits `9107b4b..fbfe576`, endpoint `POST /reconcile/batch-for-wo`, accumulating `apply_pricing_snapshot`, etc.) — but the UI on the primary accountant page does not expose it for partial-score cases.

The only way today to multi-match is:
- (a) Use the perfect-match bulk banner (only fires when ALL suggestions are 6/6 — rare in practice; the screenshot shows 2/6 scores), or
- (b) Navigate to the legacy `/match/:tripId` page, which has the proper checkbox flow but is not reachable from the main flow.

**Evidence:** User screenshot 2026-05-12 of WO `W001022` (Cty PAN HẢI AN, F40 TCNU2016911). Two suggestions visible (`T002002`, `T002017`), each with a single "Ghép" button. After clicking either, the right panel will switch to matched mode and the other suggestion disappears.

---

## Root Cause

`frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx`:

- **Line 22:** `useSuggestMatches(isMatched ? null : (workOrder?.id ?? null))` — suggestions query is **disabled** when WO status is `MATCHED` or `COMPLETED`.
- **Lines 102-213:** When `isMatched` is true, the panel early-returns with a "matched mode" UI that lists already-matched TOs (with per-TO "Bỏ ghép" buttons) but has **no "+ Thêm đơn hàng" affordance** to go back to suggestion mode.

---

## Expected Behavior

When a user selects an already-MATCHED WO:

1. Right panel shows the current matched TOs list (existing behavior — keep).
2. Below the matched list, also fetch + show suggestions for **adding more TOs to this same WO**.
3. Suggestions list must **exclude TOs already linked to this WO** (handled at backend in `match_suggester` by `matched_to_ids` filter — verify still works for MATCHED-WO case).
4. "Ghép" button next to each suggestion still works — calls `POST /reconcile` (or `batch-for-wo`) and adds the TO to the existing match set without resetting WO status (already idempotent in backend per `WorkOrder.match()`).

Optional UX polish:
- Section header: `Thêm đơn hàng khác cho chuyến này` (vs `Đơn hàng có thể ghép` for unmatched).
- Collapsed by default; expand on click.

---

## Recommendation

**File:** `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx`

1. Remove the `isMatched ? null :` guard on line 22 so suggestions are fetched for both PENDING and MATCHED WOs:
   ```ts
   const { data: suggestionsData, isLoading } = useSuggestMatches(workOrder?.id ?? null)
   ```
2. Verify backend `suggest_trip_matches` excludes already-linked TOs for a MATCHED WO (check `match_suggester.py` — it does exclude unmatched ones, but confirm it also handles the MATCHED-WO case).
3. In the matched-mode render block (lines 102-213), after the matched TOs list and before the unmatch confirm dialog, add a "Thêm đơn hàng khác" section that renders the same `MatchCard` list used in unmatched mode.
4. Test: WO matched with 1 TO → panel shows 1 in matched list + remaining 1 in suggestion list → click "Ghép" on the 2nd → both now in matched list, suggestion list empties (or shows other lower-score options).

---

## Acceptance Criteria

- [ ] On `/accountant/work-orders`, select a MATCHED WO → see both: (a) list of TOs already linked, (b) list of more suggestions to add.
- [ ] Clicking "Ghép" on a suggestion adds it to the same WO; WO badge `N ĐH` increments; suggestion disappears.
- [ ] Driver salary on this WO accumulates correctly (sum of all linked TOs).
- [ ] No regression on unmatched WO suggestion flow.

---

## Related

- Backend already supports — see `app/contexts/operations/application/reconciliation.py` `MatchTripToWorkOrder` (idempotent for already-MATCHED WO).
- See `docs/plans/multi-match-chuyen-don-hang-tasklist.md` for fuller context.
