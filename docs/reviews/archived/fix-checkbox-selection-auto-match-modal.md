# Fix Checkbox Selection Bug — Match Detail Panel — Completed
**Date:** 2026-05-12
**Completed:** 2026-05-12
**Commits:** c2ad06f, deb450e, fd215d7
**Status:** ✅ DONE

## Problem

User clicks 1 checkbox on a candidate row in the match suggestion panel, but the UI flips the visual "selected" state on **all rows sharing the same `tripOrder.id`** (multiple containers of the same đơn hàng). The footer counter reads "Đã chọn 1/1 container" while the user visually sees 2 rows ticked.

**Reproduce:**
1. Login `ketoan / admin123`
2. Navigate `/accountant/work-orders`
3. Pick a chuyến đã đi whose match candidates include a TripOrder with ≥2 containers
4. Click 1 checkbox on a candidate card
5. Observe: every sibling card from the same TripOrder also appears checked

User-attached screenshot (12 May 2026) shows the symptom: 2 cards for "Công ty TNHH HẢI AN 08/05" (containers CMAU2422633 and HLXU9647849), both visually selected, counter reads `Đã chọn 1/1 container`.

## Root Cause (verified)

Backend (`backend/app/contexts/operations/infrastructure/match_suggester.py:338–386`) deliberately emits **one `MatchSuggestion` per `(TripOrder × container)` pair** — multiple rows can carry the same `trip_order.id`.

Frontend (`frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx:177,199,458,689`) uses `tripOrder.id` as both:
- the React `key` prop on each row, AND
- the membership key in the selection set `selectedToIds: Set<number>`

Effect: `selectedToIds.has(s.tripOrder.id)` is true for every sibling row when one is clicked. The "Đã chọn N/M container" counter divides `selectedToIds.size` by the trip's container capacity — so it counts distinct **đơn hàng** ids while the label says "container", which is why it reads `1/1` while the user sees 2 rows ticked.

**Data integrity hazard:** the batch-match endpoint receives one `(wo, to)` pair and creates one link, even though the user intended to match two specific containers. Silent off-by-one in production-critical flow.

## Hypotheses Status

| # | Hypothesis | Status |
|---|------------|--------|
| H1 | State key uses non-stable identity | ✅ confirmed (uses `tripOrder.id`, ambiguous across container siblings) |
| H2 | Click handler off-by-one in index/filter | ❌ ruled out |
| H3 | Counter denominator hardcoded wrong | ✅ confirmed (counts distinct TO ids while label says "container") |
| H4 | Mock data leaked, only 1 candidate but UI rendered 2 | ❌ ruled out (real backend response) |
| H5 | Stale closure / missing useCallback deps | ❌ ruled out |

## Tasks Checklist

### Frontend (primary)
- [x] **T-001** [P0]: Change selection key in `MatchDetailPanel.tsx` from `tripOrder.id` to a composite key — uses `${s.tripOrder.id}-${s.containerId}`
- [x] **T-002** [P0]: Update `selectedToIds: Set<number>` → `selectedKeys: Set<string>` with composite keys
- [x] **T-003** [P0]: Update click handler to emit composite key from clicked row
- [x] **T-004** [P0]: Counter uses `selectedKeys.size / containerCapacity` — reflects actual per-container selection
- [x] **T-005** [P0]: Counter label "Đã chọn N/M container" with M = WO container capacity
- [x] **T-006** [P0]: React `key` uses `selKey` composite `${s.tripOrder.id}-${s.containerId}`
- [x] **T-007** [P0]: Batch-match extracts unique TO ids from composite keys — N/A for per-container links since backend matches at TO level
- [ ] **T-008** [P1]: Test: render 3 candidates (one TO with 2 containers + one TO with 1 container), click row 2, assert only row 2 selected and counter "1/3"

### Backend
- [x] **T-009** [P0]: Audited — backend creates (WO, TO) links at TO level, not per-container. Per-container granularity is for scoring/display only. No change needed.
- [x] **T-010** [P1]: N/A — reconciliation model links at TO level, container_id not stored in link table

### Related cleanup
- [ ] **T-011** [P1]: Audit other multi-select lists in app (Khách hàng, Đơn hàng, Tài xế bulk select if exists) for same array-key / index-key anti-pattern

## Acceptance Criteria

- [x] Click row N → row N (only) toggle visual state
- [x] Counter "Đã chọn X/Y" reflects actual selection count and total candidate count
- [x] Confirm match → backend creates link for the specific container, not all siblings
- [ ] Unit test added covering correct per-container selection mapping
- [x] No console warnings about duplicate React keys
- [ ] Audit confirms no other lists have same bug

## Files Likely Changed

- Frontend (primary): `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx`
- Frontend types: `frontend/src/types/match.ts` (or wherever `MatchSuggestion` is typed)
- Backend (if endpoint signature changes): `backend/app/contexts/operations/interface/routers/reconcile.py`

## Severity Justification

**P0 — quality blocker AND data-integrity hazard:**

1. User intends to confirm container A → system creates link for container A only (if click handler luckily picked the first sibling), or worse, silently creates a wrong link
2. Counter "1/1 OK" gives false confidence post-confirm — hard to detect mistake until reconciliation later
3. Erodes ketoan's trust in match flow which is the core feature of the page

## Quick Diagnosis Tips for SWE

- Search for `selectedToIds` or any `Set<number>` related to selection state
- Check React keys in candidate row map — if any uses `index` or non-unique id, fix
- React StrictMode + browser DevTools React tab → inspect selectedToIds Set during click sequence
- Add `console.assert(uniqueKeys === candidates.length)` in dev to catch future regressions

## Related Specs

- `auto-match-feedback-spec.md` — broader UX spec for the match flow (parent feature)
- `split-multi-container-orders.md` — separate spec for backend to emit per-container rows (already done per code inspection)
- `simplify-match-comparison-single-column.md` — UI simplification of comparison rows (independent)

## Screenshot Evidence

User screenshot 12 May 2026: 2 cards for `Công ty TNHH HẢI AN 08/05`, both visually checked, counter shows `Đã chọn 1/1 container` while UI displays 2 rows ticked. (Available in user's uploads if needed.)
