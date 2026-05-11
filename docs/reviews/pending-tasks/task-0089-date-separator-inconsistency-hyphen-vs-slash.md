# Task-0089: Date Format Separator Inconsistency Across Views (Hyphen vs Slash)

**Type:** Visual Bug
**Severity:** 🟢 Minor
**Role/Flow:** giamdoc - Director dashboard; ketoan - Work orders and trips
**Location:** https://phucloc.tingting.vip/director (recent trips list); /accountant/work-orders; /accountant/trips
**Viewport:** all

## Observation
Short date formats use inconsistent separators across different views:

**Director dashboard** (`/director`) — Recent work orders list:
- Dates shown as **"10-05"**, **"09-05"**, **"08-05"** (hyphen separator: DD-MM)

**Accountant work orders** (`/accountant/work-orders`) — Work order cards:
- Dates shown as **"11/05"** (slash separator: DD/MM)

**Accountant trips** (`/accountant/trips`) — Trip rows:
- Dates shown as **"03/05"**, **"05/05"**, **"09/05"** (slash separator: DD/MM)

All dates follow DD/MM order, but the separator character differs: hyphens in the director view, slashes in the accountant view.

## Impact
Minor visual inconsistency. Users toggling between director and accountant views (or looking at exported data) may notice the difference and question whether the formats mean different things. In Vietnamese convention, dates typically use "/" as the separator (e.g., "10/05/2026").

## Recommendation
Standardize all short date displays to use the slash separator: DD/MM (e.g., "10/05"). Update the director dashboard's recent trips list to match the accountant format. Check date formatting utilities in the codebase — if both views use different formatters or locale configs, consolidate them.
