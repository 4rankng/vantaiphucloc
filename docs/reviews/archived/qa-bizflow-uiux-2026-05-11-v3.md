# QA Report — 2026-05-11 (Round 3)

**Tester:** QA Agent (automated)
**Date:** 2026-05-11
**App URL:** https://phucloc.tingting.vip/
**Previous round:** qa-bizflow-2026-05-11-v2.md

---

## Summary

4 bugs found across 2 roles (Kế toán and Tài xế). No new bugs found in Director or SuperAdmin roles. 3 of the 4 bugs are **regressions** — they were previously reported and supposedly fixed but are still present in production.

---

## Issues by Role

### Director (giamdoc)

| Area | Status | Notes |
|---|---|---|
| Login | PASS | Navigates to /director correctly |
| Dashboard KPIs (Tổng chuyến, Đã khớp, Chờ xử lý, Doanh thu) | PASS | All showing non-zero values; "Đã khớp" = 10 (was 0 in previous round — now fixed) |
| Layout (no sidebar, horizontal top nav) | PASS | Correct — no sidebar present |
| User Management (Quản lý tài khoản) | PASS | Shows 5 users, excludes SuperAdmin |
| Activity Log (Hoạt động gần đây) | PASS | Proper Vietnamese text, no garbled content |
| Notifications (Thông báo) | PASS | Empty state renders correctly |
| API errors | PASS | No 4xx/5xx errors on any API call |

### Accountant (ketoan)

| Area | Status | Notes |
|---|---|---|
| Login | PASS | Navigates to /accountant correctly |
| Sidebar (4 nav items) | PASS | Persistent sidebar present: Tổng quan, Đơn hàng, Ghép chuyến, Cài đặt |
| Dashboard KPIs | PASS | Realistic values, no zeros |
| Đơn hàng — Doanh thu column | PASS | Shows real values (550k, 900k, etc.) — not 0₫ |
| Đơn hàng — Filter chips | PASS | "Chờ ghép" and "Đã khớp" correct |
| Cài đặt > Khách hàng — Loại column | **FAIL** | Still shows "Cá nhân" for all companies → task-0059 |
| Cài đặt > Kỳ lương | PASS | Period 26/04 → 25/05 is correct for today (2026-05-11) |
| Ghép chuyến — Routes in cards | **FAIL** | Routes truncated with "..." in left panel → task-0062 |
| Ghép chuyến — Tuyến đường comparison | **FAIL** | Always shows "—" for both sides → task-0061 |
| API errors | PASS | No 4xx/5xx errors |

### Driver (taixe)

| Area | Status | Notes |
|---|---|---|
| Login | PASS | Navigates to /driver correctly |
| Layout (no sidebar) | PASS | No sidebar — correct for driver role |
| Work order cards (trip dates) | PASS | All trips are from today (2026-05-11); "Hôm nay" is correct for the current test data |
| Work order cards (routes) | PASS | Điểm lấy/Điểm trả visible in cards |
| Trip detail (Cung đường field) | PASS | Shows "Tân Cảng → Hiệp Phước" correctly |
| Driver earnings API | **FAIL** | /api/v1/driver/earnings returns 403 for all periods → task-0060 |
| Earnings amount displayed | PARTIAL | The earnings summary (3.270.000đ / 11 chuyến) is computed from work orders, not the earnings endpoint; the dedicated earnings breakdown is unavailable due to 403 |

### SuperAdmin (admin)

| Area | Status | Notes |
|---|---|---|
| Login | PASS | Navigates to /superadmin correctly |
| Layout (no sidebar) | PASS | Correct — horizontal nav only |
| User list | PASS | Shows all 6 users including SuperAdmin |
| Role filter tabs | PASS | SuperAdmin, Giám đốc, Tài xế, Kế toán tabs all correct |
| API errors | PASS | No 4xx/5xx errors |

---

## New Pending Tasks

| Task | Severity | Area | Summary |
|---|---|---|---|
| task-0059 | Medium | Kế toán — Khách hàng | "Loại" column shows "Cá nhân" for all companies (regression — fix in code but not deployed) |
| task-0060 | High | Tài xế — Earnings | Driver earnings API returns 403 (persistent regression — reported 3+ times) |
| task-0061 | Medium | Kế toán — Ghép chuyến | "Tuyến đường" comparison row hardcoded to None in backend |
| task-0062 | Low | Kế toán — Ghép chuyến | Work order route text truncated in left panel cards |

---

## Previously Fixed (Verified PASS)

- task-0055: Loại column — code fix exists in ClientList.tsx (but not deployed) → remains as task-0059
- task-0056: Driver trip dates showing "Hôm nay" for old trips — current data is all from today so cannot definitively verify; test data needs trips from multiple dates
- task-0057: Trip detail showing "Đã huỷ" badge for MATCHED trips — not reproduced, appears fixed
- task-0038/0047: Director "Đã khớp" KPI counter — VERIFIED FIXED (shows 10)
- task-0044/0050: Activity log garbled Vietnamese — VERIFIED FIXED

---

## Notes for Next QA Round

1. **Deploy frontend build**: The ClientList.tsx fix (task-0059) is in source but not in production. Run `pnpm build && deploy`.
2. **Driver earnings 403** (task-0060) has been reported in tasks 0043, 0048, 0058, and now 0060 — this fix has never made it to production. Escalate.
3. **Test data quality**: All work orders have the same date (2026-05-11 09:16). To properly test the "Hôm nay" date display bug (task-0056), seed work orders across multiple dates.
4. **Ghép chuyến Tuyến đường** (task-0061) is a backend code bug that is straightforward to fix.
