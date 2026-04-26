import { Home, Clock, Bell, UserCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { BackButton } from '@/components/shared/BackButton'

/* ─── Scroll to top on route change ───────────────────────── */
function ScrollToTop() {
  const { currentPath } = useDriverStore()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [currentPath])
  return null
}

/* ─── Top bar ──────────────────────────────────────────────── */
export function TopBar() {
  const { driver } = useDriverStore()

  return (
    <div
      className="px-4 pt-3 pb-2"
      style={{ background: 'var(--theme-brand-primary)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px]" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.75 }}>Xin chào,</p>
          <p className="text-[15px] font-bold" style={{ color: 'var(--theme-text-on-brand)' }}>{driver.name}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.25)', color: 'var(--theme-text-on-brand)' }}>
            {driver.tractorPlate}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Bottom Navigation ────────────────────────────────────── */
const driverNavItems = [
  { path: '/driver', icon: Home, label: 'Trang chủ' },
  { path: '/driver/history', icon: Clock, label: 'Lịch sử' },
  { path: '/driver/notifications', icon: Bell, label: 'Thông báo' },
  { path: '/driver/profile', icon: UserCircle, label: 'Tài khoản' },
]

export function BottomNav() {
  const { currentPath, navigate } = useDriverStore()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-safe"
      style={{
        background: 'var(--theme-bottom-nav)',
        borderTop: '1px solid var(--theme-bottom-nav-border)',
        height: '3.5rem',
      }}
    >
      {driverNavItems.map(({ path, icon: Icon, label }) => {
        const isActive = currentPath === path || (path !== '/driver' && currentPath.startsWith(path))
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full touch-manipulation"
            aria-label={label}
          >
            <Icon
              className="w-5 h-5"
              style={{ color: isActive ? 'var(--theme-bottom-nav-active)' : 'var(--theme-bottom-nav-inactive)' }}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive ? 'var(--theme-bottom-nav-active)' : 'var(--theme-bottom-nav-inactive)' }}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

/* ─── Page layout — with back button ──────────────────────── */
export function PageLayout({ children, showBack = false, className }: {
  children: React.ReactNode
  showBack?: boolean
  className?: string
}) {
  const { goBack } = useDriverStore()
  return (
    <div className="min-h-[100dvh] pb-14" style={{ background: 'var(--theme-bg-primary)' }}>
      <ScrollToTop />
      <TopBar />
      <main className={cn('p-4 space-y-4', className)}>
        {showBack && <BackButton onClick={goBack} />}
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

/* ─── Home layout ─────────────────────────────────────────── */
export function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] pb-14" style={{ background: 'var(--theme-bg-primary)' }}>
      <ScrollToTop />
      <main>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
