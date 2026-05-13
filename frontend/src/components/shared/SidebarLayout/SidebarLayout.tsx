import type { ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { AppShell } from '@/components/shared/AppShell'
import { AppSidebar } from '@/components/shared/AppSidebar'
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'
import type { Role } from '@/data/domain'

interface SidebarLayoutProps {
  role: Role
  titleMap: Record<string, string>
  children?: ReactNode
}

export function SidebarLayout({ role, titleMap }: SidebarLayoutProps) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile(1024)

  const isHome = location.pathname === `/${role}`

  if (isMobile) {
    return (
      <AppShell
        topbarProps={
          isHome
            ? {
                variant: 'home',
                name: user?.name ?? '',
                onNotifications: () => navigate(`/${role}/notifications`),
              }
            : {
                variant: 'page',
                title: titleMap[location.pathname] ?? resolvePathTitle(role, location.pathname),
                onBack: () => navigate(-1),
              }
        }
        contentClassName="px-4 py-4 space-y-4 md:px-6 md:py-6 md:max-w-4xl md:mx-auto"
      >
        <Outlet />
      </AppShell>
    )
  }

  const title = isHome
    ? 'Tổng quan'
    : titleMap[location.pathname] ?? resolvePathTitle(role, location.pathname)

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar role={role as 'accountant' | 'director' | 'driver' | 'superadmin'} />
      <SidebarInset>
        <header
          className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sticky top-0 z-30"
          style={{
            background: 'var(--theme-bg-secondary)',
            borderColor: 'var(--theme-border-default)',
          }}
        >
          <SidebarTrigger className="h-8 w-8" />
          <h1
            className="flex-1 text-sm font-semibold truncate"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {title}
          </h1>
          <NotificationBell role={role} />
        </header>
        <main className="flex-1 p-6">
          <div className="mx-auto" style={{ maxWidth: '1400px' }}>
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function SidebarLayoutCore({ role, titleMap, children }: SidebarLayoutProps) {
  const location = useLocation()

  const isHome = location.pathname === `/${role}`
  const title = isHome
    ? 'Tổng quan'
    : titleMap[location.pathname] ?? resolvePathTitle(role, location.pathname)

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar role={role as 'accountant' | 'director' | 'driver' | 'superadmin'} />
      <SidebarInset>
        <header
          className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sticky top-0 z-30"
          style={{
            background: 'var(--theme-bg-secondary)',
            borderColor: 'var(--theme-border-default)',
          }}
        >
          <SidebarTrigger className="h-8 w-8" />
          <h1
            className="flex-1 text-sm font-semibold truncate"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {title}
          </h1>
          <NotificationBell role={role} />
        </header>
        <main className="flex-1 p-6">
          <div className="mx-auto" style={{ maxWidth: '1400px' }}>
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function NotificationBell({ role }: { role: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/${role}/notifications`)}
      className="relative h-8 w-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--theme-bg-tertiary)]"
      aria-label="Thông báo"
      style={{ color: 'var(--theme-text-secondary)' }}
    >
      <Bell className="w-4 h-4" />
    </button>
  )
}

function resolvePathTitle(role: string, pathname: string): string {
  const prefix = `/${role}/`
  if (!pathname.startsWith(prefix)) return ''
  const sub = pathname.slice(prefix.length)
  const map: Record<string, string> = {
    'users': 'Quản lý tài khoản',
    'partners': 'Đối tác',
    'routes': 'Cung đường',
    'pricings': 'Bảng giá',
    'trips': 'Chuyến/Lệnh',
    'trip-orders': 'Chuyến/Lệnh',
    'work-orders': 'Đối soát tài xế',
    'pricing': 'Bảng giá',
    'salary': 'Tính lương',
    'create-trip': 'Tạo chuyến',
    'salary-setup': 'Thiết lập kỳ lương',
    'notifications': 'Thông báo',
    'profile': 'Thông tin cá nhân',
  }
  if (map[sub]) return map[sub]
  if (sub.startsWith('trip/')) return 'Chi tiết chuyến'
  if (sub.startsWith('match/')) return 'Đối soát'
  if (sub.startsWith('match-trip/')) return 'Đối soát'
  if (sub.startsWith('driver-jobs/')) return 'Tài xế'
  if (sub.startsWith('client-jobs/')) return 'Khách hàng'
  return ''
}
