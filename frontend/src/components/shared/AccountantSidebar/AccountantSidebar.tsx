import { useState, useCallback } from 'react'
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Building2,
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
  { label: 'Khách hàng', href: '/accountant/customers', icon: Building2 },
  { label: 'Cung đường', href: '/accountant/routes', icon: MapPin },
  { label: 'Bảng giá', href: '/accountant/pricing', icon: Tag },
  { label: 'Kỳ lương', href: '/accountant/salary-setup', icon: Wallet },
]

export interface AccountantSidebarProps {
  /** Whether sidebar is collapsed */
  collapsed?: boolean
  /** Collapse toggle handler */
  onToggleCollapse?: () => void
  /** Badge counts for nav items (keyed by href) */
  badges?: Record<string, number>
}

export function AccountantSidebar({
  collapsed = false,
  onToggleCollapse,
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
        background: 'var(--theme-sidebar-bg, #0F172A)',
        borderRight: '1px solid var(--theme-sidebar-border, rgba(255,255,255,0.08))',
      }}
    >
      {/* Logo area */}
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: '1px solid var(--theme-sidebar-border, rgba(255,255,255,0.08))' }}
      >
        <img src="/logo.avif" alt="" className="w-9 h-9 object-contain rounded-lg shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">Vạn Tài</p>
            <p className="text-[10px] text-white/50 truncate">Kế toán</p>
          </div>
        )}
      </div>

      {/* Quick action */}
      <div className="px-3 py-3">
        <NavLink
          to="/accountant/create-trip"
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-sm font-semibold transition-all hover:opacity-90 ${
            collapsed ? 'w-10 h-10 mx-auto p-0' : ''
          }`}
          style={{ background: 'var(--theme-brand-primary)', color: '#fff' }}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Tạo lệnh</span>}
        </NavLink>
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

      {/* Collapse toggle */}
      {onToggleCollapse && (
        <div
          className="px-3 py-3"
          style={{ borderTop: '1px solid var(--theme-sidebar-border, rgba(255,255,255,0.08))' }}
        >
          <button
            onClick={onToggleCollapse}
            className={`flex items-center justify-center gap-2 w-full rounded-xl py-2 text-xs font-medium transition-colors hover:opacity-80 ${
              collapsed ? '' : ''
            }`}
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Thu gọn</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  )
}
