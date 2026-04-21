import { useState } from 'react'
import { Truck, Receipt, Wallet, Bell, Menu, UserCircle, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDriverStore } from '@/hooks/use-driver-store'
import { useAuth } from '@/contexts/AuthContext'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet/Sheet'

export function TopBar() {
  const { driver, navigate } = useDriverStore()
  const { logout } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const initials = driver.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          background: 'var(--theme-header)',
          backdropFilter: 'var(--theme-glass-blur)',
          borderColor: 'var(--theme-header-border)',
        }}
      >
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5" style={{ color: 'var(--theme-brand-primary)' }} />
            <span className="text-lg font-bold" style={{ color: 'var(--theme-brand-primary)' }}>
              TTransport
            </span>
          </div>
          <button
            onClick={() => setProfileOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full font-bold text-xs touch-manipulation"
            style={{
              background: 'var(--theme-brand-primary)',
              color: 'var(--theme-text-on-brand)',
            }}
            aria-label="Tài khoản"
          >
            {initials}
          </button>
        </div>
      </header>

      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent side="top" className="rounded-b-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{driver.name}</p>
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{driver.phone}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-colors touch-manipulation border"
              style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
              onClick={() => { setProfileOpen(false); navigate('/driver/profile') }}
            >
              <UserCircle className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} />
              <span className="text-sm font-medium">Hồ sơ</span>
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-colors touch-manipulation border"
              style={{ background: 'var(--theme-status-error-light)', borderColor: 'var(--theme-status-error)', color: 'var(--theme-status-error)' }}
              onClick={() => { setProfileOpen(false); logout() }}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Đăng xuất</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

const tabConfig = [
  { path: '/driver/trips', Icon: Truck, label: 'Chuyến' },
  { path: '/driver/expenses', Icon: Receipt, label: 'Chi phí' },
  { path: '/driver/earnings', Icon: Wallet, label: 'Thu nhập' },
  { path: '/driver/notifications', Icon: Bell, label: 'Thông báo' },
  { path: '/driver/more', Icon: Menu, label: 'Thêm' },
]

export function BottomNav() {
  const { currentPath, navigate, unreadCount } = useDriverStore()
  const active = tabConfig.find(t => currentPath.startsWith(t.path))?.path ?? '/driver/trips'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--theme-bottom-nav)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: 'var(--theme-bottom-nav-border)',
      }}
      aria-label="Điều hướng chính"
    >
      <div className="flex items-stretch h-14 relative px-2">
        {tabConfig.map(({ path, Icon, label }) => {
          const isActive = active === path
          const showBadge = path === '/driver/notifications' && unreadCount > 0
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
                  className={cn(
                    'p-1.5 rounded-full transition-all duration-300',
                    isActive && '-translate-y-1',
                  )}
                  style={{
                    background: isActive ? 'var(--theme-brand-primary-light)' : 'transparent',
                  }}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-all duration-300',
                      isActive && 'stroke-[2.5px]',
                    )}
                    style={{
                      color: isActive ? 'var(--theme-bottom-nav-active)' : 'var(--theme-bottom-nav-inactive)',
                    }}
                  />
                </div>
                {showBadge && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: 'var(--theme-status-error)' }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
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
                {label}
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
