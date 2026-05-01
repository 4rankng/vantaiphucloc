import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['accountant']

const TITLES: Record<string, string> = {
  '/accountant': 'Tổng quan',
  '/accountant/partners': 'Đối tác',
  '/accountant/routes': 'Cung đường',
  '/accountant/work-orders': 'Đối soát tài xế',
  '/accountant/trips': 'Chuyến',
  '/accountant/create-trip': 'Tạo chuyến',
  '/accountant/salary-setup': 'Thiết lập kỳ lương',
  '/accountant/pricing': 'Bảng giá',
  '/accountant/notifications': 'Thông báo',
  '/accountant/profile': 'Thông tin cá nhân',
}

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/accountant/trip/')) return 'Chi tiết chuyến'
  if (pathname.startsWith('/accountant/match/')) return 'Đối soát'
  if (pathname.startsWith('/accountant/match-trip/')) return 'Đối soát'
  return ''
}

function AccountantShell() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const isHome = location.pathname === '/accountant'
  // Match/full-page views get no padding — they manage their own layout
  const isFullPage =
    location.pathname.startsWith('/accountant/match/') ||
    location.pathname.startsWith('/accountant/match-trip/')
  const title = resolveTitle(location.pathname)

  const contentClassName = isFullPage
    ? undefined
    : 'px-4 py-4 space-y-4 md:px-6 md:py-6 md:max-w-4xl md:mx-auto'

  return (
    <>
      <AppShell
        topbarProps={
          isHome
            ? {
                variant: 'home' as const,
                name: user?.name ?? '',
                onNotifications: () => navigate('/accountant/notifications'),
                onProfile: () => setDropdownOpen(true),
              }
            : { variant: 'page' as const, title, onBack: () => navigate(-1) }
        }
        contentClassName={contentClassName}
      >
        <Outlet />
      </AppShell>
      <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
    </>
  )
}

export function AccountantLayout() {
  const { user } = useAuth()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <AccountantShell />
}
