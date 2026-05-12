# Bug-0070: Director Dashboard Shows "Dữ liệu tháng Tháng 5 2026" (Duplicate "Tháng")

**Type:** Visual Bug  
**Layer:** Frontend  
**Severity:** 🟢 Minor  
**Affected Role/Flow:** Giam doc - Tổng quan  
**Viewport:** all  
**Location:** https://phucloc.tingting.vip/director — subtitle under "Tổng quan" heading

## Observation
The subtitle on the director dashboard reads "Dữ liệu tháng Tháng 5 2026". The word "tháng" appears twice consecutively: once as part of the fixed label ("Dữ liệu tháng") and once as part of the dynamic month string ("Tháng 5 2026"). The correct text should be either "Dữ liệu tháng 5/2026" or "Dữ liệu Tháng 5, 2026".

## Impact
The duplicated word looks like a copy error and reduces the perceived quality of the interface. It is the first text a director sees after the page heading.

## Recommendation
Fix the string composition in the director dashboard component. Either:
- Strip the "Tháng " prefix from the dynamic month label before appending, or
- Change the static label from "Dữ liệu tháng " to "Dữ liệu " and let the dynamic value include "Tháng 5 2026".
