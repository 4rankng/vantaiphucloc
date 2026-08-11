# Phase 01 — default accuracy window

## Files

- Modify `frontend/src/components/shared/data-display/OcrAccuracyChart/OcrAccuracyChart.tsx`
- Modify `backend/tests/test_ocr.py`

## Steps

1. Make the card's no-prop default 60 days; retain the optional prop for callers that need another range.
2. Add an API-level regression test with an OCR snapshot dated within the 60-day window but outside 30 days.
3. Run targeted backend and frontend validation.

## Risk and rollback

Only the card's default request range changes. Reverting the component default restores the old 30-day presentation without data migration or API-contract change.
