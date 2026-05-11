# Task 0038 — Fix Director Dashboard "Đã khớp" KPI counter showing 0

**Type:** Bug
**Severity:** 🔴 Critical
**Reporter:** BizFlow QA v6 (2026-05-11) — finding BF-02 / UX-02

## Problem

The "Đã khớp" KPI stat on the director dashboard (`/director`) shows `0` while the "Lệnh vận chuyển gần đây" panel immediately below shows T0032 as "Đã khớp". The counter is wrong.

**Network evidence:** Director page calls:
- `GET /api/v1/trip-orders` (no date filter) → used for the recent list
- `GET /api/v1/audit-logs?page_size=8` → used for activity feed

The KPI counter may use a different endpoint or a different filter than the recent list.

## Root Cause Hypotheses

1. The KPI counter queries `GET /api/v1/trip-orders?status=matched` but the status enum value used in the query doesn't match what the backend stores (e.g., querying `"matched"` when DB stores `"MATCHED"` or `"reconciled"`)
2. The KPI counter aggregates from the wrong time window (e.g., all-time when it should be current month, or vice versa)
3. The KPI is derived from work orders (`/api/v1/work-orders?status=matched`) instead of trip orders, and work order matching state is not updated

## Affected Files

- `frontend/src/pages/director/Dashboard.tsx` — KPI card data source
- `backend/app/contexts/operations/routes/director_routes.py` (or similar) — dashboard stats endpoint

## Acceptance Criteria

1. "Đã khớp" counter shows the actual count of reconciled trip orders for the selected month
2. Counter is consistent with the status chips shown in "Lệnh vận chuyển gần đây"
3. After a new reconciliation is performed by ketoan, the counter updates on next page load
4. Counter works for different months (using the month picker)

## Implementation Notes

- Quickest fix: use the same data source for both KPI and recent list
- Verify the matched status string used in the filter: `console.log` the API response status values from the list endpoint and ensure the KPI filter uses the identical string
- Consider adding an explicit stats endpoint: `GET /api/v1/director/stats?month=2026-05` that returns `{ total, matched, pending, revenue }` as a single call
