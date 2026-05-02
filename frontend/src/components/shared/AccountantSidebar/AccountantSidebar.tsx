import { useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Truck,
  Briefcase,
  Users,
  MapPin,
  Tag,
  Wallet,
} from 'lucide-react'

export interface SidebarItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

const NAV_ITEMS: SidebarItem[] = [
  { label: 'Tổng quan', href: '/accountant', icon: LayoutDashboard },
  { label: 'Lệnh điều phối', href: '/accountant/trips', icon: FileText },
  { label: 'Chuyến đã đi', href: '/accountant/driver-trips', icon: Truck },
  { label: 'Đối soát', href: '/accountant/work-orders', icon: Briefcase },
  { label: 'Đối tác', href: '/accountant/partners', icon: Users },
  { label: 'Cung đường', href: '/accountant/routes', icon: MapPin },
  { label: 'Bảng giá', href: '/accountant/pricing', icon: Tag },
  { label: 'Kỳ lương', href: '/accountant/salary-setup', icon: Wallet },
]

export interface AccountantSidebarProps {
  /** Whether sidebar is collapsed */
  collapsed?: boolean
  /** Badge counts for nav items (keyed by href) */
  badges?: Record<string, number>
}

export function AccountantSidebar({
  collapsed = false,
  badges = {},
}: AccountantSidebarProps) {
  const location = useLocation()

  const isActive = useCallback(
    (href: string) => {
      if (href === '/accountant') {
        return location.pathname === '/accountant'
      }
      return location.pathname.startsWith(href)
    },
    [location.pathname]
  )

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 transition-all duration-200 ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
      style={{
        background: 'var(--theme-sidebar, #0a3520)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Logo area */}
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <img src="/logo.avif" alt="" className="h-7 w-7 object-contain rounded-md shrink-0" />
        {!collapsed && (
          <p className="text-[13px] font-bold text-white/95 leading-tight truncate">Vận Tải Phúc Lộc</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto sidebar-scroll">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const badge = badges[item.href]

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                collapsed ? 'justify-center' : ''
              }`}
              style={{
                background: active
                  ? 'color-mix(in srgb, var(--theme-brand-primary) 20%, transparent)'
                  : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.65)',
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className="h-[18px] w-[18px] shrink-0"
                style={{ color: active ? 'var(--theme-brand-primary)' : 'currentColor' }}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge && badge > 0 && (
                    <span
                      className="shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                      style={{ background: 'var(--theme-status-warning)', color: '#fff' }}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

    </aside>
  )
}
