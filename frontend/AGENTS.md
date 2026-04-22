# AGENTS.md — TTransport Frontend Development Guide

> **Read before any UI/UX change. Violations = revert.**

## Design Philosophy: Grab-inspired Compact Mobile

- **Space is expensive real estate** — every pixel earns its place
- **Content density > whitespace** — show more, scroll less
- **One hand, one thumb** — touch targets ≥ 44px, actions within thumb reach
- **Visual hierarchy through weight, not size** — bold/color for emphasis, not bigger boxes
- **Consistent card language** — same card = same treatment everywhere

---

## 1. Color System

### Rule: ALL colors via `var(--theme-*)`. Zero hardcoded hex. Zero.

```tsx
// ✅ Correct
style={{ color: 'var(--theme-text-primary)' }}
style={{ background: 'var(--theme-bg-secondary)' }}

// ❌ Wrong — NEVER
style={{ color: '#111827' }}
style={{ background: '#fff' }}
style={{ color: 'white' }}
```

### Token Quick Reference

| Token | Usage |
|---|---|
| **Text** | |
| `--theme-text-primary` | Headings, main text |
| `--theme-text-secondary` | Labels, descriptions |
| `--theme-text-muted` | Hints, timestamps, disabled |
| `--theme-text-on-brand` | Text on brand-colored bg |
| `--theme-text-inverse` | Text on error/success badges |
| **Background** | |
| `--theme-bg-primary` | Page background (`#F7F7F7`) |
| `--theme-bg-secondary` | Card background (`#FFFFFF`) |
| `--theme-bg-tertiary` | Subtle bg, icon containers (`#EEEEEE`) |
| **Brand** | |
| `--theme-brand-primary` | Grab green (`#00963E`) |
| `--theme-brand-primary-light` | Light green tint (`#E6F9EF`) |
| **Borders** | |
| `--theme-border-light` | Dividers inside cards (`#F3F3F3`) |
| `--theme-border-default` | Card/section borders (`#EBEBEB`) |
| **Shadows** | |
| `--theme-shadow-card` | Default cards |
| `--theme-shadow-elevated` | Hero/floating cards |
| `--theme-shadow-sm` | Active tab pill |
| **Status** | |
| `--theme-status-success` | Green — completed, approved |
| `--theme-status-warning` | Amber — pending, live |
| `--theme-status-error` | Red — errors, destructive |
| `--theme-status-error-light` / `-text` | Error bg / text |
| `--theme-status-success-light` | Success bg |

---

## 2. Card System — 3 Levels

### Level 1 — Active/Alert (LiveCard only)
Amber "ĐANG CHẠY" header bar + white content. Only for active trip.
```tsx
<LiveCard title={} subtitle={} elapsed={} onClick={} />
```

### Level 2 — Summary/Hero
```tsx
style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-elevated)' }}
className="rounded-2xl p-4"
```

### Level 3 — List Items
```tsx
style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
className="rounded-2xl p-3.5 card-lift"   // card-lift for press feedback
```

### Card rules:
- **rounded-2xl** — cards, buttons, inputs (default radius)
- **rounded-xl** — icon containers, small elements
- **rounded-full** — avatars, badges, pills
- **rounded-3xl** — ONLY login card / bottom sheet
- **card-lift** — interactive cards only (scale 0.98 on press)

---

## 3. Typography

| Element | Classes |
|---|---|
| Hero stat | `text-2xl font-bold tabular-nums` |
| Section stat | `text-lg font-bold tabular-nums` |
| Card title | `text-[15px] font-bold` or `text-sm font-semibold` |
| Section header | `text-xs font-bold` + `color: var(--theme-text-secondary)` |
| Body | `text-sm` |
| Caption | `text-xs` or `text-[11px]` |
| Tiny label | `text-[10px]` or `text-[11px] font-medium` |
| All numbers | `tabular-nums` (currency, counts, distances) |
| All text | **Vietnamese only** |

---

## 4. Spacing — Tight & Efficient

| Context | Value |
|---|---|
| Page padding | `p-4` or `px-4` |
| Between sections | `space-y-4` (was space-y-5, tightened) |
| Between list items | `space-y-2.5` (cards), `space-y-1.5` (compact rows) |
| Card internal | `p-4` hero, `p-3.5` list, `p-3` compact, `p-2.5` stats |
| Section header → content | `mb-3` |
| Label → value | `mb-1` |
| Row height in lists | `py-2.5` (compact), `py-3` (standard) |
| Dividers inside cards | `mx-4 border-t` + `borderColor: var(--theme-border-light)` |
| Green hero to first card | `pb-14` on hero, `-mt-6` on first card |
| After live card | `mb-8` |

---

## 5. Component Library

### Driver Mobile (actively used)

```
@/components/shared/BackButton       — ← Quay lại (uses goBack() history stack)
@/components/shared/InlineStatStrip  — horizontal key-value strip
@/components/shared/EmptyState       — icon + text center
@/components/organisms/LiveCard      — amber active-trip indicator
@/components/ui/Badge                — status badges (success/warning/danger)
@/components/ui/Button               — buttons
@/components/ui/Input                — text inputs (search-pill for login)
@/components/ui/Sheet/Sheet          — bottom sheets
@/components/ui/Label/Label          — form labels
```

### Shared Components (available for all roles)

```
shared/ChartCard       — chart container
shared/DashboardShell  — dashboard layout
shared/DataTable       — table with sort/filter
shared/EmptyState      — no-data placeholder
shared/ErrorFallback   — error UI
shared/FloatingActionButton — FAB
shared/GlassCard       — glass morphism card
shared/InlineError     — inline error text
shared/InlineStatStrip — compact stat strip
shared/KPIBadge        — KPI indicator
shared/LoadingState    — loading skeleton
shared/MetricCard      — metric with trend
shared/PageHeader      — page title header
shared/SearchBar       — search input
shared/SegmentedControl — pill tabs
shared/SparklineChart  — mini sparkline
shared/StatCard        — stat card
shared/StatusBadge     — status indicator
shared/TrendIndicator  — up/down arrow
```

### UI Primitives (design system)

```
ui/Alert  Avatar  Badge  Breadcrumb  Button  Collapsible  Command
ContextMenu  Dialog  DropdownMenu  ErrorBoundary  Input  Label
Pagination  Progress  Select  Separator  Sheet  Skeleton  Switch
Tabs  Toast  Tooltip
```

### Atomic Structure

```
atoms/       — Icon, Pill, Toast
molecules/   — FormField, ListItem, SearchPill, SheetSelect
organisms/   — LiveCard, DataList, FormCard
shared/      — cross-cutting (BackButton, EmptyState, etc.)
ui/          — design system primitives
```

---

## 6. Navigation

### Driver: No bottom nav. Hub + top bar.
- Top bar: green bg, scrolls with page
- Left: "Xin chào, <name>"
- Right: 🔔 bell (→ notifications) + 👤 user icon (→ profile)

### History Stack
```tsx
const { navigate, goBack } = useDriverStore()
navigate('/driver/trips')  // pushes to history
goBack()                   // pops to previous page
```

### BackButton
Every sub-page MUST have one:
```tsx
import { BackButton } from '@/components/shared/BackButton'
<BackButton />  // returns to actual caller page
```

---

## 7. Trang Chủ (DriverHome) — Hub Layout

```
1. Wallet Hero     — green bg, net income card, Thu/Chi/Chuyến HT
2. Live Card       — active trip (if any), amber header
3. Chuyến Đi       — stats row (chờ nhận/đang chạy) + trip list
                      → Chi tiết → TripList
4. Chi Phí         — top categories + pending count
                      → + Khai chi phí → CreateExpense
                      → Chi tiết → ExpenseList
```

---

## 8. Page Patterns

### Sub-page structure
```tsx
<div className="p-4 space-y-4">
  <BackButton />
  {/* content */}
</div>
```

### Section header with action
```tsx
<div className="flex items-center justify-between mb-3">
  <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>
    Section Title
  </span>
  <div className="flex items-center gap-3">
    <button onClick={...} className="flex items-center gap-1 text-xs font-semibold"
      style={{ color: 'var(--theme-brand-primary)' }}>
      <Plus className="w-3.5 h-3.5" /> Action
    </button>
    <button onClick={...} className="flex items-center gap-0.5 text-xs font-semibold"
      style={{ color: 'var(--theme-brand-primary)' }}>
      Chi tiết <ChevronRight className="w-3 h-3" />
    </button>
  </div>
</div>
```

### Compact label-value row
```tsx
<div className="flex justify-between items-center px-4 py-2.5">
  <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{value}</span>
</div>
```

### Stats row (3-col)
```tsx
<div className="grid grid-cols-3 gap-2">
  <div className="rounded-2xl p-2.5 text-center" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
    <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{value}</p>
    <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
  </div>
</div>
```

### Segmented control (tabs)
```tsx
<div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }}>
  {tabs.map(t => (
    <button
      onClick={() => setActive(t.key)}
      className="flex-1 py-2 text-center text-xs font-semibold rounded-xl transition-all"
      style={{
        background: active === t.key ? 'var(--theme-bg-secondary)' : 'transparent',
        color: active === t.key ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
        boxShadow: active === t.key ? 'var(--theme-shadow-sm)' : 'none',
      }}
    >
      {t.label}
    </button>
  ))}
</div>
```

### Notification item (compact)
```tsx
<button className="w-full text-left rounded-xl px-3 py-2.5 flex items-start gap-2.5"
  style={{ background: n.read ? 'transparent' : 'var(--theme-bg-secondary)' }}>
  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
    style={{ background: n.read ? 'var(--theme-bg-tertiary)' : `${color}15` }}>
    <Icon className="w-4 h-4" style={{ color: n.read ? 'var(--theme-text-muted)' : color }} />
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-xs font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{title}</p>
    <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--theme-text-muted)' }}>{message}</p>
    <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-muted)', opacity: 0.7 }}>{time}</p>
  </div>
</button>
```

---

## 9. Currency Formatting

Always use `formatCurrencyShort()` from `@/data/mockData`:
- < 1 tỷ: full number with `₫`
- ≥ 1 tỷ: "X,XX tỷ"

---

## 10. CSS Utilities

| Class | Usage |
|---|---|
| `card-lift` | Press feedback on interactive cards (scale 0.98) |
| `search-pill` | Rounded pill input (login, search) |
| `live-dot` | Pulsing green dot for active trip |
| `skeleton-shimmer` | Loading placeholder animation |
| `animate-fade-slide-up` | Entry animation |
| `animate-fade-in` | Simple fade |
| `stagger-1` through `stagger-6` | Staggered animation delays |
| `safe-area-bottom` | iPhone safe area padding |
| `glass-overlay` | Frosted glass effect |
| `touch-target` | min 44px touch area |
| `sidebar-scroll` | Thin custom scrollbar |

---

## 11. Theme System

Theme defined in `src/themes/grab.ts` — Grab Green (`#00963E`).
Applied via `ThemeProvider` in App.tsx.

To add new theme: create `src/themes/<name>.ts` implementing `ThemeDefinition`.

---

## 12. Bad Practices — Fix Immediately

| ❌ Don't | ✅ Do |
|---|---|
| `color: '#fff'` or any hex | `var(--theme-text-on-brand)` |
| `background: 'white'` | `var(--theme-bg-secondary)` |
| `rounded-lg` for cards | `rounded-2xl` |
| Sticky header for driver | Let top bar scroll with content |
| `prompt()` / `alert()` | Sheet / Toast |
| Inline back buttons | `<BackButton />` component |
| Different card designs per page | Same TripCard/row everywhere |
| `pb-20` / `pb-24` (was for nav) | `pb-6` or less |
| Large avatar sections | Compact inline header (48px) |
| `py-6` / `py-16` for empty states | `py-12` max |
| Separate read/unread lists | Single flat list with visual distinction |
| Icon containers > 40px | 32px (w-8 h-8) for compact, 48px max |

---

## 13. File Structure

```
src/
  components/
    atoms/         — primitives (Icon, Pill, Toast)
    molecules/     — composed (FormField, ListItem, SheetSelect)
    organisms/     — feature blocks (LiveCard, DataList)
    shared/        — cross-cutting (BackButton, EmptyState, etc.)
    ui/            — design system (Button, Input, Badge, Sheet, etc.)
    layout/        — Header, Sidebar, MobileBottomNav
    modules/       — business components (ClientCard, TripCard, etc.)
  contexts/        — AuthContext, ThemeContext, ErrorContext, OfflineContext
  data/            — mockData, formatters (formatCurrencyShort)
  hooks/           — use-driver-store, use-api, use-polling, use-notifications
  lib/             — utils (cn, error-utils, notifications, offline-db)
  pages/
    Login.tsx
    RoleSelect.tsx
    driver/        — driver role pages
    accountant/    — accountant role pages
    director/      — director role pages
    dispatcher/    — dispatcher role pages
  themes/          — grab.ts, types.ts, ThemeContext.tsx
  index.css        — global styles, utilities, animations
```

---

## 14. New Page Checklist

- [ ] All colors via `var(--theme-*)`
- [ ] `<BackButton />` at top
- [ ] `rounded-2xl` for all cards
- [ ] Vietnamese text everywhere
- [ ] `card-lift` on interactive cards
- [ ] `tabular-nums` on all numbers/currency
- [ ] Consistent card design with existing pages
- [ ] Empty state for no-data
- [ ] No `alert()` / `prompt()` — use Sheet/Toast
- [ ] `space-y-4` sections, `space-y-2.5` list items
- [ ] Compact: py-2.5 rows, p-3 cards where possible
- [ ] No hardcoded hex colors
