# Standardize LinkButton Component

## Context
5 distinct link-button patterns exist across 6 files. Goal: one `LinkButton` component that covers all cases.

### Patterns found
| Pattern | Style | Files | Count |
|---------|-------|-------|-------|
| A: `<Link>` back-nav | muted, icon+text | VendorRoutePricingPage, SalaryPeriodSettings, RoutePricingPage | 3 |
| B: `LinkButton` (onClick) | brand color | ExcelImportPage | 1 |
| C: `Button variant="link"` | shadcn link | VehicleExpensesPage | 2 |
| D: Inline export button | muted, disabled | SalaryPage | 1 |
| E: Dead exports | — | DetailLink, ActionPill | 0 consumers |

## Tasks

- [x] (frontend) Rewrite LinkButton component with unified API: `to` (router Link) / `onClick` (button), `variant` (brand/muted), `icon`, `disabled`
- [x] (frontend) Replace Pattern A — 3 identical `<Link>` back-nav occurrences with `<LinkButton to="..." icon={ArrowLeft} variant="muted">`
- [x] (frontend) Replace Pattern C — 2 `Button variant="link"` in VehicleExpensesPage with `<LinkButton onClick variant="brand">`
- [x] (frontend) Replace Pattern D — inline export button in SalaryPage with `<LinkButton onClick variant="muted" disabled>`
- [x] (frontend) Update Pattern B — ExcelImportPage to use new LinkButton API
- [x] (frontend) Remove dead DetailLink and ActionPill exports
- [x] (frontend) Run `make test-frontend` gate

---

# UI-002 · "Kế hoạch Tổng quát" — data-dense redesign (2026-10-26)

## Context
General Plan (Oct 2026) uses large single-column task cards. Each card consumes ~15 rows to express ~8 data points (type badge, ref, time, cont spec, ports, carrier, driver, status). At 228 cont/month, scrolling cost exceeds comprehension time. Owner directive: **elegant, data-dense, zero wasted space.**

## Requirements
1. Compact **row-per-task table** (desktop default): time · type (Nhập/Xuất/Cont/Lẻ, color-coded 4px left border) · ref (mono, truncate+hover) · cargo chip ("3×40DC") · ports abbreviated (VIMC→ĐVũ) · carrier/driver merged · status dot. Row ≤32px, font 12-13px, tabular numerals
2. Summary bar → **sticky single line**: `228 cont · 20′:59 40′:169 · Lẻ:40 lô · [Ngày/Tuần/Tháng toggle]`, merged into toolbar
3. **Card → inline expand only** (click row; no page nav); assignment action inside expand
4. Density toggle (compact/comfortable) persisted; compact default ≥1280px
5. Collapsible group headers (day/carrier), column sort, no modals for assignment
6. Visual: neutral surface, one accent, status-only color (green done / amber unallocated / red warning), no card shadows, 8px grid
7. Keyboard: ↑↓ rows · Enter expand · `A` assign

## Acceptance
- [ ] ≥20 tasks visible @1440×900 without scroll (vs ~4 today)
- [ ] Zero information loss vs current cards (all 8 data points in row+expand)
- [ ] Mobile ≤390px keeps card layout (desktop-only densification)
- [ ] `make test-frontend` green · a11y ≥90 · UI-driver screenshots @1440 + @390
