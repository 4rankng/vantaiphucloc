# task-0079: Location Alias Page Has No Manual Create Button for Accountant

**Type:** Missing Feature / UX Friction
**Severity:** 🟡 Major
**Layer:** Frontend
**Affected Role/Flow:** ketoan - Cài đặt → Địa điểm (/accountant/settings/locations)
**URL:** https://phucloc.tingting.vip/accountant/settings/locations
**Viewport:** all

## Observation
The "Địa điểm & bí danh" (Location Aliases) settings page only shows:
- A "Chờ duyệt" tab (pending aliases submitted by drivers)
- A "Tất cả" tab with status filters (Chờ duyệt, Đã xác nhận, Đã từ chối, Đã gộp)
- Currently: "Không có bí danh" (No aliases)

There is no button to manually create a new location alias from the accountant side. The only way aliases are added is when a driver submits one through the driver app, and the accountant approves/rejects it.

## Impact
Accountants cannot pre-populate the location alias dictionary without driver submissions. If the company adds a new port or warehouse, they must wait for a driver to encounter it and submit an alias before it can be configured. This is a significant bottleneck for onboarding new routes.

## Recommendation
Add an "Thêm địa điểm" (Add location) button on the locations page that allows accountants to manually create location aliases directly. The create form should support: canonical name, aliases, and GPS coordinates (optional).
