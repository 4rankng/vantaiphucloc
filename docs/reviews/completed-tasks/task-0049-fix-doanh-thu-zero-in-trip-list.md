# Task 0049 — Fix Đơn hàng Doanh thu Column Showing 0 ₫

**Type:** Bug
**Severity:** 🔴 High
**Source:** BizFlow QA v6 BF-01 / UIUX v6 UX-01

## Problem

All 19 rows in `/accountant/trips` (Đơn hàng) show "0 ₫" in the Doanh thu column.
The dashboard KPI correctly shows 25.050.000 ₫ total, confirming data exists.

## Investigation

Check `frontend/src/pages/accountant/TripList.tsx` — the Doanh thu column (around line 548):
```ts
{
  key: 'revenue',
  header: 'Doanh thu',
  accessor: (row) => (
    <span>
      {row.unitPrice > 0 ? fmt(row.unitPrice) : <span>—</span>}
    </span>
  ),
  sortKey: (row) => row.unitPrice ?? 0,
}
```

The frontend uses `row.unitPrice`. Verify via network tab that `GET /api/v1/trip-orders`
response includes a non-zero `unit_price` field for seeded trip orders.

## Likely Root Causes (check in order)

1. **Data issue**: Seeded trip orders have `unit_price = 0` in DB (pricing not applied at import time)
   - Fix: Update seed script or apply pricing to existing records
   - Check: `SELECT id, unit_price FROM trip_orders LIMIT 5;` in postgres

2. **API response issue**: Backend `TripOrderOut` schema omits or zeros `unit_price`
   - Check `backend/app/schemas/domain.py` class `TripOrderOut` — `unit_price: int`
   - Check the query that populates TripOrderOut in trip_orders router

3. **Frontend mapping issue**: If the API returns a different field name
   - The `toCamel` conversion converts `unit_price` → `unitPrice` — verify this works

## Fix

If the data has unit_price = 0, update the seed data OR add a migration to populate
unit_price from the pricing rules for existing trip orders.

If it's a code issue, fix the relevant backend query or frontend mapping.

## Acceptance Criteria

- Doanh thu column shows non-zero values for trip orders that have pricing
- Trip orders without pricing show "—" (not "0 ₫")
