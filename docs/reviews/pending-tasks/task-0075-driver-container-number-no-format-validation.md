# task-0075: Driver Work Order Form — Container Number Input Has No Format Validation

**Type:** UX Friction / Missing Feature
**Severity:** 🟡 Major
**Layer:** Frontend
**Affected Role/Flow:** taixe - Create work order (/driver/work-orders/new)
**URL:** https://phucloc.tingting.vip/driver/work-orders/new
**Viewport:** all

## Observation
The container number input field has a placeholder of "MSKU1234567" which implies the standard ISO container format (4 letters + 7 digits, e.g. MSKU1234567). However, entering an invalid value such as "INVALID" produces no inline validation error or format warning. The only feedback is the general summary "Còn thiếu: số cont, ảnh cont, khách hàng, điểm lấy, điểm trả" which does not mention format.

The Excel import flow (separate feature) presumably validates container numbers differently, creating the inconsistency noted in OPEN-05.

## Impact
Drivers can submit work orders with malformed container numbers, which will cause downstream matching failures. The lack of immediate visual feedback means the error surfaces later (or silently), adding friction and data quality issues.

## Recommendation
Add inline validation on the container number field:
- Pattern: `^[A-Z]{4}\d{7}$`
- Show a red helper text on blur: "Số container không hợp lệ (ví dụ: MSKU1234567)"
- Disable the "Xác nhận" button if the container number is present but invalid
- Align validation rules with the Excel import parser to ensure consistency (OPEN-05)
