# Spec: "Tự động ghép" — Interactive Feedback

> **Status:** Pending implementation
> **Owner:** TBD
> **Created:** 2026-05-12
> **Author:** Orbit (QA + PM)
> **Page:** `/accountant/work-orders` — button "Tự động ghép" (top-right)

---

## 1. Current Behavior Audit (live, prod)

**Environment tested:** https://phucloc.tingting.vip/accountant/work-orders
**Account:** Kế Toán Test (ketoan role)
**Date:** 2026-05-12
**Method:** Chrome MCP — UI clicks, XHR interception, DOM inspection

### 1.1 What works

| Aspect | Result |
| --- | --- |
| Click triggers `POST /api/v1/reconcile/auto-match` | ✅ confirmed, 200 OK |
| Button shows loading state | ✅ text changes to "Đang ghép..." + spinner icon |
| Button is disabled during in-flight request | ✅ `disabled={autoMatching}` |
| Double-click guard | ✅ verified — clicking twice fires **only 1** request |
| Backend returns structured payload | ✅ `auto_matched`, `partial_matches`, `unmatched_work_order_ids`, `skipped_already_matched`, `errors` all present |

### 1.2 What's broken — critical findings

**Bug A — Silent success (P0, blocks user trust).**
After click → request → 200 OK response, **the UI shows nothing**: no result dialog opens, no toast appears, list does not refresh visibly.

Reproduced live:

```json
// Response actually received from backend on 2026-05-12 click:
{
  "auto_matched": [],
  "partial_matches": [
    { "work_order_id": 8,  "trip_order_id": 8,  "score": 0.5, "matched_fields": ["pickup_location","dropoff_location","client"] },
    { "work_order_id": 11, "trip_order_id": 14, "score": 0.5, "matched_fields": ["pickup_location","dropoff_location","client"] },
    { "work_order_id": 12, "trip_order_id": 14, "score": 0.5, "matched_fields": ["pickup_location","dropoff_location","client"] },
    { "work_order_id": 21, "trip_order_id": 24, "score": 0.5, "matched_fields": ["pickup_location","dropoff_location","client"] },
    { "work_order_id": 22, "trip_order_id": 25, "score": 0.5, "matched_fields": ["pickup_location","dropoff_location","client"] },
    { "work_order_id": 37, "trip_order_id": 16, "score": 0.5, "matched_fields": ["pickup_location","dropoff_location","client"] }
  ],
  "unmatched_work_order_ids": [5, 20, 24, 25, 28, 33, 35, 36, 39, 40],
  "skipped_already_matched": 9,
  "errors": []
}
```

DOM verification after response settled:
- `document.querySelector('[role="dialog"]')` → `null`
- `document.querySelectorAll('[data-sonner-toast]').length` → `0`
- "16 chờ ghép" badge unchanged

**Root cause:** `frontend/src/pages/accountant/WorkOrderList.tsx:130-140`

```tsx
onSuccess: (res) => {
  if (res.data) {                          // ← res.data is undefined
    setAutoMatchResult(res.data)           // ← never runs
    if (res.data.autoMatched.length > 0) {
      toast.success(...)
    } else {
      toast.info(...)
    }
  }
}
```

But the mutation pipes through `unwrap` in `frontend/src/hooks/use-queries.ts:8`:

```ts
function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data        // ← already returns T (AutoMatchResponse)
  throw new Error(...)
}
```

So `res` in `onSuccess` **is** the `AutoMatchResponse` (with `autoMatched`, `partialMatches`, etc.). `res.data` doesn't exist on it, so the `if` guard fails silently. Every branch — dialog open, success toast, info toast — is dead code.

**Bug B — Partial matches never rendered (P0).**
Even if Bug A is fixed, `AutoMatchDialog.tsx` renders only `result.autoMatched` and `result.unmatchedWorkOrderIds`. The `result.partialMatches` array (6 pairs in the production call above) is **never displayed** anywhere in the dialog body. Users have no way to know they exist or to act on them.

**Bug C — Dialog detail too thin (P1).**
When the dialog does render auto-matched rows, each row shows only `Phiếu #123 → Đơn #456` — opaque IDs. No biển số, no KH, no route, no per-criterion checkmark, no human-readable date. Score is a hard-coded `100%` chip (the dialog assumes 6/6 always — partial scores are never seen anyway because of Bug B).

**Bug D — Auto-commit without explicit confirmation (P1).**
`POST /reconcile/auto-match` (backend `reconcile.py:auto_match`) **immediately commits** every full-score match (`score >= 1.0`) inside the same request, via `match_use_case(...) → db.commit()` per pair. The dialog is then expected to be a **post-hoc receipt**, not a confirmation. There is no way to deselect a wrong auto-match before it lands in `reconciliations`. Combined with Bug A, kế toán has zero visibility into what just got committed.

**Bug E — Production has no full-score (6/6) pairs in current dataset.**
All 22 PENDING work orders score ≤ 3/6. The backend pipeline (suggest → `score >= 1.0` filter) consequently returns `auto_matched: []` on every click today. Even if Bug A is fixed, the dialog opens with `0` matched + `0` unmatched displayed (because `partial_matches` aren't rendered — Bug B), giving the impression "nothing happened." The matching threshold (`>= 1.0`) is fine in principle, but the UI must surface partials so users can act.

### 1.3 Edge cases tested

| Case | Observation |
| --- | --- |
| Click when 16 chuyến chưa ghép | Silent (Bug A) |
| Click rapidly 2× | Only 1 request fired — disabled guard works |
| Click when 0 candidates would match | (not directly tested — but code path is the `else` toast branch, also dead due to Bug A) |
| Network error / 401 / 500 | `onError → toast.error('Lỗi', 'Không thể tự động ghép')` — assumed to work but **untested** because no error was provoked |
| Console errors | None observed during the auto-match flow |

### 1.4 Files involved

- `backend/app/contexts/operations/interface/routers/reconcile.py` — `POST /reconcile/auto-match`
- `backend/app/schemas/domain.py` — `AutoMatchRequest`, `AutoMatchResponse`, `AutoMatchResult`
- `backend/app/contexts/operations/infrastructure/match_suggester.py` — scoring algorithm (6 criteria)
- `frontend/src/pages/accountant/WorkOrderList.tsx` — button + handler (`handleAutoMatch`)
- `frontend/src/hooks/use-queries.ts` — `useAutoMatch` mutation
- `frontend/src/services/api/tripOrders.api.ts` — `autoMatch()` API client
- `frontend/src/components/shared/AutoMatchDialog.tsx` — result dialog (renders only auto-matched, not partials)

---

## 2. Product Spec: "Tự động ghép" Interactive Feedback

### Problem statement
Kế toán clicks "Tự động ghép" and the UI is silent — no result dialog, no toast, no list refresh. They cannot tell whether the system ran, whether any match was found, what got committed, or what's left to handle. The result: lost confidence, repeated clicking, and silent auto-commits the user never reviewed.

### User goals
1. Confirm the action started (loading state — *already working*).
2. See clear results: **N cặp đã ghép tự động**, **M cặp đề xuất** (cần review), **K phiếu không thể ghép**.
3. See human-readable detail per pair: biển số, KH, tuyến đường, score X/6, per-criterion checkmarks.
4. **Review and confirm** partial matches (≥ 3/6) before they hit DB.
5. Empty / error state should explain why and what to try next.
6. Refresh the master list automatically after confirm.

### Proposed UX flow

**Step 1 — Click button.**
- Button disables + spinner inside + label "Đang tìm cặp ghép..." (currently "Đang ghép..." — acceptable, keep).
- Toast info: `Đang phân tích N phiếu chưa ghép…` (new, informative).

**Step 2 — Result modal opens (after API returns).**

Title: `Kết quả tự động ghép`

**Summary header — 3 stat cards:**
- `Đã ghép tự động` — `result.autoMatched.length` (success green)
- `Đề xuất ghép` — `result.partialMatches.length` (warning amber)
- `Không thể ghép` — `result.unmatchedWorkOrderIds.length` (muted red)

**Section A — Auto-matched (collapsible, open by default if non-empty):**

Read-only receipt of pairs already committed by backend. Per row:
- Biển số chuyến · ngày · tuyến (load from WO + TO via lookup, **not** raw IDs)
- KH · mã đơn hàng
- Score chip `6/6` (green) + 6 criterion checkmarks (date, biển số, container, KH, pickup, dropoff)
- Button `Hủy ghép` (calls existing unmatch endpoint, P1)

**Section B — Đề xuất ghép (partial matches, ≥ 3/6, the actionable section):**

Table with checkbox per row. Auto-checked if `score >= 5/6`, unchecked otherwise.
- Cột: ☑ · Chuyến · Đơn hàng · Score · Tiêu chí khớp
- Score chip color-coded: 6/6 green, 5/6 lime, 4/6 amber, 3/6 orange
- Each criterion shown as ✅/❌ pill: `Ngày`, `Biển số`, `Container`, `KH`, `Pickup`, `Dropoff`
- Hover row → show full detail in side popover

**Section C — Không thể ghép (collapsible, closed by default):**
- List of WOs with no candidates ≥ 3/6
- Each row links to the WO detail in the master list

**Bottom actions:**
- `[Đóng]` (left, secondary) — dismiss without confirming any partial
- `[Xác nhận ghép N cặp đã chọn]` (right, primary, disabled if 0 selected) — calls confirm endpoint

**Step 3 — Confirmation result.**
- After confirm: spinner on button, then close dialog
- Toast success: `Đã ghép M cặp thành công` (auto-dismiss 5s)
- If partial failure: keep dialog open, mark failed rows with red X + reason, toast warning `Đã ghép M/N cặp — X cặp lỗi`
- React Query invalidates `workOrders` and `tripOrders` queries → master list refreshes

**Step 4 — Empty state (`auto_matched.length === 0 && partial_matches.length === 0`).**
- Dialog still opens with friendly empty illustration
- Heading: `Không tìm thấy cặp ghép phù hợp`
- Body: explanation + 3 suggestions:
  1. *Kiểm tra alias địa điểm — pickup/dropoff có thể chưa được map.*
  2. *Đảm bảo chuyến và đơn hàng cùng ngày và cùng khách hàng.*
  3. *Nhập thêm phiếu chuyến hoặc đơn hàng mới.*
- Show counter: `Đã quét N phiếu PENDING · K đã ghép từ trước được bỏ qua` (from `skipped_already_matched`).

**Step 5 — Error state (HTTP error / network error).**
- Toast error: `Không thể tự động ghép — <reason>`
- Inline retry button on dialog OR collapse to dismissible card
- Expandable "Chi tiết kỹ thuật" section for admin (status code + endpoint URL + error message — no PII)

### Acceptance criteria

- [ ] After click, user always sees either a result dialog OR an error toast within 5 s.
- [ ] Result dialog shows summary counts that **match** the API response exactly.
- [ ] Auto-matched pairs are shown with human-readable WO/TO labels (not raw IDs).
- [ ] Partial matches are listed with checkbox + score + 6-criterion breakdown.
- [ ] User can deselect any partial-match row before confirming.
- [ ] Confirm action calls a **separate** endpoint and only commits the selected pairs.
- [ ] Empty state shows friendly explanation + at least 3 next-step suggestions.
- [ ] Error state is recoverable (retry button or dismiss-and-retry).
- [ ] Master list refreshes (count badge updates) after a successful confirm.
- [ ] Backend tests cover: candidates endpoint does not commit, confirm endpoint is atomic and idempotent.
- [ ] Frontend E2E covers: click → dialog opens → uncheck 1 → confirm → N-1 matches in DB.

### Out of scope (defer)

- Individual undo of an auto-matched pair from inside the dialog (use existing `Hủy ghép` flow).
- Threshold tuning UI (use backend default `score >= 1.0` for auto, `>= 0.5` for partial).
- Scheduled background auto-match job.
- Per-WO "match this one only" inline button from the master list (separate spec).

---

## 3. SWE Tasklist

### Backend tasks

- [ ] **BE-001** [P0]: Split `auto-match` into preview + confirm endpoints
  - **Current:** `POST /reconcile/auto-match` commits every full-score pair immediately inside the same call (see `reconcile.py:auto_match`, the inner `match_use_case(...) → db.commit()` loop).
  - **New behavior:** Make `POST /reconcile/auto-match` a pure **read-only preview** that returns candidates without writing to `reconciliations`. Pricing snapshot / status transitions stay untouched until confirm.
  - **Proposed response shape (camelCase via existing `toCamel`):**
    ```json
    {
      "scannedWorkOrderCount": 22,
      "skippedAlreadyMatched": 9,
      "candidates": [
        {
          "workOrderId": 8,
          "tripOrderId": 8,
          "score": 0.5,
          "matchScore": 3,
          "maxScore": 6,
          "matchedFields": ["pickup_location","dropoff_location","client"],
          "criteria": [
            {"key":"date","label":"Ngày đi","match":false},
            {"key":"plate","label":"Biển số","match":false},
            {"key":"container","label":"Số container","match":false},
            {"key":"client","label":"Khách hàng","match":true},
            {"key":"pickup","label":"Pickup","match":true},
            {"key":"dropoff","label":"Dropoff","match":true}
          ],
          "suggestedDefault": false,
          "workOrderRef":   {"id":8,"code":"W001008","plate":"29C-12345","date":"2026-05-11","clientName":"Công ty TNHH HAP","route":"Cát Lái → Bình Dương"},
          "tripOrderRef":   {"id":8,"code":"T002008","clientName":"Công ty TNHH HAP","route":"Cát Lái → Bình Dương","containers":[{"size":"E20","number":"OOLU7774229"}]}
        }
      ],
      "unmatchedWorkOrderRefs": [{"id":5,"code":"W001005","plate":"29C-12345","date":"2026-05-11"}],
      "errors": []
    }
    ```
  - `suggestedDefault = score >= 5/6` (auto-checked in UI; pre-selected for "Xác nhận").
  - File: `backend/app/contexts/operations/interface/routers/reconcile.py`
  - Schemas: `backend/app/schemas/domain.py` — extend `AutoMatchResponse` / `AutoMatchResult`, add `AutoMatchCandidate`.

- [ ] **BE-002** [P0]: New endpoint `POST /reconcile/auto-match/confirm`
  - **Body:**
    ```json
    { "pairs": [ {"work_order_id": 8, "trip_order_id": 8}, ... ] }
    ```
  - **Validation per pair:** WO still PENDING, TO has remaining container capacity, no existing active reconciliation for the pair. Reuses `MatchTripToWorkOrder` use case + capacity logic from `batch-for-to`.
  - **Atomicity:** Process pairs in a single transaction; on any failure, return per-pair status array but commit successes (current `batch-for-wo` semantics — keep consistent).
  - **Response:**
    ```json
    {
      "matched":   [ {"workOrderId":8,"tripOrderId":8,"success":true} ],
      "failed":    [ {"workOrderId":11,"tripOrderId":14,"success":false,"error":"WO đã ghép trước đó"} ],
      "durationMs": 312
    }
    ```
  - Audit: `log_action(action="AUTO_MATCH_CONFIRM", ...)` per successful pair.
  - File: `backend/app/contexts/operations/interface/routers/reconcile.py`

- [ ] **BE-003** [P1]: Idempotency on confirm
  - Confirming the same pair twice returns `success:false, error:"already_matched"` instead of duplicating reconciliation rows.
  - Add unique constraint check via existing `find_link()` before insert.

- [ ] **BE-004** [P1]: Cache busting headers on preview
  - Preview endpoint returns `Cache-Control: no-store` to prevent stale candidates after a separate confirm changes DB state.

### Frontend tasks

- [ ] **FE-001** [P0]: Fix `res.data` silent-fail bug
  - **File:** `frontend/src/pages/accountant/WorkOrderList.tsx:127-145` (`handleAutoMatch` `onSuccess`)
  - Replace `if (res.data) { setAutoMatchResult(res.data) … }` with `setAutoMatchResult(res)` and use `res.autoMatched` directly. `unwrap()` already returns the `AutoMatchResponse` object.
  - Verify all subsequent property accesses (`autoMatched`, `partialMatches`, `unmatchedWorkOrderIds`) match the camelCased shape from `toCamel`.

- [ ] **FE-002** [P0]: Migrate `useAutoMatch` to consume the new preview shape
  - **File:** `frontend/src/services/api/tripOrders.api.ts` — update `AutoMatchResponse` type and `autoMatch()` to match BE-001 (`candidates`, `unmatchedWorkOrderRefs`, `scannedWorkOrderCount`).
  - **File:** `frontend/src/hooks/use-queries.ts` — `useAutoMatch` stays a mutation, returns the new shape.

- [ ] **FE-003** [P0]: Rewrite `AutoMatchDialog` for candidate review + confirm
  - **File:** `frontend/src/components/shared/AutoMatchDialog.tsx`
  - Render three sections (summary counts, candidate table with checkboxes + per-criterion chips, unmatched list collapsible).
  - State: `selectedPairs: Set<{woId, toId}>`, initialized from `candidates.filter(c => c.suggestedDefault)`.
  - Bottom action bar: `Đóng` + `Xác nhận ghép N cặp` (disabled when `selectedPairs.size === 0`).
  - Use `apiClient.autoMatchConfirm(pairs)` on confirm.

- [ ] **FE-004** [P0]: New API + hook for confirm
  - **File:** `frontend/src/services/api/tripOrders.api.ts` — add `autoMatchConfirm(pairs)` → `POST /reconcile/auto-match/confirm`.
  - **File:** `frontend/src/hooks/use-queries.ts` — add `useAutoMatchConfirm()` mutation that invalidates `workOrders` + `tripOrders` on success.

- [ ] **FE-005** [P0]: Empty + error states inside dialog
  - When `candidates.length === 0 && unmatchedWorkOrderRefs.length > 0`: friendly empty-state with 3 suggestions (alias check, same-day/same-client, add data).
  - On confirm error: show error block above action bar with retry button (keep dialog open).

- [ ] **FE-006** [P1]: Persist preview after dialog close
  - If user accidentally closes the dialog before confirming, show a sticky "Xem lại N đề xuất" pill in the page header — clicking it re-opens the dialog with the same state.
  - Discard state when the user navigates away or page is refreshed.

- [ ] **FE-007** [P1]: Show match score chips in master list rows
  - Already partially implemented via `useMatchScores`; ensure chips visually align with the same color scale used in the dialog (6/6 green, 5/6 lime, 4/6 amber, 3/6 orange) so users can predict what auto-match will surface.

### Testing tasks

- [ ] **TEST-001** [P0]: Backend integration test — preview endpoint never writes to DB
  - Seed PENDING WOs + TOs with full-score match pair, call preview, assert `reconciliations` row count unchanged.
  - File: `tests/integration/test_reconcile.py`

- [ ] **TEST-002** [P0]: Backend integration test — confirm endpoint batch insert
  - Confirm 3 pairs, assert 3 active reconciliations created, WO statuses → MATCHED, TO unchanged status semantics per TO-centric model.
  - Re-confirm same pair → returns `error:"already_matched"`, no duplicate row.

- [ ] **TEST-003** [P0]: Backend integration test — capacity guard on confirm
  - TO has 1 container, confirm 2 pairs targeting same TO → second returns `error`, first succeeds.

- [ ] **TEST-004** [P0]: Frontend E2E (Playwright) — happy path
  - Login as ketoan, navigate `/accountant/work-orders`, click "Tự động ghép", assert dialog opens with correct counts, uncheck 1 row, confirm, assert toast + master list count decreases.

- [ ] **TEST-005** [P1]: Frontend E2E — empty state
  - Seed data with 0 candidates, click button, assert friendly empty state visible with 3 suggestions.

- [ ] **TEST-006** [P1]: Frontend unit — `AutoMatchDialog`
  - Snapshot test for the three sections (auto-matched, partial, unmatched).

### Effort estimate

- Backend: ~1 dev-day (split endpoint + confirm + tests).
- Frontend: ~1.5 dev-day (dialog rewrite is the bulk; FE-001 is a 1-line fix that ships independently).
- Testing: ~0.5 dev-day.
- **Total: ~3 dev-days.**

### Suggested rollout

1. **Hotfix first (≤ 30 min):** ship FE-001 alone — fixes the silent-failure UX immediately by making the existing (limited) dialog actually appear.
2. Then ship BE-001 + BE-002 + FE-002…FE-005 together as the proper "review before commit" feature.
3. BE-003, FE-006, FE-007 follow as polish.

---

## 4. References

- **Live QA evidence:** Production payload captured 2026-05-12 via Chrome MCP XHR hook (see §1.2).
- **Root-cause line:** `frontend/src/pages/accountant/WorkOrderList.tsx:131` (`if (res.data)` after `unwrap()`).
- **Backend entry point:** `backend/app/contexts/operations/interface/routers/reconcile.py` — function `auto_match`.
- **Scoring algorithm:** `backend/app/contexts/operations/infrastructure/match_suggester.py` — `suggest_trip_matches` returns 6-criterion `Match` objects.
- **Related spec:** `CLAUDE.md` → "Recently Completed (2026-05-12) — TO-Centric Matching Model" — confirms the capacity / 1:N semantics that BE-002 must respect.
