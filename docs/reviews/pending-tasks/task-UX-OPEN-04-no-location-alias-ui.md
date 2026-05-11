# UX-OPEN-04 — No Location Alias Management UI

**Severity:** 🔴 Critical  
**Type:** Missing Feature  
**Layer:** Frontend  
**Affected Role/Flow:** ketoan — Settings; Backend — match suggester  
**Status:** ⚠️ Still Present (verified QA v9, 2026-05-11)

---

## Issue

The backend has a `location_aliases` table with PENDING/MATCHED/REJECTED statuses. The match suggester uses aliases for location comparison — meaning a driver work order with location "HPH" can match a trip order with location "Hải Phòng" if an alias exists.

However, **there is no UI anywhere to review or manage these aliases**. Settings menu (ketoan) has: Kỳ lương, Bảng giá, Khách hàng, Nhà thầu, Tài xế, Người dùng — no location or alias section.

This means:
- Aliases submitted by drivers (via GPS pin) accumulate as PENDING and are never confirmed
- Alias-aware auto-matching is effectively disabled
- Accountants cannot fix location mismatches without direct database access

---

## Expected Behavior

A **"Địa điểm & bí danh"** page should be accessible under ketoan Settings (and admin):

**For ketoan:**
- View list of PENDING aliases (alias string → canonical location)
- Confirm an alias → status becomes MATCHED; future work orders using this alias resolve correctly
- Reject an alias → status becomes REJECTED; can provide a rejection note
- Reopen a rejected alias

**For admin/superadmin:**
- Full CRUD on locations and aliases
- Merge two duplicate canonical locations (all references update)

---

## Recommendation

1. Create `/accountant/settings/locations` page with two tabs: **Địa điểm** (canonical locations) and **Bí danh** (aliases)
2. Bí danh tab: table with columns Bí danh | Địa điểm chính | Trạng thái | Ngày tạo | Actions (Xác nhận / Từ chối)
3. Backend: `PATCH /api/v1/location-aliases/{id}` endpoint to update status
4. Add the page link to the ketoan sidebar Settings section
