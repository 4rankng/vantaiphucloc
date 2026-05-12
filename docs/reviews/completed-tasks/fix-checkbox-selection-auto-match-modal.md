# Fix Checkbox Selection Bug — Match Suggestion Panel (per-container rows) — Pending Task Spec

**Date:** 2026-05-12
**For:** Next SWE pickup (P0 — quality/data-integrity blocker)
**Priority:** P0
**Effort:** ~0.5–1 dev-day (depending on whether DTO change is included)

## Problem (verbatim user report)

> "I click only one tick box, but website only choose tick 2, and then show message say Da chon 1/1 container, i think UI UX so dumb, could you fix"

User clicks **one** checkbox in the match-suggestion list, but the UI visibly marks **two** rows as selected. The floating counter chip reads "Đã chọn 1 / 1 container" — which appears correct numerically but is misleading because the user clearly sees two highlighted rows.

This is **not** an off-by-one error. It is a **shared-identity** bug: the suggestion list contains multiple rows with the same `tripOrder.id`, and selection state is keyed by that id.

## Reproduce

**Pre-condition:** at least one TripOrder with **≥ 2 containers** must exist in PENDING state, eligible to be matched to a candidate WorkOrder.

1. Login `ketoan / admin123` at http://localhost:5174
2. Navigate `/accountant/work-orders` (Ghép chuyến page).
3. Click a WorkOrder in the master list whose suggestion panel contains the multi-container TO from the precondition.
4. Observe: the "Đơn hàng có thể ghép" list shows **N rows for the same TripOrder** (one per container), each with its own MatchCard + checkbox.
5. Click the checkbox on row 1 (container A).
6. **Bug:** rows 1 *and* 2 (both for the same TO id) become checked. Counter reads "Đã chọn 1 / 1 container".
7. Click any checkbox of a different TO → ignored silently (capacity guard) — counter still 1/1.

> Note: the current localhost seed data only has single-container TOs, so the bug does not visibly reproduce on the default dev DB. The defect is fully visible in the code path; to repro locally, seed at least one TO with `containers=[{containerNumber:'A'},{containerNumber:'B'}]` and a matching WO with `containers.length >= 1`.

## Root Cause

The suggestion list is intentionally split per `(TripOrder × container)` on the backend, but the frontend tracks selection by **TripOrder id only** — there is no per-container identity in the DTO or the UI state.

**Backend** — `backend/app/contexts/operations/infrastructure/match_suggester.py:338–386`

```python
# Emit one MatchSuggestion entry per available container so the
# UI renders independent rows for each container.
for container in available_containers:
    ...
    to_out = TripOrderOut(
        id=to.id,  # ← same TO id reused for every container
        ...
        containers=[TripContainerOut.model_validate(container)],
        ...
    )
    suggestions.append(MatchSuggestion(trip_order=to_out, ...))
```

→ For a TO with N containers, the API emits N `MatchSuggestion` items, **all carrying the same `trip_order.id`**, differing only by the single-element `containers[]` slice.

**Frontend DTO** — `frontend/src/data/domain.ts:209–217`

```ts
export interface MatchSuggestion {
  tripOrder: TripOrder         // ← has .id, but no container_id at this level
  ...
}
```

There is no `containerId` (or sub-row identifier) exposed at the suggestion level.

**Frontend state** — `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx`

```ts
// line 177
const [selectedToIds, setSelectedToIds] = useState<Set<number>>(new Set())

// line 199–211
const toggleSelection = useCallback((id: number) => {
  setSelectedToIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else { if (prev.size >= containerCapacity) return prev; next.add(id) }
    return next
  })
}, [containerCapacity])

// line 458 (matched-mode) and line 689 (unmatched-mode)
{suggestions.map(s => (
  <div key={s.tripOrder.id} className="relative">     // ← duplicate React key
    <label
      onClick={... toggleSelection(s.tripOrder.id) ...}  // ← shared identity
      ...
    >
      ...
      style={{
        background: selectedToIds.has(s.tripOrder.id)  // ← derived from set
          ? 'var(--theme-brand-primary)'
          : 'transparent',
      }}
```

**Three concrete consequences:**
1. **Duplicate React keys** — `key={s.tripOrder.id}` is non-unique when multiple rows share a TO id. React will warn (or silently re-key during reconciliation).
2. **Shared checked-state** — `selectedToIds.has(s.tripOrder.id)` returns `true` for *every* row with that id. Clicking one ticks them all.
3. **Misleading counter** — `selectedToIds.size` counts distinct TO ids, but the chip label reads "Đã chọn X / containerCapacity **container**". Containers ≠ TOs. With 1 TO of 2 containers selected, the chip shows "1 / 1" while the user has visually picked two containers and the batch endpoint will, in fact, only match 1 link (not 2). This silently breaks the user's intent.

**Verdict — most likely cause:** H1 (state key uses non-stable identity) + H3 (counter denominator semantics mismatch). H2 (off-by-one), H4 (mock data), H5 (stale closure) are ruled out.

## Files Likely Changed

**Frontend (definitely):**
- `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx` — state key, click handler, counter, capacity guard
- `frontend/src/pages/accountant/work-orders/MatchCard.tsx` — possibly needs a stable per-row key prop
- `frontend/src/data/domain.ts` — add `containerId` (or a synthetic `suggestionKey`) to `MatchSuggestion`

**Backend (recommended):**
- `backend/app/contexts/operations/infrastructure/match_suggester.py` — surface container id on the emitted suggestion (or a unique pair key)
- `backend/app/contexts/operations/interface/schemas/domain.py` (Pydantic `MatchSuggestion`) — add the field
- `backend/app/contexts/operations/interface/routers/reconcile.py` — if batch-match endpoint should accept `(woId, toId, containerId)` triples instead of just `(woId, toId)` pairs

**Tests:**
- `backend/tests/integration/test_match_suggester.py` (new or extended) — assert that multi-container TO emits N distinct suggestion rows with unique sub-keys
- Frontend test (Vitest/RTL) — render 3 suggestions including 2 with same TO id, click row 2, assert only row 2 ticked + counter "1/3"

## Tasks Checklist

- [ ] **T-001** [P0] — Reproduce locally. Seed `TripOrder` with 2 containers and a matching `WorkOrder`. Confirm visual two-row tick + duplicate-key warning in console.
- [ ] **T-002** [P0] — Add stable per-suggestion key. Two viable options:
  - (a) **Quick fix (FE-only):** synthesize `key = ${tripOrder.id}-${containers[0].containerNumber || index}` on the FE. Change `selectedToIds: Set<number>` → `Set<string>` of these keys. Loses backend traceability but unblocks UI today.
  - (b) **Clean fix (BE+FE):** add `container_id: int` to `MatchSuggestion` Pydantic schema; expose as `containerId` on the FE DTO. Use `${toId}-${containerId}` as the stable key. **Preferred.**
- [ ] **T-003** [P0] — Fix counter semantics. Either:
  - (a) Label change: "Đã chọn X / Y **đơn**" where X = distinct TO ids, Y = total TO suggestions (clear); **or**
  - (b) Keep "container" label but make X = number of selected `(TO×container)` rows. Recompute `atCapacity` against this true count, not `selectedToIds.size`. (Preferred — matches the unit named in the chip.)
- [ ] **T-004** [P0] — Fix capacity guard. With the per-container key:
  - `containerCapacity = workOrder.containers.length` is correct.
  - Compare against **selected container count**, not selected TO count.
  - Update the over-capacity warning copy accordingly.
- [ ] **T-005** [P0] — Update batch-match call site (`useBatchReconcileForWO`). If only the FE quick-fix is shipped, ensure the request still de-duplicates TO ids before sending. If clean fix, payload becomes `(woId, toId, containerId)[]` and `POST /reconcile/batch-for-wo` must accept the third coordinate.
- [ ] **T-006** [P1] — Add Vitest test for `MatchDetailPanel`: render 3 suggestions (2 share TO id #42, 1 is TO #43), click row 2 (TO #42, container B), assert only row 2 has the checked style and counter shows "1 / N".
- [ ] **T-007** [P1] — Add backend integration test: TO with 3 containers → `/suggest-matches` returns 3 entries with distinct container ids (or container-number tag).
- [ ] **T-008** [P2] — Audit other multi-select lists in the app for the same anti-pattern:
  - `KhachHang` (ClientList) detail dialog
  - `Don hang` (TripList / UserManagement bulk-select)
  - `Driver` (DriverList) settings page
  Verify each uses a stable, unique id as React key + state key.

## Acceptance Criteria

- [ ] Multi-container TO renders N independent rows; clicking row K toggles **only** row K.
- [ ] Counter chip "Đã chọn X / Y container" reflects the real count of selected `(TO × container)` rows, not the size of a deduped TO set.
- [ ] Capacity guard fires correctly: cannot select more containers than `workOrder.containers.length`; copy still reads naturally.
- [ ] No React duplicate-key warning in console when the panel renders.
- [ ] Batch-match call links exactly the rows the user ticked — verified by post-confirm reload showing only those container links on the WO.
- [ ] At least one FE test + one BE test added; full suite green (`pytest`, `pnpm test`).

## Quick Diagnosis Tips for SWE

- The bug only shows up against multi-container TOs. Standard dev seed data is single-container — seed before reproducing.
- Open React DevTools → select `MatchDetailPanel` → inspect `selectedToIds` (it's a `Set`). After one click, you'll see `Set { 42 }` while two rows are visually checked. Confirms shared-identity.
- `s.tripOrder.containers[0].containerNumber` is the only field that differs between sibling rows of the same TO — use it (or a real container id) as the disambiguator.
- React StrictMode double-render does NOT exacerbate this bug — it's a steady-state rendering issue, not a stale-closure one. Rule out H5.
- If you go with the FE-only quick fix, the batch endpoint silently does the right thing (it just receives one `(wo,to)` pair instead of two), but the link table will have **only one row**, not the two the user thought they confirmed. This is a data-integrity hazard — prefer the clean fix.

## Severity

**P0 — Quality blocker + data-integrity hazard.**

- User intends to confirm 2 containers of TO #42 → system records 1 link → second container silently remains unmatched.
- Counter says "1 / 1" so confirmation looks successful; post-confirm the user has no signal that something was dropped.
- Accountants will not catch this until reconciliation/payroll downstream — at which point unwinding requires manual investigation.
- Trust erosion: user has already labelled the UX "dumb" once; further surprises will compound.

## Related Specs

- `auto-match-feedback-spec.md` — broader UX spec for the auto-match preview modal (separate flow — that modal has *no* checkboxes, the bug is in the per-WO suggestion panel only).
- CLAUDE.md entry `Split multi-container orders (2026-05-12)` — this is the backend change that surfaced the latent FE bug. The FE was not updated to track per-container identity at that time.

## Out of Scope

- Auto-match preview dialog (`AutoMatchDialog.tsx`) — that flow has no checkboxes today and is not affected.
- TripOrder side (TO-centric panel) selecting WOs — if a similar checkbox flow exists there it should be audited (T-008) but is not part of this spec.

## Resolution

**Root cause:** Multi-container TripOrders emit N suggestion rows sharing the same `tripOrder.id`. Frontend tracked selection by `Set<number>` keyed on TO id only, causing all sibling rows to share checked state.

**Fix applied — clean BE+FE approach (T-002 option b):**

1. **Backend `MatchSuggestion` Pydantic schema** (`app/schemas/domain.py`): Added `container_id: int` field.
2. **Backend `match_suggester.py`**: Populated `container_id=container.id` when building per-container suggestions.
3. **Frontend `domain.ts`**: Added `containerId: number` to `MatchSuggestion` interface.
4. **Frontend `MatchDetailPanel.tsx`**:
   - Changed `selectedToIds: Set<number>` → `selectedKeys: Set<string>` with composite key `${toId}-${containerId}`
   - React `key` uses composite key (fixes duplicate key warning)
   - Counter counts selected rows accurately
   - `handleBatchForWO` deduplicates TO ids from composite keys before sending to API

**Files changed:**
- `backend/app/schemas/domain.py`
- `backend/app/contexts/operations/infrastructure/match_suggester.py`
- `frontend/src/data/domain.ts`
- `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx`

**Tests:** 224 passed, 27 skipped, 0 failures.
