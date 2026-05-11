# task-0073: Driver Work Order List Shows "— đ" for Unmatched Trip Earnings

**Type:** Visual Bug
**Severity:** 🟡 Major
**Layer:** Frontend
**Affected Role/Flow:** taixe - Driver home / work order list
**URL:** https://phucloc.tingting.vip/driver
**Viewport:** all

## Observation
In the driver work order list, matched trips display earnings correctly as "+350.000 ₫", "+280.000 ₫", etc. However, unmatched ("Chờ ghép") trips show "— đ" — a dash followed by the Vietnamese currency abbreviation "đ". This appears to be a broken string interpolation where the earnings value resolves to null/undefined but the "đ" suffix from a currency formatter is still appended.

Example:
- "HAIAN · Công ty TNHH HẢI AN — đ Điểm lấy: Bình Dương Chờ ghép"
- "HAP · Công ty TNHH HAP — đ Điểm lấy: Bình Dương Chờ ghép"

## Impact
"— đ" is grammatically incorrect and looks broken. Drivers see an unprofessional display for their pending trips. The correct behavior should be either a plain "—" (dash only) or "Chưa xác định" (pending) for trips that haven't been priced yet.

## Recommendation
In the earnings display logic, when the trip is unmatched or earnings is null/0, render a plain "—" without the currency suffix. For example: `earnings ? formatCurrency(earnings) : '—'`.

## Resolution
Already fixed in current code. WorkOrderCard DriverCard (lines 146-148) shows plain "—" for unmatched trips without currency suffix. `formatCurrencyFull` is only called when `driverSalary > 0`.
