# task-0072: Table Column Header Casing Inconsistency

**Type:** Visual Bug
**Severity:** 🟢 Minor
**Layer:** Frontend
**Affected Role/Flow:** ketoan - Đơn hàng (trips table); giamdoc - Director trips view; ketoan - Khách hàng (clients table)
**URL:** https://phucloc.tingting.vip/accountant/trips, https://phucloc.tingting.vip/director/trips, https://phucloc.tingting.vip/accountant/settings/clients
**Viewport:** all

## Observation
In the trips table, column headers use inconsistent casing:
- "Ngày" — Title Case
- "Khách hàng" — Title Case
- "CONTAINER" — ALL CAPS
- "Doanh thu" — Title Case
- "TRẠNG THÁI" — ALL CAPS

Similarly in the clients table: "Tên", "SĐT", "MST" are mixed with "LOẠI" and "ĐỊA CHỈ" in ALL CAPS.

Note: SĐT and MST are abbreviations so all-caps is conventional, but "CONTAINER", "TRẠNG THÁI", "LOẠI", and "ĐỊA CHỈ" are full words unnecessarily capitalized.

## Impact
Inconsistent capitalization creates a visually noisy header row. It makes the UI look unpolished and departs from the otherwise clean design language used throughout the app.

## Recommendation
Standardize all column headers to Title Case (or sentence case). Convert "CONTAINER" → "Container", "TRẠNG THÁI" → "Trạng thái", "LOẠI" → "Loại", "ĐỊA CHỈ" → "Địa chỉ". Keep abbreviations like SĐT and MST in caps as they are standard Vietnamese abbreviations.

## Resolution
Already fixed in current code. TripList.tsx uses Title Case headers ("Container", "Trạng thái"). ClientList.tsx uses Title Case ("Tên", "SĐT", "MST", "Loại", "Địa chỉ"). No ALL CAPS headers remain.
