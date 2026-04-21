import { cn } from '@/lib/utils'
import { useDriverStore } from '@/hooks/use-driver-store'

export function TopBar() {
  const { driver } = useDriverStore()
  const initial = driver.name.charAt(driver.name.lastIndexOf(' ') + 1)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        background: 'var(--theme-header)',
        backdropFilter: 'var(--theme-glass-blur)',
        borderColor: 'var(--theme-header-border)',
      }}
    >
      <div className="flex items-center justify-between h-14 px-[var(--theme-spacing-page-padding)]">
        <span className="text-lg font-bold" style={{ color: 'var(--theme-brand-primary)' }}>
          🚛 TTransport
        </span>
        <div className="flex items-center gap-2">
          <button
            className="relative w-10 h-10 flex items-center justify-center rounded-full transition-colors touch-manipulation"
            style={{ color: 'var(--theme-text-secondary)' }}
            aria-label="Thông báo"
          >
            <span className="text-lg">🔔</span>
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: 'var(--theme-status-error)' }}
            />
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full font-bold text-xs touch-manipulation"
            style={{
              background: 'var(--theme-brand-primary)',
              color: 'var(--theme-text-on-brand)',
            }}
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
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--theme-bottom-nav)',
        backdropFilter: 'var(--theme-glass-blur)',
        borderColor: 'var(--theme-bottom-nav-border)',
      }}
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
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-b-full transition-all duration-300"
                  style={{ background: 'var(--theme-bottom-nav-active)' }}
                />
              )}
              <div
                className={cn(
                  'p-1.5 rounded-full transition-all duration-300',
                  isActive && '-translate-y-1',
                )}
                style={{
                  background: isActive ? 'var(--theme-brand-primary-light)' : 'transparent',
                  color: isActive ? 'var(--theme-bottom-nav-active)' : 'var(--theme-bottom-nav-inactive)',
                }}
              >
                <span className={cn('text-lg inline-block', isActive && 'scale-110')}>{t.icon}</span>
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium leading-none transition-all duration-300',
                  !isActive && 'opacity-80',
                )}
                style={{
                  color: isActive ? 'var(--theme-bottom-nav-active)' : 'var(--theme-bottom-nav-inactive)',
                }}
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
    <div className="min-h-screen" style={{ background: 'var(--theme-bg-primary)' }}>
      <TopBar />
      <main
        className="overflow-y-auto"
        style={{
          paddingTop: 'calc(3.5rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
          minHeight: '100vh',
        }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
