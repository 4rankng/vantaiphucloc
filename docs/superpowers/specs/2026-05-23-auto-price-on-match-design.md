# Auto-Populate Pricing on Match Confirmation

**Date:** 2026-05-23
**Status:** Draft

## Context

When trips are matched (DeliveredTrip <-> BookedTrip), the financial fields (`revenue`, `driver_salary`) are left at 0. Users must manually apply pricing later or it never gets filled. The `BookedTrip.revenue` column is redundant — the actual revenue should live on `DeliveredTrip` (the executed trip), populated from `RoutePricing` (bang gia cuoc thu chu hang). Vendor trips should auto-populate `driver_salary` from `VendorRoutePricing` (bang gia cuoc tra nha xe).

## Decisions

1. **Inline pricing lookup in `confirm_matches()`** — atomic with match confirmation, no extra API calls
2. **Remove `BookedTrip.revenue` column** — drop from model, schema, migration, and all consumers
3. **Dashboard/P&L pull revenue from `DeliveredTrip.revenue`** — the single source of truth
4. **Vendor trips auto-fill `driver_salary`** — from `VendorRoutePricing` when `vendor_id` is not null

## Design

### Part 1: Auto-price in `confirm_matches()`

**File:** `backend/app/contexts/operations/infrastructure/auto_match_service.py`

After the loop that sets `matched=True` on all pairs, before `db.flush()`:

1. Collect all matched `(wo, to)` tuples
2. Build `TripPriceInfo` objects for all matched DeliveredTrips
3. Call `lookup_client_prices(db, trips)` → get `{wo_id: price}` → set `wo.revenue = price`
4. For trips with `vendor_id`: call `lookup_vendor_prices(db, trips)` → set `wo.driver_salary = price`
5. `db.flush()` persists everything atomically

Reuses existing `TripPriceInfo`, `lookup_client_prices()`, and `lookup_vendor_prices()` from `backend/app/core/pricing_lookup.py`.

### Part 2: Remove `BookedTrip.revenue` column

**Model:** `backend/app/models/domain.py` — remove `revenue` Column from `BookedTrip`

**Migration:** Alembic migration to `ALTER TABLE booked_trips DROP COLUMN revenue`

**Backend consumers to update:**

| File | Change |
|------|--------|
| `app/schemas/_booked_trip.py` | Remove `revenue` from `BookedTripCreate`, `BookedTripUpdate`, `BookedTripOut` |
| `app/contexts/platform/interface/routers/dashboard.py:55,91,244` | Sum from `DeliveredTrip.revenue` instead of `BookedTrip.revenue` |
| `app/contexts/operations/infrastructure/excel/booked_trip_export.py:101,111,271` | Remove revenue column from export |
| `app/contexts/operations/infrastructure/import_queries.py:67` | Remove `(BookedTripORM.revenue == 0)` filter |
| `app/contexts/operations/infrastructure/repositories.py:69` | Remove revenue==0 filter |
| `app/contexts/operations/application/booked_trips.py` | Remove `ApplyPricingToTrips` class (or redirect to DeliveredTrip) |
| `app/contexts/payroll/application/use_cases.py` (GetMonthlyPnL) | No change needed — already uses dynamic `lookup_client_prices()` |
| `tests/test_apply_pricing.py` | Remove `test_booked_trip_has_revenue` |
| `tests/test_models.py:108` | Remove `test_booked_trip_revenue_not_nullable` |
| `tests/test_trip_daily_stats.py:45` | Update to use DeliveredTrip.revenue |

**Frontend consumers to update:**

| File | Change |
|------|--------|
| `frontend/src/data/domain.ts` | Remove `revenue` from `BookedTrip` type |
| `frontend/src/components/shared/DeliveredTripDetailDrawer/index.tsx:236-242` | Remove revenue display/edit for booked trip |
| `frontend/src/services/api/autoMatch.api.ts` | No change needed |
| Any hook/schema referencing `bookedTrip.revenue` | Remove |

### Part 3: Dashboard revenue redirect

**File:** `backend/app/contexts/platform/interface/routers/dashboard.py`

- Line 55: `select(func.sum(BookedTrip.revenue))` → `select(func.sum(DeliveredTrip.revenue))`
- Line 91: Outstanding debt query → sum `DeliveredTrip.revenue` where `matched=True`
- Line 244: Revenue per day chart → group by `DeliveredTrip.trip_date`, sum `DeliveredTrip.revenue`

All queries filter by the same date range. Date filtering shifts from `BookedTrip.created_at` to `DeliveredTrip.trip_date` (or `created_at` if `trip_date` is null).

## Edge Cases

- **No pricing row found:** Revenue/driver_salary stays at 0 (same as current behavior)
- **DeliveredTrip already has revenue > 0:** Do not overwrite — only fill if current value is 0
- **cont_type is NULL:** Falls back to `f20_price` via `_price_for_cont_type` (existing behavior)
- **vendor_id is NULL (internal driver):** Skip vendor pricing lookup, `driver_salary` stays at 0

## Verification

1. `make test-backend` — all tests pass after changes
2. `make test-frontend` — lint + build pass after removing BookedTrip.revenue references
3. Manual: confirm a match via `/auto-match/confirm` → verify DeliveredTrip.revenue and driver_salary are populated
