import { useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Bell, LogOut, UserCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useUnreadCount } from '@/components/shared/NotificationPanel/NotificationPanel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui'

export interface DesktopTopNavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

export interface DesktopTopNavProps {
  /** Brand label shown next to the logo (e.g. "Quản trị", "Giám đốc"). */
  brandLabel: string
  /** Tab items rendered inline in the nav. */
  items: DesktopTopNavItem[]
  /** Path used as "active root" — exact match resolves to it. */
  rootPath: string
  /** Optional path for the user-dropdown profile link. */
  profilePath?: string
  /** Optional path for the user-dropdown notifications link. */
  notificationsPath?: string
}

/**
 * Linear/Vercel-style top nav for back-office roles (superadmin, director).
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ [logo] Phúc Lộc · Quản trị   [Tab1] [Tab2] [Tab3]   [bell] [user]│
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Sticky, 56px tall, hairline bottom border. Hidden on mobile.
 */
export function DesktopTopNav({
  brandLabel,
  items,
  rootPath,
  profilePath,
  notificationsPath,
}: DesktopTopNavProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const unread = useUnreadCount()

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])

  const isActive = useCallback(
    (href: string, exact?: boolean) => {
      if (exact || href === rootPath) return location.pathname === href
      return location.pathname === href || location.pathname.startsWith(href + '/')
    },
    [rootPath],
  )

  return (
    <header
      className="hidden lg:flex sticky top-0 z-30 w-full items-center h-14 px-6 gap-6"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderBottom: '1px solid var(--theme-border-default)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <img src="/logo.avif" alt="" className="h-7 w-7 object-contain rounded-md" />
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold tracking-tight" style={{ color: 'var(--theme-text-primary)' }}>
            Phúc Lộc
          </span>
          <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>
            {brandLabel}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
        {items.map(item => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className="relative flex items-center gap-1.5 h-14 px-3 text-[13px] font-medium tracking-tight transition-colors"
              style={{
                color: active ? 'var(--theme-text-primary)' : 'var(--theme-text-secondary)',
              }}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
              <span className="whitespace-nowrap">{item.label}</span>
              {active && (
                <span
                  aria-hidden
                  className="absolute left-3 right-3 bottom-0 h-[2px] rounded-t"
                  style={{ background: 'var(--theme-brand-primary)' }}
                />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Right: user menu */}
      <div className="flex items-center gap-2 shrink-0">
        {notificationsPath && (
          <button
            type="button"
            onClick={() => navigate(notificationsPath)}
            className="relative h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors hover:bg-[var(--theme-bg-tertiary)]"
            style={{ color: 'var(--theme-text-secondary)' }}
            aria-label="Thông báo"
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span
                className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 flex items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-none"
                style={{ background: 'var(--theme-status-error)', color: '#fff' }}
              >
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-md transition-colors hover:bg-[var(--theme-bg-tertiary)] outline-none"
            >
              <div
                className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full text-[11px] font-semibold"
                style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
              >
                {(user?.name || user?.username || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col leading-tight text-left max-w-[140px]">
                <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
                  {user?.name || user?.username}
                </span>
                <span className="text-[10px] truncate" style={{ color: 'var(--theme-text-muted)' }}>
                  {brandLabel}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-56 z-[9999]">
            {profilePath && (
              <DropdownMenuItem onClick={() => navigate(profilePath)}>
                <UserCircle className="mr-2 h-4 w-4" />
                Thông tin cá nhân
              </DropdownMenuItem>
            )}
            {profilePath && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
