# MULTI-MATCH-03 — Add Checkbox Multi-Select to MatchDetailPanel

**Severity:** 🟡 Major (UX gap; backend ready)
**Type:** Missing Feature (FE)
**Layer:** Frontend
**Affected Role/Flow:** ketoan — `/accountant/work-orders` — Right-side `MatchDetailPanel`
**Status:** ❌ Open

---

## Issue

On the primary accountant page `/accountant/work-orders`, the `MatchDetailPanel` (right side) lists suggested TOs but **each TO has only a single "Ghép" button**. There is no checkbox to multi-select 2+ partial-score TOs and confirm them as a batch.

A bulk affordance exists — but ONLY when every suggestion is 100% (6/6) match. The "Có {N} cặp 100% match — Ghép tất cả ngay" banner (lines 247-258) calls `bulkMatch.mutateAsync(pairs)`. For the realistic case (screenshot shows 2/6 scores), no batch UI surfaces.

Workaround today is to click "Ghép" repeatedly, but after the first click the WO becomes MATCHED and the panel hides further suggestions (see `MULTI-MATCH-01`).

---

## Expected Behavior

Mirror the multi-select pattern already implemented in `frontend/src/hooks/use-match-trip.ts` (`selectedTripIds[]`, `toggleTripSelection`, `getTripMatchStatus`) but inside `MatchDetailPanel`:

1. Each `MatchCard` in the suggestions list shows a checkbox on the left (or the whole row toggles selection).
2. A floating action bar appears at the bottom of the panel when `selectedCount > 0`:
   - "Đã chọn {N} đơn — Ghép tất cả vào W001022"
   - Disabled until count ≥ 1.
3. Click bar → calls `useBatchReconcileForWO` (already exists in hooks/use-queries) with payload `{ workOrderId, tripOrderIds }`.
4. After success, refresh suggestions + matched list.

For low-score (<3/6) selections, show a confirmation modal — re-use `ConfirmationCheckbox` pattern from the legacy `MatchTrip.tsx`.

---

## Recommendation

**File:** `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx`

1. Add local state: `const [selectedToIds, setSelectedToIds] = useState<Set<number>>(new Set())`.
2. Each `MatchCard` receives `isSelected` + `onToggle` props.
3. Selection bar component at panel footer with batch action.
4. Wire `useBatchReconcileForWO` (already in `hooks/use-queries`).
5. Clear selection on success.
6. Keep single-click "Ghép" buttons for users who prefer one-by-one.

Also fix the related issue in `MULTI-MATCH-01` so the suggestion list still appears when WO is MATCHED — so users can incrementally add more.

---

## Acceptance Criteria

- [ ] User selects WO → suggestion list shows checkboxes.
- [ ] Tick 2+ suggestions → batch action bar appears with count.
- [ ] Click batch action → all selected TOs link to the WO in one API call (`/reconcile/batch-for-wo`).
- [ ] WO badge updates to `N ĐH` after success.
- [ ] Low-confidence selections trigger confirm modal before submitting.
- [ ] Single-TO "Ghép" buttons still work for one-by-one flow.

---

## Related

- Backend endpoint exists: `POST /api/v1/reconcile/batch-for-wo` (see `backend/app/contexts/operations/interface/routers/reconcile.py:136`).
- FE hook exists: `useBatchReconcileForWO` (used by `MatchTrip.tsx` legacy page).
- Pattern to copy: `frontend/src/hooks/use-match-trip.ts`.
