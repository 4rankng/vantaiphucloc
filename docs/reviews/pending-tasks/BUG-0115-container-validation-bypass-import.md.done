# BUG-0115: Container validation bypass in import pipeline

## Severity: Major
## Area: backend
## Files: `backend/app/contexts/operations/interface/routers/trip_orders.py` (_container_inputs), import pipeline

### Problem
Container number ISO 6346 validation is only enforced in the HTTP layer (`validate_container_number()` in `_container_inputs`). The domain entity's `add_container()` doesn't validate format. The Excel import pipeline may bypass the HTTP-layer validation entirely, allowing malformed container numbers into the database.

This creates a mismatch: drivers must type valid ISO 6346 numbers to match, but imported orders can have invalid numbers that never match anything.

### Solution
1. Move ISO 6346 validation into the domain entity's `add_container()` method
2. Ensure the import pipeline calls the same validation path
3. Add migration/script to flag existing invalid container numbers
4. Both create and import paths now guaranteed to validate

### Acceptance Criteria
- [ ] `add_container()` validates ISO 6346 check digit
- [ ] Import pipeline rejects rows with invalid container numbers (with clear error message)
- [ ] Driver form validation unchanged (still works)
- [ ] Existing valid containers not affected
