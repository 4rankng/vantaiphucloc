# Vendor Trip Reconciliation — Implementation Tasks

## Phase 1: Database Migration

- [ ] 1.1 Create Alembic migration to drop 8 tables:
  - `customer_reconciliation_rows`
  - `customer_reconciliation_imports`
  - `vendor_reconciliation_rows`
  - `vendor_reconciliation_imports`
  - `matched_trips` (Reconciliation)
  - `booked_trip_containers`
  - `delivered_trip_containers`
  - `customer_import_templates`

- [ ] 1.2 In same migration, alter `booked_trips`:
  - ADD: `cont_number VARCHAR(50)`, `cont_type VARCHAR(10)`, `matched BOOLEAN DEFAULT FALSE`
  - DROP: `operation_type`, `status`
  - Data: copy from `booked_trip_containers`, set `matched=TRUE` where `matched_trips` row existed

- [ ] 1.3 In same migration, alter `delivered_trips`:
  - ADD: `cont_number VARCHAR(50)`, `cont_type VARCHAR(10)`, `matched BOOLEAN DEFAULT FALSE`, `vehicle_plate VARCHAR(20)`
  - DROP: `status`, `vehicle_id`, `gps_lat`, `gps_lng`, `gps_address`, `photo_url`, `photo_lat`, `photo_lng`, `photo_timestamp`, `photo_address`
  - Data: copy from `delivered_trip_containers`, copy plate from `vehicles` via `vehicle_id`, set `matched=TRUE` where `matched_trips` row existed

- [ ] 1.4 Run migration locally, verify data integrity

## Phase 2: Backend Domain & Models

- [ ] 2.1 Remove ORM models in `backend/app/models/domain.py`:
  - Delete: `BookedTripContainerORM`, `DeliveredTripContainerORM`, `ReconciliationORM`, `VendorReconciliationImportORM`, `VendorReconciliationRowORM`, `CustomerReconciliationImportORM`, `CustomerReconciliationRowORM`, `CustomerImportTemplateORM`
  - Update `BookedTripORM`: add `cont_number`, `cont_type`, `matched`; remove `operation_type`, `status`
  - Update `DeliveredTripORM`: add `cont_number`, `cont_type`, `matched`, `vehicle_plate`; remove `status`, `vehicle_id`, GPS/photo fields

- [ ] 2.2 Remove status enums in `backend/app/contexts/operations/domain/value_objects.py`:
  - Delete `BookedTripStatus` and `DeliveredTripStatus` classes

- [ ] 2.3 Update domain entities in `backend/app/contexts/operations/domain/entities.py`:
  - `BookedTrip`: add `cont_number`, `cont_type`, `matched`; remove `operation_type`, `status`
  - `DeliveredTrip`: add `cont_number`, `cont_type`, `matched`, `vehicle_plate`; remove `status`, `vehicle_id`, GPS/photo fields
  - Remove status transition methods (`mark_matched`, `unmark`)

- [ ] 2.4 Update domain exceptions in `backend/app/contexts/operations/domain/exceptions.py`:
  - Remove status-related exceptions (`InvalidStatusTransition`, etc.)

- [ ] 2.5 Update domain repository interfaces in `backend/app/contexts/operations/domain/repositories.py`:
  - Remove `status: DeliveredTripStatus` parameters
  - Remove `set_status()` batch methods

- [ ] 2.6 Update all schemas in `backend/app/schemas/`:
  - Remove status fields from input/output schemas
  - Add `matched`, `cont_number`, `cont_type`, `vehicle_plate`
  - Remove container-related schemas

- [ ] 2.7 Update enums in `backend/app/models/enums.py` and `backend/app/schemas/_enums.py`:
  - Remove `DeliveredTripStatus`, `BookedTripStatus`

- [ ] 2.8 Update mappers in `backend/app/contexts/operations/infrastructure/mappers.py`:
  - Remove status/container mapping
  - Map new flat fields

## Phase 3: Backend Repositories & Services

- [ ] 3.1 Update `backend/app/contexts/operations/infrastructure/repositories.py`:
  - Replace all `status` filters with `matched` boolean
  - Remove container join queries
  - Add vendor_id filter support for delivered_trips

- [ ] 3.2 Update reconciliation service `backend/app/contexts/operations/application/reconciliation.py`:
  - Replace status transitions with `matched = True/False`
  - Remove Reconciliation table writes

- [ ] 3.3 Update bulk import service `backend/app/contexts/operations/application/bulk_import_service.py`:
  - Write `cont_number`, `cont_type` directly to trip row
  - Set `matched` instead of `status`
  - Remove container join table inserts

- [ ] 3.4 Update booked_trips service `backend/app/contexts/operations/application/booked_trips.py`:
  - Remove DRAFT/PENDING/CANCELLED/CONFIRMED status logic
  - Remove `cancel()`, `confirm()` if only status changes
  - Replace status checks with `matched`

- [ ] 3.5 Update delivered_trips service `backend/app/contexts/operations/application/delivered_trips.py`:
  - Replace all status references with `matched`
  - Remove status transition guards

- [ ] 3.6 Update matching strategy `backend/app/contexts/operations/infrastructure/wo_match_strategy.py`:
  - Simplify to 1:1 matching by `cont_number` on trip table (no joins)
  - Add fraud check: skip if booked_trip.matched already True

- [ ] 3.7 Update match helpers `backend/app/contexts/operations/infrastructure/_match_helpers.py`:
  - Remove status-related scoring if any

## Phase 4: Backend Routers

- [ ] 4.1 Rewrite vendor reconciliation router `backend/app/contexts/operations/interface/routers/vendor_reconciliation.py`:
  - Upload endpoint: accept vendor_id + Excel, parse SL sheet, insert into delivered_trips, auto-match, return summary
  - Remove old import/row-based endpoints

- [ ] 4.2 Update reconcile router `backend/app/contexts/operations/interface/routers/reconcile.py`:
  - Simplify match/unmatch to toggle `matched` boolean
  - Remove Reconciliation table references

- [ ] 4.3 Update auto_match router `backend/app/contexts/operations/interface/routers/reconcile/auto_match.py`:
  - Replace status checks with `matched`

- [ ] 4.4 Update booked_trips router `backend/app/contexts/operations/interface/routers/booked_trips.py`:
  - Remove status filters/updates
  - Remove cancel/confirm endpoints if they only changed status

- [ ] 4.5 Update delivered_trips router `backend/app/contexts/operations/interface/routers/delivered_trips.py`:
  - Remove status, add vendor_id filter
  - Update to use `vehicle_plate` instead of `vehicle_id`

- [ ] 4.6 Update suggested_routes router `backend/app/contexts/operations/interface/routers/suggested_routes.py`:
  - Remove CANCELLED status filter

- [ ] 4.7 Update dashboard `backend/app/contexts/platform/interface/routers/dashboard.py`:
  - Replace `status == "MATCHED"` with `matched == True`
  - Replace `status == "PENDING"` with `matched == False`

- [ ] 4.8 Update payroll `backend/app/contexts/payroll/application/use_cases.py`:
  - Replace `status == "MATCHED"` filters with `matched == True`

- [ ] 4.9 Update billing `backend/app/contexts/billing/infrastructure/settlement_loader.py`:
  - Replace `status != "CANCELLED"` with `matched` filter

- [ ] 4.10 Update identity repo `backend/app/contexts/identity/infrastructure/repositories.py`:
  - Replace status filter with matched

## Phase 5: Backend Workers & Excel

- [ ] 5.1 Update workers:
  - `backend/app/workers/tasks/stale_matched.py` — remove or rewrite (no more status flipping)
  - `backend/app/workers/tasks/earning_sync.py` — replace status with matched

- [ ] 5.2 Update Excel services:
  - `backend/app/contexts/operations/infrastructure/excel.py` — remove status columns
  - `backend/app/contexts/operations/infrastructure/excel/delivered_trip_export.py` — use matched/vehicle_plate
  - `backend/app/contexts/operations/infrastructure/excel/salary_export.py` — replace status with matched
  - `backend/app/contexts/operations/infrastructure/vendor_excel_service.py` — update for new schema

## Phase 6: Frontend

- [ ] 6.1 Update type definitions:
  - Remove `DeliveredTripStatus`, `BookedTripStatus`
  - Add `matched`, `cont_number`, `cont_type`, `vehicle_plate` to trip types
  - Remove container sub-types

- [ ] 6.2 Update DoiSoatPage `frontend/src/pages/accountant/DoiSoatPage.tsx`:
  - Remove status filter tabs → matched boolean filter
  - Add vendor filter dropdown ("All / Our trips / Vendor A / Vendor B")
  - Add vendor name column
  - Add "Upload Vendor Excel" button
  - Update columns: remove status pill, add matched pill, vehicle_plate, cont_number

- [ ] 6.3 Update ExcelImportDrawer `frontend/src/components/shared/ExcelImportDrawer.tsx`:
  - Add vendor selection mode (required dropdown)
  - Update to flat schema (no container sub-objects)

- [ ] 6.4 Update DeliveredTripDetailDrawer:
  - Remove GPS/photo sections
  - Show `vehicle_plate` instead of vehicle dropdown
  - Show `cont_number`/`cont_type` directly
  - Match suggestions work with matched boolean

- [ ] 6.5 Update API layer:
  - `frontend/src/services/api/vendorReconciliation.api.ts` — update upload endpoint
  - All trip-related APIs — update for new fields
  - `frontend/src/hooks/queries/vendor-reconciliation.ts` — update hooks

- [ ] 6.6 Update other affected pages:
  - Any page referencing `status` on trips → `matched`
  - Any page referencing `vehicle_id` → `vehicle_plate`
  - Remove photo upload/display components

## Phase 7: Cleanup & Testing

- [ ] 7.1 Remove all dead code (unused imports, functions, classes for old tables/statuses)

- [ ] 7.2 Update tests:
  - Update all backend tests for new schema
  - Remove tests for dropped tables
  - Update matching tests for 1:1 model
  - Add fraud detection test

- [ ] 7.3 End-to-end verification:
  - `pytest` passes
  - Upload vendor Excel → rows appear in DoiSoatPage
  - Auto-match → matched=TRUE where containers match
  - Fraud → flagged, not auto-matched
  - Vendor filter → see only vendor trips
  - Manual match/unmatch → toggles matched boolean
