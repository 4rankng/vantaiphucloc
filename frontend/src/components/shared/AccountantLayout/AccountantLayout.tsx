import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/shared/AppShell'
import { DesktopLayout } from '@/components/shared/DesktopLayout'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
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
}

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/accountant/trip/')) return 'Chi tiết chuyến'
  if (pathname.startsWith('/accountant/match/')) return 'Đối soát'
  if (pathname.startsWith('/accountant/match-trip/')) return 'Đối soát'
  return ''
}

// ─── Mobile ───────────────────────────────────────────────────────────────────

function AccountantMobile() {
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
        contentClassName={isHome || isFullPage ? undefined : 'px-4 py-4 space-y-4'}
      >
        <Outlet />
      </AppShell>
      <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
    </>
  )
}

// ─── Desktop ──────────────────────────────────────────────────────────────────

function AccountantDesktop() {
  const location = useLocation()
  const title = resolveTitle(location.pathname)

  return (
    <DesktopLayout role="accountant" title={title}>
      <Outlet />
    </DesktopLayout>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function AccountantLayout() {
  const { user } = useAuth()
  const isMobile = useIsMobile()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return isMobile ? <AccountantMobile /> : <AccountantDesktop />
}
