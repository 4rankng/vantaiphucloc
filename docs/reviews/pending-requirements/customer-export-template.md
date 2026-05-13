# Customer-facing Excel export — align to Phúc Lộc template

## Request (verbatim)

> Xuất dữ liệu sau khi các chuyến xe đã hoàn thành, bao gồm các dữ liệu đầy đủ để gửi cho khách hàng (file Excel). Phúc Lộc có mẫu thì gửi để làm theo mẫu cho nhanh.

## Current state

- `generate_doi_soat_excel` (backend/app/contexts/operations/infrastructure/excel.py:902) produces a per-partner workbook.
- Sheet name = partner name (truncated to 31 chars).
- Columns: `STT | Ngày chạy | Số cont | Loại | Điểm lấy | Điểm trả | Biển số xe | Số tàu`
- Triggered from `/accountant/trips` "Xuat doi soat" button → completed in `xuat-doi-soat.md`.
- One row per container; pulls trip orders for the partner in the date range regardless of MATCHED status.

## Gaps to close

1. **Request the master template from PL.** Ask Phúc Lộc to send the actual Excel they currently mail customers (headers, formatting, signature block, multi-sheet structure, summary totals, logo).
2. **Diff our output vs. the template** and adjust:
   - Header order / wording / merged cells / font / colors.
   - Summary row (totals per loại / totals VND).
   - Footer (signature, company info).
   - Sheet structure (per-trip vs per-container, multiple sheets per customer, etc.).
3. **Restrict to completed trips.** Confirm whether export should include only MATCHED trips (chuyến đã đi đã ghép) or all trips in range. Current behaviour: all trip orders regardless of MATCHED.
4. **Filename convention.** Confirm naming pattern (e.g. `DoiSoat_<KH>_<MM-YYYY>.xlsx`).

## Open questions for PL

- Send current Excel template used with customers.
- Should the export include unit price / total VND columns for invoicing, or is đối soát purely confirmation of which containers ran?
- One workbook per customer per period, or one workbook with one sheet per customer when running a batch?

## Acceptance criteria

- Generated Excel visually matches PL's template within a reasonable tolerance.
- Headers, sheet name, column order and types all match.
- Smoke test: export for one customer, open in Excel, no warnings, matches template side-by-side.
