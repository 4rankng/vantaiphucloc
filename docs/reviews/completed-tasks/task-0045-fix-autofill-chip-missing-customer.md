# Task 0045 — Fix Auto-fill Chips in Tạo chuyến: Customer Field Not Populated

**Type:** Usability Bug
**Severity:** 🟢 Minor
**Reporter:** BizFlow QA v6 (2026-05-11) — finding BF-05 / UX-11

## Problem

In the driver's "Tạo chuyến" form (`/driver/work-orders/new`), clicking a quick-fill route chip (e.g., "PAN / Tân Cảng → Hiệp Phước") fills Điểm lấy and Điểm trả correctly, but does NOT fill the Khách hàng (customer) dropdown.

**Verified:** After clicking the PAN chip, "Còn thiếu: ảnh cont, khách hàng" — customer still required.

The chip label shows the client abbreviation "PAN" which maps to "Công ty TNHH PAN HẢI AN". The chip data should contain the client's ID to populate the customer field.

## Affected Files

- `frontend/src/pages/driver/CreateWorkOrder.tsx` (or `useCreateWorkOrder.ts`) — the chip click handler
- The component that renders the "TỰ ĐỘNG ĐIỀN" chips

## Acceptance Criteria

1. Clicking any quick-fill chip fills **all three** fields: Khách hàng, Điểm lấy, Điểm trả
2. The "Còn thiếu" validation message no longer includes "khách hàng" after a chip click
3. The customer dropdown shows the client name (e.g., "Công ty TNHH PAN HẢI AN") after chip click
4. The driver can still override the pre-filled customer after chip click

## Implementation Notes

```ts
// The chip click handler should call all three setters:
function handleChipClick(chip: AutoFillChip) {
  setCustomer(chip.clientId);       // Add this line
  setPickupLocation(chip.pickup);   // Already working
  setDropoffLocation(chip.dropoff); // Already working
}
```

- The chip data object likely has a `clientId` or `clientCode` field — pass it to the customer state setter
- The customer dropdown component needs to accept a programmatic selection (same as when user picks from the dropdown manually)
- If the customer dropdown uses a search/async pattern, ensure it can be set by ID without requiring user interaction
