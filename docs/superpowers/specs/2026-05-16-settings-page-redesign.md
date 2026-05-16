# Settings Page Redesign

**Date:** 2026-05-16  
**Scope:** `frontend/src/pages/accountant/SettingsPage.tsx` + new shared component `DayStepperInput`

---

## Problem

The current settings page has one section (Kỳ lương) rendered with:
- Native `<select>` dropdowns (browser-styled, inconsistent, low visual quality)
- A plain `→` text arrow connecting them
- A tiny grey period-example line that reads as an afterthought
- An out-of-place "Mới" sparkle badge in the section header
- No scalable card template — future sections would copy-paste ad-hoc layout

---

## Goals

1. Replace native selects with a polished hybrid stepper (click or type).
2. Elevate the period example from footnote to a tinted info chip.
3. Remove the "Mới" badge.
4. Establish a reusable section-card pattern so future settings sections are consistent.

---

## Architecture

### New component: `DayStepperInput`

Location: `frontend/src/components/shared/DayStepperInput.tsx`

A self-contained controlled input for choosing a day-of-month (1–31).

**Props:**
```ts
interface DayStepperInputProps {
  value: number
  onChange: (v: number) => void
  label: string
  hint?: string        // text for InfoTip
}
```

**Behaviour:**
- Renders: `−` button | `<input type="text" inputMode="numeric">` | `+` button
- Input width: fixed (e.g. `w-12`) to prevent layout shift
- Typing: updates local draft string; on blur, parse → clamp to [1, 31] → call `onChange`
- `+` / `−`: increment/decrement, wrap at boundaries (1 → 31, 31 → 1)
- Buttons use `aria-label` ("Giảm ngày", "Tăng ngày")

### Updated `SettingsPage`

**Section card template** (inline, not extracted — only one page uses it today):
- Rounded-xl border card with `boxShadow` matching other accountant cards
- Header strip: icon + bold title, `borderBottom` separator
- Content area: `p-5`

**Kỳ lương section layout:**
```
Header: 📅 Kỳ lương

Content:
  Row: [DayStepperInput label="Ngày bắt đầu"]  ──→  [DayStepperInput label="Ngày kết thúc"]

  Info chip (tinted brand bg):
    📅  Ví dụ: 21/04/2026 → 20/05/2026

  (when dirty)
  Warning banner — unchanged
  Cancel / Save buttons — unchanged
```

**Removed:** `sparkleDismissed` state and the "Mới" / `<Sparkles>` badge.

---

## Data flow

No changes to API calls, hooks, or mutation logic. `SettingsPage` keeps its existing `fromDay` / `toDay` state and `useSalaryConfig` / `useUpdateSalaryConfig` hooks. `DayStepperInput` is purely presentational.

---

## Error handling

- Invalid typed input (empty, non-numeric, out-of-range): silently clamped to [1, 31] on blur. No toast needed — the field self-corrects.

---

## What is NOT changing

- `AccountantPageShell`, `DashboardSectionHeader`, `InfoTip`, `PulseHint` — used as-is
- Confirm dialog — unchanged
- Save/cancel button logic — unchanged
- All API/query logic — unchanged
