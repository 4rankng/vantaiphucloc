# task-0074: Driver Job Detail "Thu nhập" Field Shows "Chờ ghép" Status Badge

**Type:** UX Friction / Visual Bug
**Severity:** 🟡 Major
**Layer:** Frontend
**Affected Role/Flow:** taixe - Driver job detail (/driver/job/:id)
**URL:** https://phucloc.tingting.vip/driver/job/37 (and any unmatched job)
**Viewport:** all

## Observation
On the driver job detail page for an unmatched trip, the "Thu nhập" (Income) field displays the string "Chờ ghép" — which is a trip status label, not an income value. The detail shows:

```
Thu nhập
Chờ ghép
```

This means the component is rendering the trip's status chip/badge in place of a monetary value for the income row.

## Impact
A driver viewing their job detail sees a confusing label under "Thu nhập" where they expect an amount (or a clear "pending" placeholder). It conflates two different concepts (income amount vs. trip status) and may cause confusion about what "Chờ ghép" means in this context.

## Recommendation
For unmatched trips, display a monetary placeholder in the "Thu nhập" row such as "—" or "Chưa xác định (chờ ghép)". The trip status ("Chờ ghép" badge) should remain a separate, visually distinct element — not substitute for the income field value.
