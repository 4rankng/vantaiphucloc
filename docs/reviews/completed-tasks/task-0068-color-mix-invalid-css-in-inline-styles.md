# Task 0068: Invalid `color-mix(in_srgb,...)` Syntax in Inline Styles

**Type:** Visual Bug  
**Severity:** 🟡 Major  
**Layer:** Frontend  
**Affected Role/Flow:** ketoan — MatchTrip (mobile match flow) / CreateTrip  
**URL:** `/accountant/match-trip/:woId`, `/accountant/create-trip`

## Observation

Two source files use `color-mix(in_srgb, ...)` (underscore) in React inline `style={{}}` props instead of the valid CSS `color-mix(in srgb, ...)` (space):

- `frontend/src/pages/accountant/MatchTrip.tsx` line 445:
  ```
  background: 'color-mix(in_srgb, var(--theme-status-error) 10%, transparent)'
  ```
  (criterion match/fail badge backgrounds — 8 elements rendered)

- `frontend/src/pages/accountant/MatchTrip.tsx` line 576:
  ```
  background: 'color-mix(in_srgb, var(--theme-status-warning) 10%, transparent)'
  ```
  (low-confidence warning banner background)

- `frontend/src/pages/accountant/CreateTrip.tsx` line 291:
  ```
  background: 'color-mix(in_srgb, var(--theme-brand-primary) 8%, transparent)'
  ```
  (info/hint box background)

**Note:** Underscores ARE correct inside Tailwind arbitrary-value class names (e.g. `bg-[color-mix(in_srgb,...)]`) because Tailwind converts `_` → space. But in React `style={{}}` props the string is passed directly to the browser as CSS — underscores are NOT converted, making the `color-mix()` call invalid.

**Confirmed in browser:** Computed style of the 8 criterion badge spans returns `rgba(0,0,0,0)` (transparent), proving the browser rejects the invalid syntax and falls back to no background.

## Impact

- Criterion match/fail badges on the MatchTrip mobile page render with a **transparent background** instead of the intended faint red tint for mismatches. This makes it harder for accountants to quickly see which criteria failed.
- The low-confidence warning banner loses its warm yellow background when `lowConfConfirm` is triggered, reducing the urgency signal.
- The CreateTrip hint box also loses its brand-tinted background.

## Recommendation

Replace `in_srgb` → `in srgb` (space, not underscore) in all inline `style={{}}` uses:

```tsx
// MatchTrip.tsx line 445 — criterion badge
background: c.match
  ? 'var(--theme-status-success-light)'
  : 'color-mix(in srgb, var(--theme-status-error) 10%, transparent)'

// MatchTrip.tsx line 576 — low-conf banner
style={{ background: 'color-mix(in srgb, var(--theme-status-warning) 10%, transparent)', ... }}

// CreateTrip.tsx line 291 — hint box
style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)', ... }}
```

Tailwind class names with arbitrary color-mix values (elsewhere in the codebase) are correct as-is — do not change those.

## Resolution

Replaced `in_srgb` → `in srgb` in 3 inline `style={{}}` props. Tailwind class names with `in_srgb` were left unchanged (correct — Tailwind converts `_` to space).

**Files changed:**
- `frontend/src/pages/accountant/MatchTrip.tsx` — 2 locations (criterion badge, low-conf banner)
- `frontend/src/pages/accountant/CreateTrip.tsx` — 1 location (salary hint box)
