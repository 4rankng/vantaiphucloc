# Route Pricing Excel Import

## Goal

Add Excel import to the Cước tuyến page (`/accountant/settings/cuoc-tuyen`) so accountants can bulk-import route pricing from files like `DS PORT+CƯỚC TUYẾN.xlsx`.

## Excel Format

Flexible sheet name detection. The parser scans all sheets for one containing the expected header pattern:

| STT | CHỦ HÀNG | ĐIỂM ĐI | ĐIỂM ĐẾN | F20 | F40 | E20 | E40 | TÁC NGHIỆP |
|-----|----------|---------|----------|-----|-----|-----|-----|-------------|

Headers are matched case-insensitively with whitespace normalization. At minimum, `CHỦ HÀNG`, `ĐIỂM ĐI`, `ĐIỂM ĐẾN`, and at least one price column must be present.

Each row maps to one `RoutePricing` record with all 4 price fields.

## Architecture

### Backend Parser (`route_pricing/infrastructure/route_pricing_import.py`)

**Sheet detection**: Iterate all sheets, find first with matching header row. Header row may be at any position (scan rows 1-10).

**Row parsing**: Extract fields per row. Skip empty/aggregate rows (TỔNG, CỘNG, etc). Normalize operation type to valid enum values.

**Auto-matching**:
- Client: match `CHỦ HÀNG` against `Client.code` (exact, case-insensitive), then `Client.name` (contains, case-insensitive). Return `client_id` or `null` for unmatched.
- Locations: use existing `LocationResolverService` to resolve pickup/dropoff. Return `location_id` or `null` with suggestions.
- Operation type: normalize whitespace/case to match valid values (`XUẤT/NHẬP TÀU`, `CHUYỂN BÃI`, `LẤY VỎ HẠ HÀNG`, `CHẠY SÀ LAN`, `ĐÓNG KHO`).

**Preview data structure**:
```python
{
  "sheet_name": "CƯỚC TUYẾN",
  "rows": [
    {
      "client_raw": "HPH",
      "client_id": 5,
      "client_matched": true,
      "pickup_raw": "HECHUN",
      "pickup_location_id": 12,
      "pickup_matched": true,
      "dropoff_raw": "HẢI AN",
      "dropoff_location_id": 15,
      "dropoff_matched": true,
      "operation_type": "XUẤT/NHẬP TÀU",
      "operation_type_valid": true,
      "f20_price": 400000,
      "f40_price": 400000,
      "e20_price": null,
      "e40_price": null,
      "row_index": 2,
      "can_commit": true  # true when client + pickup + dropoff all matched
    }
  ],
  "stats": {
    "total": 155,
    "matched": 140,
    "unmatched_client": 10,
    "unmatched_location": 5
  }
}
```

### Backend API

Two new endpoints on the existing `route_pricings_router`:

**`POST /route-pricings/import-preview`**
- Accepts: multipart file upload
- Returns: preview data structure above
- Permission: `update RoutePricing`

**`POST /route-pricings/import-commit`**
- Accepts: `{ rows: [...] }` with `client_id`, `pickup_location_id`, `dropoff_location_id`, `operation_type`, and price fields
- Behavior: bulk upsert on `(client_id, pickup_location_id, dropoff_location_id, operation_type)`. Update prices if record exists, create if not.
- Returns: `{ created: int, updated: int, skipped: int }`
- Permission: `update RoutePricing`

### Frontend

**RoutePricingImportDialog** component (`components/route-pricing/RoutePricingImportDialog.tsx`):
- 2-step flow: upload → preview/commit
- Upload step: file picker with drag-and-drop
- Preview step: table showing all rows with match status badges (matched = green, unmatched = yellow)
- Only `can_commit: true` rows are included in commit payload
- Commit step: success stats

**RoutePricingPage** changes:
- Add "Nhập Excel" button (with FileSpreadsheet icon) next to existing "Thêm cước tuyến" button
- State for dialog open/close

## Scope

- In scope: import, preview, commit, auto-match, upsert
- Out of scope: manual editing of unmatched rows in preview, creating new clients/locations from import, export
