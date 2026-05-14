---
name: ttransport-design
description: Use this skill to generate well-branded interfaces and assets for TTransport (Vận tải Phúc Lộc), the container-trucking management platform for Phúc Lộc Transport in Hải Phòng, Vietnam — either for production code or throwaway prototypes/mocks/decks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc.), copy assets out of `assets/` and `fonts/` into your output directory and create static HTML files that reference them with relative paths. Always import `colors_and_type.css` at the top of your stylesheet — that file sets every CSS variable the rest of the system relies on. Look at `preview/` cards for atomic examples of each token in use and at `ui_kits/web/` + `ui_kits/mobile/` for full screen recreations.

If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand. The production codebase is React + TypeScript + Tailwind + Radix; map CSS vars in `colors_and_type.css` to the Tailwind tokens in `frontend/tailwind.config.ts`.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions (audience, surface, role — director / accountant / driver / admin, fidelity level, whether they want options), and act as an expert designer who outputs HTML artifacts *or* production code, depending on the need.

## Non-negotiables

- **Vietnamese-first copy** with full diacritics; use the literal phrases catalogued in README.md → CONTENT FUNDAMENTALS unless the user gives different copy. Never machine-translate.
- **Be Vietnam Pro** for all text. Never substitute Inter, Roboto, or system-ui — Vietnamese diacritics need this specific face. JetBrains Mono for currency, container IDs, and numeric tables.
- **One emerald accent.** No second brand color. No purple, no pink. Status palette is success/warning/danger/info only.
- **Hairline borders are the system.** Every card is `1px solid var(--border-1)` + a near-invisible `var(--shadow-card)`. Don't reach for heavier shadows.
- **No emoji.** Allowed glyphs: `→ · ● ▶ ✓ ₫`. That's it.
- **Currency: `12.450.000 ₫`** — vi-VN grouping, `₫` symbol trailing with a hard space, mono font, `font-variant-numeric: tabular-nums`.
- **Iconography:** Lucide-React for inline UI icons (stroke 1.8). Branded 3D PNG icons in `assets/icons/` for hero/role/empty surfaces only — never inline.

## When something is ambiguous

If you don't see an existing pattern for what the user is asking for, **don't invent it**. Look first in `ui_kits/`, then in `preview/`, then ask the user before extending the system.
