# UX-OPEN-05 — Container Validation Inconsistency Between Import and Driver Form

**Severity:** 🟡 Major  
**Type:** Bug / Data Integrity  
**Layer:** Both (Frontend + Backend)  
**Affected Role/Flow:** ketoan — Nhập đơn hàng; taixe — Tạo chuyến  
**Status:** ⚠️ Partially Verified (QA v9, 2026-05-11) — driver form validation confirmed strict; Excel import validation unconfirmed

---

## Issue

The driver's **Tạo chuyến** form validates container numbers strictly against the ISO 6346 standard:
- Requires format: 4 letters + 7 digits (e.g., `MSKU1234567`)
- Check digit is validated
- Invalid numbers disable the submit button

If the **Excel import** does not apply the same validation, trip orders with technically invalid container numbers can be created by the accountant — but the driver can never type the same number to create a matching work order, since their form rejects it.

This creates permanent unmatched orders that cannot be reconciled.

---

## Test Steps (manual QA required)

1. Find a container number from an imported trip order in the system
2. Log in as `taixe` / `admin123`
3. Navigate to Tạo chuyến
4. Type the same container number into the container field
5. Verify: does the driver form accept it? Or does it show a validation error?

If the driver form rejects a container number that exists in the system, this bug is confirmed.

---

## Expected Behavior

Both paths must use the **same validation algorithm**:
- Option A: Both validate ISO 6346 strictly (recommended — prevents bad data from entering)
- Option B: Both are lenient (accepts any alphanumeric string) — weaker, but consistent

The strictness level should be a shared constant/utility, not implemented independently in two places.

---

## Recommendation

1. Extract ISO 6346 validation into a shared backend utility (`app/core/container_validation.py`)
2. Apply it in both the driver work order creation endpoint AND the Excel import parser
3. On import: if a container number fails validation, flag it in the preview (warning, not hard block) so the accountant can correct before committing
4. Frontend: import preview should show a ⚠️ indicator on rows with invalid container numbers
