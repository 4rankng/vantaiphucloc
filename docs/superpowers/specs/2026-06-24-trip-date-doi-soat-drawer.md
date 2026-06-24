# Show Trip Date in `/doi-soat` Detail Drawer — Design

## Goal

Make the trip's assigned date (`trip_date`) visible **and editable** in the "Chuyến đã đi" detail drawer on the `/doi-soat` page. Today the row is labeled **"Ngày chuyến"** and bound to `originalTripDate`, which is `NULL` until a trip is auto-matched to a booked trip — so for most rows the field shows `—`.

## Background

- The reconciliation page `/doi-soat` (`frontend/src/pages/accountant/DoiSoatPage.tsx`) opens a `DeliveredTripDetailDrawer` (`frontend/src/components/shared/overlays/DeliveredTripDetailDrawer/index.tsx`) when a row is clicked. The drawer shows 13 criteria in an editable grid using `CriteriaEditRow` + `InlineEditable` / `InlineSelect`.
- `DeliveredTrip` (ORM `backend/app/models/domain.py:328-379`) has two date fields with different semantics:
  - `trip_date: Date` — the assigned date (the date the trip is recorded for). Always populated when the driver creates the trip.
  - `original_trip_date: Date` — a snapshot taken **at match time** (`backend/app/contexts/operations/interface/routers/auto_match.py:254-259`). `NULL` until the trip is matched. Used to restore `trip_date` on unmatch.
- Both fields are exposed in the API: `DeliveredTripOut` (`backend/app/schemas/_delivered_trip.py:85-108`, lines 101 and 104). The frontend `DeliveredTrip` type declares both (`frontend/src/data/domain.ts:185-204`, lines 197-198).
- Other UI surfaces already display `tripDate` with a `createdAt` fallback chain (e.g. `frontend/src/components/shared/delivered-trips/DeliveredTripCard.tsx:190,227`).

## Non-Goals

- Changing backend ORM/API behavior.
- Showing both dates side by side in the drawer.
- Changing auto-match snapshot/restore semantics in `auto_match.py`.

## User-confirmed requirements

- **Date semantic:** display `trip_date` (the assigned date, the value the driver sets when creating the trip).
- **Editability:** the field must be editable like other criteria in the drawer (click → picker → save).

## Architecture

Two-file frontend change. No backend changes, no migration, no new component.

```
InlineEditable          ← extend with inputType: 'date'
   └─ (used by)         DeliveredTripDetailDrawer
                            └─ (row "Ngày vận chuyển")  ← bind to trip.tripDate
```

## Components

### 1. `InlineEditable` — extend to accept `date` input type

**File:** `frontend/src/components/shared/forms/InlineEditable/InlineEditable.tsx`

Change the `inputType` prop union from `'text' | 'number'` to `'text' | 'number' | 'date'`. No other behavior changes:

- `<input type="date">` returns the ISO string `YYYY-MM-DD`, which is the exact format Pydantic expects for a `date` field on the backend.
- All existing helpers (`handleSave`, `handleBlur`, `handleKeyDown`, `validate`, focus/select on edit) work unchanged.
- The hidden native input handles keyboard navigation, Esc/Enter, and the calendar picker UI for free.

### 2. `DeliveredTripDetailDrawer` — replace read-only date row

**File:** `frontend/src/components/shared/overlays/DeliveredTripDetailDrawer/index.tsx`

Replace lines 181-185 (the current `Ngày chuyến` row, bound to `originalTripDate`) with an editable **Ngày vận chuyển** row bound to `trip.tripDate`.

Display format: `formatDate(trip.tripDate, 'full')` → `DD/MM/YYYY` or `—` when null (`frontend/src/lib/format.ts:44-67`).

Edit payload: `{ tripDate: v || null }` (the wrapper at lines 53-64 already calls `setTrip(updated)` after a successful PATCH, so the row updates without extra state plumbing).

## Data Flow

```
User clicks the value in the "Ngày vận chuyển" row
   └─ InlineEditable → enters edit mode
       └─ <input type="date"> opens native calendar picker
           └─ User picks a date → presses Enter (or ✓)
               └─ onSave(draft) → updateTrip.mutateAsync({ id, data: { tripDate: draft || null } })
                   └─ safeRequest → api.put('/delivered-trips/{id}', toSnake({trip_date: ...}))
                       └─ PATCH (PUT) on backend updates delivered_trips.trip_date
                           └─ Response → setTrip(updated) → row re-renders with new value
```

Empty input → `tripDate: null` is sent → backend nulls the column → row shows `—` again.

## Error Handling

- Network/API failure → `InlineEditable` shows `"Không thể lưu thay đổi"` inline (existing behavior, line 68).
- Esc mid-edit → reverts to previous value (existing behavior, line 114).
- The `updateTrip` wrapper already surfaces TanStack Query error states; no additional handling needed.

## Testing

### Manual (against `make dev`)

1. Open `/doi-soat`. Click any trip row. Drawer opens.
2. Confirm the **Ngày vận chuyển** row shows the trip date (not `—`).
3. Click the date → native picker opens → choose a new date → Enter.
4. Verify the row updates and persists across a drawer close/reopen.
5. Clear the value (delete in the picker) → save → confirm the row returns to `—`.
6. Hard-reload the page → reopen the trip → confirm the persisted value matches.

### Automated

- `make test-frontend` (eslint + vite build + vitest).
- `cd backend && PYTHONPATH=. python -m pytest -q` — smoke test that PUT `trip_date` on `DeliveredTrip` still works (no backend change, but guards against accidental coupling).

## Migration

None. `DeliveredTrip.trip_date` is already a nullable `Date` column. `DeliveredTripUpdatePayload.tripDate` already exists in `frontend/src/services/api/deliveredTrips.api.ts:66`.

## Out of Scope (deferred)

- **Auto-match override of manual edits.** The match-confirm path overwrites `trip_date` with the matched booked trip's date; unmatch restores from `original_trip_date`. If a user manually edits `trip_date` after matching and then un-matches, the manual edit is lost. This is an existing semantic issue in `auto_match.py:254-259`. Flagged for a future change — not in scope for this UI fix.

## Acceptance Criteria

- The drawer shows a **Ngày vận chuyển** row bound to `trip.tripDate`.
- For a trip with a populated `trip_date`, the row shows `DD/MM/YYYY`.
- For a trip with `trip_date = null`, the row shows `—`.
- Clicking the value opens a date picker; choosing a date and pressing Enter persists the change to the backend.
- Clearing the value persists `null` and the row returns to `—`.
- All other editable rows in the drawer continue to work unchanged.
- `make test-frontend` and backend pytest still pass.