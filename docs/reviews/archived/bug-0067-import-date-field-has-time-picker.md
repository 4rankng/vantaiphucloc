# Bug-0067: Import Dialog "Ngày mặc định" Uses datetime-local (Includes Unnecessary Time Picker)

**Type:** UX Friction  
**Layer:** Frontend  
**Severity:** 🟢 Minor  
**Affected Role/Flow:** Ke toan - Nhập đơn hàng (Import)  
**Viewport:** all  
**Location:** https://phucloc.tingting.vip/accountant/trips?import=true — "Ngày mặc định" field in import dialog

## Observation
The "Ngày mặc định" (Default Date) input in the import dialog uses `type="datetime-local"`, which renders a combined date + time picker in the browser. The label says "Ngày mặc định" (date only), but the input accepts and displays a time component. There is no business requirement for a time to be attached to a default import date.

## Impact
Users are presented with an unnecessarily complex input (date + time) for a field that only needs a date. The time component adds confusion and may cause inconsistent data if some imports include a time and others do not. On some browsers, the time defaults to midnight and can cause off-by-one day errors in timezone edge cases.

## Recommendation
Change the input type from `type="datetime-local"` to `type="date"`. Update any downstream date parsing to accept date-only strings (YYYY-MM-DD). This aligns the UI with the label and simplifies the user experience.
