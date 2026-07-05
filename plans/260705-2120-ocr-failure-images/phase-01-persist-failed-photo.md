# Phase 1 — Persist failed-OCR photo (backend)

## Context

- OCR endpoint: `backend/app/contexts/operations/interface/routers/delivered_trips.py:191`
  (`ocr_container`). Already decodes `body.image_data` → `image_bytes`, has
  `body.mime_type`. Analytics write is wrapped in try/except (lines 218-246).
- Photo helper: `backend/app/contexts/operations/infrastructure/photo_storage.py`
  → `save_base64_photo(data_url)` returns `StoredPhoto(url, content_hash)`. Handles
  HEIC→JPEG. Url is `/photos/YYYY/MM/DD/<uuid>.jpg`.
- Model: `backend/app/models/domain.py:605` (`OcrDriverRequest`).
- Alembic gotcha ([[project_alembic_ops]]): revision-id slug ≤32 chars; current head is
  `0017_null_original_cont`.

## Requirements

- New nullable column `ocr_driver_requests.cont_photo_url` (String, length ~256).
- On OCR failure only, persist the image and store its URL on the row.
- Successful OCR runs must NOT touch disk for the photo.
- A photo-save failure must never break the OCR response or the analytics write.

## Files

- **Create** `backend/alembic/versions/0018_ocr_driver_photo.py`
- **Edit** `backend/app/models/domain.py` — add `cont_photo_url` column to `OcrDriverRequest`
- **Edit** `backend/app/contexts/operations/interface/routers/delivered_trips.py` — save
  photo on failure in `ocr_container`

## Steps

1. **Migration 0018.**
   - `revision = "0018_ocr_driver_photo"` (≤32 chars).
   - `down_revision = "0017_null_original_cont"`.
   - `upgrade()`: `op.add_column("ocr_driver_requests", sa.Column("cont_photo_url", sa.String(length=256), nullable=True))`.
   - `downgrade()`: `op.drop_column("ocr_driver_requests", "cont_photo_url")`.

2. **Model.** Add to `OcrDriverRequest`:
   ```python
   cont_photo_url = Column(String(256), nullable=True)
   ```
   Place after `provider`, before `__table_args__`. Add a one-line comment: photo captured
   only when OCR failed, for admin diagnosis.

3. **OCR endpoint.** In `ocr_container`, after `result = await extract_container_numbers(...)`
   and before the analytics try/except:
   - Compute the photo URL only on failure:
     ```python
     failed_photo_url: str | None = None
     if not result.get("success"):
         try:
             data_url = f"data:{body.mime_type};base64,{body.image_data}"
             failed_photo_url = save_base64_photo(data_url).url
         except Exception:
             _logger.exception("[OCR] failed to persist failed-OCR photo")
     ```
   - Pass `cont_photo_url=failed_photo_url` to the `OcrDriverRequest(...)` constructor
     inside the existing analytics block.
   - Import `save_base64_photo` (already imported in this file — verify).
   - Note: `body.image_data` is raw base64 (no `data:` prefix) per `ContainerOCRRequest`;
     `mime_type` defaults to `image/jpeg`. Building the data URL matches what
     `save_base64_photo` expects.

## Validation

- `make test-backend` — existing OCR-endpoint tests still pass.
- Round-trip the migration on SQLite: upgrade head, then downgrade -1, then upgrade head.
- New unit/integration test: POST `/delivered-trips/ocr-container` with `extract` failing
  (or a fixture that yields `success=false`) → assert a row in `ocr_driver_requests` with
  `cont_photo_url` populated and the file exists under `PHOTO_STORAGE_ROOT`. And the success
  path leaves `cont_photo_url` None. (Mock `extract_container_numbers` per existing test
  pattern.)

## Rollback

- Drop column via `alembic downgrade -1`. Revert model + endpoint edits.
