# Task 0062: Ghép chuyến — Work order route truncated with "..." in left panel cards

**Type:** Usability Issue
**Layer:** Frontend
**Severity:** Low
**Affected Role/Flow:** Kế toán — Ghép chuyến (work order list cards)

## Description

In the Ghép chuyến left panel, work order cards show the route as "Công ty TNHH PAN HẢI AN · Hiệp Phước → ..." — the destination is cut off with an ellipsis. The full route cannot be read without clicking into the card.

Example: W001002 shows "Công ty TNHH PAN HẢI AN · Hiệp Phước → ..." instead of "Công ty TNHH PAN HẢI AN · Hiệp Phước → Cát Lái".

## Steps to Reproduce

1. Login as ketoan / admin123
2. Navigate to Ghép chuyến
3. Look at work order cards in the left panel — routes with longer text are truncated

## Expected

The route "Điểm lấy → Điểm trả" should be fully visible or wrap to a second line. At minimum, the full route should be readable without interaction.

## Actual

Long routes are truncated with "..." cutting off the destination city.

## Fix Hint

In the work order list card component, increase the width allocation for the route text or change `truncate` to `line-clamp-2` (Tailwind) to allow two lines. The card is in the work order list panel.

Key files:
- `frontend/src/pages/accountant/work-orders/` — look for the card rendering component (likely `WorkOrderCard.tsx` or the list component that renders work order items in the Ghép chuyến page)
