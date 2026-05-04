# Gap analysis — PAN BK SL export

For every column on the customer's deliverable, where the data lives today and what (if anything) is missing.

## SL sheet — per-trip detail

| Customer column | Need | Status | Source / gap |
|---|---|---|---|
| STT | row counter | ✅ trivial | n/a |
| NGÀY ĐI | trip date | ✅ have | `TripOrder.trip_date` |
| CHỦ HÀNG | customer short code | ✅ have | `Client.code` (e.g. `PAN`); falls back to `client_name` if no code |
| SỐ CONTAINER | container # | ✅ have | `TripOrderContainer.container_number` |
| F20'/F40'/E20'/E40' | binary cont-type flag | ✅ have | derived from `TripOrderContainer.work_type` |
| SỐ XE CHẠY | tractor plate that ran the trip | ⚠️ **partial** | `WorkOrder.tractor_plate` reachable via `TripOrderWorkOrder` join — only populated once a trip is matched to a work order (status MATCHED/COMPLETED). Unmatched trips will show blank. |
| ĐIỂM ĐI / ĐIỂM ĐẾN | route endpoints | ✅ have | `TripOrder.pickup_location`, `TripOrder.dropoff_location` |
| SỐ CHUYẾN | always 1 per row | ✅ trivial | n/a |
| CƯỚC CHUYẾN | per-container price | ⚠️ **partial** | `TripOrder.unit_price` is trip-level. We split per container: 1 cont → full price; same-type N conts → equal split; mixed-type → look up each from `Pricing` table, fallback to equal split. Documented as assumption in spec. |
| TỔNG TT | row revenue | ✅ formula | `=L*M` |
| TÁC NGHIỆP | XUAT TAU / NHAP TAU / CHUYEN BAI | ❌ **missing** | Not stored. Could be derived if we knew which locations are "ports" vs "yards" vs "customer site". For now: **blank in v1**. Recommend adding `operation_type` to `TripOrder` later. |
| GHI CHÚ | "oke" | ✅ derived | written `oke` if `TripOrder.is_confirmed`; blank otherwise |

## BKTT sheet — settlement summary

| Customer column | Need | Status | Source / gap |
|---|---|---|---|
| STT | row counter | ✅ trivial | n/a |
| Tuyến (đi/đến) | route endpoints | ✅ have | aggregated from `TripOrder.pickup_location` + `dropoff_location` |
| Đơn vị tính | always `Chuyến` | ✅ trivial | hardcode |
| Loại cont (E/F × 20/40) split into hàng 20', hàng 40', vỏ | counts per group | ✅ have | aggregated from `TripOrderContainer.work_type` |
| Cộng Số lượng | row total | ✅ formula | `=E+F+G+H` |
| Đơn giá | avg unit price | ✅ formula | `=K/I` |
| Thành tiền | revenue per group | ✅ have | sum of `TripOrderContainer`-allocated revenue (uses the same per-container price rule as SL) |
| Ghi chú | Chuyển bãi / Nhập tàu | ❌ **missing** | same gap as TÁC NGHIỆP — leave blank in v1 |
| Đơn giá HĐ (col N) | reference contract price | n/a — we leave it out of v1 (reviewer scratch column, not on the official 12-col layout) |
| Bằng chữ (number-in-words) | Vietnamese reading of total | ✅ implemented | new helper `app/utils/number_to_words_vi.py` |

## Summary

**No new DB columns required for v1.** Everything except the three "operation type"–style fields can be produced from existing tables. The two genuinely-missing pieces (`TÁC NGHIỆP` on SL, `Ghi chú` on BKTT) share the same root: we don't track operation type. They're left blank in v1 with a clear note in the spec.

## Files added/changed

### Backend (new)
- `backend/app/services/customer_settlement_service.py` — assembles the per-container revenue split + groups data for both sheets.
- `backend/app/services/excel_pan_bk_sl.py` — openpyxl writer for the two-sheet workbook.
- `backend/app/utils/number_to_words_vi.py` — Vietnamese amount-in-words.
- `backend/app/api/v1/reports.py` — new router exposing `GET /reports/customer-settlement/export`.
- `backend/tests/test_customer_settlement.py` — unit tests on the data shaping + number-to-words.

### Backend (modified)
- `backend/app/api/v1/router.py` — register `reports_router`.

### Frontend (new)
- `frontend/src/pages/accountant/CustomerSettlementReport.tsx` — picker page (client + period) and download button.

### Frontend (modified)
- `frontend/src/routes.ts` — lazy import for new page.
- `frontend/src/router.ts` — `accountant/reports/customer-settlement` route.
- `frontend/src/components/shared/AccountantSidebar/AccountantSidebar.tsx` — add `Báo cáo` nav item.
- `frontend/src/services/reports.ts` — typed API helper.
