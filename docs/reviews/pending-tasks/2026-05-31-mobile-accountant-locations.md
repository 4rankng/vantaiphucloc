# Mobile UI fix — accountant pages (starting with `/accountant/locations`)

**Status:** pending  
**Reported:** 2026-05-31  
**Severity:** unusable on mobile  
**Scope:** all accountant pages, but the immediately broken case is `/accountant/locations`

---

## Symptom

On a ~380px viewport, `/accountant/locations` renders the master-detail split side-by-side. The right (detail) panel ends up roughly 80px wide, which causes its content — section labels (`ĐỊA ĐIỂM`, `TÊN PHỤ`), the location name (`BÃI GMC`), helper text — to wrap one character per line. The page becomes unreadable.

User screenshot in `~/uploads/9a749804-image.png` shows: left rail with 70 location names listed (BÃI GMC, BÃI TOA, CHÂN THẬT PHƯƠNG ĐÔNG, …), right rail narrowed so badly that "Thêm tên gọi khác để hệ thống tự nhận diện..." prints vertically with one character per row.

## Root cause

`frontend/src/pages/accountant/LocationAliases/index.tsx` lines 225–356.

```tsx
<div className="flex-1 flex overflow-hidden" style={{ ... }}>
  <aside className="shrink-0 flex flex-col"
         style={{ width: 300, borderRight: '1px solid var(--line)', ... }}>
    {/* search + list */}
  </aside>
  <main className="flex-1 min-w-0" style={{ background: 'var(--surface)' }}>
    {selected ? <LocationDetailPanel … /> : <EmptyState … />}
  </main>
</div>
```

Two structural problems on mobile:

1. The `<aside>` has hard-coded `width: 300` and `shrink-0`. At ~380px viewport that consumes 79% of the available width, leaving the detail `<main>` with the rest minus a 1px border.
2. The container uses `flex` with horizontal direction unconditionally. There is no `flex-col` swap at the mobile breakpoint — even though `useIsMobile(768)` is already imported and used elsewhere on this page (for shorter labels and smaller buttons).

The text-per-character wrapping is a downstream effect — `LocationDetailPanel` is doing its job, the container just gave it no horizontal room.

## Proposed fix

### Behavior

Mobile (≤ 768px):

- One pane visible at a time.
- Default view = the list. Selecting an item swaps to the detail view full-width.
- Detail view shows a back arrow in its header that returns to the list (`setSelectedId(null)`).
- The Excel-import drawer and merge dialog continue to overlay full-screen as they already do.

Desktop (> 768px): unchanged — keep the 300px rail beside the detail panel.

### Implementation sketch

The page already has `const isMobile = useIsMobile(768)` (line 44). Reuse it:

```tsx
{/* ── Master-detail split ── */}
<div
  className={`flex-1 overflow-hidden ${isMobile ? 'flex flex-col' : 'flex'}`}
  style={{
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-lg)',
    minHeight: 480,
  }}
>
  {/* Left rail — hidden on mobile when an item is selected */}
  {(!isMobile || selectedId === null) && (
    <aside
      className={isMobile ? 'flex-1 flex flex-col min-h-0' : 'shrink-0 flex flex-col'}
      style={{
        width: isMobile ? '100%' : 300,
        borderRight: isMobile ? 'none' : '1px solid var(--line)',
        background: 'var(--surface-2)',
      }}
    >
      … existing list …
    </aside>
  )}

  {/* Right panel — hidden on mobile when nothing is selected */}
  {(!isMobile || selectedId !== null) && (
    <main className="flex-1 min-w-0" style={{ background: 'var(--surface)' }}>
      {selected ? (
        <LocationDetailPanel
          location={selected}
          aliases={selectedAliases}
          allAliases={aliases}
          allLocations={locations}
          onUpdate={handleUpdate}
          onDelete={(loc) => setDeleteTarget(loc)}
          onPromoteAlias={handlePromoteAlias}
          onDeleteAlias={handleDeleteAlias}
          onAddAlias={handleAddAlias}
          onMergeInto={(target) =>
            openMergeDialog({ source: selected.id, target: target.id })
          }
          updatePending={updateLocation.isPending}
          addingAlias={createAlias.isPending}
          promoting={promoteAlias.isPending}
          // NEW — only used by the panel on mobile
          onBack={isMobile ? () => setSelectedId(null) : undefined}
        />
      ) : (
        <div className="h-full flex items-center justify-center">
          <EmptyState … />
        </div>
      )}
    </main>
  )}
</div>
```

### `LocationDetailPanel` change

`frontend/src/components/shared/cards/LocationDetailPanel.tsx` should accept an optional `onBack?: () => void` prop. When present (mobile case), render a back-arrow button at the top-left of its header that calls `onBack()`. When absent (desktop case), render as today.

### List item tap behavior

Already correct — `onClick={() => setSelectedId(loc.id)}` will now trigger the mobile pane swap because of the conditional render above. No change needed.

### Empty state on mobile

When `isMobile && selectedId === null`, the right panel is hidden, so the "Chọn một địa điểm" empty state never shows. That is the intended behavior — the list IS the primary view on mobile. No action needed.

## Other accountant pages — same pattern likely

A grep for hard-coded sidebar widths or `flex` containers without column-swap turned up similar potential issues in:

- `frontend/src/pages/accountant/PnLPage.tsx` — uses `width: 300` style (line/column unverified, please check).
- `frontend/src/pages/accountant/ExcelImportPage.tsx` — similar drawer / sidebar pattern.

Other large accountant pages that should be audited at ≤ 380px:

- `AccountantDashboard.tsx`
- `ClientsPage.tsx`
- `DoiSoatPage.tsx`
- `RoutePricingPage.tsx`
- `SalaryPage.tsx`
- `TransportersPage.tsx`
- `VehicleExpensesPage.tsx`
- `VendorRoutePricingPage.tsx`
- `VendorsPage.tsx`

For any page that uses a desktop master-detail / list-detail layout, apply the same pattern: pick one pane to show based on selection state when `isMobile`, swap with a back affordance, otherwise render both side-by-side.

For pages that show wide data tables, the typical mobile mitigation is `overflow-x: auto` on the table wrapper with a faint right-edge gradient hint — confirm each affected page either does this already or add it.

## Acceptance

1. At ≤ 380px viewport on `/accountant/locations`:
   - Initial view: full-width list, no detail panel visible.
   - Tapping a location: list hides, full-width detail panel appears with a back arrow that returns to the list.
   - No per-character vertical text wrapping anywhere on the page.
2. At ≥ 769px viewport: layout is byte-identical to current (300px rail + flex-1 detail). Verify by diff'ing screenshots before/after at desktop width.
3. Existing flows (search, add, merge, import, alias promote/delete) work in both layouts.
4. No console errors. `tsc --noEmit` clean.

## Out of scope

- Restyling the detail panel itself — content fits fine when the container has room.
- Adding swipe gestures.
- Changes to the desktop layout.
