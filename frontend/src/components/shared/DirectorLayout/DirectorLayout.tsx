import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Bell, Users } from 'lucide-react'
import { AppShell } from '@/components/shared/AppShell'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/domain'

const ALLOWED_ROLES: Role[] = ['director', 'superadmin']

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', href: '/director', icon: LayoutDashboard, end: true },
  { label: 'Quản lý tài khoản', href: '/director/users', icon: Users },
  { label: 'Thông báo', href: '/director/notifications', icon: Bell },
]

function DirectorNavStrip() {
  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto px-4 py-2 md:px-6 border-b"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
      }}
      aria-label="Điều hướng giám đốc"
    >
      {NAV_ITEMS.map(({ label, href, icon: Icon, end }) => (
        <NavLink
          key={href}
          to={href}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-[color-mix(in_srgb,_var(--theme-brand-primary)_14%,_transparent)]'
                : 'hover:bg-[color-mix(in_srgb,_var(--theme-brand-primary)_6%,_transparent)]'
            }`
          }
          style={({ isActive }) => ({
            color: isActive
              ? 'var(--theme-brand-primary)'
              : 'var(--theme-text-secondary)',
          })}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function DirectorShell() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <AppShell
      topbarProps={{
        variant: 'home' as const,
        name: user?.name ?? '',
        onNotifications: () => navigate('/director/notifications'),
      }}
    >
      <DirectorNavStrip />
      <div className="page-container">
        <Outlet />
      </div>
    </AppShell>
  )
}

export function DirectorLayout() {
  const { user } = useAuth()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <DirectorShell />
}
