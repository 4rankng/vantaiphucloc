import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['accountant']

const TITLES: Record<string, string> = {
  '/accountant/clients': 'Khách hàng & Nhà thầu',
  '/accountant/routes': 'Cung đường',
  '/accountant/work-orders': 'Đối soát tài xế',
  '/accountant/trips': 'Chuyến',
  '/accountant/salary-setup': 'Thiết lập kỳ lương',
  '/accountant/pricing': 'Bảng giá',
  '/accountant/create-trip': 'Tạo chuyến',
}

export function AccountantLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  const isHome = location.pathname === '/accountant'
  const isFullPage = location.pathname.startsWith('/accountant/match/') || location.pathname.startsWith('/accountant/match-trip/')

  let title = TITLES[location.pathname] ?? ''
  if (location.pathname.startsWith('/accountant/trip/')) {
    title = 'Chi tiết chuyến'
  } else if (location.pathname.startsWith('/accountant/match/')) {
    title = 'Đối soát'
  } else if (location.pathname.startsWith('/accountant/match-trip/')) {
    title = 'Đối soát'
  }

  return (
    <AppShell
      topbarProps={
        isHome
          ? {
              variant: 'home',
              name: user.name,
              onNotifications: () => {},
              onProfile: () => setDropdownOpen(true),
            }
          : { variant: 'page', title, onBack: () => navigate(-1) }
      }
      contentClassName={isHome || isFullPage ? undefined : 'p-4 space-y-4'}
    >
      <Outlet />
      <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
    </AppShell>
  )
}
