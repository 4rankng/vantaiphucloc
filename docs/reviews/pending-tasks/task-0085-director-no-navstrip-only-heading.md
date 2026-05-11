# Task-0085: Director Dashboard Has No NavStrip — "Tổng quan" Is a Heading, Not a Tab

**Type:** Missing Feature / UX Friction
**Severity:** 🟢 Minor
**Role/Flow:** giamdoc - Director Dashboard (/director)
**Location:** https://phucloc.tingting.vip/director
**Viewport:** all

## Observation
The director dashboard page at `/director` renders "Tổng quan" as a plain `<h1>` heading inside the main content area. There is no horizontal NavStrip (tab bar) visible.

The specification states: "giamdoc: horizontal NavStrip with 'Tổng quan' tab only. No sidebar." However, the current implementation has:
- No NavStrip component
- No tab navigation
- Just a heading "Tổng quan" in the page body

The only navigation available to the director is:
- "Xem tất cả" button (links to /director/trips)
- "Tài khoản" icon button (account menu with "Thông tin cá nhân" and "Đăng xuất")

There is no persistent tab bar or strip navigation. If the director were to have additional views in the future (e.g., a "Báo cáo" tab), there is no navigation infrastructure for it.

## Impact
Currently the director only has one main view so the missing NavStrip has no functional impact. However, it creates an inconsistency with the specification and means the director's layout has less navigation affordance than intended. If additional director views are added, this will need to be retrofitted.

## Recommendation
If the director is intended to have only one view long-term, update the spec to match (no NavStrip needed). If additional views are planned, scaffold the NavStrip now with "Tổng quan" as the single active tab so the pattern is established before expanding the director's feature set.
