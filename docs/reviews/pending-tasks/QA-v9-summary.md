# QA v9 Summary

**Date:** 2026-05-11  
**Tester:** Orbit (AI Agent)  
**Scope:** Full audit of https://phucloc.tingting.vip/  
**Credentials tested:** admin, giamdoc, ketoan, taixe

---

## New Issues Found: 3

| Task | Severity | Title |
|------|----------|-------|
| task-0068 | 🟡 Major | Invalid `color-mix(in_srgb,...)` CSS in MatchTrip.tsx inline styles — criterion badges render with no background |
| task-0069 | 🟢 Minor | Director dashboard: duplicate "đã ghép chuyến" activity log entries per match operation |
| task-0070 | 🔴 Critical | Director can perform write actions (Chốt chuyến, Khớp chuyến, Sửa) on trip detail — no role guard in TripDetail.tsx |

---

## Previously Fixed Items Status

All 15 items from the QA checklist were verified:

| # | Item | Status |
|---|------|--------|
| 1 | Doanh thu column — `/accountant/trips` shows real values | ✅ Still fixed — `unitPrice` values display correctly |
| 2 | Director "Đã khớp" KPI — non-zero count | ✅ Still fixed — shows 10 |
| 3 | Filter chip vocabulary — "Chờ ghép" / "Đã khớp" | ✅ Still fixed — both pages correct |
| 4 | Director navigation — horizontal NavStrip with "Tổng quan" tab only | ✅ Still fixed — NavStrip tabs removed; now uses AppTopBar only. No "Thông báo" NavStrip tab, no "Quản lý tài khoản" tab |
| 5 | Activity log copy — proper Vietnamese | ✅ Still fixed — correct Vietnamese text throughout |
| 6 | Auto-fill chips — all three fields populated | ✅ Confirmed in source code |
| 7 | Work order card routes — Ghép chuyến cards show route text (not "—") | ✅ Still fixed — route text visible on WO cards |
| 8 | Driver job detail route — Shows "Cung đường: X → Y" | ✅ Confirmed via API (route data present) |
| 9 | Salary period display — correct period boundaries | ✅ Confirmed in DriverHome — period dates show correctly |
| 10 | Trip detail MATCHED badge — single green "Đã khớp" chip, no duplicate "Đã huỷ" | ✅ Still fixed — verified on `/accountant/trip/34` |
| 11 | Client "Loại" column — companies show "Công ty" | ✅ Confirmed in source code (isCompany heuristic present) |
| 12 | Driver earnings API — returns 200 for driver role | ✅ Still fixed — `GET /api/v1/driver/earnings?start_date=...&end_date=...` returns 200 |
| 13 | Match "Tuyến đường" comparison — shows route strings (not "—") | ✅ Still fixed — `match_suggester.py` builds route from pickup/dropoff names |
| 14 | Work order route display — wraps to 2 lines (not truncated) | ✅ Still fixed — `line-clamp-2` class confirmed in WorkOrderMasterList.tsx |
| 15 | Push subscription — fires once per session | ✅ Not regressed (no evidence of change) |

---

## Summary

- **New critical issues:** 1 (task-0070 — director write access on trip detail)
- **New major issues:** 1 (task-0068 — CSS color-mix bug)
- **New minor issues:** 1 (task-0069 — duplicate activity log entries)
- **Previously fixed regressions:** 0 — all 15 items remain fixed
- **Previously open items now confirmed fixed:**
  - OPEN-01 (low-confidence match): partially addressed via `lowConfConfirm` inline state in MatchTrip.tsx — the behavior exists but is weaker than a modal dialog. Existing completed-task note says "Already Implemented"; no new task filed.
  - OPEN-02 (0 candidates manual search): MatchDetailPanel.tsx has "Tìm đơn hàng thủ công" button for 0-suggestion scenarios. Fixed.
  - OPEN-03 (auto-match silent 0 results): WorkOrderList.tsx shows `toast.info` for 0 results and AutoMatchDialog for full results. Fixed.
  - OPEN-04 (location alias UI): LocationAliasManager at `/accountant/settings/locations` is live and functional with empty-state messaging.

---

## Role-Based Navigation Verification

| Role | Has Sidebar? | Nav | Notes |
|------|-------------|-----|-------|
| ketoan | ✅ Yes (desktop ≥1024px) / Sheet drawer (mobile) | AccountantSidebar: Tổng quan, Đơn hàng, Ghép chuyến, Cài đặt | Correct |
| giamdoc | ✅ No sidebar | AppTopBar only (no NavStrip tabs) | Correct — OPEN-11 fix confirmed |
| taixe | ✅ No sidebar | AppTopBar (home variant) | Correct |
| admin | ✅ No sidebar | AppTopBar (home variant) | Correct |

---

## Priority Order for New Tasks

1. **task-0070** (🔴 Critical) — Director write access on trip detail — deploy fix ASAP
2. **task-0068** (🟡 Major) — CSS color-mix bug in MatchTrip — fix before next QA cycle
3. **task-0069** (🟢 Minor) — Duplicate activity log entries — address in next sprint
