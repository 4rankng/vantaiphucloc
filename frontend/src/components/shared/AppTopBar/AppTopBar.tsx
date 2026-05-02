import { type ReactNode, useState, useCallback, useRef } from 'react'
import { Bell, UserCircle, ArrowLeft } from 'lucide-react'
import { NotificationPanel, useUnreadCount } from '@/components/shared/NotificationPanel/NotificationPanel'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { OfflineTopBarIcon } from '@/components/shared/OfflineIndicator/OfflineIndicator'

/**
 * AppTopBar — glass-effect top bar used across all app screens.
 *
 * The body gradient (brand green) shows through the glass backdrop.
 * Text and icons use dark green for contrast against the tinted glass.
 */

const DARK_GREEN = '#003d15'
const MUTED_GREEN = 'rgba(0, 80, 30, 0.5)'
const ICON_BG = 'rgba(0, 80, 30, 0.08)'

interface AppTopBarBaseProps {
  actions?: ReactNode
}

interface HomeVariantProps extends AppTopBarBaseProps {
  variant: 'home'
  name: string
  onNotifications?: () => void
}

interface PageVariantProps extends AppTopBarBaseProps {
  variant: 'page'
  title: string
  onBack?: () => void
}

export type AppTopBarProps = HomeVariantProps | PageVariantProps

export function AppTopBar(props: AppTopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileBtnRef = useRef<HTMLDivElement>(null)
  const unread = useUnreadCount()

  const handleBellClick = useCallback(() => {
    setNotifOpen(true)
  }, [])

  return (
    <>
      <div>
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 md:max-w-4xl md:mx-auto">
        {/* ── Left ── */}
        <div className="flex items-center gap-2 min-w-0">
          <img src="/logo.avif" alt="" className="w-8 h-8 shrink-0 object-contain rounded-md" />
          {props.variant === 'home' ? (
            <div className="min-w-0">
              <p
                className="text-xs leading-tight"
                style={{ color: MUTED_GREEN }}
              >
                Xin chào,
              </p>
              <p
                className="text-sm font-semibold leading-tight truncate"
                style={{ color: DARK_GREEN }}
              >
                {props.name}
              </p>
            </div>
          ) : (
            <>
              {props.onBack && (
                <button
                  onClick={props.onBack}
                  className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 touch-manipulation"
                  style={{ background: ICON_BG, color: DARK_GREEN }}
                  aria-label="Quay lại"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <p
                className="text-sm font-semibold truncate"
                style={{ color: DARK_GREEN }}
              >
                {props.title}
              </p>
            </>
          )}
        </div>

        {/* ── Right ── */}
        <div className="flex items-center gap-2.5 shrink-0">
          {props.actions}

          {/* Offline icon */}
          <OfflineTopBarIcon />

          {/* Bell */}
          <button
            onClick={handleBellClick}
            className="w-8 h-8 flex items-center justify-center rounded-full relative touch-manipulation"
            style={{ background: ICON_BG, color: DARK_GREEN }}
            aria-label="Thông báo"
          >
            <Bell className="w-[17px] h-[17px]" />
            {unread > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold leading-none px-1"
                style={{ background: 'var(--theme-status-error)', color: '#fff' }}
              >
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          {/* Profile */}
          <div ref={profileBtnRef} className="relative">
            <button
              onClick={() => setProfileOpen(v => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-full touch-manipulation"
              style={{ background: ICON_BG, color: DARK_GREEN }}
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
      </div>

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}
