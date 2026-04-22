# AGENTS.md — TTransport Frontend Development Guide

> **Mandatory reading before any UI/UX change.**
> Violations = build rejects. Fix immediately if found.

## 1. Color System

### ALL colors via CSS custom properties — ZERO hardcoded hex/rgb

```tsx
// ✅ Correct
style={{ color: 'var(--theme-text-primary)' }}
style={{ background: 'var(--theme-bg-secondary)' }}

// ❌ Wrong — NEVER do this
style={{ color: '#111827' }}
style={{ background: '#fff' }}
style={{ color: 'white' }}
```

### Token Reference

| Token | Usage |
|---|---|
| `--theme-text-primary` | Headings, main text |
| `--theme-text-secondary` | Labels, descriptions |
| `--theme-text-muted` | Hints, timestamps, disabled |
| `--theme-text-on-brand` | Text on brand-colored backgrounds |
| `--theme-text-inverse` | Text on error/success badges |
| `--theme-bg-primary` | Page background |
| `--theme-bg-secondary` | Card background |
| `--theme-bg-tertiary` | Nested/subtle backgrounds, icon containers |
| `--theme-brand-primary` | Primary brand color (navy/green) |
| `--theme-brand-primary-light` | Light brand tint (icon bg, active states) |
| `--theme-border-light` | Thin dividers inside cards |
| `--theme-border-default` | Card/section borders |
| `--theme-shadow-card` | Default card shadow |
| `--theme-shadow-elevated` | Floating/hero card shadow |
| `--theme-status-success` | Green — completed, active |
| `--theme-status-warning` | Amber — pending, live indicator |
| `--theme-status-error` | Red — errors, destructive actions |
| `--theme-status-error-light` | Error background tint |
| `--theme-status-error-text` | Error text on light bg |
| `--theme-status-success-light` | Success background tint |

## 2. Card System

### Three levels of visual hierarchy

**Level 1 — Active/Alert (amber header)**
```tsx
// LiveCard component — amber "ĐANG CHẠY" header + white content
// Only for: active trip indicator
// Use: <LiveCard title={} subtitle={} elapsed={} onClick={} />
```

**Level 2 — Summary/Hero (elevated shadow)**
```tsx
// Wallet card, stats card, hero data
style={{
  background: 'var(--theme-bg-secondary)',
  boxShadow: 'var(--theme-shadow-elevated)',
}}
className="rounded-2xl p-4"
```

**Level 3 — List Items (card shadow)**
```tsx
// Trip cards, expense rows, list items
style={{
  background: 'var(--theme-bg-secondary)',
  boxShadow: 'var(--theme-shadow-card)',
}}
className="rounded-2xl p-3.5 card-lift"  // card-lift for hover/press feedback
```

### Radius Rules
- `rounded-2xl` — cards, buttons, inputs (default)
- `rounded-xl` — icon containers, small elements
- `rounded-full` — avatars, badges, pills
- `rounded-3xl` — ONLY login card / modal

## 3. Typography

| Element | Classes |
|---|---|
| Page title | `text-xl font-bold` |
| Section header | `text-xs font-bold` with `color: var(--theme-text-secondary)` |
| Card title | `font-bold text-[15px]` or `text-sm font-semibold` |
| Body text | `text-sm` |
| Caption/hint | `text-xs` or `text-[11px]` |
| Small label | `text-[11px] font-medium` |
| Stat number | `text-lg font-bold tabular-nums` or `text-2xl font-bold tabular-nums` for hero |
| Price/amount | Always `tabular-nums` + `font-bold` or `font-semibold` |

**ALL user-facing text in Vietnamese.**

## 4. Spacing

| Context | Pattern |
|---|---|
| Page padding | `p-4` or `px-4` |
| Section gap | `space-y-5` between sections |
| Card internal | `p-4` (hero), `p-3.5` (list items) |
| Between label + value | `mb-1` or `mb-3` |
| Section header to content | `mb-3` |
| Green hero bottom to cards | `pb-14` on hero, then `-mt-6` on first card |
| List items gap | `space-y-2.5` |
| Dividers inside cards | `mx-4 border-t` with `borderColor: var(--theme-border-light)` |

## 5. Component Imports

```
@/components/shared/BackButton     — ← Quay lại button
@/components/shared/InlineStatStrip — horizontal stat strip
@/components/shared/EmptyState      — icon + title + desc
@/components/ui/Badge               — status badges
@/components/ui/Button              — buttons
@/components/ui/Input               — text inputs
@/components/ui/Sheet/Sheet         — bottom sheets
@/components/organisms/LiveCard     — active trip indicator
```

**Atomic structure:**
- `atoms/` — Icon, Pill, Toast (primitives)
- `molecules/` — FormField, ListItem, SearchPill, SheetSelect
- `organisms/` — LiveCard, DataList, FormCard
- `shared/` — cross-cutting: BackButton, EmptyState, InlineStatStrip
- `ui/` — design system: Button, Input, Badge, Sheet, Dialog

### BackButton — every sub-page MUST have one
```tsx
import { BackButton } from '@/components/shared/BackButton'

// Default: goes to /driver
<BackButton />

// Custom target
<BackButton to="/driver/trips" />
```

## 6. Page Structure

### Trang chủ (DriverHome) — the hub
Must contain these sections in order:
1. **Wallet hero** — green bg, net income card with Thu/Chi/Chuyến HT
2. **Live card** — active trip (if any)
3. **Quick actions** — grid of 2: Chuyến đi + Khai chi phí
4. **Chuyến đi** — stats row (chờ nhận/đang chạy) + trip list → Chi tiết → TripList
5. **Chi phí** — top categories + pending count → Chi tiết → ExpenseList

### Sub-pages
```tsx
<div className="p-4 space-y-5">
  <BackButton to="/driver" />
  {/* ... content ... */}
</div>
```

### Section headers
```tsx
<div className="flex items-center justify-between mb-3">
  <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>
    Section Title
  </span>
  <button onClick={...} className="flex items-center gap-0.5 text-xs font-semibold"
    style={{ color: 'var(--theme-brand-primary)' }}>
    Chi tiết <ChevronRight className="w-3 h-3" />
  </button>
</div>
```

## 7. Top Bar (Driver)

- Green brand background (part of hero, NOT sticky)
- Left: "Xin chào," + driver name
- Right: bell icon (notifications, with badge) + user icon (profile)
- No dropdown, no menu — icons navigate directly

## 8. Card Lift Animation
Use `card-lift` class on interactive cards for press feedback:
```tsx
className="rounded-2xl p-4 card-lift"
```

## 9. Currency Formatting
Always use `formatCurrencyShort()` from `@/data/mockData`:
```tsx
import { formatCurrencyShort } from '@/data/mockData'
<span>{formatCurrencyShort(amount)}</span>
```
- < 1 tỷ: full number with `₫`
- ≥ 1 tỷ: "X,XX tỷ"

## 10. Bad Practices to Avoid

| ❌ Don't | ✅ Do |
|---|---|
| `color: '#fff'` | `color: 'var(--theme-text-on-brand)'` |
| `background: 'white'` | `background: 'var(--theme-bg-secondary)'` |
| `rounded-lg` for cards | `rounded-2xl` |
| Sticky headers for driver | Let top bar scroll with content |
| `prompt()` / `alert()` | Sheet / Toast components |
| Inline back buttons | Use `<BackButton />` component |
| Different card designs per page | Same TripCard/ExpenseRow everywhere |
| Bottom nav on driver | Hub + top bar icons only |
| `pb-20` bottom padding (was for nav) | `pb-6` or none |

## 11. File Structure

```
src/
  components/
    atoms/       — primitives
    molecules/   — composed atoms
    organisms/   — feature blocks
    shared/      — cross-cutting (BackButton, EmptyState, etc.)
    ui/          — design system (Button, Input, Badge, Sheet, etc.)
  contexts/      — React contexts (AuthContext, ThemeContext, etc.)
  data/          — mock data, formatters
  hooks/         — custom hooks (use-driver-store, use-api, etc.)
  lib/           — utilities
  pages/
    Login.tsx
    driver/      — driver role pages
    accountant/  — accountant role pages
    director/    — director role pages
    dispatcher/  — dispatcher role pages
  themes/        — theme definitions (navy-gold, grab)
```

## 12. New Page Checklist

- [ ] All colors via `var(--theme-*)`
- [ ] `<BackButton />` at top
- [ ] `rounded-2xl` for all cards
- [ ] Vietnamese text everywhere
- [ ] `card-lift` on interactive cards
- [ ] `tabular-nums` on numbers/currency
- [ ] Consistent card design with existing pages
- [ ] Empty state for no-data scenarios
- [ ] No `alert()` / `prompt()` — use Sheet/Toast
- [ ] `space-y-5` between sections, `space-y-2.5` between list items
