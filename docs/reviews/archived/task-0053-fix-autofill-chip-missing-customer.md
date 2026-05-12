# Task 0053 — Fix Auto-fill Chips Not Populating Khách hàng Field

**Type:** Bug
**Severity:** 🟡 Major
**Source:** BizFlow QA v6 BF-05 / UIUX v6 UX-11

## Problem

Clicking a quick-fill route chip on the Tạo chuyến form populates Điểm lấy and Điểm trả
but NOT the Khách hàng field. The "missing fields" indicator still shows "khách hàng".

## Files to Check

- `frontend/src/components/shared/RecentTripSuggestions/RecentTripSuggestions.tsx`
  — calls `onSelect({ tripId, clientId: String(trip.partner.id), clientName, pickupLocation, dropoffLocation })`

- `frontend/src/pages/driver/useCreateWorkOrder.ts` — `handleRecentTripSelect`:
  ```ts
  setClientId(trip.clientId)  // This IS being called
  setPickupLocation(trip.pickupLocation)
  setDropoffLocation(trip.dropoffLocation)
  ```

The `handleRecentTripSelect` sets `clientId` correctly. But the client SELECT dropdown
in the form may not visually reflect the selection because:

## Likely Root Cause

In `frontend/src/pages/driver/CreateWorkOrder.tsx`, the Khách hàng field is likely a
`<select>` element with `value={clientId}`. If `clientId` is set to a valid partner ID
string but the `clients` array (loaded separately) hasn't loaded yet OR the partner ID
doesn't match the loaded clients list, the `<select>` shows blank.

Check the HTML select element — if it uses `value={clientId}` and `clientId = "3"` but
the loaded `clients` only has objects with `id: 3` (number not string), there may be a
type mismatch preventing the selection from being displayed.

## Fix

In the Khách hàng `<select>`:
```tsx
<option value="">Chọn khách hàng</option>
{clients.map(c => (
  <option key={c.id} value={String(c.id)}>{c.name}</option>
))}
```
Ensure `value={clientId}` and option values are both strings. Also ensure `clients` is
loaded before chips are shown, or that selecting a chip that sets `clientId` also forces
a clients re-fetch if the list is empty.

Also verify that `trip.partner.id` in `RecentTripSuggestions` is the same ID as the 
partner IDs returned by `apiClient.getClients()`.

## Acceptance Criteria

- Clicking a chip fills Khách hàng, Điểm lấy, AND Điểm trả simultaneously
- "Còn thiếu: khách hàng" no longer appears after a chip click
