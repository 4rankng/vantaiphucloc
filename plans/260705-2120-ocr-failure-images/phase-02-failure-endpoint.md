# Phase 2 — Failure-list endpoint (backend)

## Context

- Dashboard OCR router: `backend/app/contexts/platform/interface/routers/dashboard/ocr_stats.py`
  (already imports `OcrDriverRequest`, `require_roles`, `select`, `func`).
- Existing endpoint `GET /dashboard/ocr-stats` at line 169 — pattern + deps to mirror.
- Router is wired via `backend/app/contexts/platform/interface/routers/dashboard/__init__.py`.

## Requirements

- `GET /dashboard/ocr-failures?days=30` returns failure rows that have a photo, newest
  first, capped at 50.
- **Superadmin-only.**
- Each item: `{id, created_at, user_id, driver_name, attempts, numbers_found, provider,
  cont_photo_url}`.
- `driver_name` from the users table (LEFT JOIN; null-tolerant).

## Files

- **Edit** `backend/app/contexts/platform/interface/routers/dashboard/ocr_stats.py` — add
  the route.

## Steps

1. Add `User` to the model imports at the top of the file (for the driver-name join).
   `User` lives in `app.models.domain` — confirm import path alongside `OcrDriverRequest`.
2. Append a new route at the end of the file:
   ```python
   @router.get("/ocr-failures")
   async def get_ocr_failures(
       days: int = 30,
       current_user: User = Depends(require_roles("superadmin")),
       db: AsyncSession = Depends(get_db),
   ):
       end = utcnow()
       start = end - timedelta(days=max(1, min(days, 365)))
       rows = (
           await db.execute(
               select(
                   OcrDriverRequest.id,
                   OcrDriverRequest.created_at,
                   OcrDriverRequest.user_id,
                   OcrDriverRequest.attempts,
                   OcrDriverRequest.numbers_found,
                   OcrDriverRequest.provider,
                   OcrDriverRequest.cont_photo_url,
                   User.full_name.label("driver_name"),
               )
               .select_from(OcrDriverRequest)
               .outerjoin(User, OcrDriverRequest.user_id == User.id)
               .where(
                   OcrDriverRequest.success.is_(False),
                   OcrDriverRequest.cont_photo_url.is_not(None),
                   OcrDriverRequest.created_at >= start,
                   OcrDriverRequest.created_at <= end,
               )
               .order_by(OcrDriverRequest.created_at.desc())
               .limit(50)
           )
       ).all()
       return {
           "items": [
               {
                   "id": r.id,
                   "created_at": r.created_at.isoformat() if r.created_at else None,
                   "user_id": r.user_id,
                   "driver_name": r.driver_name,
                   "attempts": r.attempts,
                   "numbers_found": r.numbers_found,
                   "provider": r.provider,
                   "cont_photo_url": r.cont_photo_url,
               }
               for r in rows
           ]
       }
   ```
3. Verify `utcnow`, `timedelta`, `AsyncSession`, `get_db` are imported (they are, per the
   existing endpoint). Verify `require_roles` import.

## Validation

- Test: superadmin receives 200 + only failed-with-photo rows ordered desc.
- Test: director/accountant receive 403.
- Test: rows where `success=true` or `cont_photo_url is None` are excluded.

## Rollback

- Delete the route. No schema impact.
