# Task 0070: Director Can Perform Write Actions on Trip Detail Page

**Type:** Interaction Bug / Role Scope Violation  
**Severity:** 🔴 Critical  
**Layer:** Frontend  
**Affected Role/Flow:** giamdoc — `/director/trip/:tripId`  
**URL:** `/director/trip/9` (and any `/director/trip/:tripId`)

## Observation

When the director (giamdoc) navigates to a trip detail page, they see — and can click — action buttons that should be restricted to the accountant role only:

1. **"Chốt chuyến"** toggle button — visible on T002009 and other matched trips. This locks/unlocks the trip with the client. **Director can click this and the API call executes**, modifying production data.

2. **"Khớp chuyến"** button — visible on any trip where `status !== 'COMPLETED'`. This opens a match dialog allowing the director to link a work order to a trip order.

3. **"Sửa" (Edit)** button — visible on trips where `status !== 'MATCHED'`. This opens an edit dialog for the director to modify trip data.

**Root cause:** `TripDetail.tsx` is shared between accountant and director routes but has **no role-based guards** on any action buttons. It does not call `useAuth()` to check the user's role before rendering buttons.

Browser-verified: logged in as `giamdoc`, navigated to `/director/trip/9`, observed "Chốt chuyến" button rendered and clickable.

## Impact

- Directors can accidentally (or intentionally) lock/unlock trips, match work orders to trips, and edit trip data — all of which are accountant-exclusive operations.
- Data integrity risk: director changes bypass the accountant workflow review.
- Spec violation: "Verify no create/edit buttons anywhere" for giamdoc.

## Recommendation

Add a role check in `TripDetail.tsx` so that action buttons are only rendered for the `accountant` role:

```tsx
const { user } = useAuth()
const canEdit = user?.role === 'accountant'

// Then guard all action buttons:
{canEdit && trip.status !== 'MATCHED' && (
  <button onClick={handleOpenEdit} ...>Sửa</button>
)}
{canEdit && trip.status !== 'COMPLETED' && (
  <button onClick={() => setShowMatchDialog(true)} ...>Khớp chuyến</button>
)}
{canEdit && (
  <ConfirmationCheckbox ... label="Chốt chuyến" />
)}
```

Additionally, the backend `/api/v1/trip-orders/:id/confirm` endpoint should enforce that only `accountant` and `superadmin` roles can call it (returning 403 for director).

## Files to Change

- `frontend/src/pages/accountant/TripDetail.tsx` — add `canEdit` role guard on all mutating buttons
- `backend/app/contexts/billing/interface/routers/` (or similar) — add role check on confirm endpoint

## Resolution

Added `useAuth()` role guard in `TripDetail.tsx`. Action buttons (Sửa, Khớp chuyến, Chốt chuyến, Bỏ match) now only render for `accountant` and `superadmin` roles. Director users see read-only trip details.

**Files changed:**
- `frontend/src/pages/accountant/TripDetail.tsx` — added `canEdit` flag from `useAuth()`, guarded all 4 action buttons
