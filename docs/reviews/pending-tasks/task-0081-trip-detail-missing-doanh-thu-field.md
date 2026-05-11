# task-0081: Trip Detail Dialog Does Not Show Doanh thu (Revenue) Field

**Type:** Missing Feature / UX Friction
**Severity:** 🟢 Minor
**Layer:** Frontend
**Affected Role/Flow:** ketoan - Đơn hàng → Trip detail dialog
**URL:** https://phucloc.tingting.vip/accountant/trips (click any trip row)
**Viewport:** all

## Observation
Clicking a trip row in the accountant trips table opens a detail dialog ("Chi tiết chuyến") that shows:
- Khách hàng (Customer)
- Cung đường (Route)
- Lương + Phụ cấp (Salary + allowance)
- Container details
- Status and action button

The "Doanh thu" (Revenue) field is visible as a column in the trips table list but is absent from the trip detail dialog. The dialog shows "Lương + Phụ cấp: 200.000 ₫ + 50.000 ₫" (driver cost) but not the revenue amount the company charges the customer.

## Impact
Accountants opening a trip detail to verify billing cannot see the revenue figure in the detail view — they must close the dialog and read it from the table column. This is minor friction but inconsistent (the list shows revenue, the detail hides it).

## Recommendation
Add a "Doanh thu" row to the trip detail dialog, displaying the revenue amount. This is already available in the API response (it shows in the table). Place it alongside or near the "Lương + Phụ cấp" field for financial context.
