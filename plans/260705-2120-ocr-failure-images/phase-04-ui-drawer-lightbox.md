# Phase 4 — UI: clickable headline + drawer + lightbox

## Context

- Chart that owns the headline: `frontend/src/components/shared/data-display/OcrPerformanceChart/OcrPerformanceChart.tsx`
  — block at lines 152-228 renders "Lỗi tài xế gặp phải" and the "N ảnh không nhận được số
  cont." line. Rendered only on superadmin pages (SuperAdminDashboard,
  SuperAdminOverview).
- Drawer primitive: `frontend/src/components/shared/overlays/Drawer/Drawer.tsx` — reuse.
- Reference drawer: `frontend/src/components/shared/overlays/DeliveredTripDetailDrawer/index.tsx`
  — shows the `PhotoLightbox` integration pattern (`useState(false)` + conditional render at
  lines 296-300).
- `PhotoLightbox` props: `{ src, alt?, onClose }`. Built-in zoom + "Tải về" via
  `downloadImage` (`@/lib/download`).
- `useOcrStats` already loaded in `OcrPerformanceChart` — `driverFailed` is computed there.

## Requirements

- When `driverFailed > 0`, the "N ảnh không nhận được số cont." text becomes a button that
  opens `OcrFailureDrawer`.
- When `driverFailed === 0`, behavior unchanged (not clickable).
- Drawer: grid of thumbnails. Each tile: image preview (`contPhotoUrl`), driver name (or
  "—"), relative/absolute time, provider badge, attempts count. Clicking a tile opens
  `PhotoLightbox` for that image.
- Empty state: "Chưa có ảnh lỗi được ghi nhận" when the list is empty (e.g. historical
  failures with no photo yet).
- Loading + error states per existing patterns.
- Vietnamese for all copy. Tap targets ≥44px. No stacked action buttons ([[feedback_no_stacked_buttons]]).

## Files

- **Create** `frontend/src/components/shared/overlays/OcrFailureDrawer/index.tsx`
- **Edit** `frontend/src/components/shared/data-display/OcrPerformanceChart/OcrPerformanceChart.tsx`
  — wire the trigger.
- **Edit** `frontend/src/components/shared/index.ts` — export `OcrFailureDrawer` if the
  barrel exists (mirror other overlays).

## Steps

1. **`OcrFailureDrawer`** (`{ open: boolean; onClose: () => void; days: number }`):
   - `useOcrFailures(days)` for data; derive `isLoading`, `isError`, `items`.
   - Local state: `const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)`.
   - Render via the shared `Drawer` primitive (study its API: open/onClose/title/children).
     Title: "Ảnh OCR lỗi".
   - Body:
     - Loading skeleton.
     - Error state: short message + retry (if the Drawer primitive supports actions; else
       plain text — match existing drawers).
     - Empty state when `items.length === 0`.
     - Otherwise responsive grid (`grid-cols-2 md:grid-cols-3 xl:grid-cols-4`), each tile a
       `<button>` (44px min, accessible) containing `<img>` + meta line. `onClick` →
       `setLightboxSrc(item.contPhotoUrl)`.
   - When `lightboxSrc`, render `<PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />`.
   - Date formatting: reuse any existing date util in the codebase (search before
     reinventing).

2. **`OcrPerformanceChart`** wiring:
   - `const [drawerOpen, setDrawerOpen] = useState(false)`.
   - Replace the `<p>` "N ảnh không nhận được số cont." with a conditional: when
     `driverFailed > 0`, render a `<button type="button" onClick={() => setDrawerOpen(true)}>`
     styled as an inline link/chevron with an icon (e.g. `ImageIcon` from lucide). Keep the
     existing copy and color. When `driverFailed === 0`, keep the current `<p>`.
   - Render `<OcrFailureDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} days={effectiveDays} />`
     at the end of the component. Use the same `days` basis as the chart's current window
     (`effectiveDays`) so the drawer matches the count.
   - Memoize handlers (`useCallback`) per frontend CLAUDE.md rules.

3. **Barrel export:** if `frontend/src/components/shared/index.ts` re-exports overlays, add
   `OcrFailureDrawer` there.

## Validation

- `npm run typecheck` clean; `npm run lint` (or `make lint`) clean for touched files.
- Manual on the superadmin dashboard:
  - `driverFailed > 0` → headline is clickable → drawer opens → thumbnails load → click →
    PhotoLightbox with zoom + download.
  - `driverFailed === 0` → not clickable.
  - Empty drawer state when no failure rows have photos yet.
- Director/accountant dashboards visually unchanged (they don't render
  `OcrPerformanceChart`).

## Rollback

- Revert chart edit; delete `OcrFailureDrawer`; remove barrel export.
