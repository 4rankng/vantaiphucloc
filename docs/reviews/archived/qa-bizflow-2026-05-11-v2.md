# QA Business Flow Audit — 2026-05-11 v2

**Tester:** Claude (Senior QA Agent)
**Date:** 2026-05-11
**App URL:** https://phucloc.tingting.vip/
**Scope:** Full business flow audit across all three roles after latest deployment

---

## Summary

| Category | Count |
|---|---|
| Previously-fixed bugs VERIFIED working | 6 |
| Previously-fixed bugs STILL BROKEN (regression) | 3 |
| NEW bugs found | 1 |
| **Total issues requiring action** | **4** |

---

## Verified Fixes (Working Correctly)

The following items from the prior fix list were confirmed working:

1. **Doanh thu column** — Đơn hàng page shows real values (550.000 ₫ – 900.000 ₫). ✓
2. **Director "Đã khớp" KPI** — Shows 10 (not 0). ✓
3. **Filter chips vocabulary** — Shows "Chờ ghép" / "Đã khớp" (not "Chờ khớp"). ✓
4. **Director sidebar removed** — Director uses a horizontal NavStrip, no sidebar. ✓
5. **Activity log copy** — Shows proper Vietnamese text ("Kế toán đã ghép chuyến #1"). ✓
6. **Auto-fill chips** — Clicking a chip (HAP, PAN, etc.) correctly populates Khách hàng, Điểm lấy, Điểm trả fields. ✓
7. **Work order cards show route** — Ghép chuyến page shows routes correctly (not "—"). ✓
8. **Driver job detail route** — Job detail shows "Cung đường: Tân Cảng → Hiệp Phước" (not "-"). ✓
9. **Salary period** — Kỳ lương shows "26/04 → 25/05" which is correct for current date 11/05/2026. ✓

---

## Issues Found

### Issue 1 — Regression (task-0055)

**Type:** Bug (Regression)
**Layer:** Frontend + Backend
**Affected Role/Flow:** Kế toán — Cài đặt > Khách hàng
**Severity:** Medium

**Description:** The "Loại" column on the Khách hàng settings page shows "Cá nhân" for every client record, including companies clearly named "Công ty TNHH HAP", "Công ty TNHH HẢI AN", etc.

The `Partner` TypeScript interface in `domain.ts` has no `type` field. `ClientList.tsx` line 131 reads `c.type === 'company'`, which is always `undefined`, so all records render as "Cá nhân". The API response from `/api/v1/partners` confirms no `type` field is returned — only `partner_type` (`client`/`vendor`) and `partner_role` (`factory`/`shipping_line`). The fix from task-0036 was never fully implemented (field missing from backend schema).

---

### Issue 2 — Regression (task-0056)

**Type:** Bug (Regression)
**Layer:** Backend (data)
**Affected Role/Flow:** Tài xế — Dashboard (trip list + trip detail)
**Severity:** Medium

**Description:** All driver trip cards still show "Hôm nay · 09:16" regardless of actual trip date. All 11 work orders returned by `/api/v1/work-orders?driver_id=4` have `trip_date: null`. The frontend falls back to `created_at` which is all the same seed timestamp (2026-05-11T01:16:25Z). The trip detail page also shows "Thời gian: 11/05/2026 09:16" for all trips. Tasks 0046 and 0051 were marked as fixed, but the underlying data was not updated.

---

### Issue 3 — NEW Bug (task-0057)

**Type:** Bug (NEW)
**Layer:** Frontend
**Affected Role/Flow:** Kế toán — Đơn hàng > Trip detail dialog
**Severity:** Medium

**Description:** Clicking a "Đã khớp" order opens a detail dialog that shows TWO status chips simultaneously: a red `chip-error` "Đã huỷ" AND a green `chip-success` "Đã khớp". This is confusing and misleading.

Root cause: In `TripDetail.tsx` lines 178-179, the `statusVariant`/`statusLabel` ternary chain handles `DRAFT`, `PENDING`, `COMPLETED` but not `MATCHED`. Since actual matched orders have `status === 'MATCHED'`, they fall through to the default `'error'` / `'Đã huỷ'` case. Lines 220-225 then add an additional `chip-success "Đã khớp"` chip for MATCHED orders, resulting in two chips showing.

Fix: Add `trip.status === 'MATCHED' ? 'success' : ...` and `trip.status === 'MATCHED' ? 'Đã khớp' : ...` to the ternary chains on lines 178-179, then remove the now-redundant secondary chip (lines 220-225).

---

### Issue 4 — Regression (task-0058)

**Type:** Bug (Regression)
**Layer:** Backend
**Affected Role/Flow:** Tài xế — Dashboard (earnings)
**Severity:** High

**Description:** `GET /api/v1/driver/earnings` returns HTTP 403 for users with `role = "driver"`. This was reported and supposedly fixed as tasks 0043 and 0048 but is still occurring on the live server.

Backend code (`policy.polar` line 82, `oso.py`) looks correct — the permission `read_own_salary` is defined for the driver role. The 403 on the live server likely indicates a **deployment issue**: the live container is running an old cached version of the policy that predates the fix.

Impact: The driver dashboard still shows a salary figure (computed locally from work-orders as a fallback), but the proper earnings API silently fails on every page load.

---

## Architecture Rule Check

| Role | Expected nav | Actual nav | Pass? |
|---|---|---|---|
| ketoan | Persistent sidebar | Sidebar present with 4 links | ✓ |
| taixe | No sidebar, header/top nav only | No sidebar, header buttons | ✓ |
| giamdoc | No sidebar, header/top nav only | Horizontal NavStrip (border-b nav) | ✓ |

---

## Task Files Created

- `task-0055-fix-client-type-loai-still-shows-ca-nhan.md`
- `task-0056-fix-driver-trip-date-still-shows-hom-nay.md`
- `task-0057-fix-trip-detail-matched-shows-da-huy-badge.md`
- `task-0058-fix-driver-earnings-403-still-present.md`
