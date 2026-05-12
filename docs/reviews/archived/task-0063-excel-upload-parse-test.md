# Task 0063 — QA: Test Excel Upload & Parsing for Đơn Hàng Import

**Type:** QA / Bug Verification  
**Priority:** High  
**Affects:** ketoan — Nhập đơn hàng  
**Source:** Scheduled QA v9 + product owner instruction (2026-05-11)

---

## Background

Customer billing sheets (e.g., `Phúc Lộc - Shipside T4.26 HAP.xlsx`) have a specific structure. The import flow must parse these correctly. Test files are at:

```
/Users/dev/Documents/projects/vantaiphucloc/docs/don-hang/
  - Phúc Lộc - Shipside T4.26 HAP.xlsx
  - 2.GLORY SHANGHAI- 2612N.xlsx
  - 8.CONSCIENCE 2615N.xlsx
  - Loading list of HAIAN BETA 062S.xls
```

## Excel File Structure (confirmed from `Phúc Lộc - Shipside T4.26 HAP.xlsx`)

The main data is on the sheet **"Bảng kê SS"** (not Sheet1 or CUOC). Data starts at **row 14** (row 13 is header). Columns:

| Col | Field | Notes |
|-----|-------|-------|
| A | TT | Sequence number |
| B | SỐCONT | Container number (ISO 6346) |
| C | LOẠI | Container size: `20` or `40` (feet) |
| D | H/R | Cargo type: `H` = hàng (full cargo), `R` = rỗng (empty) |
| E | TÀU | Vessel name |
| F | CHUYẾN | Voyage number |
| G | NƠI LẤY CONTAINER | Pickup location |
| H | NƠI TRẢ CONTAINER | Dropoff location |
| I | SỐ XE VC | Vehicle plate number (links to driver's work order) |
| J | ĐƠN GIÁ | Unit price (VND, pre-VAT) |
| K | THUẾ GTGT (8%) | VAT = unit price × 8% |
| L | THÀNH TIỀN | Total = unit price + VAT |
| M | Ngày | Date of transport |
| N | Ký hiệu cước | Fuel price index band (integer, e.g., 5) |
| O | Giá dầu TB tháng | Average monthly fuel price (e.g., 34,832) |
| P | Nội dung HĐ | Invoice description (formula-generated) |

**One row = one container = one đơn hàng.**

---

## Test Steps

### Step 1: Upload via Import UI
1. Log in as `ketoan` / `admin123`
2. Navigate to the import đơn hàng page
3. Upload `Phúc Lộc - Shipside T4.26 HAP.xlsx`
4. Verify the preview shows rows from the **"Bảng kê SS"** sheet starting at row 14
5. Verify these fields are correctly parsed per row:
   - Container number (SỐCONT)
   - Container size: 20 or 40
   - Cargo type: H or R
   - Pickup location (NƠI LẤY)
   - Dropoff location (NƠI TRẢ)
   - Vehicle plate (SỐ XE VC) — used for matching to driver work orders
   - Date (Ngày)
   - Unit price (ĐƠN GIÁ)

### Step 2: Verify count
- The file has **421 data rows** (rows 14–434 on "Bảng kê SS")
- After import, verify ~421 đơn hàng are created (minus any empty rows)

### Step 3: Check other files
- Upload `2.GLORY SHANGHAI- 2612N.xlsx` — verify it also parses
- Upload `Loading list of HAIAN BETA 062S.xls` (old .xls format) — verify it's supported or gives a clear error

---

## Expected Behavior
- Parser reads the correct sheet by name ("Bảng kê SS") or by detecting the header row
- Each row becomes one đơn hàng with its own container number, route, size, and type
- Unit price from the file is stored as-is (for invoice reconciliation)
- The vehicle plate number is stored and available for matching with driver work orders

## Failure Indicators
- Wrong sheet parsed (e.g., reads Sheet1 or CUOC instead of Bảng kê SS)
- Header row (row 13) included as a data row
- Fields mapped to wrong columns
- Only first sheet loaded (misses multi-sheet structure)
- `.xls` format not supported

## Blocker

This is a QA verification task requiring manual browser interaction (file upload via UI). Cannot be automated in this task runner. Requires manual QA execution or Playwright E2E test setup.
