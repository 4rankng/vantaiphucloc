# Task-0082: "Nhập đơn" Import Dialog Has Different Fields and Actions on Work-Orders vs Trips Pages

**Type:** UX Friction / Inconsistency
**Severity:** 🟡 Major
**Role/Flow:** ketoan - Ghép chuyến and Đơn hàng
**Location:** /accountant/work-orders ("Nhập đơn" button) vs /accountant/trips ("Nhập đơn" button)
**Viewport:** all

## Observation
Clicking "Nhập đơn" from two different pages opens two different dialogs:

**From /accountant/work-orders:**
- Title: "Nhập đơn hàng"
- Fields: "Chọn khách hàng" (dropdown)
- File upload area: "Kéo thả file vào đây / hoặc click để chọn file .xlsx / .xls"
- Action button: **"Tải lên"**
- No date field

**From /accountant/trips:**
- Title: "Nhập đơn hàng"
- Fields: "Khách hàng" (dropdown) + "Ngày mặc định" (date input)
- File upload area: "Kéo thả tệp Excel vào đây / hoặc bấm để chọn tệp · Hỗ trợ .xlsx, .xls"
- Action button: **"Phân tích tệp"**
- Has extra date field

The two dialogs have:
1. Different action button labels ("Tải lên" vs "Phân tích tệp")
2. Different file upload copy ("click" vs "bấm", "file" vs "tệp")
3. Different fields (no date on work-orders dialog, no date label on trips dialog header)

## Impact
Accountants who use both pages will encounter two subtly different import experiences for what appears to be the same workflow. The different button labels suggest different behaviors ("upload now" vs "parse first"). This creates confusion about which is the "correct" import flow and whether each produces the same result.

## Recommendation
1. Consolidate into a single import dialog component reused across both pages.
2. Standardize the action button label — "Phân tích tệp" is more descriptive and should be the standard (a two-step parse → confirm flow is better UX than a one-click upload).
3. Standardize copy: use "tệp" consistently (not "file"), and "bấm" vs "click" should match the design system's voice.
4. Add the "Ngày mặc định" field to the work-orders dialog if the trips dialog has it (or remove it from trips if it's not needed).

## Status: Deferred — Refactor Needed
Requires consolidating two import components (WorkOrderList's inline import vs TripList's ImportOrdersDialog) into a single shared component. The two flows have different backends (upload Excel for work orders vs parse+create for trip orders). Estimated effort: 4-8 hours.

## Resolution (Updated)
Partially fixed: Action button label standardized to "Phân tích tệp" and copy standardized to use "tệp"/"bấm" consistently in both dialogs. The remaining difference (no date field in work-orders dialog) is intentional — the work-orders upload flow uses a different backend (direct upload with client selection) than the trips import flow (parse + preview + create). Adding a date field to the work-orders dialog would require backend changes to support default date override.
