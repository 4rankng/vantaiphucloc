# Vendor Trip Reconciliation — Final Design Spec

## Context

Phuc Loc uses external trucks (xe ngoai) from vendors to fulfill some customer orders. At month-end, vendors send Excel files listing the trips they completed. The system needs to import vendor trips, auto-match against customer orders (booked_trips) by container number, and flag mismatches/fraud.

This is also a major schema simplification: flatten container join tables into trip rows, replace status enums with a `matched` boolean, and drop 8 unused/complex tables.

## Decisions

1. Vendors do NOT get driver accounts — accountant uploads vendor Excel
2. Vendor pricing model TBD — revenue stays 0 for now
3. `status` column removed from both BookedTrip and DeliveredTrip → replaced by `matched` boolean
4. No lifecycle states (no CANCELLED/DRAFT/CONFIRMED/COMPLETED)
5. Container fields flattened into trip tables (no join tables)
6. `vehicle_id` FK removed from delivered_trips → replaced by `vehicle_plate` text field
7. GPS/photo fields removed from delivered_trips (not needed now)
8. Matching is 1:1 by container (one BookedTrip ↔ one DeliveredTrip)
9. Fraud detection: prevent duplicate matching
10. Vendor upload: required vendor dropdown, then Excel upload (SL sheet format, one file per month)
11. Manual matching: reuse existing DeliveredTripDetailDrawer

## Database Changes

### Tables to DROP (8):
- `booked_trip_containers`
- `delivered_trip_containers`
- `matched_trips` (Reconciliation)
- `customer_reconciliation_imports`
- `customer_reconciliation_rows`
- `vendor_reconciliation_imports`
- `vendor_reconciliation_rows`
- `customer_import_templates`

### `booked_trips` changes:
- ADD: `cont_number VARCHAR(50)`, `cont_type VARCHAR(10)`, `matched BOOLEAN DEFAULT FALSE`
- DROP: `operation_type`, `status`

### `delivered_trips` changes:
- ADD: `cont_number VARCHAR(50)`, `cont_type VARCHAR(10)`, `matched BOOLEAN DEFAULT FALSE`, `vehicle_plate VARCHAR(20)`
- DROP: `status`, `vehicle_id` (FK), `gps_lat`, `gps_lng`, `gps_address`, `photo_url`, `photo_lat`, `photo_lng`, `photo_timestamp`, `photo_address`

## Backend

### Vendor Excel Upload Flow:
1. Accountant selects vendor from dropdown
2. Uploads Excel file (SL sheet format, existing parser)
3. Parse rows → INSERT into `delivered_trips` (vendor_id set, matched=false, driver_id=NULL, revenue=0)
4. Auto-match against `booked_trips` using existing 7-point scoring (container 28%, locations 28%, etc.)
5. Score >= 0.8 → set matched=true on both trips. Fraud check: skip if booked_trip.matched already true.
6. Return summary (total, matched, unmatched, fraud count)

### Matching:
- Same algorithm as our own trips (trip_match_strategy.py)
- 1:1 by container (each trip row has one cont_number)
- Fraud: if booked_trip.matched=true already, flag instead of matching

## Frontend

### DoiSoatPage extensions:
- Remove status filter tabs → matched boolean filter
- Add vendor filter dropdown ("All / Our trips / Vendor A / Vendor B")
- Add vendor name column
- Add "Upload Vendor Excel" button → opens drawer with vendor selection
- Remove GPS/photo sections from detail drawer
- Show vehicle_plate instead of vehicle dropdown
- Matched shown as pill (green=true, gray=false)
