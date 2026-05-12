# Task 0042 — Fix Filter Chip Vocabulary: "Chờ khớp" → "Chờ ghép"

**Type:** Bug (Regression + Partial Fix)
**Severity:** 🟡 Major
**Reporter:** UX Audit v6 (2026-05-11) — finding UX-08 / NX15

## Problem

Both `/accountant/trips` (Đơn hàng) and `/accountant/work-orders` (Ghép chuyến) use "Chờ khớp" as the filter chip label for unmatched items. In v5, the Đơn hàng page was correctly fixed to "Chờ ghép". This has regressed, and Ghép chuyến previously used "Hoàn thành" (now correctly "Đã khớp" but "Chờ khớp" persists).

**Correct target vocabulary:**
- Unmatched items: **"Chờ ghép"** (waiting to be matched)
- Matched items: **"Đã khớp"** (already matched) — this is CORRECT on both pages

## Context

The product vocabulary standard:
- Trip orders waiting for reconciliation → "Chờ ghép" (not "Chờ khớp")
- Trip orders that have been reconciled → "Đã khớp" (correct)
- Dashboard KPI also uses "CHUYẾN CHƯA GHÉP" — consistent with "Chờ ghép" as the standard

## Affected Files

- `frontend/src/pages/accountant/TripOrdersPage.tsx` (or `Trips.tsx`) — filter chip config for Đơn hàng
- `frontend/src/pages/accountant/WorkOrdersPage.tsx` (or `MatchTrip.tsx`) — filter chip config for Ghép chuyến
- Possibly a shared filter config or status constants file

## Acceptance Criteria

1. On `/accountant/trips`: filter chips show `Tất cả | Chờ ghép | Đã khớp`
2. On `/accountant/work-orders`: filter chips show `Tất cả | Chờ ghép | Đã khớp`
3. The count chip (e.g., "20 chờ ghép") also uses the correct label
4. Filtering by "Chờ ghép" shows only unmatched items; "Đã khớp" shows only matched items
5. Status pills in list rows continue to use correct vocabulary (Chờ ghép / Đã khớp)

## Implementation Notes

- This is a pure label/string change, not a logic change
- The filter value passed to the API (e.g., `status=pending`) should remain unchanged — only the display label changes
- Estimated effort: 10 minutes
- Check if there is a shared `STATUS_LABELS` or `FILTER_CHIPS` constant — update once, applies to both pages
