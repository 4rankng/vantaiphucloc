# Project Conventions

## Architecture

- **Backend**: FastAPI, SQLAlchemy async, PostgreSQL, DDD context structure (`backend/app/contexts/`)
- **Frontend**: React, TanStack Query, shadcn/ui-style components, custom theming via CSS vars (`--theme-*`)

## Frontend Component Library

- All pages are **orchestration of components from the component library** (`frontend/src/components/`)
- **Never write components specific to one page only.** Even if a component is initially needed for one page, create it in the library for future reuse.
- Reusable components live in:
  - `components/ui/` — primitive UI building blocks (Button, Input, Dialog, Sheet, Select, Popover, etc.)
  - `components/shared/` — composed components used across pages (InlineSelect, EntityTable, AccountantPageShell, DashboardSectionHeader, etc.)
  - `components/molecules/` — larger composed components (SheetSelect, etc.)
  - `components/atoms/` — atomic utilities (Toast, etc.)
- Before building new UI, check the library first. Prefer extending or combining existing components.

## Entity Naming

- **No Partner concept anywhere** — replaced with `Client` and `Vendor` as separate entities throughout frontend and backend
- Backend: `Client` ORM → `clients` table; `Vendor` ORM → `vendors` table

## Code Style

- No comments unless explicitly asked
- Use theme CSS variables (`var(--theme-*)`) for all colors — never hardcode colors
- Vietnamese labels for UI text visible to users

## Key Components Reference

- `InlineSelect` — searchable dropdown with filter, optional "create new" action
- `EntityTable` — table view pattern for entity lists
- `AccountantPageShell` — page layout shell with search, add button, count
- `Sheet` — slide-in panel for detail views
- `Dialog` / `DialogContent` — modal dialogs; supports `hideCloseButton` prop
