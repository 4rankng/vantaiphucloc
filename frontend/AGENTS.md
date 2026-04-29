# AGENTS.md — Frontend

> Update this file when adding/removing pages, components, hooks, services, or routes.

## Quick Facts

- **Mobile-first PWA** with offline support (IndexedDB queue)
- **Single-tenant** — no company selection
- **4 roles**: `driver` (mobile hub), `accountant` (trips/pricing/salary), `director` (dashboards), `superadmin`
- **No React Router** — custom state-based navigation (history stacks)
- **Theme**: Grab-inspired green, CSS variables
- **All UI text in Vietnamese**

## ⚠️ Version Bump Rule

Every frontend change MUST bump `version` in `package.json`. Format: `YYYY.MM.DD.N`. Same day bump N, new day reset to 1. Used for PWA cache busting.

## Tech: React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui (26 components) + Axios + vite-plugin-pwa

## Path Aliases

`@` → `./src` | `@ui` → `./src/components/ui` | `@shared` → `./src/components/shared` | `@lib` → `./src/lib`

## Structure

```
src/
├── App.tsx                  # Provider stack → AppContent (role switch) → DriverRouter
├── main.tsx                 # Entry point
│
├── components/
│   ├── atoms/               # Icon, Pill, Toast
│   ├── molecules/           # FormField, ListItem, SearchPill, SheetSelect
│   ├── organisms/           # DataList, FormCard, LiveCard
│   ├── shared/              # 30+ cross-cutting: AppTopBar, BackButton, DataTable, EmptyState,
│   │                        #   StatusBadge, TripCard, WorkOrderCard, OfflineIndicator, etc.
│   ├── modules/             # ClientCard, TripDetail, VehicleTable, etc.
│   ├── layout/              # Header, Sidebar
│   └── ui/                  # shadcn/ui: Button, Sheet, Dialog, Select, Tabs, etc.
│
├── contexts/
│   ├── AuthContext.tsx       # login(), logout(), JWT in localStorage
│   ├── ErrorContext.tsx      # Error boundary
│   └── OfflineContext.tsx    # Queue mutations when offline (IndexedDB)
│
├── hooks/
│   ├── use-api.ts           # useApi<T>() — Axios + offline queue
│   ├── use-app-store.tsx    # Accountant nav: navigate(path), goBack(), history
│   ├── use-driver-store.tsx # Driver nav: navigate(path), goBack(), history
│   └── use-mobile.ts, use-network.ts, use-notifications.ts, use-polling.ts
│
├── lib/
│   ├── utils.ts             # cn() (tailwind-merge + clsx)
│   ├── offline-db.ts        # IndexedDB for offline storage
│   ├── statusMaps.ts        # Status → label/color mappings
│   ├── navigation.ts        # Accountant sidebar nav, page titles
│   └── error-utils.ts, network.ts, notifications.ts, sw-register.ts
│
├── pages/
│   ├── Login.tsx
│   ├── driver/              # AppShell, DriverHome, CreateWorkOrder, JobDetail,
│   │                        #   DriverHistory, DriverNotifications, Profile
│   ├── accountant/          # AccountantApp (router), Dashboard, ClientList, RouteList,
│   │                        #   PricingList, WorkOrderList, TripList, CreateTrip,
│   │                        #   MatchJob, MatchTrip, SalarySetup
│   ├── director/            # DirectorApp (router), Dashboard, UserManagement,
│   │                        #   DriverJobs, ClientJobs, Notifications
│   └── superadmin/          # SuperAdminApp
│
├── services/
│   ├── api/client.ts        # Axios: baseURL /api/v1, JWT interceptor, typed ApiError
│   ├── api/realClient.ts    # Real API calls with offline fallback
│   └── sandbox/             # Mock client for dev
│
└── themes/                  # Grab green theme, ThemeProvider, CSS vars
```

## Routing (No React Router)

**App.tsx** switches on `user.role` → role App component.

**Driver** — `DriverStore`: `/driver` (home), `/driver/work-orders/new`, `/driver/history`, `/driver/notifications`, `/driver/job/:id`

**Accountant** — `AppStore`: `/accountant` (dashboard), `/accountant/clients`, `/accountant/routes`, `/accountant/pricing`, `/accountant/work-orders`, `/accountant/trips`, `/accountant/trip/:id`, `/accountant/match/:id`, `/accountant/match-trip/:id`, `/accountant/create-trip`, `/accountant/salary-setup`

**Director** — `useState<'dashboard'|'users'|'notifications'|'driver-jobs'|'client-jobs'>`

## Offline Flow

1. `OfflineProvider` wraps app, monitors network
2. When offline, `queueAction()` stores mutations in IndexedDB
3. When online, `syncNow()` replays queued actions
4. `CreateWorkOrder` shows "Lưu offline" when offline, auto-syncs on reconnect

## Commands

```bash
pnpm dev          # Dev server (port 5173)
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm tsc --noEmit # Type check
```
