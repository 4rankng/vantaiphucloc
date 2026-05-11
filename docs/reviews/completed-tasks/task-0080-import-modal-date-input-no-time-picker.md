# task-0080: Import Modal Date Input Is type="date" with No Time Component

**Type:** UX Friction
**Severity:** 🟢 Minor
**Layer:** Frontend
**Affected Role/Flow:** ketoan - Nhập đơn (Import trips modal)
**URL:** https://phucloc.tingting.vip/accountant/trips (click "Nhập đơn")
**Viewport:** all

## Observation
The Excel import modal ("Nhập đơn hàng") contains a "Ngày mặc định" (Default date) field rendered as `<input type="date">`. This provides only a date picker with no time component.

- `type="date"` — confirmed by DOM inspection (id="default-trip-date")
- No time selector present alongside the date input

Trip orders in the system include a time component (e.g., "11/05/2026 09:16"). The import's default date will be recorded without a time, which may default to midnight (00:00) or be stored as date-only, creating inconsistency with trips created via the driver app that have timestamps.

## Impact
If trip dates need time precision for sorting, salary period matching, or audit logs, a date-only default creates ambiguity. Trips imported on the same day may sort incorrectly relative to driver-created trips.

## Recommendation
Consider changing the import date field to `type="datetime-local"` if time precision matters for the import flow. Alternatively, add a note explaining that imported trips will use "start of day" (00:00) as the time component. At minimum, document the behavior so accountants understand what they're setting.

## Status: Deferred — Low Priority
Changing to datetime-local would affect all imported trips. Current behavior (date-only → midnight 00:00) is acceptable since Excel imports typically don't have time data. If time precision is needed later, change type="date" to type="datetime-local" in ImportOrders.tsx.

## Resolution (Updated)
Fixed: ImportOrders.tsx now uses `type="datetime-local"` for the default date input and row-level date inputs. The default date now includes the current time (HH:MM) instead of midnight 00:00.
