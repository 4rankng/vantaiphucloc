# Centralize Inline Editing — Design Spec

## Problem

Four pages use inline table editing with near-identical infrastructure, but `DriverEditRow` (transporters) reimplements `useInlineEditForm` manually. The single-active-cell pattern (expenses, vendor route pricing) duplicates active-field state + auto-focus logic.

## Approach

Pragmatic centralization: fix the outlier (`DriverEditRow`), extract a small `useActiveField` hook for the active-cell pages, and move shared style constants out of inline definitions.

No UX pattern changes. No config-driven generic component.

## Changes

### 1. New: `useActiveField` hook

**File:** `frontend/src/components/shared/useActiveField.ts`

```ts
function useActiveField<F extends string>(
  initial: F,
  refs?: Record<F, React.RefObject<HTMLInputElement | null>>
): { activeField: F; setActiveField: (f: F) => void }
```

- Manages `activeField` state (which cell is currently editable)
- Auto-focuses the corresponding input ref when `activeField` changes
- Replaces manual `useState + useEffect` in `ExpenseEditRow` and `VendorRoutePricingEditRow`

### 2. Fix: `DriverEditRow` → use `useInlineEditForm`

**File:** `frontend/src/components/shared/DriverTableRows.tsx`

Remove:
- Manual `useState<DriverRowFormData>`
- Manual `isDirty`, `anyDirty`, `set` helpers
- Manual `handleSave` callback
- Manual keyboard listener `useEffect` (Escape/Enter on `window`)

Replace with `useInlineEditForm<DriverRowFormData>` call, matching the pattern used by `ClientEditRow`, `ExpenseEditRow`, and `VendorRoutePricingEditRow`.

### 3. Extract: `editCellStyles` constants

**File:** `frontend/src/components/shared/editCellStyles.ts`

Move the duplicated `tdActive`/`tdInactive` style objects out of inline definitions in `ExpenseEditRow` and `VendorRoutePricingEditRow` into a shared module.

Two variants for inactive cells:
- `tdHidden` — `opacity: 0` (expenses page)
- `tdDimmed` — `opacity: 0.45` (vendor route pricing page)

### 4. Refactor: `ExpenseEditRow` and `VendorRoutePricingEditRow`

Both switch to `useActiveField` for their active cell management and import `editCellStyles` instead of defining styles inline.

## What stays per-page (no abstraction)

- Column layout and field definitions
- Cell type rendering (text, number, select, date, toggle)
- Validation rules
- Display formatting for inactive cells (currency, dates, badges)
- Auto-advance behavior (vendor route pricing: pickup → dropoff)
- Save transforms (clients: trim name)

## Scope

| Component | Change |
|---|---|
| `useActiveField` | New file |
| `editCellStyles` | New file |
| `DriverEditRow` | Replace manual form state with `useInlineEditForm` |
| `ExpenseEditRow` | Use `useActiveField` + `editCellStyles` |
| `VendorRoutePricingEditRow` | Use `useActiveField` + `editCellStyles` |
| `ClientEditRow` | No changes (already uses `useInlineEditForm`, all-fields-visible pattern) |

## Acceptance criteria

- All 4 inline edit pages work identically to before (no UX changes)
- `DriverEditRow` uses `useInlineEditForm` (no manual form state)
- `useActiveField` hook used by both single-active-cell EditRows
- `make test-frontend` passes (lint + build)
