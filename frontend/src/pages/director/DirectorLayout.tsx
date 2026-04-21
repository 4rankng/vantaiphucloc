import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MobileHeader, DesktopHeader } from '@/components/layout/Header'
import { directorNav, directorMobileNav, getPageTitle } from '@/lib/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { Users, Receipt, UserCog, BarChart3, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoutConfirmDialog } from '@/components/layout/Header'

const moreItems = [
  { label: 'Chủ hàng', icon: Users, path: '/director/clients' },
  { label: 'Công nợ', icon: Receipt, path: '/director/receivables' },
  { label: 'KPI Tài xế', icon: UserCog, path: '/director/driver-kpi' },
  { label: 'Báo cáo', icon: BarChart3, path: '/director/reports' },
]

function DirectorMoreSheet() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const [showLogout, setShowLogout] = useState(false)

  useEffect(() => {
    if (location.pathname === '/director/more') setOpen(true)
  }, [location.pathname])

  const handleClose = (v: boolean) => {
    setOpen(v)
    if (!v) navigate('/director')
  }

  const handleLogout = () => { handleClose(false); logout(); navigate('/') }

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Thêm chức năng</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 pb-2 mt-2">
            {moreItems.map((item) => {
              const Icon = item.icon
              const active = location.pathname === item.path
              return (
                <button key={item.path} onClick={() => { handleClose(false); navigate(item.path) }}
                  className={cn('flex flex-col items-center justify-center gap-2 py-5 rounded-xl transition-colors touch-target',
                    active ? 'text-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-default)]' : 'hover:text-[var(--theme-bg-tertiary)]/50 text-[var(--theme-text-secondary)]')}>
                  <Icon size={22} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              )
            })}
            <button onClick={() => setShowLogout(true)}
              className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl text-red-600 hover:bg-red-50 transition-colors touch-target">
              <LogOut size={22} />
              <span className="text-xs font-medium">Đăng xuất</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <LogoutConfirmDialog open={showLogout} onOpenChange={setShowLogout} onConfirm={handleLogout} />
    </>
  )
}

export default function DirectorLayout() {
  const location = useLocation()
  const title = getPageTitle(location.pathname)
  const isMorePage = location.pathname === '/director/more'

  return (
    <div className="flex min-h-screen bg-[var(--theme-bg-primary)]">
      <Sidebar items={directorNav} title="Giám đốc" basePath="/director" />
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <DesktopHeader title={title} />
        <MobileHeader title={title} />
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-4 lg:p-6 pb-24 lg:pb-6">
            {!isMorePage && <Outlet />}
          </div>
        </main>
        <MobileBottomNav items={directorMobileNav} />
        <DirectorMoreSheet />
      </div>
    </div>
  )
}
