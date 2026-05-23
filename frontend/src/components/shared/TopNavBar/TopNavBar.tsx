import { NavLink } from 'react-router-dom'
import { Bell, UserCircle, ArrowLeft } from 'lucide-react'
import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useUnreadCount } from '@/components/shared/NotificationPanel/useUnreadCount'
import { NotificationPanel } from '@/components/shared/NotificationPanel/NotificationPanel'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { OfflineTopBarIcon } from '@/components/shared/OfflineIndicator/OfflineIndicator'
import type { LucideIcon } from 'lucide-react'

export interface TopNavItem {
  path: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

interface TopNavBarProps {
  items: TopNavItem[]
  /** Sub-page title shown left of the tab strip when not on a tab root */
  backLabel?: string
  onBack?: () => void
}

export function TopNavBar({ items, backLabel, onBack }: TopNavBarProps) {
  const { user } = useAuth()
  const unread = useUnreadCount()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileBtnRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full"
        style={{
          background: 'var(--theme-brand-primary)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.1)',
        }}
      >
        {/* ── Brand row ── */}
        <div className="flex items-center justify-between px-6 pt-3 pb-0 max-w-5xl mx-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/logo.avif" alt="" className="w-8 h-8 shrink-0 object-contain rounded-md" />
            <div className="min-w-0">
              <p className="text-[10px] leading-tight" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.65 }}>
                Xin chào,
              </p>
              <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--theme-text-on-brand)' }}>
                {user?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <OfflineTopBarIcon />

            <button
              onClick={() => setNotifOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full relative touch-manipulation"
              style={{ background: 'rgba(255,255,255,0.18)', color: 'var(--theme-text-on-brand)' }}
              aria-label="Thông báo"
            >
              <Bell className="w-[17px] h-[17px]" />
              {unread > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold leading-none px-1 text-white"
                  style={{ background: 'var(--theme-status-error)' }}
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>

            <div ref={profileBtnRef} className="relative">
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="w-8 h-8 flex items-center justify-center rounded-full touch-manipulation"
                style={{ background: 'rgba(255,255,255,0.18)', color: 'var(--theme-text-on-brand)' }}
                aria-label="Tài khoản"
              >
                <UserCircle className="w-[17px] h-[17px]" />
              </button>
              <UserDropdown
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                anchorRef={profileBtnRef}
              />
            </div>
          </div>
        </div>

        {/* ── Tab strip row ── */}
        <div className="flex items-end px-4 max-w-5xl mx-auto">
          {/* Back button for sub-pages — sits left of the tabs */}
          {backLabel && onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-2 py-2.5 mr-1 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors touch-manipulation select-none"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {backLabel}
            </button>
          )}

          <nav className="flex items-end overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {items.map(({ path, label, icon: Icon, exact }) => (
              <NavLink
                key={path}
                to={path}
                end={exact}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors touch-manipulation select-none',
                    isActive ? 'text-white' : 'text-white/55 hover:text-white/80',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                    {label}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-t-full"
                        style={{ background: 'white' }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}
