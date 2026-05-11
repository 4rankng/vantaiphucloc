# UX-OPEN-07 — Driver Table Missing Biển Số Xe and Nhà Xe Columns

**Severity:** 🟢 Minor  
**Type:** Usability Issue  
**Layer:** Frontend  
**Affected Role/Flow:** ketoan — `/accountant/settings/drivers`  
**Status:** ✅ Partially Fixed — Biển số xe column already exists in DriverList.tsx (line 60). Nhà xe column blocked: backend Driver model has no `nhaXe` field.

---

## Issue

The driver table at `/accountant/settings/drivers` shows only 2 columns:
- **Tài xế** (name)
- **SĐT** (phone number)

Missing operationally critical columns:
- **Biển số xe** (vehicle plate number) — needed for matching with work orders and billing sheets
- **Nhà xe** (trucking company affiliation)

The vehicle plate is the primary link between a driver's work order and the client's billing Excel (`SỐ XE VC` column). Without it visible in the table, accountants must click into each driver record to verify assignments.

**QA v9 evidence:** Table confirmed to have only 2 columns in header.

---

## Expected Behavior

Driver table should show at minimum:

| Tài xế | SĐT | Biển số xe | Nhà xe |
|--------|-----|------------|--------|
| Nguyễn Văn A | 09xx | 15C-09877 | Phúc Lộc |
| ... | | | |

---

## Recommendation

1. Add `bien_so_xe` and `nha_xe` columns to the driver list API response (if not already present)
2. Add the two columns to the driver table component in the frontend
3. Biển số xe should be the 3rd column (after SĐT) given its operational importance
4. If the driver model doesn't yet have these fields, they need to be added to the driver schema and database
