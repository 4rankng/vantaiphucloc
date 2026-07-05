# Phase 3 — Frontend API client + hook

## Context

- API client: `frontend/src/services/api/ocrStats.api.ts` — has `getOcrStats` + types, uses
  `api`, `safeRequest`, `toCamel`. Pattern to mirror for `getOcrFailures`.
- Query hook: `frontend/src/hooks/queries/ocr-stats.ts` — exports `useOcrStats` + `queryKeys`.
  Mirror for `useOcrFailures`.
- `toCamel` converts snake_case response keys to camelCase (so `cont_photo_url` →
  `contPhotoUrl`, `driver_name` → `driverName` automatically).

## Requirements

- `OcrFailureItem` interface (camelCase).
- `getOcrFailures(days)` returning `ApiResponse<{ items: OcrFailureItem[] }>`.
- `useOcrFailures(days)` TanStack Query hook, superadmin-only (callers gate by role).

## Files

- **Edit** `frontend/src/services/api/ocrStats.api.ts`
- **Edit** `frontend/src/hooks/queries/ocr-stats.ts`

## Steps

1. In `ocrStats.api.ts`, append:
   ```ts
   export interface OcrFailureItem {
     id: number
     createdAt: string
     userId: number | null
     driverName: string | null
     attempts: number
     numbersFound: number
     provider: string | null
     contPhotoUrl: string
   }

   export function getOcrFailures(
     days = 30,
   ): Promise<ApiResponse<{ items: OcrFailureItem[] }>> {
     return safeRequest(
       () => api.get('/dashboard/ocr-failures', { params: { days } }),
       (res) => toCamel<{ items: OcrFailureItem[] }>(res.data),
     )
   }
   ```

2. In `hooks/queries/ocr-stats.ts`, mirror `useOcrStats`:
   - Add a query key e.g. `ocrFailures: (days: number) => ['ocr-failures', days]` to
     `queryKeys`.
   - `useOcrFailures(days = 30)` → `useQuery({ queryKey: queryKeys.ocrFailures(days),
     queryFn: () => getOcrFailures(days), enabled: ?? })`. Whether to gate `enabled` on role
     is decided by the caller; the hook can be role-agnostic and the page decides to render
     the trigger only for superadmin (the chart is already superadmin-only).

## Validation

- `npm run typecheck` (or `make lint` scope) clean.
- Manual: superadmin call returns items; director/accountant call 403 (handled gracefully
  by `safeRequest`).

## Rollback

- Revert the two edits.
