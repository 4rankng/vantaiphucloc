import { Bell, UserCircle } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useDriverStore } from '@/hooks/use-driver-store'
import { BackButton } from '@/components/shared/BackButton'

/* ─── Scroll to top on route change ───────────────────────── */
function ScrollToTop() {
  const { currentPath } = useDriverStore()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [currentPath])
  return null
}

/* ─── Top bar — context-aware ──────────────────────────────── */
export function TopBar() {
  const { driver, navigate, unreadCount, currentPath } = useDriverStore()
  '  // removed: always green'

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
        <div className="flex items-center gap-3">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full touch-manipulation relative"
            style={{ background: 'rgba(255,255,255,0.35)', color: 'var(--theme-text-on-brand)' }}
            onClick={() => navigate('/driver/notifications')} aria-label="Thông báo"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: 'var(--theme-status-error)', color: 'var(--theme-text-inverse)' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full touch-manipulation"
            style={{ background: 'rgba(255,255,255,0.35)', color: 'var(--theme-text-on-brand)' }}
            onClick={() => navigate('/driver/profile')} aria-label="Tài khoản"
          >
            <UserCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Page layout — common wrapper ─────────────────────────── */
export function PageLayout({ children, showBack = false, className, fab }: {
  children: React.ReactNode
  showBack?: boolean
  className?: string
  fab?: React.ReactNode
}) {
  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
      <ScrollToTop />
      <TopBar />
      <main className={cn('p-4 space-y-4', className)}>
        {showBack && <BackButton />}
        {children}
      </main>
      {fab}
    </div>
  )
}

/* ─── Home layout — no back, green topbar ──────────────────── */
export function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
      <ScrollToTop />
      <TopBar />
      <main>
        {children}
      </main>
    </div>
  )
}
