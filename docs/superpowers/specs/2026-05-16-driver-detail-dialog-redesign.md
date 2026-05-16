# Driver Detail Dialog Redesign

**Date:** 2026-05-16  
**File:** `frontend/src/pages/accountant/DriversPage.tsx`

## Goal

Redesign `DriverDetailDialog` to:
1. Add an effective-date picker to the base-salary inline form (defaults to today).
2. Keep "Chưa thiết lập" as the display when no salary record exists.
3. Improve visual design — cleaner sections, better hierarchy, less cramped layout.

## Out of Scope

- `CreateDriverDialog` — no changes.
- Note field for salary — not added (matches current dialog's scope, not the richer standalone `DriverBaseSalaryDialog`).

## Architecture

### Salary logic: use `useDriverBaseSalaryForm`

Replace the ad-hoc inline salary state (`newSalary`, `showSalaryForm`, hardcoded `today`) with the existing `useDriverBaseSalaryForm` hook from `@/components/payroll/useDriverBaseSalaryForm`. This hook already provides:

- `fields.baseSalary` — formatted VND string
- `fields.effectiveFrom` — ISO date string, defaults to today
- `setBaseSalary`, `setEffectiveFrom` — setters
- `history`, `currentRate`, `historyLoading` — salary history data
- `submit`, `submitting`, `error`, `reset` — mutation + validation

The dialog passes `driverId` to the hook. No new state or mutation logic is introduced in the `.tsx` file.

### Local UI state in dialog

Only one local state remains: `showSalaryForm: boolean` (controls whether the inline form is expanded).

## Component Layout

```
DriverDetailDialog
│
├── DialogHeader — driver name
│
├── Info row (flex, gap-3)
│   ├── VehiclePill — 🚗 plate (InlineEditable, clicking allows edit)
│   └── PhonePill — 📞 phone number (read-only display)
│
├── Salary section
│   ├── Section header: "LƯƠNG CƠ BẢN" + "Điều chỉnh" button (right-aligned)
│   ├── Current rate line: "<amount> · từ <date>" or "Chưa thiết lập"
│   │
│   ├── [when showSalaryForm = true]
│   │   ├── Two-column form row
│   │   │   ├── Input: Số tiền (inputMode=numeric, formatted VND)
│   │   │   └── Input type=date: Hiệu lực từ (defaults to today)
│   │   ├── Error message (if any)
│   │   └── Action row: [Lưu] [Huỷ] — horizontal, right-aligned
│   │
│   └── History list (shown when history.length > 0)
│       Compact rows: <amount> · từ <date>
│
└── DialogFooter — [Đóng] button, right-aligned (not full-width)
```

## Design Tokens / Visual Rules

- Vehicle and phone displayed as small pill-shaped info cards (rounded-lg, bg-tertiary), side by side.
- Section labels: `text-[10px] font-bold uppercase tracking-wider` + `color: var(--theme-text-muted)` (consistent with existing patterns in the file).
- Current salary: `text-sm font-semibold` + inline muted date.
- Form opens below the current-rate line, no separate card — inline expansion.
- Two-column form: `grid grid-cols-2 gap-3` for amount + date inputs.
- Action buttons: horizontal row, right-aligned (`flex justify-end gap-2`). Lưu = brand primary, Huỷ = outline.
- History rows: simple `flex justify-between text-xs` lines, muted colour, `mt-1` spacing.
- Footer: `<Button variant="outline">Đóng</Button>` — NOT full-width, right-aligned.

## Behaviour

- "Điều chỉnh" click: `setShowSalaryForm(true)`.
- "Huỷ" click: `setShowSalaryForm(false)` + `form.reset()`.
- On successful save (`form.submit`): `setShowSalaryForm(false)` (hook already resets fields internally).
- Effective date: pre-filled with today via `useDriverBaseSalaryForm` (no manual default needed).
- `currentRate` null → show "Chưa thiết lập" (string, muted colour).
- `currentRate` present → show `formatCurrencyFull(currentRate.baseSalary) + " · từ " + currentRate.effectiveFrom`.

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/pages/accountant/DriversPage.tsx` | Rewrite `DriverDetailDialog` function only. No other functions in the file change. |

## No Changes To

- `useDriverBaseSalaryForm.ts` — used as-is.
- `DriverBaseSalaryDialog.tsx` — not referenced here.
- `CreateDriverDialog` — unchanged.
- Backend / API — no changes.
