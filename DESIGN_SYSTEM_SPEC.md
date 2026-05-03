# Design System Spec — Modern SaaS Overhaul

This is the **single source of truth** for the UI/UX redesign. Every page must follow these tokens, components, and patterns. Aesthetic is **Linear / Vercel — modern SaaS**.

---

## 1. Visual Language

- **Vibe:** clean, calm, professional, dense-but-readable. Think Linear's app, Vercel's dashboard, Stripe Dashboard.
- **Color discipline:** **mostly neutral zinc**, with a **single emerald accent** used sparingly (primary actions, active states, brand moments). NO multi-color rainbow UIs. NO gradients except the brand gradient on opt-in surfaces.
- **Borders over shadows:** prefer 1px hairline borders (`var(--theme-border-default)`) for separation. Shadows are very soft and used only for elevated surfaces (dialogs, popovers).
- **Tight typography:** Be Vietnam Pro (self-hosted), semibold for headings, regular for body. Letter-spacing slightly negative (`-0.011em` to `-0.025em`). NEVER import Google Fonts via CSS — CSP blocks it; only self-hosted fonts in `public/fonts/`.
- **Tabular numbers** for all numeric data (use `.font-mono-num` or `.tabular-nums`).
- **Compact spacing:** 4 / 8 / 12 / 16 / 24 / 32 rhythm. NO arbitrary values like `gap: 7px`.

---

## 2. Tokens (CSS variables — already defined)

All tokens live in `frontend/src/themes/grab.ts` and are exposed as CSS custom properties. **Use these — never hard-code colors.**

### Backgrounds
- `var(--theme-bg-primary)` → `#FAFAFA` — page background
- `var(--theme-bg-secondary)` → `#FFFFFF` — cards, surfaces, dialogs
- `var(--theme-bg-tertiary)` → `#F4F4F5` — input bg, hover states, muted chips
- `var(--theme-bg-glass)` → translucent white for sticky headers

### Brand (single emerald accent)
- `var(--theme-brand-primary)` → `#059669`
- `var(--theme-brand-primary-light)` → `#ECFDF5` (subtle bg for brand chips/states)
- `var(--theme-brand-primary-dark)` → `#047857` (hover for brand buttons)

### Text (zinc scale)
- `var(--theme-text-primary)` → `#09090B` — headings, primary content
- `var(--theme-text-secondary)` → `#52525B` — body, descriptions
- `var(--theme-text-muted)` → `#A1A1AA` — labels, hints, placeholders
- `var(--theme-text-on-brand)` → `#FFFFFF` — text on brand-colored bg

### Borders
- `var(--theme-border-default)` → `#E4E4E7` — default 1px hairline
- `var(--theme-border-light)` → `#F4F4F5` — softer divider (e.g. between rows in a card)

### Status (semantic)
- success / warning / error / info — each has `bg`, `light`, `text` variants. Use chips/badges that combine `bg-light + text + border-color-mix`.

### Sidebar (dark slate — Linear-style)
- `var(--theme-sidebar)` → `#18181B`
- `var(--theme-sidebar-text)` → `#D4D4D8`
- `var(--theme-sidebar-active)` → `rgba(255,255,255,0.08)` (active bg)
- `var(--theme-sidebar-active-text)` → `#FFFFFF`
- `var(--theme-sidebar-hover)` → `rgba(255,255,255,0.04)`

### Radii
- `var(--theme-radius-sm)` → 6px (chips, badges)
- `var(--theme-radius-md)` → 8px (inputs, buttons)
- `var(--theme-radius-lg)` → 10px (cards)
- `var(--theme-radius-xl)` → 14px (dialogs, sheets)
- `var(--theme-radius-full)` → 9999px (avatars, pills)

### Shadows (sparingly)
- `var(--theme-shadow-card)` → `0 1px 2px 0 rgba(9,9,11,0.04)` — default card
- `var(--theme-shadow-elevated)` → `0 4px 16px -4px rgba(9,9,11,0.08)` — popovers, dialogs

### Transitions
- `var(--theme-transition-fast)` → `120ms cubic-bezier(0.4, 0, 0.2, 1)` — hover/active states
- `var(--theme-transition-normal)` → `180ms` — most UI transitions
- `var(--theme-transition-slow)` → `240ms` — sheet/modal enter

---

## 3. Typography utilities (in `index.css`)

Use these classes — don't redefine sizes:
- `.typo-display` — page title (24px / 700 / -0.025em)
- `.typo-h1` — 20px / 600 / -0.02em
- `.typo-h2` — 15px / 600 (section headers in cards)
- `.typo-h3` — 13px / 600 (subsection)
- `.typo-body` — 14px / 400 (default body)
- `.typo-body-sm` — 13px / 400 secondary text
- `.typo-label` — 11px / 600 / uppercase / 0.06em letter-spacing (column labels, group labels)
- `.typo-form-label` — 13px / 500 (form field labels above inputs)
- `.typo-value-lg` — 15-16px / 600 / tabular (KPIs, prominent values)
- `.typo-mono` — JetBrains Mono with tabular nums (numeric tables)
- `.typo-meta` — 12px / 400 / muted (timestamps, captions)
- `.typo-caption` — 11px / 500 / muted

---

## 4. Component primitives (utility classes in `index.css`)

### Buttons
```html
<button class="btn-primary">Action</button>
<button class="btn-secondary">Cancel</button>
<button class="btn-ghost">Subtle</button>
```
Heights: 36px default. For toolbar/dense use h-8 (32px) variants.

### Cards
```html
<div class="card p-4">…</div>
<div class="card-interactive p-4">… (with hover/press)</div>
<div class="surface p-4">… (no border, just rounded white surface)</div>
```

### Tables
Use `.table-modern` for desktop tabular data:
```html
<table class="table-modern">
  <thead><tr><th>Column</th></tr></thead>
  <tbody><tr><td>Value</td></tr></tbody>
</table>
```
Sticky header, hairline rows, hover row tint, tabular numbers in numeric cells.

### Chips / Badges (status)
```html
<span class="chip">Default</span>
<span class="chip chip-success">Hoàn thành</span>
<span class="chip chip-warning">Chờ duyệt</span>
<span class="chip chip-error">Lỗi</span>
<span class="chip chip-info">Đang xử lý</span>
<span class="chip chip-brand">Đặc biệt</span>
```

### Search pill
```html
<input class="search-pill" placeholder="Tìm kiếm…" />
```

### Section divider
```html
<div class="divider-h" />
```

### Page container
```html
<div class="page-container">… (responsive padding + max-width)</div>
```

---

## 5. Layout patterns

### Desktop (accountant, optionally director)
- **Dark slate sidebar** (`var(--theme-sidebar)` bg) on left, fixed 232px wide, collapsible to 64px (icons-only).
- Top of sidebar: brand mark + role label.
- Sidebar items: 13px / 500, icon left + label, 8px radius, hover → `var(--theme-sidebar-hover)`, active → `var(--theme-sidebar-active)` bg with `var(--theme-sidebar-active-text)` text + 2px brand-color left accent bar (or subtle brand dot).
- Section labels in sidebar: `.typo-caption` style on `var(--theme-sidebar-text-muted)`.
- **NO top bar** — Linear/Vercel style. Sidebar holds brand + nav + user menu + logout. The page title, breadcrumbs, and actions all live inside each page's `<PageHeader />`. This gives ~56px back to data, which is critical for dense accountant tables.
- **Content area** uses `.page-container` with off-white page bg.

### Mobile (driver, admin, director, accountant fallback)
- Light topbar with brand mark + page title + actions (max 2).
- **Bottom tab bar** (`var(--theme-bottom-nav)` glass) with 3-5 tabs, active tab uses `var(--theme-brand-primary)` icon+label, inactive `var(--theme-bottom-nav-inactive)`.
- Content uses `.page-container` padding.
- Cards are full-bleed (negative margin from container) on narrow screens for visual rhythm.

### Common page structure (both desktop & mobile)
```
<PageHeader title="..." subtitle="..." actions={<Button>Tạo mới</Button>} />
<FilterBar ... />        ← search + segmented filter pills + sort dropdown
<ContentArea>             ← Cards on mobile, table on desktop
  <EmptyState />          ← when no data
  <LoadingSkeleton />     ← while fetching
</ContentArea>
<Pagination />            ← desktop tables
```

---

## 6. Pattern catalogue (use these; don't reinvent)

### Page header
- Title: `.typo-display` on mobile, `.typo-h1` aligned with breadcrumbs on desktop.
- Optional subtitle: `.typo-body-sm`.
- Actions on the right: max 2 buttons, primary action last (rightmost).
- 16-24px bottom margin before content.

### Filter bar
- Search input (`.search-pill`) takes flex-1 on mobile, fixed 280px on desktop.
- Segmented filter pills (active = brand bg, inactive = bg-tertiary) for categorical filters.
- Inline dropdowns for "Sort by", "Status", etc.
- "Clear filters" ghost button when any filter active.

### Empty state
Centered, in a card or full-page:
- 40-56px circular icon container (bg-tertiary, muted icon)
- `.typo-h2` title — what's missing
- `.typo-body-sm` description — how to add
- Optional `btn-primary` with the create action

### Loading skeleton
Use `.skeleton-shimmer` rounded rectangles matching the eventual content shape. NO spinner-in-the-middle pattern — it tells the user nothing.

### Status badge
Always use `.chip chip-{success|warning|error|info|brand}`. Vietnamese labels:
- success → "Hoàn thành", "Đã thanh toán"
- warning → "Chờ duyệt", "Chờ đối soát"
- error → "Đã hủy", "Lỗi"
- info → "Đang xử lý", "Mới"
- brand → "Hoạt động"

### KPI card (dashboard)
```
<div class="card p-4">
  <div class="typo-label">Tổng chuyến tháng này</div>
  <div class="typo-display mt-1 tabular-nums">1,247</div>
  <div class="typo-meta mt-1">+12% so với tháng trước</div>
</div>
```

### Form pattern
- Label above input (use `.typo-form-label`).
- 8px gap label→input.
- Input: 38-40px height, `var(--theme-radius-md)` (8px), `var(--theme-border-default)` border, focus ring brand color.
- Hint text below: `.typo-meta`.
- Validation error: `.typo-meta` in `var(--theme-status-error-text)`.
- Section grouping: subtle h3 + 1px hairline above content.

### Tables (desktop)
- Use `.table-modern`.
- Numeric columns: right-align + `.font-mono-num`.
- Status column: chip components.
- Action column: ghost icon buttons (edit/delete/view) in a flex row, 4px gap.
- Row hover: `var(--theme-bg-tertiary)` bg.
- Sticky header on scroll.

### Cards (mobile lists)
- Tap target = whole card (use `.card-interactive`).
- Top row: title + status chip on right.
- Middle: 1-2 lines of secondary info in `.typo-body-sm`.
- Bottom row: meta info + chevron right.
- 12px internal padding, 8px gap between cards.

---

## 7. Migration rules — do NOT do these

❌ Hard-code hex colors anywhere. Use CSS variables.
❌ Use rounded-3xl / rounded-2xl / rounded-full on cards (use rounded-lg / 10px max).
❌ Use the old gold/yellow color or any color outside the spec.
❌ Use `.typo-h2` for page titles (use `.typo-display` or `.typo-h1`).
❌ Build ad-hoc table HTML — use `<table class="table-modern">` or DataTable component.
❌ Spinners as the primary loading state — use `.skeleton-shimmer`.
❌ Multiple primary CTAs on one page header.
❌ Glassy/gradient cards (only the bottomnav and topbar use glass).
❌ Mix Tailwind arbitrary values like `text-[#00963E]` — use tokens.

---

## 8. Per-role notes

### Accountant (ketoan) — **desktop-first**
- Dark slate sidebar pinned at 240px (collapsible).
- Top bar with breadcrumbs, search command palette trigger (Cmd+K), notifications, user menu.
- Most pages are dense data tables — use `.table-modern` consistently.
- Forms (CreateTrip, MatchJob, MatchTrip) use a **2-column form layout** on desktop with section groupings.
- Dashboard uses 4-up KPI grid + 2-col workbench.

### Director (giamdoc) — **mobile-first** (desktop usable)
- Mobile: bottom tab bar + light topbar.
- Desktop: same dark slate sidebar style as accountant, but fewer items.
- DirectorDashboard: KPI grid + activity feed + chart.
- Approval-heavy flows (DirectorPartners, DirectorNotifications) use card-list with action buttons.

### Admin (superadmin) — **mobile-first**
- Same shell as director on mobile/desktop.
- Single dashboard right now — keep it focused, KPIs + recent activity.

### Driver (taixe) — **already 95% good**
- Apply new tokens only — DO NOT restructure layouts.
- Replace any hardcoded greens with `var(--theme-brand-primary)`.
- Replace any rounded-3xl with rounded-lg.
- Update typography classes if old ones (e.g. `.typo-h2` for big titles).

### Login page — **DO NOT REDESIGN**
- The two-tone (green hero band + white form body) login from commit `16aea3a` is the canonical design.
- Pages/Login.tsx and the `.login-*` classes in index.css should not be modified by the redesign work.
- Only acceptable change: token alignment (brand color reference, font family) — no layout/structural changes.

---

## 9. Illustrated assets

User-provided illustrated icons (soft green, friendly) live in `frontend/public/icons/`:
- `/icons/calkey.png` — calendar + key (booking, schedule, work order)
- `/icons/money.png` — cash + coins (payment, salary, revenue)
- `/logo.avif` — brand mark

Custom SVG illustrations for empty states live in `frontend/public/illustrations/`:
- `/illustrations/empty-trips.svg` — empty trip / order lists ("Chưa có chuyến nào")
- `/illustrations/empty-notifications.svg` — empty notifications ("Tất cả đã xem")
- `/illustrations/empty-search.svg` — no search/filter results ("Không tìm thấy kết quả")
- `/illustrations/empty-clients.svg` — empty client/partner lists
- `/illustrations/empty-matching.svg` — empty work-order matching (đối soát)
- `/illustrations/empty-pricing.svg` — empty pricing rules (bảng giá)

**EmptyState usage with illustrations** — use `illustration` prop:
```tsx
<EmptyState
  illustration
  icon={<img src="/illustrations/empty-trips.svg" alt="" className="h-28 w-auto" />}
  title="Chưa có chuyến nào"
  description="Tạo chuyến đầu tiên để bắt đầu quản lý vận tải."
  action={<button className="btn-primary"><Plus size={16} /> Tạo chuyến mới</button>}
/>
```

**EmptyState usage with Lucide icon** (default — for less prominent empty states):
```tsx
<EmptyState
  icon={<Search size={20} />}
  title="Không có kết quả"
  description="Thử từ khóa khác hoặc xóa bộ lọc."
/>
```

**Recommendation:** use `illustration` for primary/full-page empty states (no trips on the trip list, etc.). Use the default Lucide-icon mode for in-card empty states (e.g. "no recent activity" card on dashboard).

**Usage rule:** sprinkle these in **empty states** and **dashboard hero areas** to add warmth, but DO NOT pepper the entire UI with them. Linear/Vercel restraint applies — illustrated icons are punctuation, not paragraphs. Use 56-80px size in empty states, 32-48px in dashboard widgets.

Lucide icons remain the default for inline UI (buttons, table actions, sidebar nav, badges).

## 11. Accessibility

- All interactive elements have visible `:focus-visible` ring (already in base CSS).
- Color contrast: text on bg ≥ 4.5:1. Brand on white ≥ 4.5:1 (emerald-600 = 4.6:1 ✓).
- All icon-only buttons need `aria-label`.
- Form inputs have associated `<label>`.
- Min touch target 44×44px on mobile (use `.touch-target` helper).

---

## 12. File locations reference

```
frontend/src/
├── themes/
│   ├── grab.ts               ← THE TOKENS (already updated)
│   ├── types.ts              ← TS interfaces
│   ├── ThemeContext.tsx      ← React provider
│   └── css.ts, tokens.ts     ← apply to DOM
├── index.css                 ← BASE + UTILITIES (already updated)
├── components/
│   ├── ui/                   ← shadcn primitives (Button, Input, Card, Dialog, …)
│   ├── shared/               ← cross-role layout/data components
│   │   ├── DataTable, DataTablePro
│   │   ├── EmptyState, LoadingState
│   │   ├── FilterPills, FilterToolbar
│   │   ├── PageHeader (create if missing)
│   │   ├── StatusBadge, StatusBadgePro
│   │   ├── DriverLayout, AccountantLayout, DirectorLayout, SuperAdminLayout
│   │   └── AccountantSidebar, AppTopBar, BottomTabBar
│   └── atoms/molecules/organisms ← smaller bits
└── pages/
    ├── driver/    ← 7 pages (lightly polish — DO NOT restructure)
    ├── accountant/← 15 pages (full redesign — desktop-first)
    ├── director/  ← 8 pages (full redesign — mobile-first)
    └── superadmin/← 2 pages (full redesign — mobile-first)
```
