# Task 0057: Trip detail dialog shows "Đã huỷ" badge for matched orders

**Type:** Bug (NEW)
**Layer:** Frontend
**Severity:** Medium
**Affected Role/Flow:** Kế toán — Đơn hàng (trip detail dialog)

## Description

When clicking on a matched ("Đã khớp") trip order from the Đơn hàng page, the detail dialog shows TWO status chips simultaneously:
- `chip chip-error` "Đã huỷ" (red/error style)  
- `chip chip-success` "Đã khớp" (green/success style)

This is confusing and misleading — accountants see a red "Đã huỷ" badge on orders that are actually confirmed and matched.

Root cause (confirmed by code inspection in `TripDetail.tsx` lines 178-179 and 219-225):

```tsx
const statusVariant = trip.status === 'DRAFT' ? 'draft'
  : trip.status === 'PENDING' ? 'warning'
  : trip.status === 'COMPLETED' ? 'success'
  : 'error'   // <-- MATCHED falls here → chip-error

const statusLabel = trip.status === 'DRAFT' ? 'Nháp'
  : trip.status === 'PENDING' ? 'Chờ ghép'
  : trip.status === 'COMPLETED' ? 'Đã khớp'
  : 'Đã huỷ'  // <-- MATCHED falls here → "Đã huỷ"
```

The status map handles `DRAFT`, `PENDING`, `COMPLETED`, and everything else falls through to the error case. But the actual trip status for a matched order is `MATCHED` — not `COMPLETED`. Lines 220-225 then add a second "Đã khớp" chip specifically for `MATCHED`, creating a double-badge situation.

## Steps to Reproduce

1. Login as ketoan / admin123
2. Navigate to Đơn hàng
3. Click the "Đã khớp" filter chip
4. Click on any row to open the detail dialog
5. Observe two status chips: red "Đã huỷ" and green "Đã khớp"

## Expected

A matched order should show only one green "Đã khớp" chip. No red "Đã huỷ" badge should appear.

## Actual

Both "Đã huỷ" (red, chip-error) and "Đã khớp" (green, chip-success) appear simultaneously in the dialog header area.

## Fix Hint

In `frontend/src/pages/accountant/TripDetail.tsx`, update the status mapping on lines 178-179 to handle the `MATCHED` case:

```tsx
const statusVariant = trip.status === 'DRAFT' ? 'draft'
  : trip.status === 'PENDING' ? 'warning'
  : trip.status === 'MATCHED' ? 'success'   // ADD THIS
  : trip.status === 'COMPLETED' ? 'success'
  : 'error'

const statusLabel = trip.status === 'DRAFT' ? 'Nháp'
  : trip.status === 'PENDING' ? 'Chờ ghép'
  : trip.status === 'MATCHED' ? 'Đã khớp'   // ADD THIS
  : trip.status === 'COMPLETED' ? 'Đã khớp'
  : 'Đã huỷ'
```

Then remove or make conditional the duplicate `chip chip-success "Đã khớp"` chip rendered at lines 220-225 (it was added as a workaround but is no longer needed once the status map is correct).
