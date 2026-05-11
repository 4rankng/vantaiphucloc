# Task 0037 — Fix Đơn hàng Doanh thu column showing 0 ₫ for all rows

**Type:** Bug
**Severity:** 🔴 Critical
**Reporter:** BizFlow QA v6 (2026-05-11) — finding BF-01 / UX Audit UX-01

## Problem

All 19 trip orders on `/accountant/trips` display `0 ₫` in the Doanh thu column. The dashboard KPI card still correctly aggregates `25.050.000 ₫` for the month, so the data exists. The per-row display is broken.

**Verified via JS:**
```js
document.body.innerText.match(/0 ₫/g).length === 19  // all zero
document.body.innerText.match(/[1-9][0-9,.]+ ₫/g)    // null (no non-zero)
```

## Root Cause Hypotheses

1. The `GET /api/v1/trip-orders` response no longer includes a `price`, `revenue`, or `total_amount` field that the table column expects
2. The field was renamed in a backend schema change but the frontend still looks for the old field name
3. The pricing rules are not applied at import time — `trip_order.price` is null/0 in the DB for newly seeded data

## Affected Files

- **Backend:** `backend/app/contexts/operations/schemas.py` or `trip_order_schema.py` — check if `price`/`revenue` field is in the response schema
- **Backend:** `backend/app/contexts/customer_pricing/` — check if pricing lookup runs on trip order creation/import
- **Frontend:** `frontend/src/pages/accountant/TripOrdersPage.tsx` or similar — check the Doanh thu column's `accessorKey` or `cell` renderer

## Acceptance Criteria

1. Each trip order row shows its actual revenue based on the pricing rule for its client, route, and container type
2. The sum of all row revenues should approximately equal the dashboard KPI `DOANH THU` value for the same period
3. Rows with no applicable pricing rule should show "—" rather than "0 ₫" to distinguish "no price configured" from "free"
4. Matched and unmatched orders both show revenue (revenue is determined by the order, not by reconciliation status)

## Implementation Notes

- First, query the API directly: `GET /api/v1/trip-orders?date_from=2026-05-01&date_to=2026-05-31` and inspect one record's JSON for price/revenue fields
- If the field exists in the API response but shows 0: pricing lookup is not populating on import — fix the import pipeline to compute price from BảngGiá
- If the field is missing from the API response: add it to the schema and the query
- Cross-check: the `/api/v1/dashboard/stats` endpoint presumably calculates 25 tr ₫ correctly — trace its query to find the correct field/join
