# AGENTS.md — Frontend Development Guide

> **Read this before making any frontend change.** This file is the source of truth for project structure, routing, component locations, and where to make changes. Update it whenever you add/remove pages, components, hooks, services, or routes.

---

## Self-Maintenance Rule

**Every agent MUST update this file when:**
- Adding or removing a page component
- Adding or removing a shared/module component
- Adding or removing a hook, context, or service
- Adding or removing a route (navigation path)
- Changing the routing architecture
- Adding or changing path aliases
- Changing the state management approach
- Adding new design conventions or breaking existing ones

If you change code and this file becomes stale, the next agent will be misled. Keep it current.

---

## Project Overview

**Vận Tải Phúc Lộc** — a freight/logistics management frontend for Phúc Lộc transport company.

- **Mobile-first** PWA with offline support
- **Single-tenant** — no company selection, no multi-tenancy
- **4 roles**: `driver` (mobile hub), `accountant` (manage trips/pricing/salary), `director` (dashboards/reports), `superadmin`
- **No React Router** — custom state-based navigation with history stacks
- **Theme system**: Grab-inspired green theme with CSS variables
- **Backend-driven force update**: checks `GET /version` every 5 min, can force reload users

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 |
| UI Library | Shadcn/ui (26 components) |
| HTTP | Axios |
| State | React Context + useState (no Redux/Zustand) |
| PWA | vite-plugin-pwa |
| Icons | Lucide React |

---

## Path Aliases

Configured in `vite.config.ts`:

| Alias | Path |
|---|---|
| `@` | `./src` |
| `@ui` | `./src/components/ui` |
| `@shared` | `./src/components/shared` |
| `@layout` | `./src/components/layout` |
| `@hooks` | `./src/hooks` |
| `@lib` | `./src/lib` |
| `@data` | `./src/data` |
| `@themes` | `./src/themes` |

---

## Folder Map

```
frontend/src/
│
├── App.tsx                      # Root component
│                                #   Provider stack: ThemeProvider → AuthProvider → ErrorBoundaryProvider
│                                #   → OfflineProvider → ToastProvider → ErrorBoundary
│                                #   AppContent switches on user.role → role App component
│                                #   DriverRouter: state-based switch on currentPath from DriverStore
│
├── main.tsx                     # Entry point, renders <App />
├── index.css                    # Global styles, CSS utilities, animations (card-lift, search-pill, etc.)
│
├── components/
│   ├── atoms/                   # Primitives (3 components)
│   │   ├── Icon/Icon.tsx        #   Icon wrapper
│   │   ├── Pill/Pill.tsx        #   Pill badge
│   │   └── Toast/Toast.tsx      #   Toast notification (also ToastProvider)
│   │
│   ├── molecules/               # Composed from atoms/ui (4 components)
│   │   ├── FormField/FormField.tsx    # Label + Input combo
│   │   ├── ListItem/ListItem.tsx      # List row item
│   │   ├── SearchPill/SearchPill.tsx  # Rounded search input
│   │   └── SheetSelect/SheetSelect.tsx # Bottom sheet picker
│   │
│   ├── organisms/               # Feature blocks (3 components)
│   │   ├── DataList/DataList.tsx      # Generic data list with loading/empty states
│   │   ├── FormCard/FormCard.tsx      # Form in a card container
│   │   └── LiveCard/LiveCard.tsx      # Amber active-trip indicator (driver only)
│   │
│   ├── shared/                  # Cross-cutting reusable components (30+ components)
│   │   ├── ActivityFeed/            # Activity feed list
│   │   ├── AppTopBar/              # Top bar (home variant with avatar, or page variant with back)
│   │   ├── BackButton/             # ← Quay lại button (uses goBack() from store)
│   │   ├── ChartCard/              # Chart container
│   │   ├── ContBadge/              # Container type/number badge
│   │   ├── ContainerScanner/       # Container photo/scan UI
│   │   ├── DashboardShell/         # Dashboard layout wrapper
│   │   ├── DataList/               # Generic data list
│   │   ├── DataTable/              # Table with sort/filter
│   │   ├── DetailRow/              # Label-value detail row
│   │   ├── EmptyState/             # No-data placeholder (icon + text)
│   │   ├── ErrorFallback/          # Error UI fallback
│   │   ├── ExpenseCard/            # Expense item card
│   │   ├── ExpenseRow/             # Expense list row
│   │   ├── FloatingActionButton/   # FAB button
│   │   ├── GlassCard/              # Glass morphism card
│   │   ├── InfoRow/                # Info label-value row
│   │   ├── InlineError/            # Inline error text
│   │   ├── InlineStatStrip/        # Horizontal key-value stat strip
│   │   ├── KPIBadge/               # KPI indicator badge
│   │   ├── LinkButton/             # Styled link button
│   │   ├── LoadingState/           # Loading skeleton
│   │   ├── MasterDetail/           # Master-detail layout
│   │   ├── MetricCard/             # Metric with trend
│   │   ├── MonthNavigator/         # Month picker
│   │   ├── NotificationItem/       # Single notification row
│   │   ├── OfflineIndicator/       # Offline status bar
│   │   ├── PageHeader/             # Page title header
│   │   ├── ProfileDialog/          # User profile dropdown (UserDropdown)
│   │   ├── SearchBar/              # Search input
│   │   ├── SectionHeader/          # Section title with optional action
│   │   ├── SegmentedControl/       # Pill tabs
│   │   ├── SheetPicker/            # Bottom sheet picker for edits
│   │   ├── SparklineChart/         # Mini sparkline chart
│   │   ├── StatCard/               # Stat card
│   │   ├── StatTileCard/           # Tile stat card
│   │   ├── StatsRow/               # Row of stat tiles
│   │   ├── StatusBadge/            # Status indicator badge
│   │   ├── TimeRangePicker/        # Time range selector
│   │   ├── TrendIndicator/         # Up/down arrow
│   │   ├── TripCard/               # Trip order card
│   │   └── WorkOrderCard/          # Work order card
│   │
│   ├── modules/                 # Business/domain components (7 components)
│   │   ├── ClientCard/           # Client summary card
│   │   ├── ClientDetail/         # Client detail view
│   │   ├── InvoiceCard/          # Invoice card
│   │   ├── TripCard/             # Trip card (module-level, different from shared)
│   │   ├── TripDetail/           # Trip detail view
│   │   ├── TripTable/            # Trip data table
│   │   ├── VehicleCard/          # Vehicle card
│   │   ├── VehicleDetail/        # Vehicle detail
│   │   └── VehicleTable/         # Vehicle data table
│   │
│   ├── layout/                  # App-level layout
│   │   ├── Header/Header.tsx     # App header
│   │   └── Sidebar/Sidebar.tsx   # Desktop sidebar
│   │
│   └── ui/                      # Shadcn/ui design system primitives (26 components)
│       ├── Alert/                ├── Input/
│       ├── Avatar/               ├── Label/
│       ├── Badge/                ├── Pagination/
│       ├── Breadcrumb/           ├── Progress/
│       ├── Button/               ├── Select/
│       ├── Collapsible/          ├── Separator/
│       ├── Command/              ├── Sheet/        # Bottom sheet
│       ├── ContextMenu/          ├── Skeleton/
│       ├── Dialog/               ├── Switch/
│       ├── DropdownMenu/         ├── Tabs/
│       ├── ErrorBoundary/        ├── Toast/
│       └── Tooltip/
│
├── contexts/
│   ├── AuthContext.tsx           # AuthProvider — login(), loginAs(role), logout()
│   │                             #   JWT in localStorage (key: "token")
│   │                             #   User info in localStorage (key: "ttransport_user")
│   │                             #   Listens for 401 → auto-logout
│   ├── ErrorContext.tsx          # ErrorBoundaryProvider — error boundary wrapper
│   └── OfflineContext.tsx        # OfflineProvider — queue mutations when offline
│
├── data/
│   └── mockData.ts               # Mock data for sandbox mode
│                                 #   Driver, Trip, Expense type definitions
│                                 #   formatCurrencyShort() — currency formatting (₫, "X,XX tỷ")
│
├── hooks/
│   ├── use-api.ts                # useApi<T>() → { data, loading, error, execute, reset, retry }
│   │                             #   Wraps Axios with offline queue support
│   ├── use-app-store.tsx         # AppStoreProvider + useAppStore()
│   │                             #   currentPath, navigate(path), goBack(), history stack
│   │                             #   Used by AccountantApp
│   ├── use-driver-store.tsx      # DriverStoreProvider + useDriverStore()
│   │                             #   currentPath, navigate(path), goBack(), history stack
│   │                             #   Used by DriverApp. Hardcoded driver DRV-001 for now
│   ├── use-mobile.ts             # useIsMobile() — responsive breakpoint detection
│   ├── use-network.ts            # Network status hook
│   ├── use-notifications.ts      # Notification state management
│   └── use-polling.ts            # Polling/re-fetch hook
│
├── lib/
│   ├── utils.ts                  # cn() (tailwind-merge + clsx), general utilities
│   ├── navigation.ts             # accountantNav[] — sidebar items for accountant
│   │                             #   pageTitles map — path → Vietnamese title
│   │                             #   getPageTitle(pathname) helper
│   ├── error-utils.ts            # ApiError type: { type, message, statusCode?, endpoint? }
│   ├── network.ts                # Network utility functions
│   ├── notifications.ts          # Notification helpers
│   ├── offline-db.ts             # IndexedDB for offline storage
│   ├── statusMaps.ts             # Status → label/color mappings (for WorkOrder, TripOrder, etc.)
│   └── sw-register.ts            # Service worker registration
│
├── pages/
│   ├── Login.tsx                 # Phone + password login form (calls auth.login)
│   ├── RoleSelect.tsx            # Dev-only: pick a role to login as (sandbox)
│   │
│   ├── driver/                   # Driver role pages (mobile-first)
│   │   ├── AppShell.tsx          #   PageLayout (with back button) + HomeLayout (no back)
│   │   ├── DriverHome.tsx        #   Hub: wallet hero, live card, trip list, expense summary
│   │   ├── CreateWorkOrder.tsx   #   Submit new work order (containers, photos)
│   │   ├── JobDetail.tsx         #   Work order detail view
│   │   ├── DriverHistory.tsx     #   Past trips history
│   │   ├── DriverNotifications.tsx # Notifications
│   │   └── Profile.tsx           # Driver profile
│   │
│   ├── accountant/               # Accountant role pages
│   │   ├── AccountantApp.tsx     #   Router: state-based via useAppStore, TITLES map
│   │   │                         #   Paths: /accountant, /accountant/clients, /accountant/routes,
│   │   │                         #   /accountant/work-orders, /accountant/trips,
│   │   │                         #   /accountant/trip/:id, /accountant/match/:id,
│   │   │                         #   /accountant/match-trip/:id, /accountant/create-trip,
│   │   │                         #   /accountant/salary-setup, /accountant/pricing
│   │   ├── AccountantDashboard.tsx #  Overview dashboard
│   │   ├── ClientList.tsx        #   Manage clients (CRUD)
│   │   ├── RouteList.tsx         #   Manage routes (CRUD)
│   │   ├── PricingList.tsx       #   Manage pricing (CRUD)
│   │   ├── WorkOrderList.tsx     #   View/match work orders
│   │   ├── TripList.tsx          #   View trip orders
│   │   ├── TripDetail.tsx        #   Single trip detail
│   │   ├── CreateTrip.tsx        #   Create new trip
│   │   ├── MatchJob.tsx          #   Match work order → trip
│   │   ├── MatchTrip.tsx         #   Match trip → work orders
│   │   └── SalarySetup.tsx       #   Salary period configuration
│   │
│   ├── director/                 # Director role pages
│   │   ├── DirectorApp.tsx       #   Router: simple useState<DirectorPage> enum
│   │   │                         #   Pages: dashboard, users, notifications, driver-jobs, client-jobs
│   │   ├── DirectorDashboard.tsx #   Overview dashboard with drill-down
│   │   ├── UserManagement.tsx    #   Manage user accounts
│   │   ├── DirectorNotifications.tsx
│   │   ├── DriverJobs.tsx        #   View a driver's work orders
│   │   └── ClientJobs.tsx        #   View a client's trips
│   │
│   └── superadmin/
│       └── SuperAdminApp.tsx     # Super admin pages
│
├── services/
│   ├── api/
│   │   ├── client.ts             # Axios instance (baseURL: /api/v1, 30s timeout)
│   │   │                         #   Request interceptor: attaches JWT from localStorage
│   │   │                         #   Response interceptor: maps errors to ApiError types
│   │   │                         #   Error types: network, auth (401/403), validation (422),
│   │   │                         #   not-found (404), server (5xx)
│   │   └── index.ts              # Re-exports api client
│   └── sandbox/
│       ├── sandboxClient.ts      # Dev-mode mock client
│       └── storage.ts            # Sandbox localStorage adapter
│
└── themes/
    ├── grab.ts                   # Grab green theme (#00963E) — implements ThemeDefinition
    ├── types.ts                  # ThemeDefinition, ThemeColors, ThemeTypography interfaces
    ├── ThemeContext.tsx           # ThemeProvider — injects CSS variables into document root
    └── index.ts                  # Re-exports
```

---

## Routing Architecture

**No React Router is used.** The app uses custom state-based navigation with three different patterns:

### App-Level (App.tsx)
`AppContent` reads `user.role` from AuthContext and renders:
- `superadmin` → `<SuperAdminApp />`
- `director` → `<DirectorApp />`
- `accountant` → `<AccountantApp />`
- default (driver) → `<DriverApp />`

### Driver Routing (App.tsx → DriverRouter)
- Uses `DriverStore` context (`useDriverStore`)
- `navigate(path)` pushes to history stack, `goBack()` pops
- `currentPath` drives a `switch` statement in `DriverRouter`
- Routes: `/driver` (home), `/driver/work-orders/new`, `/driver/history`, `/driver/notifications`, `/driver/job/:id`

### Accountant Routing (AccountantApp.tsx → AccountantRouter)
- Uses `AppStore` context (`useAppStore`) with `initialPath="/accountant"`
- Same `navigate(path)` / `goBack()` pattern
- `currentPath` drives a `switch` + `startsWith` matching in `AccountantRouter`
- Routes: `/accountant` (dashboard), `/accountant/clients`, `/accountant/routes`, `/accountant/pricing`, `/accountant/work-orders`, `/accountant/trips`, `/accountant/trip/:id`, `/accountant/match/:id`, `/accountant/match-trip/:id`, `/accountant/create-trip`, `/accountant/salary-setup`

### Director Routing (DirectorApp.tsx)
- Simple `useState<DirectorPage>` with type union: `'dashboard' | 'users' | 'notifications' | 'driver-jobs' | 'client-jobs'`
- No path-based routing — uses `setPage()` directly
- Goes through `goBack = () => setPage('dashboard')`

---

## API Layer

### Client Setup (`services/api/client.ts`)
- Axios instance with `baseURL` = `VITE_API_BASE` env or `/api/v1`
- JWT auto-attached from `localStorage.getItem('token')`
- Errors mapped to typed `ApiError`: `{ type, message, statusCode?, endpoint? }`

### Data Fetching Hook (`hooks/use-api.ts`)
```tsx
const { data, loading, error, execute, retry } = useApi<TripOrder[]>()
await execute({ method: 'GET', url: '/trip-orders' })
```
- Integrates with OfflineContext — queues mutations when offline
- `retry()` replays the last request

### Dev Proxy (`vite.config.ts`)
```js
proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } }
```

---

## State Management

No Redux or Zustand. Everything uses React Context + useState:

| Context | Hook | Purpose |
|---|---|---|
| `AuthProvider` | `useAuth()` | `user`, `login(phone, pwd)`, `loginAs(role)`, `logout()` |
| `DriverStoreProvider` | `useDriverStore()` | `currentPath`, `navigate()`, `goBack()`, `driver` |
| `AppStoreProvider` | `useAppStore()` | `currentPath`, `navigate()`, `goBack()` (for accountant) |
| `OfflineProvider` | `useOffline()` | `isOnline`, `queueAction()` |
| `ThemeProvider` | `useTheme()` | Current theme |

---

## Design Conventions

For detailed design rules (color tokens, spacing, typography, card system), see `.claude/CLAUDE.md`.

Key rules:
- **All colors** via `var(--theme-*)` CSS variables — zero hardcoded hex
- **Vietnamese text** everywhere
- **Cards**: `rounded-2xl`, interactive cards get `card-lift` class
- **Numbers**: `tabular-nums` on all currency/counts
- **Sub-pages**: must have `<BackButton />` at top
- **Components**: `.tsx` for UI only, `.ts` for logic
- **Separation**: atoms → molecules → organisms → shared → modules → ui

---

## How-To Recipes

### Add a Driver Page

1. Create `src/pages/driver/NewPage.tsx`
2. Add route case in `DriverRouter` (inside `App.tsx`):
   ```tsx
   case '/driver/new-page': return <PageLayout showBack title="Tiêu đề"><NewPage /></PageLayout>
   ```
3. Navigate to it: `const { navigate } = useDriverStore(); navigate('/driver/new-page')`
4. Update this AGENTS.md file

### Add an Accountant Page

1. Create `src/pages/accountant/NewPage.tsx`
2. Add route case in `AccountantRouter` (inside `AccountantApp.tsx`):
   ```tsx
   case '/accountant/new-page': return <NewPage />
   ```
3. Add title to `TITLES` map in `AccountantApp.tsx`
4. If it needs a sidebar nav item, add to `accountantNav` in `lib/navigation.ts`
5. Add to `pageTitles` map in `lib/navigation.ts`
6. Update this AGENTS.md file

### Add a Director Page

1. Create `src/pages/director/NewPage.tsx`
2. Add page name to `DirectorPage` type union in `DirectorApp.tsx`
3. Add case in `renderContent()` switch
4. Update this AGENTS.md file

### Add a Shared Component

1. Create `src/components/shared/<Name>/<Name>.tsx`
2. Export from the component file
3. Import via `@shared/<Name>/<Name>` or relative path
4. Update this AGENTS.md file

### Add an API Call

```tsx
import { useApi } from '@/hooks/use-api'

function MyComponent() {
  const { data, loading, execute } = useApi<MyType[]>()

  useEffect(() => {
    execute({ method: 'GET', url: '/my-endpoint' })
  }, [])

  if (loading) return <LoadingState />
  // render data
}
```

### Add a Navigation Path

For accountant: edit `lib/navigation.ts` — add to `accountantNav[]` and `pageTitles`.
For driver: add case in `DriverRouter` (App.tsx).
For director: add to `DirectorPage` type in DirectorApp.tsx.

---

## Force Update (Backend-Driven Version Check)

The frontend checks `GET /api/v1/version` (public, no auth) on load + every 5 minutes.

**How it works:**
1. Backend exposes `{ version: "2026.04.28.1", minimum_version: "2026.04.22.0" }`
2. Frontend has its own version baked at build time via `__APP_VERSION__` (from `package.json`)
3. `src/lib/version.ts` compares versions:
   - `current < minimum` → **hard update**: show `ForceUpdateOverlay`, delete all caches, reload
   - `current < latest` → **soft update**: tell service worker to `skipWaiting()`, seamless
   - `current == latest` → up-to-date

**Key files:**
- `src/lib/version.ts` — `checkVersion()`, `forceUpdate()`, `requestSoftUpdate()`
- `src/App.tsx` — `VersionChecker` component wraps entire app
- `src/sw.ts` — handles `SKIP_WAITING` and `FORCE_UPDATE` messages from main thread
- `src/components/shared/ForceUpdateOverlay/` — full-screen Vietnamese "Đang cập nhật..." overlay
- `vite.config.ts` — `define: { __APP_VERSION__ }` injects version at build time

**To force all users to update:** Raise `MINIMUM_VERSION` in backend `.env` and restart.

---

## Common Commands

```bash
# Install dependencies
cd frontend && pnpm install

# Run dev server (port 5173, proxies /api → localhost:8000)
cd frontend && pnpm dev

# Build for production
cd frontend && pnpm build

# Preview production build
cd frontend && pnpm preview

# Lint
cd frontend && pnpm lint
```
