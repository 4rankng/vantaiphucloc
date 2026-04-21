import { useDriverStore } from '@/hooks/use-driver-store'

export function TopBar() {
  const { driver } = useDriverStore()
  return (
    <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)] sticky top-0 z-30">
      <span className="text-lg font-bold text-[var(--theme-brand-primary)]">🚛 TTransport</span>
      <div className="flex items-center gap-3">
        <button className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--theme-bg-tertiary)]">
          🔔
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--theme-bg-secondary)]" />
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--theme-brand-primary-light)] text-[var(--theme-brand-secondary)] font-bold text-sm">
          {driver.name.charAt(driver.name.lastIndexOf(' ') + 1)}
        </button>
      </div>
    </div>
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
    <nav className="h-16 flex items-center justify-around border-t border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)] sticky bottom-0 z-30 pb-[env(safe-area-inset-bottom,12px)]">
      {tabs.map(t => (
        <button
          key={t.path}
          onClick={() => navigate(t.path)}
          className="flex flex-col items-center justify-center w-16 h-full min-h-[44px]"
        >
          <span className={`text-xl ${active === t.path ? '' : 'opacity-50'}`}>{t.icon}</span>
          <span className={`text-[11px] mt-0.5 ${active === t.path ? 'text-[var(--theme-brand-primary)] font-semibold' : 'text-[var(--theme-text-muted)]'}`}>
            {t.label}
          </span>
        </button>
      ))}
    </nav>
  )
}
