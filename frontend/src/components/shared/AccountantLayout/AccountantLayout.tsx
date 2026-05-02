import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import {
  Home, Truck, Briefcase, Receipt, Handshake, Route, Settings,
} from 'lucide-react'
import { AppShell } from '@/components/shared/AppShell'
import { BottomTabBar } from '@/components/shared/BottomTabBar/BottomTabBar'
import { TopNavBar } from '@/components/shared/TopNavBar/TopNavBar'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['accountant']

// ─── Mobile: 5 core tabs only ─────────────────────────────────────────────────
// Đối tác & Cung đường are reference data — accessed via modals inside workflows,
// not as top-level destinations on mobile.

const MOBILE_TABS = [
  { path: '/accountant',            label: 'Tổng quan', icon: Home,     exact: true },
  { path: '/accountant/trips',      label: 'Lệnh điều', icon: Truck },
  { path: '/accountant/work-orders',label: 'Đối soát',  icon: Briefcase },
  { path: '/accountant/pricing',    label: 'Bảng giá',  icon: Receipt },
  { path: '/accountant/salary-setup',label: 'Kỳ lương', icon: Settings },
]

// ─── Desktop: all 7 tabs in the horizontal strip ──────────────────────────────

const DESKTOP_TABS = [
  { path: '/accountant',             label: 'Tổng quan',   icon: Home,     exact: true },
  { path: '/accountant/trips',       label: 'Lệnh điều',   icon: Truck },
  { path: '/accountant/work-orders', label: 'Đối soát',    icon: Briefcase },
  { path: '/accountant/pricing',     label: 'Bảng giá',    icon: Receipt },
  { path: '/accountant/partners',    label: 'Đối tác',     icon: Handshake },
  { path: '/accountant/routes',      label: 'Cung đường',  icon: Route },
  { path: '/accountant/salary-setup',label: 'Kỳ lương',    icon: Settings },
]

// ─── Title map (mobile back-navigation) ──────────────────────────────────────

const TITLES: Record<string, string> = {
  '/accountant':                  'Tổng quan',
  '/accountant/trips':            'Lệnh điều hành',
  '/accountant/create-trip':      'Tạo lệnh điều hành',
  '/accountant/work-orders':      'Đối soát tài xế',
  '/accountant/pricing':          'Bảng giá',
  '/accountant/partners':         'Đối tác',
  '/accountant/routes':           'Cung đường',
  '/accountant/salary-setup':     'Kỳ lương',
  '/accountant/notifications':    'Thông báo',
  '/accountant/profile':          'Thông tin cá nhân',
}

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/accountant/trip/'))       return 'Chi tiết lệnh'
  if (pathname.startsWith('/accountant/match/'))      return 'Đối soát'
  if (pathname.startsWith('/accountant/match-trip/')) return 'Đối soát'
  return ''
}

// Full-screen pages — hide tab bar, show back button instead
const FULLSCREEN_PREFIXES = [
  '/accountant/match/',
  '/accountant/match-trip/',
]

// Tab-root pages — show home-variant topbar (no back button)
const TAB_PATHS = new Set(DESKTOP_TABS.map(t => t.path))

// ─── Mobile layout ────────────────────────────────────────────────────────────

function AccountantMobile() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isFullscreen = FULLSCREEN_PREFIXES.some(p => location.pathname.startsWith(p))
  const isTabRoot    = TAB_PATHS.has(location.pathname)
  const title        = resolveTitle(location.pathname)

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: 'var(--theme-bg-primary)' }}>
      <AppShell
        topbarProps={
          isTabRoot
            ? {
                variant: 'home' as const,
                name: user?.name ?? '',
                onNotifications: () => navigate('/accountant/notifications'),
              }
            : { variant: 'page' as const, title, onBack: () => navigate(-1) }
        }
        contentClassName={
          isFullscreen
            ? undefined
            : 'px-4 py-4 space-y-4 pb-[calc(1rem+56px+env(safe-area-inset-bottom))]'
        }
      >
        <Outlet />
      </AppShell>
      {!isFullscreen && <BottomTabBar tabs={MOBILE_TABS} />}
    </div>
  )
}

// ─── Desktop layout ───────────────────────────────────────────────────────────
// Green topbar (brand + user) + horizontal tab strip directly below it.
// No bottom bar. Content centred with max-w-5xl.

function AccountantDesktop() {
  const location = useLocation()
  const navigate = useNavigate()

  const isFullscreen = FULLSCREEN_PREFIXES.some(p => location.pathname.startsWith(p))
  const isTabRoot    = TAB_PATHS.has(location.pathname)
  const title        = resolveTitle(location.pathname)

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: 'var(--theme-bg-primary)' }}>
      {isTabRoot || isFullscreen
        ? (
          // Tab-root pages & fullscreen pages: TopNavBar handles brand + tabs
          <TopNavBar items={DESKTOP_TABS} />
        )
        : (
          // Sub-pages (create-trip, trip detail, etc.): TopNavBar still shows
          // tabs so user can jump away, but we also show a back affordance via
          // the page title in the tab strip active state.
          <TopNavBar items={DESKTOP_TABS} backLabel={title} onBack={() => navigate(-1)} />
        )
      }
      <main className={isFullscreen ? undefined : 'px-8 py-6 max-w-5xl mx-auto'}>
        <Outlet />
      </main>
    </div>
  )
}

// ─── Layout entry ─────────────────────────────────────────────────────────────

export function AccountantLayout() {
  const { user } = useAuth()
  const isMobile = useIsMobile(768)

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return isMobile ? <AccountantMobile /> : <AccountantDesktop />
}
