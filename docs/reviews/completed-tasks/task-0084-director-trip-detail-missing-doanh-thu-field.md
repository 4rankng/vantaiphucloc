# Task-0084: Director Trip Detail Page Missing "Doanh thu" (Revenue) Field

**Type:** Missing Feature / UX Friction
**Severity:** 🟡 Major
**Role/Flow:** giamdoc - Director trip detail (/director/trip/:id)
**Location:** https://phucloc.tingting.vip/director/trip/9 (and all director trip detail pages)
**Viewport:** all

## Observation
The director trip detail page at `/director/trip/:id` shows:
- Khách hàng (Customer)
- Cung đường (Route)
- Lương + Phụ cấp (Driver salary + allowance)
- Container details
- Status and action buttons ("Khớp chuyến", "Đã khớp", "Chốt chuyến")

The "Doanh thu" (Revenue) field is completely absent from this detail view, even though:
1. The director's trips list at `/director/trips` shows a "Doanh thu" column with real values (e.g., 550.000 ₫, 900.000 ₫)
2. The director is responsible for oversight of financials, including revenue

This is the same issue as task-0081 (filed for the accountant role) but also affects the director.

## Impact
The director cannot see the revenue figure for an individual trip without closing the detail page and reading it from the table. For a financial oversight role, this is a significant gap — the director needs to verify that revenue is correctly recorded, especially before "Chốt chuyến" (Confirming the trip with the customer). Approving a trip without seeing the revenue figure risks confirming incorrect billing.

## Recommendation
Add a "Doanh thu" row to the director trip detail page, displaying the revenue amount. Place it above or alongside the "Lương + Phụ cấp" row so financial figures are grouped together. This data is already available in the API response (it populates the list view).

## Resolution
Already fixed in current code. Director uses the same TripDetail.tsx component (router.ts line 110) which shows "Doanh thu" field at lines 264-267.
