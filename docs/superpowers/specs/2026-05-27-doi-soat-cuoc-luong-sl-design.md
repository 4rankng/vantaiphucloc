# DoiSoat: Add Cuoc + Luong SL Columns

**Date:** 2026-05-27
**Status:** Approved

## Goal

Show Cước (revenue) and Lương SL (driver salary) on the /accountant/doi-soat page so accountants can see and override pricing per trip.

## Context

- DeliveredTrips already have `revenue` and `driver_salary` fields in the DB and API
- The update endpoint (`PUT /api/v1/delivered-trips/:id`) already accepts `revenue` and `driver_salary`
- The existing DoiSoat table has no pricing columns — accountants must look elsewhere to check/adjust pricing
- Values are auto-populated from RoutePricing when trips are matched via auto-match

## Changes

### 1. Table columns (DeliveredTripColumns/index.tsx)

Add 2 columns after "Tac nghiep":

- **Cước** — `trip.revenue`, formatted as Vietnamese money (`450.000`). Zero or null shows em-dash.
- **Lương SL** — `trip.driverSalary`, formatted as Vietnamese money. Zero or null shows em-dash.

### 2. Drawer edit fields (DeliveredTripDetailDrawer/index.tsx)

Add 2 CriteriaEditRow + InlineEditable rows in the delivered trip grid:

- **Cước** — editable, saves `{ revenue: parsedInt }` via existing `updateTrip` mutation
- **Lương SL** — editable, saves `{ driverSalary: parsedInt }` via existing `updateTrip` mutation

Format display as Vietnamese money. Input accepts raw number (user types 450000, display shows 450.000).

### 3. No backend changes

`DeliveredTripUpdatePayload` already supports `revenue` and `driverSalary`.

## Files

| File | Change |
|------|--------|
| `frontend/src/components/shared/DeliveredTripColumns/index.tsx` | Add Cước + Lương SL columns |
| `frontend/src/components/shared/DeliveredTripDetailDrawer/index.tsx` | Add edit rows for revenue + driverSalary |

## Scope exclusions

- Override indicator (auto vs manual) — deferred to future iteration
- SL (quantity) column — not needed (1 trip = 1 container)
- Inline table editing — drawer-based editing per existing pattern
