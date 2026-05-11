# Bug-0072: Container Number Input Has No Format Validation

**Type:** UX Friction  
**Layer:** Frontend  
**Severity:** 🟡 Major  
**Affected Role/Flow:** Taixe - Sửa chuyến (Edit Work Order)  
**Viewport:** 375px (mobile-first)  
**Location:** https://phucloc.tingting.vip/driver/work-orders/{id}/edit — container number input field

## Observation
The container number input field (`placeholder="MSKU1234567"`) has no validation constraints: `maxLength=-1` (unlimited), `pattern=""` (no regex), `required=false`. A valid ISO container number follows the format: 4 uppercase letters + 7 digits (e.g., "OOLU7774229"). The field currently accepts any arbitrary text with no error feedback. Tested on work order 37.

## Impact
Drivers can submit invalid or malformed container numbers (e.g., "test", "12345", blank) that will fail matching downstream. The accountant's matching algorithm depends on accurate container numbers to calculate match scores. Bad data from the driver edit form will silently degrade match quality without any indication to the driver that their input was invalid.

## Recommendation
Add client-side validation to the container input:
```tsx
<input
  pattern="[A-Z]{4}[0-9]{7}"
  maxLength={11}
  required
  title="Số container phải có dạng 4 chữ HOA + 7 chữ số (vd: MSKU1234567)"
/>
```
Also convert input to uppercase automatically using `onChange` to prevent case errors. Show an inline error message if the pattern is not matched on blur.
