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
        <SheetContent side="bottom" className="h-auto pb-safe">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-base font-semibold text-left">Tài khoản</SheetTitle>
            <SheetDescription className="text-left">Thông tin tài xế</SheetDescription>
          </SheetHeader>
          <div className="pb-2">
            <div className="flex items-center gap-3 px-3 pb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{driver.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>{driver.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl transition-colors touch-manipulation"
                style={{ color: 'var(--theme-text-primary)' }}
                onClick={() => { setProfileOpen(false); navigate('/driver/profile') }}
              >
                <UserCircle className="w-5 h-5" style={{ color: 'var(--theme-text-secondary)' }} />
                <span className="text-xs font-medium leading-none" style={{ color: 'var(--theme-text-secondary)' }}>Hồ sơ</span>
              </button>
              <button
                className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl transition-colors touch-manipulation"
                onClick={() => { setProfileOpen(false); logout() }}
              >
                <LogOut className="w-5 h-5" style={{ color: 'var(--theme-status-error)' }} />
                <span className="text-xs font-medium leading-none" style={{ color: 'var(--theme-status-error)' }}>Đăng xuất</span>
              </button>
            </div>
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
