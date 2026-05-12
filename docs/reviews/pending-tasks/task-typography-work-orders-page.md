# Task TYPO-WO-01: Tighten typography hierarchy on Ghép chuyến page

**Type:** Visual Polish / Information Architecture
**Layer:** Frontend
**Severity:** 🟡 Major (long page, daily use)
**Affected Role/Flow:** Kế toán — Ghép chuyến
**Viewport:** desktop primarily, mobile secondary
**Location:** `http://localhost:5174/accountant/work-orders`

## Observation

The page reads heavy and inconsistent. Multiple problems compound:

- **Master list cards** (left column): status chip is a 44 × 44 box with three stacked elements (icon + score, then count) that visually competes with the plate number. The plate number, partner name, and route text all sit at similar weights, so the eye doesn't know what to look at first.
- **TripDetailCard / edit form** (right top): plate is `text-sm font-mono font-bold` (14 px) while the form labels are `text-[10px]` and inputs are `text-xs` (12 px). The plate dominates while the actual editable values look almost like placeholder text.
- **MatchCard score chip** (right bottom): `4/5` renders at `text-sm font-bold` (14 px) inside a 44 × 44 chip — visually heavier than the plate at the top of the section, even though it's a secondary indicator.
- **MatchDetailPanel section headers** (`Đơn hàng có thể ghép`, `Đã ghép với đơn hàng`): `text-sm font-semibold` is OK but the count badge next to them uses the same size, so the heading–badge pair looks like two equal things.
- **Header actions** (`Tự động ghép`, `Nhập đơn`): both are `h-9` solid green/brand buttons sitting in the top-right corner — same weight, same color, so neither reads as primary.

The user feedback was direct: *"text and font size not a proper typography hierarchy highlight... ensure that this page look compact, dont use too big font size, overall consistent and please the eye."*

## Goal

Establish a clear, compact type scale and apply it consistently across all three regions (master list, trip-detail card, match suggestions). Nothing exotic — pick four sizes, assign each to a role, and remove every other size.

## Proposed type scale (Tailwind classes)

| Role | Size | Weight | Color | Examples |
|---|---|---|---|---|
| Section heading | `text-[13px]` | `font-semibold` (500) | text-primary | "Đã ghép với đơn hàng", "Đơn hàng có thể ghép", "Chỉnh sửa chuyến" |
| Primary value | `text-xs` (12 px) | `font-semibold` | text-primary or brand | plate number, partner name in card header |
| Body / criterion value | `text-xs` (12 px) | `font-medium` | text-primary | criterion values, route text, container number |
| Secondary / label | `text-[11px]` | `font-medium` | text-muted | dates, "KH" prefix, form labels, counter strings |
| Numeric chip (score) | `text-[11px]` | `font-bold tabular-nums` | tone color | "4/5", "1 ĐH" |

Notes:

- **Drop `text-sm` (14 px) on density-critical surfaces.** Reserve it for the dialog/page title only.
- **Two weights only: 500 and 700.** Anything mid-range (`font-medium` 500 used as 600) reads muddy.
- **Section headings are 13 px not 14 px** — keeps them visually close to body without losing primacy.
- **Tabular numerals** (`tabular-nums`) on all counters and scores so they don't jitter as numbers change.

## Specific changes

### `WorkOrderMasterList.tsx`
1. Score chip 44 × 44 → **36 × 36**. Drop the icon when it duplicates color (✓ on green, ✗ on red); keep only the score text `text-[11px] font-bold`.
2. The matched-status chip stack is too tall — replace with a single line: `Đã khớp · 1 ĐH` inline (no second row), `text-[11px]`.
3. **Three-line content block:**
   - Line 1: plate `text-xs font-bold` (brand) + date `text-[11px]` (muted) — same as today, just smaller font.
   - Line 2: partner name `text-xs font-semibold` (primary) + thin separator + route `text-[11px]` (muted). Currently they're concatenated with `·` at the same weight, which reads as one long string.
   - Line 3: container chip `text-[10px] font-mono` (secondary) — keep.
4. Vertical padding `py-2.5 → py-2` to gain density. Border-left selection indicator `3px → 2px`.

### `TripDetailCard.tsx`
1. Plate `text-sm → text-xs` (font-mono font-bold, keep the brand-light background pill).
2. "KH" prefix → tiny label uppercase: `text-[10px] uppercase tracking-wider font-semibold` muted, then partner name `text-xs font-semibold` next to it.
3. Form labels (`Khách hàng`, `Điểm lấy`, `Điểm trả`, `Container`) already `text-[10px]` — bump to `text-[11px]` for legibility; keep `font-semibold` muted.
4. Form inputs `text-xs` — keep, just standardise the `py-1.5` for all (currently mixed).
5. "Chỉnh sửa chuyến" title → `text-[11px] uppercase tracking-wider font-semibold` brand, with the pencil icon at 12 px. Currently it's `text-xs font-bold` which reads like body.

### `MatchCard.tsx`
1. Score chip 44 × 44 → **36 × 36**, `text-sm font-bold → text-[11px] font-bold tabular-nums`.
2. Card header partner name `text-xs font-medium → text-xs font-semibold` (it's the primary anchor of the card).
3. Container chips in header `text-[10px] font-mono` — keep; truncate at 3 items (already does).
4. Criterion label `text-xs font-semibold w-20 → text-[11px] font-semibold w-24` — slightly more room, slightly lighter.
5. Criterion value (TO value) `text-xs → text-xs` — keep, but ensure `font-medium` not `font-normal`.
6. Counter line `text-[11px]` — already done in the recent refactor; ensure it's `font-medium` not bold.
7. "Ghép" button `text-xs font-bold → text-xs font-semibold` — bold reads aggressive next to the gentler chip.

### `MatchDetailPanel.tsx`
1. Section headings (`Đã ghép với đơn hàng`, `Đơn hàng có thể ghép`, `Thêm đơn hàng khác cho chuyến này`) → `text-[13px] font-semibold` (currently `text-sm`).
2. Count badge next to headings: `text-[10px] font-semibold tabular-nums` in a `bg-tertiary` pill (currently `text-xs`).
3. Matched-trip card date `text-xs → text-[11px]` muted.
4. Empty states `text-sm → text-[13px]` (just slightly tighter).

### `WorkOrderList.tsx` (header)
1. Header action buttons (`Tự động ghép`, `Nhập đơn`) — `h-9 → h-8`, `text-xs → text-[11px] font-semibold`.
2. Make ONE primary: keep `Tự động ghép` as solid brand-success; demote `Nhập đơn` to **outline** style (`bg-transparent border border-brand text-brand`). Two solid buttons next to each other = both lose primacy.
3. `MonthNavigator` title `Tháng 05/2026` already large — verify it's `text-sm font-semibold` (not bigger). Subtitle `01/05 → 31/05` should be `text-[10px] uppercase tracking-wider` muted.

## Don't

- Don't introduce new colors. The palette already has success / warning / error / muted tokens — use those.
- Don't add new shadows, gradients, or rounded-3xl flourishes. The goal is to **reduce** visual noise, not add to it.
- Don't touch the data layer or the match scoring algorithm.
- Don't change the column widths (40 / 60 split) or layout structure.

## Verification

1. `cd frontend && pnpm tsc --noEmit && pnpm lint` clean (or no new errors beyond baseline).
2. Visual check at `http://localhost:5174/accountant/work-orders`:
   - Squint test — can you still tell which row is selected? (border-left should still pop.)
   - Hierarchy test — read each card top-to-bottom: plate → partner → container. Does your eye flow in that order?
   - Density test — list shows ≥ 8 rows without scrolling on a 14" laptop (1366 × 768).
3. Cross-check the mobile sheet — same components are reused; the smaller sizes shouldn't break anything.
4. Take a screenshot at desktop (1440 × 900) and compare against the current state.

## Key files

- `frontend/src/pages/accountant/work-orders/WorkOrderMasterList.tsx`
- `frontend/src/pages/accountant/work-orders/TripDetailCard.tsx`
- `frontend/src/pages/accountant/work-orders/MatchCard.tsx`
- `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx`
- `frontend/src/pages/accountant/WorkOrderList.tsx`
- `frontend/src/components/shared/MonthNavigator.tsx` (verify only)
- `frontend/src/components/shared/FilterToolbar.tsx` (verify only)

## Commits

Suggested: `refactor(work-orders): unify typography scale across master list, trip card, match panel`

Please dispatch agent to do visual review
