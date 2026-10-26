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
