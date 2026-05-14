# TTransport Design System

A polished design language for **TTransport** — *Phần mềm quản lý vận tải hàng hóa* — the container-trucking operations platform for **Phúc Lộc Transport (Vận tải Phúc Lộc)** in Hải Phòng, Vietnam.

The product runs the day-to-day of a Vietnamese trucking yard: drivers log container moves from their phones, accountants reconcile orders against work tickets, directors review revenue and activity, and an admin keeps user accounts in order. The UI is Vietnamese-first and bilingually neat (Vietnamese display copy, English keywords in code/keys).

The visual language is **Linear / Vercel-inspired modern SaaS**: a single emerald accent on a neutral zinc canvas, hairline 1 px borders, tight radii (6/8/10/14), soft single-shadow elevation, and `Be Vietnam Pro` as the workhorse typeface. The login flow is the one place we lean into a fuller emerald gradient with a hand-drawn freight scene — everywhere else, restraint.

---

## Source materials

This system was reverse-engineered from the live frontend codebase:

- **GitHub:** `4rankng/vantaiphucloc` (private) — `frontend/` directory
  - Theme tokens: `frontend/src/themes/grab.ts` (file kept under legacy name — actually the **Modern / Linear-Vercel** preset)
  - Type stack & Tailwind: `frontend/tailwind.config.ts`
  - Auth + login visuals: `frontend/src/pages/Login.tsx`
  - Sidebar / Header chrome: `frontend/src/components/layout/`
  - Reusable atoms: `frontend/src/components/ui/`, `frontend/src/components/atoms/`
  - Domain modules: `frontend/src/components/modules/` (Trip, Client, Invoice, Vehicle cards)
  - Role dashboards: `frontend/src/pages/{director,accountant,driver,superadmin}/`
- **Product proposal:** `proposal.txt` in repo root — Vietnamese sales sheet for the 4 user roles
- **Brand assets:** `frontend/public/{fonts,icons,illustrations,logo.avif,pwa-*.png}` — all imported into this project under `fonts/` and `assets/`

---

## Index — what's in this folder

| File / folder                      | What it is                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `README.md`                        | You are here. Brand & content fundamentals + visual foundations + iconography. |
| `SKILL.md`                         | Agent Skill manifest — invoke this when designing for TTransport.           |
| `colors_and_type.css`              | All CSS vars (colors, radii, spacing, motion) + semantic `.typo-*` classes. |
| `fonts/`                           | Be Vietnam Pro (7 weights) + JetBrains Mono (3 weights) + `fonts.css`.      |
| `assets/logo.avif` / `logo-512.png`| Truck-on-green emoji-style app logo. Use AVIF where supported, PNG fallback.|
| `assets/icons/`                    | 12 branded 3D PNG icons (truck, route, package, invoice, analytics, …).     |
| `assets/illustrations/`            | 10 emerald empty-state & background SVGs.                                   |
| `preview/`                         | Per-token cards that populate the Design System tab.                        |
| `ui_kits/web/`                     | Interactive recreation of the desktop web app (director + accountant). Login → dashboard → trips → clients. |
| `ui_kits/mobile/`                  | Interactive recreation of the driver mobile PWA. Home → trip detail → camera-OCR new order. |

---

## Product context

TTransport is a 4-role internal tool — there is no public marketing site, no signup, no payments. The "big tech polish" lives in the workmanlike attention to typography rhythm, table density, currency formatting, and zero visual noise.

| Role (Vietnamese)           | Surface                | What they do                                                                 |
| --------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| **Quản trị** *(Admin)*      | Web (desktop)          | Bootstrap user accounts. Almost no UI surface.                               |
| **Giám đốc** *(Director)*   | Web (desktop)          | KPIs, trip-orders feed, audit log, monthly bar chart.                        |
| **Kế toán** *(Accountant)*  | Web (desktop)          | Trip orders, work-order matching (manual + AI), pricing/clients/routes CRUD. |
| **Tài xế** *(Driver)*       | **Mobile-first PWA**   | Photographs container number (AI OCR), submits work order, sees earnings.    |

The driver app is an installable PWA that works offline (IndexedDB-buffered) and re-syncs when network returns. It's the only fully-mobile surface; everything else is responsive but desktop-led.

---

## CONTENT FUNDAMENTALS

### Language

- **Vietnamese-first.** All user-facing copy is in Vietnamese with full diacritics (Đ, ấ, ệ, ự…). The `<html lang="vi">` attribute is set globally and `Be Vietnam Pro` is loaded specifically because it ships polished Vietnamese tone marks.
- English appears only in two places: (1) developer-facing strings (status enums like `PLANNED`, `IN_PROGRESS`) that are mapped to Vietnamese for display, and (2) the `TTransport` wordmark itself, kept English as a product brand.
- Currency is **Vietnamese Đồng** (`₫`) with compact formats: `2.4 tr` (triệu = million), `1.8 tỷ` (tỷ = billion). Full format uses `vi-VN` locale grouping: `12.450.000 ₫`.
- Numbers use **tabular-nums** (the `.typo-num` utility) — currency columns must align decimally in tables.

### Voice & tone

- **Operational, neutral, respectful.** This is a tool people use 8 hours a day; copy is short, declarative, and unfussy. Never cheerful, never apologetic.
- Uses **bạn** ("you", informal-but-respectful) when addressing the user — *"Bạn có chắc muốn đăng xuất?"*, *"Nhập thông tin để tiếp tục."*. Never the formal **quý khách** (this is an internal tool, not a customer-facing one) and never the casual **mày/tao**.
- Buttons are **verbs**, terse, no period: *Đăng nhập*, *Đăng xuất*, *Huỷ*, *Xác nhận*, *Tạo chuyến*, *Bắt đầu*, *Hoàn thành*.
- Empty states pair one short status line with a hint: *"Chưa có chuyến nào"* / *"Nhấn + để tạo chuyến mới"*.
- Errors are diagnostic, not blamey: *"Thông tin đăng nhập không hợp lệ. Vui lòng thử lại."* / *"Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau."*

### Casing

- Page titles & dialog titles: **Sentence case** (`Tổng quan`, `Đổi mật khẩu`, `Hồ sơ người dùng`).
- Button labels: **Sentence case** (`Đăng nhập`, never `ĐĂNG NHẬP`).
- Eyebrows / section labels / table headers: **UPPERCASE** with `tracking-wider` (e.g. `MENU`, `TÊN`, `ĐIỆN THOẠI`). The `.typo-eyebrow` utility does this.
- Status pills inside cards: **UPPERCASE** short codes (`DN` for doanh nghiệp, work-type codes).

### Punctuation & glyphs

- Vietnamese diacritic combining is intact — don't replace ạ→a.
- Route arrows: **`→`** (U+2192) — *"Hải Phòng → Hà Nội"*. Not `->` and not `>`.
- Bullets in micro-copy: **`·`** (middle dot, U+00B7) — *"08:30 · 12 km"*.
- Currency symbol: **`₫`** (U+20AB), trailing the amount with a hard space: `12.450.000 ₫`.
- Status indicators inline: **`●`** (filled circle) followed by status text in the color.
- **No emoji**, with two arch exceptions: an occasional `▶` / `✓` glyph on driver buttons (`▶ Bắt đầu`, `✓ Hoàn thành`). Otherwise emoji are not part of the system.

### Sample copy

| Surface         | Vietnamese                                          | Note                                  |
| --------------- | --------------------------------------------------- | ------------------------------------- |
| Login title     | `Đăng nhập`                                         | Sentence case, one word               |
| Login sub       | `Nhập thông tin để tiếp tục`                        | No period                             |
| Dashboard h1    | `Tổng quan`                                         | "Overview", sentence case             |
| Stat label      | `Tổng chuyến`, `Đã khớp`, `Chờ xử lý`, `Doanh thu`  | 2–3 words, no punctuation             |
| Section header  | `Lệnh vận chuyển gần đây`                           | "Recent dispatch orders"              |
| Subhead         | `5 lệnh mới nhất`                                   | Numeric facts beat adjectives         |
| Empty list      | `Chưa có lệnh nào` / `Các lệnh mới sẽ xuất hiện ở đây` | Status + one-line hint              |
| Confirm dialog  | `Bạn có chắc muốn đăng xuất?`                       | Always second-person `bạn`            |

---

## VISUAL FOUNDATIONS

### Color

A neutral **zinc canvas** with one **emerald accent**, plus a four-color semantic status set (success = same emerald, warning amber, danger red, info blue). No purple. No pink. No second-brand accent. Gradients exist but are reserved for two contexts only: the login hero (full emerald gradient) and the driver "earnings card" (a 5%-emerald-into-white wash).

| Token            | Hex        | Role                                                    |
| ---------------- | ---------- | ------------------------------------------------------- |
| `--brand`        | `#059669`  | Emerald-600. Primary buttons, active state, links.      |
| `--brand-hover`  | `#047857`  | Emerald-700. Hover/pressed brand. Sidebar bg.           |
| `--brand-soft`   | `#ECFDF5`  | Emerald-50. Icon halos, chip backgrounds, tints.        |
| `--fg-1`         | `#09090B`  | Zinc-950. Headlines, body emphasis.                     |
| `--fg-2`         | `#52525B`  | Zinc-600. Body copy, secondary text.                    |
| `--fg-3`         | `#A1A1AA`  | Zinc-400. Muted labels, hints, placeholders.            |
| `--bg-1`         | `#FAFAFA`  | Zinc-50. Page background.                               |
| `--bg-2`         | `#FFFFFF`  | Card / sheet / dialog background.                       |
| `--bg-3`         | `#F4F4F5`  | Zinc-100. Hover row, input bg, chip bg.                 |
| `--border-1`     | `#E4E4E7`  | Zinc-200. The default 1 px hairline.                    |
| `--border-2`     | `#F4F4F5`  | Zinc-100. Softer divider, table-row separator.          |

### Typography

- **Display + body:** `Be Vietnam Pro` — the only sans face, used across the entire product. Six weights are loaded (300, 400, 500, 600, 700, 800) plus italic-400. The face is paid attention specifically because of its Vietnamese diacritic quality.
- **Mono:** `JetBrains Mono` — used for currency totals (`tabular-nums`), container numbers, IDs, and reconciliation deltas.
- **Scale:** 10 / 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 px. Always pulled from `--fs-*` vars; never hard-coded.
- **Tracking:** headlines run `-0.025em` tight; all-caps labels run `+0.1em` (wider). Body is normal.
- **Letter-spacing on Vietnamese:** *never* go tighter than `-0.025em` — combining diacritics need air.

### Spacing & rhythm

A linear 4-px-base scale: `4 / 8 / 12 / 16 / 24 / 32 / 48`. Cards have **16 px** internal padding; pages have **16 px** outer padding. Section gaps are **16 px**. Stat-card grids step up to **24 px** on `lg` only.

### Borders & corners

- **Always 1 px**. Never 2 px, never thick. Borders are the primary form of definition — shadows are secondary.
- Radii ladder: `sm = 6` (chips), `md = 8` (inputs, buttons), `lg = 10` (cards, table containers), `xl = 14` (dialogs, sheets), `full` for pills/avatars.
- Cards combine a hairline border (`1px solid var(--border-1)`) with a near-invisible shadow (`--shadow-card`) — *not* a heavier shadow. The combo reads crisp on light backgrounds.

### Elevation / shadows

Three levels, all very restrained:

- `--shadow-sm` — `0 1px 1px 0 rgba(9,9,11,0.03)` — passive cards.
- `--shadow-card` — `0 1px 2px 0 rgba(9,9,11,0.04)` — KPI tiles.
- `--shadow-elevated` — `0 4px 16px -4px rgba(9,9,11,0.08), 0 0 0 1px rgba(9,9,11,0.03)` — popovers, dropdowns, modals.
- `--shadow-brand` — emerald glow, only for the primary CTA in the login flow.

Cards never use just-a-shadow; they pair shadow + hairline. The shadow alone is too soft to define an edge on `--bg-1`.

### Backgrounds & imagery

- **App canvas:** flat `--bg-1` zinc-50. No gradient. No texture. No grain.
- **Login hero:** full emerald `--brand-grad` background with a low-opacity (8–25%) hand-drawn SVG of a road, trucks, distant buildings, and stars — the only place the system gets scenic. The illustration sits at ~18% opacity over the gradient.
- **Empty states:** scenic emerald-palette SVG illustrations from `assets/illustrations/` (`empty-trips.svg`, `empty-welcome.svg`, etc.) — soft, line-art-adjacent, never photographic.
- **Brand icons:** 3D-style PNG icons on pale-emerald circular backgrounds (`assets/icons/icon_*.png`) — these appear in role dashboards and empty states. They are NOT used as inline UI icons (Lucide handles that).
- **No stock photography.** No people in glass towers. No abstract dotted globes.
- **No repeating patterns or textures.** The closest we get is a `0.045`-opacity SVG truck silhouette watermark on the driver's earnings card.

### Animation

- **Springy but restrained.** Standard easing is `cubic-bezier(0.4, 0, 0.2, 1)` at `120 / 180 / 240 ms` (fast / normal / slow). A separate spring `cubic-bezier(0.34, 1.56, 0.64, 1)` at `300 ms` is reserved for confirm-pop moments.
- **Page load:** elements fade-in-up `10 px → 0` over `400 ms`. A hero-reveal variant adds a `0.98 → 1` scale.
- **Button press:** `scale(0.98) translateY(1px)` over `200 ms`, easing out.
- **Sidebar item hover:** background fades from transparent → `var(--sidebar-hover)` in `150 ms`.
- **No** scroll-triggered animations, no parallax, no bounce, no continuous loops *except* a grain-shift on certain hero backgrounds at `8s steps(10) infinite`.

### Hover & press states

- **Buttons (primary):** background stays `--brand`, an `active:scale-[0.98]` ripple acknowledges the press; no color shift on hover.
- **Buttons (secondary / ghost / outline):** background → `var(--bg-3)` on hover, no scale.
- **Table rows:** background → `var(--bg-3)` on hover. Cursor `pointer`. No row-height change.
- **Sidebar items (on dark green):** background → `rgba(255,255,255,0.08)` on hover, `0.15` when active. Active item also gets a small `chevron-right` icon in `var(--brand-2)`.
- **Cards (interactive):** `transition-all hover:shadow-md` — shadow steps up slightly; no transform.
- **Links:** `hover:underline` only, no color change.

### Transparency & blur

Used sparingly, in exactly two places:

1. **Header bar:** `rgba(255,255,255,0.85)` background + `backdrop-filter: blur(12px) saturate(1.4)` + `1px` bottom hairline. Sticky to top, z-40.
2. **Mobile bottom-nav:** same treatment, sticky to bottom.

Sidebars and modals are **opaque** — no glassy panels. We're not Apple.

### Layout rules

- **Web app:** desktop ≥ `1024 px` gets the left sidebar (`w-64`, fixed). Below that, sidebar collapses and a mobile top-bar takes over with a hamburger and avatar dropdown.
- **Driver app:** always single-column mobile layout, with a `FloatingActionButton` (bottom-right, `--brand` filled circle with a `+` glyph) and a top `MobileHeader`. No sidebar.
- **Tables:** wrapped in a card; first row is `border-bottom: 1px solid var(--border-1)`, subsequent rows `border-bottom: 1px solid var(--border-2)`. Column headers are `.typo-eyebrow`.
- **Forms:** label above input, `8 px` gap. Inputs are full-width inside their column, `h-10` (40 px) default.
- **Fixed elements:** header (z-40), sidebar (no z, it's a sibling), FAB (z-50), modal overlay (z-300), toast (z-500).

### Status pills

The `StatusBadge` pattern is the canonical way to communicate state in a table or list row: a small filled chip, soft-tint background, darker-tint text, `--radius-full`. Categories: `default` (emerald), `secondary` (zinc), `success`, `warning`, `danger`, `info`, `neutral`, `outline`, `gold` (= emerald-light for legacy reasons). The "gold" variant name is kept for codebase compatibility but it's emerald-soft visually.

---

## ICONOGRAPHY

TTransport uses **two parallel icon systems** that don't mix:

### 1. Lucide-React — the working UI icon set

- Every inline UI affordance (chevrons, search, plus, lock, eye/eye-off, truck, alert-circle, calendar, dollar-sign, user, log-out, key-round, chevron-down, trending-up, arrow-up-right, activity, etc.) is from **`lucide-react@^1.8`**.
- Stroke width: default `1.5–2`. Used at `12 / 14 / 16 / 18 / 22 px`. Inherit color via `currentColor` so they re-tint with theme tokens.
- Available at CDN as `lucide-static` (SVG sprite) or via `https://unpkg.com/lucide@latest` for prototypes. **Substitution note:** when prototyping in plain HTML here, use Lucide via CDN — this matches production exactly, no flag needed.

### 2. Branded 3D icons (PNG) — for hero / role / empty-state moments

Twelve hand-illustrated 3D-ish PNG icons in `assets/icons/` on pale-emerald circular backgrounds (256–512 px source). These are the **product-personality** icons — used at the top of role dashboards, in big empty states, and as `BrandIcon` instances inside large stat-card highlights. They are *never* used inline in text.

| File                       | Domain meaning                          |
| -------------------------- | --------------------------------------- |
| `icon_truck.png`           | Vehicles / fleet                        |
| `icon_route.png`           | Routes (cung đường)                     |
| `icon_package.png`         | Container / cargo                       |
| `icon_warehouse.png`       | Depot / origin / destination            |
| `icon_invoice.png`         | Invoice / bill                          |
| `icon_document.png`        | Generic document / work order           |
| `icon_schedule.png`        | Trip schedule / calendar                |
| `icon_analytics.png`       | Reports / dashboards                    |
| `icon_team.png`            | Users / drivers / partners              |
| `icon_settings.png`        | Configuration                           |
| `money.png`                | Earnings / revenue (driver app)         |
| `calkey.png`               | Empty-state mascot — generic "nothing here yet" |

The TypeScript `BrandIcon` component maps semantic names → file paths. When prototyping, just reference `assets/icons/icon_*.png` directly.

### Emoji & unicode glyphs

- **No emoji** in normal UI, period.
- A handful of **unicode shapes** are used: `→` (route separator), `·` (bullet), `●` (status dot), `▶` / `✓` (driver button affordances), `★` (rare — favourites; not currently in use).
- **No icon font.** No Font Awesome. No Material Icons.

### Illustrations

Ten emerald-palette SVG illustrations in `assets/illustrations/` cover empty / error / welcome states. They're vector, gradient-light, scenic but not cluttered. Use them at `120–240 px` square. They are not used as background imagery; they are illustration-as-content.

### Substitutions / flags

- **None.** All fonts, icons, illustrations are imported directly from the codebase. The PWA icon (`assets/logo-512.png`) doubles as a high-resolution logo when you need raster — for vector, the AVIF logo (`assets/logo.avif`) is the source, but AVIF support varies, so most HTML mocks should reference the PNG.

---

## Notes on "big tech polish"

The original codebase was already pretty close — what this system locks in is:

1. **Restraint over flourish.** One brand color. One type family. Three shadows. Don't add a fourth of anything.
2. **Hairlines do the work, not shadows.** A 1 px `--border-1` is non-negotiable on every card.
3. **Vietnamese typography respect.** No tracking tighter than `-0.025em`, real Be Vietnam Pro at all weights, never substitute Roboto/Inter.
4. **Dense, factual, calm.** This is a tool. Every pixel earns its place; nothing decorates without meaning.
