# TTransport UI kit — Web (desktop)

Interactive recreation of the **director/accountant** desktop experience for TTransport.

## Files

```
ui_kits/web/
├── index.html              # Entry point — loads React 18 + Babel + all .jsx files
├── styles.css              # All component-level styles, imports colors_and_type.css
├── icons.jsx               # Inline Lucide-style SVG icon set (Icon.Truck, Icon.Search, …)
├── Sidebar.jsx             # Deep emerald left nav with menu + user footer
├── TopBar.jsx              # Sticky translucent header with search + bell
├── LoginScreen.jsx         # Full-bleed emerald hero, scenic SVG road, white form card
├── DashboardScreen.jsx     # KPI tiles + recent trips list + monthly bar chart + activity feed
├── TripsScreen.jsx         # Data-table with tab filters, search, status pills, currency col
├── ClientsScreen.jsx       # Directory of partners with debt column
└── App.jsx                 # Root component — auth gate + sidebar/page state machine
```

## Click-through flow

1. **Login screen** — emerald hero card with prefilled demo credentials (`ketoan / admin123`). Click *Đăng nhập*.
2. **Tổng quan** (dashboard) — KPI grid, recent dispatch orders list, monthly bar chart, activity feed.
3. Click any row in *Lệnh vận chuyển gần đây* → opens the **Lệnh vận chuyển** screen.
4. Use the sidebar to navigate between Tổng quan, Lệnh vận chuyển, Khách hàng, and placeholder screens for Phiếu chuyến, Ghép chuyến, Bảng giá, Cung đường, Báo cáo & đối soát.

## What's faithful, what's stubbed

- **Visual fidelity:** lifted from `frontend/src/themes/grab.ts`, `frontend/tailwind.config.ts`, and `frontend/src/components/layout/{Sidebar,Header}/`. Colors, radii, spacing, type, and the sidebar-active chevron pattern all match production.
- **Stubbed:** data is hardcoded in each screen file; there is no API, no auth, no persistence. The form lets you "log in" as any of the demo roles (`admin`, `ketoan`, `giamdoc`, `taixe`) — anything else falls back to `ketoan`. The driver role surfaces a banner pointing to `ui_kits/mobile`.

## Conventions for new screens

- Wrap page contents in `<>…</>`; the sidebar + topbar shell lives in `App.jsx`.
- Use the `.page-header` block for h1 + sub + right-aligned actions.
- KPI tiles → `<StatCard>` (defined inside `DashboardScreen.jsx`); for tables → `.card-shell > .toolbar + .tt-table`.
- All icons come from the `Icon` global exposed by `icons.jsx`. Add new ones there; reuse Lucide path data.
- Status pills: `.badge.badge-{success|warning|danger|info|neutral|brand|outline}` + optional `<span className="dot"/>`.
