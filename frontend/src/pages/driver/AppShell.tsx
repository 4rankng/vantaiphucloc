import { cn } from '@/lib/utils'
import { useDriverStore } from '@/hooks/use-driver-store'

export function TopBar() {
  const { driver } = useDriverStore()
  const initial = driver.name.charAt(driver.name.lastIndexOf(' ') + 1)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-[var(--theme-bg-secondary)]/95 backdrop-blur-xl border-b border-[var(--theme-border-default)]/40 supports-[backdrop-filter]:bg-[var(--theme-bg-secondary)]/85"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        <span className="text-lg font-bold text-[var(--theme-brand-primary)]">
          🚛 TTransport
        </span>
        <div className="flex items-center gap-2">
          <button
            className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--theme-bg-tertiary)] transition-colors touch-manipulation"
            aria-label="Thông báo"
          >
            <span className="text-lg">🔔</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--theme-brand-primary)] text-white font-bold text-xs touch-manipulation"
            aria-label="Hồ sơ"
          >
            {initial}
          </button>
        </div>
      </div>
    </header>
  )
}

const tabs = [
  { path: '/driver/trips', icon: '🚛', label: 'Chuyến' },
  { path: '/driver/expenses', icon: '🧾', label: 'Chi phí' },
  { path: '/driver/earnings', icon: '💰', label: 'Thu nhập' },
  { path: '/driver/more', icon: '☰', label: 'Thêm' },
]

export function BottomNav() {
  const { currentPath, navigate } = useDriverStore()
  const active = tabs.find(t => currentPath.startsWith(t.path))?.path ?? '/driver/trips'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--theme-bg-secondary)]/95 backdrop-blur-xl border-t border-[var(--theme-border-default)]/40 supports-[backdrop-filter]:bg-[var(--theme-bg-secondary)]/85"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Điều hướng chính"
    >
      <div className="flex items-stretch h-14 relative px-2">
        {tabs.map(t => {
          const isActive = active === t.path
          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 touch-manipulation relative group transition-all duration-300',
              )}
              aria-label={t.label}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-[var(--theme-brand-primary)] rounded-b-full transition-all duration-300" />
              )}
              <div
                className={cn(
                  'p-1.5 rounded-full transition-all duration-300',
                  isActive
                    ? 'bg-[var(--theme-brand-primary)]/10 text-[var(--theme-brand-primary)] -translate-y-1'
                    : 'text-[var(--theme-text-muted)] opacity-60 group-hover:opacity-100',
                )}
              >
                <span className={cn('text-lg', isActive && 'scale-110 inline-block')}>{t.icon}</span>
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium leading-none transition-all duration-300',
                  isActive
                    ? 'text-[var(--theme-brand-primary)]'
                    : 'text-[var(--theme-text-muted)] opacity-80',
                )}
              >
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--theme-bg-primary)]">
      <TopBar />
      <main className="pt-14 pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
