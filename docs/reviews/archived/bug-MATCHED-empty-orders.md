# Bug-MATCHED-EMPTY: Work order shows "Đã khớp" but right panel lists 0 linked orders

**Type:** Data Inconsistency / UX Confusion
**Layer:** Backend + Frontend (likely backend root cause)
**Severity:** 🔴 Major
**Affected Role/Flow:** Kế toán — Ghép chuyến (work-orders page)
**Viewport:** desktop + mobile
**Location:** `http://localhost:5174/accountant/work-orders` — right detail panel for any WO with status `MATCHED`

## Observation

On the work-orders page, multiple rows in the left master list display the status badge **"Đã khớp"** (matched). When the user clicks one of these rows, the right detail panel shows:

- Header: **"Đã ghép với đơn hàng" 0** (count badge)
- Empty state: **"Chưa có đơn hàng nào được ghép"**
- Below: "Thêm đơn hàng khác cho chuyến này" → "Không còn đơn hàng phù hợp để thêm"

This is a **contradiction**: a WO cannot be in status `MATCHED` with zero linked TripOrders. By the domain model, `MATCHED` exists precisely because at least one active reconciliation link exists. See the recent CLAUDE.md notes on the TO-centric matching model: WO is 1:1 with TripOrder, and unmatch resets WO → PENDING.

Reproduction in the attached screenshot: WO #29C-23456 (12/05) on the left, marked "Đã khớp", but the right panel shows 0 linked orders.

## Impact

- Accountants cannot tell whether the link is broken, the order was deleted, or there's a display bug.
- They cannot unmatch the WO from this UI because there's no order card to click "Bỏ ghép" on.
- The matched_trip_count badge in the list also shows 0 (or is missing), reinforcing the confusion.
- Workflow gets stuck — the user can neither use the WO nor recover its state without DB access.

## Hypotheses (please verify before fixing)

1. **Stale WO status (most likely backend bug)** — A previous unmatch flow soft-deleted/inactivated the `Reconciliation` row but did not reset `WorkOrder.status` back to `PENDING`. The 1:1 unmatch path in `reconciliation.py` (`UnmatchTripFromWorkOrder`) should always reset WO → PENDING per the recent TO-centric refactor (bug-0078..0083). Check whether some other code path (TripOrder deletion, partner edit, etc.) deactivates the reconciliation without touching the WO.
2. **Frontend window filter** — `MatchDetailPanel.matchedTrips` filters `allTripOrders` by date range (the month picker at top). If the linked TripOrder is **outside** the current month window, `allTripOrders` won't contain it, so `matchedTrips` is empty even though the link exists. Verify by widening the month or fetching the linked TO directly.
3. **Field mismatch** — `MatchDetailPanel.matchedTrips` filters by `t.matchedWorkOrderIds?.includes(workOrder.id)`. Confirm that `matched_work_order_ids` is populated on `GET /trip-orders` for cross-month TOs.

## Steps to Reproduce

1. Login as ketoan / admin123.
2. Navigate to `/accountant/work-orders`.
3. Switch the filter pill to **"Đã khớp"**.
4. Click any WO row that has status "Đã khớp" but no green "1 ĐH" matched-count chip (most rows in the screenshot fit this).
5. Observe the right panel — `0` next to "Đã ghép với đơn hàng" and the empty state.

## Expected

- If a WO is `MATCHED`, the right panel MUST list at least one linked TripOrder, regardless of the current month filter.
- If the linked TO is outside the filter window, fetch it on demand (don't rely on `allTripOrders` from the month query) — or relax the filter for matched WOs.
- Otherwise (no active link in DB), reset the WO to `PENDING` so the status badge tells the truth.

## Actual

WO status is `MATCHED` but the panel shows 0 orders and offers no recovery.

## Fix Hint

**Backend audit script** to find affected rows:

```sql
SELECT w.id, w.code, w.status
FROM work_orders w
LEFT JOIN reconciliations r
  ON r.work_order_id = w.id AND r.is_active = true
WHERE w.status = 'MATCHED' AND r.id IS NULL;
```

If this returns rows, those WOs are stale-MATCHED. Either:

- **Heal the data:** one-off migration to flip stale rows back to `PENDING`.
- **Find the leaking path:** add an integrity check at the end of every reconciliation mutation (`MatchTripToWorkOrder`, `UnmatchTripFromWorkOrder`, TripOrder soft-delete) asserting status mirrors `count_links_for_wo`. Tests in `tests/integration/test_multi_match_reconciliation.py` already exercise the happy paths — add a negative test that deletes the TO directly and asserts the WO ends up `PENDING`.

**Frontend fallback (defense in depth)** in `MatchDetailPanel.tsx` (around line 233):

```ts
const matchedTrips = useMemo(() => {
  if (!isMatched || !workOrder) return []
  // First try the window-loaded trips:
  const inWindow = allTripOrders.filter(t => t.matchedWorkOrderIds?.includes(workOrder.id))
  if (inWindow.length > 0) return inWindow
  // Otherwise fetch by WO id (new endpoint) and merge — never show empty
  // when the status says MATCHED.
  return /* useTripsLinkedToWO(workOrder.id) */ []
}, [isMatched, workOrder, allTripOrders])
```

If `matchedTrips.length === 0` while `isMatched === true`, the panel should show an **error state** ("Trạng thái chuyến đang lệch dữ liệu — liên hệ kỹ thuật") with a one-click "Đặt lại trạng thái PENDING" recovery button, not a silent empty state.

## Key files

- `backend/app/contexts/operations/application/reconciliation.py` (lifecycle)
- `backend/app/contexts/operations/infrastructure/link_queries.py` (`count_links_for_wo`)
- `backend/app/contexts/operations/interface/routers/work_orders.py` (`_load_many` populates `matched_trip_count`)
- `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx` (lines 233–235, 302–387)
- `frontend/src/pages/accountant/work-orders/WorkOrderMasterList.tsx` (line 140, status badge logic)
- `frontend/src/data/domain.ts` (`matchedTripCount`, `matchedWorkOrderIds`)

## Don't

- Don't "fix" by hiding the status badge — that masks the real bug.
- Don't reset stale rows in production without first identifying the leaking write path; otherwise the stale state will recur.
