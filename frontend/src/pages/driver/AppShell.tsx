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
export function PageLayout({ children, showBack = false, className }: {
  children: React.ReactNode
  showBack?: boolean
  className?: string
}) {
  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
      <ScrollToTop />
      <TopBar />
      <main className={cn('p-4 space-y-4', className)}>
        {showBack && <BackButton />}
        {children}
      </main>
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

/* ─── Reusable BottomNav (kept for other roles) ────────────── */
import { Home } from 'lucide-react'

export function BottomNav({ tabs }: { tabs: { path: string; label: string; icon: React.ElementType }[] }) {
  const { currentPath, navigate } = useDriverStore()
  const active = tabs.find(t => t.path !== '/' && currentPath.startsWith(t.path))?.path ?? '/'

  return (
    <div className="shell-bottomnav border-t"
      style={{ background: 'var(--theme-bottom-nav)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderColor: 'var(--theme-bottom-nav-border)' }}>
      <div className="flex items-stretch h-14 relative px-2">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = active === path
          return (
            <button key={path} onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 touch-manipulation relative group transition-all duration-300" aria-label={label}>
              {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-b-full" style={{ background: 'var(--theme-bottom-nav-active)', opacity: 0.9 }} />}
              <div className={cn('p-1.5 rounded-full transition-all duration-300', isActive && '-translate-y-1')}
                style={{ background: isActive ? 'var(--theme-brand-primary-light)' : 'transparent' }}>
                <Icon className={cn('h-5 w-5 transition-all duration-300', isActive && 'stroke-[2.5px]')}
                  style={{ color: isActive ? 'var(--theme-bottom-nav-active)' : 'var(--theme-bottom-nav-inactive)' }} />
              </div>
              <span className={cn('text-[10px] font-medium leading-none transition-all duration-300', !isActive && 'opacity-80')}
                style={{ color: isActive ? 'var(--theme-bottom-nav-active)' : 'var(--theme-bottom-nav-inactive)' }}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
