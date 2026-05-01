# Implementation Summary — State Machine, ISO 6346, OCR, Status Updates

## Date
2026-04-30

## Overview
Implemented comprehensive state machine, ISO 6346 validation, OCR with Gemini, and updated status workflows for WorkOrder and TripOrder entities.

---

## Changes Made

### 1. State Machine Implementation

**File:** `backend/app/services/state_machine.py` (new)

**WorkOrder States:**
- `PENDING` — No match found yet
- `MATCHED` — Match found with TO, but missing pricing data
- `COMPLETED` — Match found with TO, pricing data complete

**WorkOrder Transitions:**
- `PENDING → COMPLETED` — match found + pricing data provided
- `PENDING → MATCHED` — match found, no pricing data
- `MATCHED → COMPLETED` — pricing data provided later

**TripOrder States:**
- `DRAFT` — Missing required info (containers, client, route, or pricing)
- `PENDING` — All info provided, ready for matching
- `COMPLETED` — Match found with WO
- `CANCELLED` — Cancelled (final state)

**TripOrder Transitions:**
- `DRAFT → PENDING` — all required fields provided
- `PENDING → COMPLETED` — match found with WO
- `DRAFT → CANCELLED` — while still in draft
- `PENDING → CANCELLED` — before matching
- Cannot cancel `COMPLETED` TOs

**Features:**
- Uses `state_machine` library with `@acts_as_state_machine` decorator
- State persisted in database (status field), machine re-initializes on restart
- Logging before/after each transition
- Optional callback for custom transition logic
- Crash-proof: state machine re-initializes from database state

---

### 2. ISO 6346 Container Number Validation

**File:** `backend/app/utils/iso6346.py` (new)

**Format:** `XXXX-NNNNNN-N`
- XXXX: 4 letters (owner code)
- NNNNNN: 6 digits (serial number)
- N: 1 digit (check digit)

**Validation:**
- Strict check: format + check digit calculation
- Check digit calculation: sum of (character_value × 2^position) % 11, with 10 → 0
- Letter mapping: A=10, B=12, C=13, ..., Z=38 (C=11 skipped in ISO 6346)

**Functions:**
- `normalize_container_number()` — Remove hyphens, convert to uppercase
- `validate_format()` — Check format XXXX-NNNNNN-N
- `calculate_check_digit()` — Calculate check digit for 10-character input
- `validate_check_digit()` — Validate check digit of 11-character input
- `validate_container_number()` — Full validation (format + check digit)
- `get_container_number_error()` — Get error message or None if valid

---

### 3. OCR Service with Gemini

**File:** `backend/app/services/ocr_service.py` (new)

**Features:**
- Extracts container numbers from images using Google Gemini API
- Max 2 attempts per user (tracked in-memory, production: use Redis)
- Validates extracted numbers against ISO 6346
- Returns: success, container_number, error, attempts_remaining

**Configuration:**
- `GEMINI_API_KEY` — API key (from env)
- `GEMINI_MODEL` — Model name (default: `gemini-2.5-flash`)
- `GEMINI_ENDPOINT` — API endpoint

**Prompt:**
```
Extract the container number from this image.
Container numbers follow ISO 6346 format: XXXX-NNNNNN-N
Return ONLY the container number, no additional text.
If you cannot find a valid container number, return "NONE".
```

**Workflow:**
1. Decode base64 image
2. Send to Gemini API with prompt
3. Parse response
4. Validate against ISO 6346
5. Return result with attempts remaining

**Error Handling:**
- Invalid base64
- HTTP errors (timeout, 4xx, 5xx)
- Parse errors
- Invalid format from AI

---

### 4. Work Order Updates

**File:** `backend/app/api/v1/work_orders.py`

**Changes:**
1. **Financials default to 0** — `unit_price`, `driver_salary`, `allowance`, `earning` all default to 0 on creation
2. **Status only tracks match state** — No longer uses pricing lookup for financials
3. **Pricing lookup for reference only** — Stores `pricing_id` if found, but doesn't use it for financials
4. **Added OCR endpoint** — `POST /work-orders/ocr-container`
   - Input: `{image_data: base64, mime_type: string}`
   - Output: `{success, container_number, error, attempts_remaining}`

**OCR Endpoint:**
- Validates base64 image
- Tracks attempts per user (in-memory for now)
- Calls `extract_container_number()` from OCR service
- Returns result with attempts remaining

---

### 5. Trip Order Updates

**File:** `backend/app/api/v1/trip_orders.py`

**Changes:**
1. **Auto-pricing on create** — Looks up pricing from `Pricing` table by `(client_id, work_type, route)`
   - If found: auto-fill `unit_price`, `driver_salary`, `allowance`, `pricing_id`
   - If not found: use values from request body (or defaults)
2. **Auto-determine initial status:**
   - `DRAFT` — missing required info (containers, client, route, or pricing)
   - `PENDING` — all info provided, ready for matching
3. **On match with WO:**
   - TO status → `COMPLETED`
   - (WO status handled in reconcile endpoint)

---

### 6. Reconciliation Updates

**File:** `backend/app/api/v1/reconcile.py`

**Changes:**
1. **Sync all salary fields from TO:**
   - `WO.driver_salary = TO.driver_salary`
   - `WO.allowance = TO.allowance`
   - `WO.earning = TO.driver_salary + TO.allowance`
   - `WO.unit_price` stays 0 (revenue tracked in TO only)
2. **Determine WO status based on TO pricing:**
   - If `TO.unit_price > 0` and `TO.driver_salary > 0` → `WO.status = COMPLETED`
   - Else → `WO.status = MATCHED`

---

### 7. Database Schema Updates

**File:** `backend/app/models/domain.py`

**Changes:**
1. **WorkOrder status comment** — Updated to `PENDING | MATCHED | COMPLETED`
2. **TripOrder status comment** — Updated to `DRAFT | PENDING | COMPLETED | CANCELLED`

**Migration:** `backend/alembic/versions/006_update_status_enums.py`

**Migration logic:**
- WorkOrder: `PRICED → MATCHED`, `MATCHED (with pricing) → COMPLETED`
- TripOrder: `CONFIRMED → PENDING`, `INVOICED → COMPLETED`

---

### 8. Schema Updates

**File:** `backend/app/schemas/domain.py`

**Changes:**
1. **Added status enums:**
   - `WorkOrderStatus` (PENDING, MATCHED, COMPLETED)
   - `TripOrderStatus` (DRAFT, PENDING, COMPLETED, CANCELLED)
2. **Added OCR schemas:**
   - `ContainerOCRRequest` — `{image_data: str, mime_type: str}`
   - `ContainerOCRResponse` — `{success, container_number, error, attempts_remaining}`

---

### 9. Frontend Updates

**File:** `frontend/src/data/domain.ts`

**Changes:**
1. **Updated status types:**
   - `WorkOrderStatus` — `'PENDING' | 'MATCHED' | 'COMPLETED'`
   - `TripOrderStatus` — `'DRAFT' | 'PENDING' | 'COMPLETED' | 'CANCELLED'`
2. **Updated status badges:**
   - `getWorkOrderStatusBadge()`
     - PENDING: "Chờ đối soát" (warning)
     - MATCHED: "Đã đối soát (chờ giá)" (info)
     - COMPLETED: "Hoàn thành" (success)
   - `getTripOrderStatusBadge()`
     - DRAFT: "Nháp" (neutral)
     - PENDING: "Chờ đối soát" (warning)
     - COMPLETED: "Hoàn thành" (success)
     - CANCELLED: "Đã huỷ" (danger)

---

### 10. Configuration Updates

**File:** `backend/.env.example`

**Added:**
```
# Gemini AI (for container OCR)
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.5-flash
```

**File:** `backend/requirements.txt`

**Added:**
```
# State machine
state_machine>=0.3.0
```

---

### 11. Documentation Updates

**File:** `BizLogic.md`

**Updated sections:**
1. **Work Order Lifecycle** — New status flow
2. **Work Order Business Rules** — Updated to reflect no auto-pricing, OCR workflow
3. **Trip Order Lifecycle** — New status flow
4. **Trip Order Business Rules** — Added auto-pricing on create, status determination, cancel rules
5. **Reconciliation Flow** — Updated WO status determination, financial sync
6. **Reconciliation Rules** — Added categories for UI (matched, matched_but_required_price_data, not_match)
7. **New Section 10: State Machine & Validation**
   - 10.1 Work Order State Machine
   - 10.2 Trip Order State Machine
   - 10.3 ISO 6346 Container Number Validation (includes OCR workflow)

---

## Testing

### Python Imports
```bash
cd backend
.venv/bin/python3 -c "from app.services.state_machine import WorkOrderStateMachine, TripOrderStateMachine; from app.utils.iso6346 import validate_container_number; print('OK')"
```

### Syntax Check
```bash
cd backend
.venv/bin/python3 -m py_compile app/services/state_machine.py app/utils/iso6346.py app/services/ocr_service.py
```

---

## Next Steps

### Immediate (Before Deployment)
1. **Test state machine transitions** — Create WO, match to TO, verify status changes
2. **Test ISO 6346 validation** — Try valid/invalid container numbers
3. **Test OCR endpoint** — Upload images, verify extraction and validation
4. **Test TO auto-pricing** — Create TO with/without pricing, verify status
5. **Test reconciliation** — Match WO to TO, verify financial sync and status
6. **Run migration** — `alembic upgrade head`

### Future Enhancements
1. **Store OCR attempts in Redis** — Currently in-memory, will reset on restart
2. **Auto-trigger MATCHED → COMPLETED** — When new bang gia created, auto-update matched WOs
3. **Outstanding debt auto-update** — When TO → INVOICED, add to client debt
4. **Deductions system** — Implement `total_deduction` in salary calculation

---

## Deployment Notes

### Environment Variables Required
- `GEMINI_API_KEY` — Required for OCR functionality
- `GEMINI_MODEL` — Optional (default: gemini-2.5-flash)

### Migration
Run migration on production:
```bash
cd backend
alembic upgrade head
```

### Package Installation
Install new dependency:
```bash
cd backend
pip install state_machine
```

---

## Summary of Key Business Logic Changes

### Before
- WO financials auto-filled from pricing on creation
- WO status: PENDING/PRICED/MATCHED
- TO status: DRAFT/CONFIRMED/INVOICED/CANCELLED
- No OCR for container numbers
- No ISO 6346 validation
- No state machine enforcement

### After
- WO financials default to 0, synced from TO on match
- WO status: PENDING/MATCHED/COMPLETED (tracks match + pricing)
- TO status: DRAFT/PENDING/COMPLETED/CANCELLED (tracks info completeness)
- OCR with Gemini (2 attempts max)
- Strict ISO 6346 validation
- State machine enforces valid transitions
- Auto-pricing on TO creation
- Auto-determine TO status on create

---

## Files Modified

### Backend
- `backend/app/services/state_machine.py` — NEW
- `backend/app/utils/iso6346.py` — NEW
- `backend/app/services/ocr_service.py` — NEW
- `backend/app/api/v1/work_orders.py` — Modified
- `backend/app/api/v1/trip_orders.py` — Modified
- `backend/app/api/v1/reconcile.py` — Modified
- `backend/app/models/domain.py` — Modified (status comments)
- `backend/app/schemas/domain.py` — Modified (enums, OCR schemas)
- `backend/alembic/versions/006_update_status_enums.py` — NEW
- `backend/requirements.txt` — Modified (added state_machine)
- `backend/.env.example` — Modified (added Gemini config)

### Frontend
- `frontend/src/data/domain.ts` — Modified (status types, badges)

### Documentation
- `BizLogic.md` — Modified (lifecycles, workflows, new section 10)
- `IMPLEMENTATION_SUMMARY.md` — NEW (this file)

---

## Commit Message Suggestion

```
feat: implement state machine, ISO 6346 validation, OCR with Gemini

- Add state machine for WorkOrder (PENDING/MATCHED/COMPLETED)
- Add state machine for TripOrder (DRAFT/PENDING/COMPLETED/CANCELLED)
- Implement strict ISO 6346 container number validation
- Add OCR service with Gemini API (max 2 attempts per user)
- Update WO financials: default to 0, sync from TO on match
- Add auto-pricing on TO creation
- Auto-determine TO status based on required fields
- Update reconciliation: sync all salary fields, determine WO status
- Add migration 006 for status enum updates
- Update frontend status types and badges
- Update BizLogic.md with new workflows

Closes: #issue-number (if applicable)
```

## Additional Updates Made After Initial Implementation

### Frontend TripOrderCard Component
- **File:** `frontend/src/components/shared/TripOrderCard/TripOrderCard.tsx`
- **Changes:** Updated STATUS_CONFIG to use new status values:
  - DRAFT: "Nháp" (neutral)
  - PENDING: "Chờ đối soát" (warning) — was CONFIRMED
  - COMPLETED: "Hoàn thành" (success) — was INVOICED
  - CANCELLED: "Đã huỷ" (error) — unchanged

### Backend Dashboard API
- **File:** `backend/app/api/v1/dashboard.py`
- **Changes:** 
  - Active trips query: Changed from `["DRAFT", "CONFIRMED"]` to `["DRAFT", "PENDING"]`
  - Driver salary query: Changed from `status == "MATCHED"` to `status.in_(["MATCHED", "COMPLETED"])`

### Backend Matching Service
- **File:** `backend/app/services/matching_service.py`
- **Changes:** Changed unmatched WO query from `["PENDING", "PRICED"]` to `"PENDING"`

### Droplet .env Configuration
- **File:** `/opt/vantaiphucloc/deploy/.env` on phucloc.tingting.vip
- **Changes:** Added Gemini AI configuration:
  ```
  # Gemini AI (for container OCR)
  GEMINI_API_KEY=your-gemini-api-key-here
  GEMINI_MODEL=gemini-2.5-flash
  ```

### Verification
All backend files compile successfully. All imports verified.

### Final File List

**Backend:**
- `backend/app/services/state_machine.py` — NEW
- `backend/app/utils/iso6346.py` — NEW
- `backend/app/services/ocr_service.py` — NEW
- `backend/app/api/v1/work_orders.py` — Modified
- `backend/app/api/v1/trip_orders.py` — Modified
- `backend/app/api/v1/reconcile.py` — Modified
- `backend/app/api/v1/dashboard.py` — Modified
- `backend/app/services/matching_service.py` — Modified
- `backend/app/models/domain.py` — Modified
- `backend/app/schemas/domain.py` — Modified
- `backend/alembic/versions/006_update_status_enums.py` — NEW
- `backend/requirements.txt` — Modified
- `backend/.env.example` — Modified

**Frontend:**
- `frontend/src/data/domain.ts` — Modified
- `frontend/src/components/shared/TripOrderCard/TripOrderCard.tsx` — Modified

**Droplet:**
- `/opt/vantaiphucloc/deploy/.env` — Updated

**Documentation:**
- `BizLogic.md` — Modified
- `IMPLEMENTATION_SUMMARY.md` — NEW

## Additional Update: Trip Order Cancel Endpoint

### Cancel Endpoint Added
- **File:** `backend/app/api/v1/trip_orders.py`
- **Endpoint:** `PUT /trip-orders/{trip_order_id}/cancel`
- **Access:** accountant, superadmin
- **Logic:**
  - Can only cancel DRAFT or PENDING trip orders
  - Cannot cancel COMPLETED trip orders (returns 400 error)
  - Cannot cancel already CANCELLED trip orders (returns 400 error)
  - On successful cancel: status → CANCELLED
  - Linked work orders remain in their current state (accountant must manually fix them if needed)

### State Machine Integration
- Uses `initialize_to_state_machine()` to validate current status
- Enforces business rule: DRAFT/PENDING → CANCELLED only
- Prevents invalid transitions (e.g., COMPLETED → CANCELLED)

### Verification
All code compiles successfully. All imports verified.

---

## Final Verification Checklist

### Core Features Implemented
- ✅ State machine for WorkOrder (PENDING/MATCHED/COMPLETED)
- ✅ State machine for TripOrder (DRAFT/PENDING/COMPLETED/CANCELLED)
- ✅ ISO 6346 strict validation
- ✅ OCR service with Gemini (2 attempts max)
- ✅ WO financials default to 0, sync from TO on match
- ✅ TO auto-pricing on create
- ✅ TO auto-determine status (DRAFT vs PENDING)
- ✅ Reconciliation with financial sync
- ✅ TO cancel endpoint (DRAFT/PENDING → CANCELLED)
- ✅ Status enum updates (migration 006)
- ✅ Dashboard API updates
- ✅ Matching service updates
- ✅ Frontend status updates
- ✅ Droplet .env configured

### Future Features (Not Yet Implemented)
- Outstanding debt auto-update
- Deductions system
- Vehicle management
- Partner management
- Monthly revenue chart
- Report generation

These are marked as v1.1 features in BizLogic.md.

