import { Truck, Receipt, Wallet, Bell, Menu, UserCircle, LogOut, Settings, HelpCircle, FileText, Home, MapPinned } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDriverStore } from '@/hooks/use-driver-store'
import { useAuth } from '@/contexts/AuthContext'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu/DropdownMenu'

const moreItems = [
  { icon: Bell, label: 'Thông báo', action: () => { const { navigate } = useDriverStore.getState(); navigate('/driver/notifications') } },
  { icon: Settings, label: 'Cài đặt', action: () => alert('Tính năng đang phát triển') },
  { icon: HelpCircle, label: 'Trợ giúp', action: () => alert('Gọi 1900-xxxx để được hỗ trợ') },
  { icon: FileText, label: 'Quy định', action: () => alert('Quy định vận tải sẽ được cập nhật sớm') },
]

/* ─── Top bar ──────────────────────────────────────────────── */
export function TopBar() {
  const { driver } = useDriverStore()
  const { logout } = useAuth()
  const initials = driver.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="shell-topbar border-b"
      style={{
        background: 'var(--theme-header)',
        backdropFilter: 'var(--theme-glass-blur)',
        borderColor: 'var(--theme-header-border)',
      }}
    >
      <div className="shell-topbar-inner flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5" style={{ color: 'var(--theme-brand-primary)' }} />
          <span className="text-lg font-bold" style={{ color: 'var(--theme-brand-primary)' }}>
            TTransport
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full font-bold text-xs touch-manipulation"
              style={{
                background: 'var(--theme-brand-primary)',
                color: 'var(--theme-text-on-brand)',
              }}
              aria-label="Tài khoản"
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-colors touch-manipulation"
                      style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
                      onClick={() => useDriverStore.getState().navigate('/driver/profile')}
                    >
                      <UserCircle className="w-5 h-5" style={{ color: 'var(--theme-text-secondary)' }} />
                      <span className="text-[11px] font-medium leading-none">Hồ sơ</span>
                    </button>
                    <button
                      className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-colors touch-manipulation"
                      style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
                      onClick={() => logout()}
                    >
                      <LogOut className="w-5 h-5" style={{ color: 'var(--theme-status-error)' }} />
                      <span className="text-[11px] font-medium leading-none">Đăng xuất</span>
                    </button>
                  </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/* ─── Bottom nav ───────────────────────────────────────────── */
const tabConfig = [
  { path: '/driver', Icon: Home, label: 'Trang chủ' },
  { path: '/driver/trips', Icon: MapPinned, label: 'Chuyến' },
  { path: '/driver/expenses', Icon: Receipt, label: 'Chi phí' },
  { path: '/driver/earnings', Icon: Wallet, label: 'Thu nhập' },
  { path: '__more__', Icon: Menu, label: 'Thêm' },
]

export function BottomNav() {
  const { currentPath, navigate, unreadCount } = useDriverStore()
  const active = tabConfig.find(t => t.path !== '__more__' && t.path !== '/driver' && currentPath.startsWith(t.path))?.path ?? (currentPath === '/driver' || currentPath === '' ? '/driver' : '/driver')

  return (
    <div
      className="shell-bottomnav border-t"
      style={{
        background: 'var(--theme-bottom-nav)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: 'var(--theme-bottom-nav-border)',
      }}
    >
      <div className="flex items-stretch h-14 relative px-2">
        {tabConfig.map(({ path, Icon, label }) => {
          const isMore = path === '__more__'
          const isActive = !isMore && active === path
          const showBadge = path === '/driver/notifications' && unreadCount > 0

          if (isMore) {
            return (
              <DropdownMenu key={path}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex-1 flex flex-col items-center justify-center gap-0.5 touch-manipulation"
                    aria-label={label}
                  >
                    <div className="p-1.5 rounded-full">
                      <Icon className="h-5 w-5" style={{ color: 'var(--theme-bottom-nav-inactive)' }} />
                    </div>
                    <span className="text-[10px] font-medium leading-none opacity-80" style={{ color: 'var(--theme-bottom-nav-inactive)' }}>
                      {label}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end" className="w-48 mb-2 p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {moreItems.map(({ icon: MoreIcon, label: itemLabel, action }) => (
                      <button
                        key={itemLabel}
                        className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg transition-colors touch-manipulation"
                        style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
                        onClick={() => { action() }}
                      >
                        <MoreIcon className="w-5 h-5" style={{ color: 'var(--theme-text-secondary)' }} />
                        <span className="text-[11px] font-medium leading-none">{itemLabel}</span>
                      </button>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 touch-manipulation relative group transition-all duration-300"
              aria-label={label}
            >
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-b-full"
                  style={{ background: 'var(--theme-bottom-nav-active)', opacity: 0.9 }}
                />
              )}
              <div className="relative">
                <div
                  className={cn('p-1.5 rounded-full transition-all duration-300', isActive && '-translate-y-1')}
                  style={{ background: isActive ? 'var(--theme-brand-primary-light)' : 'transparent' }}
                >
                  <Icon
                    className={cn('h-5 w-5 transition-all duration-300', isActive && 'stroke-[2.5px]')}
                    style={{ color: isActive ? 'var(--theme-bottom-nav-active)' : 'var(--theme-bottom-nav-inactive)' }}
                  />
                </div>
                {showBadge && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: 'var(--theme-status-error)', color: 'var(--theme-text-inverse)' }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={cn('text-[10px] font-medium leading-none transition-all duration-300', !isActive && 'opacity-80')}
                style={{ color: isActive ? 'var(--theme-bottom-nav-active)' : 'var(--theme-bottom-nav-inactive)' }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Shell layout ─────────────────────────────────────────── */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell" style={{ background: 'var(--theme-bg-primary)' }}>
      <TopBar />
      <main className="shell-main overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
