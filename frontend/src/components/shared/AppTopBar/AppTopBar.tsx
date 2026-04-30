import { type ReactNode, useState, useCallback } from 'react'
import { Bell, UserCircle, ArrowLeft } from 'lucide-react'
import { NotificationPanel, useUnreadCount } from '@/components/shared/NotificationPanel/NotificationPanel'

/**
 * AppTopBar — the brand-coloured top bar used across all mobile app screens.
 *
 * Variants:
 *  - "home"  : shows greeting ("Xin chào, / Name") on the left + bell + user icons on the right
 *  - "page"  : shows a back arrow + page title (used on sub-pages)
 *
 * All props are optional so callers only pass what they need.
 */

interface AppTopBarBaseProps {
  /** Extra content rendered to the right of the left section */
  actions?: ReactNode
}

interface HomeVariantProps extends AppTopBarBaseProps {
  variant: 'home'
  /** Full name of the logged-in user */
  name: string
  onNotifications?: () => void
  onProfile?: () => void
}

interface PageVariantProps extends AppTopBarBaseProps {
  variant: 'page'
  /** Page title shown next to the back arrow */
  title: string
  onBack?: () => void
}

export type AppTopBarProps = HomeVariantProps | PageVariantProps

export function AppTopBar(props: AppTopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const unread = useUnreadCount()

  const handleBellClick = useCallback(() => {
    setNotifOpen(true)
  }, [])

  return (
    <>
      <div
        className="px-4 py-2.5 flex items-center justify-between gap-3"
        style={{ background: 'var(--theme-brand-primary)' }}
      >
        {/* ── Left ── */}
        <div className="flex items-center gap-2 min-w-0">
          <img src="/logo.avif" alt="" className="w-8 h-8 shrink-0 object-contain rounded-md" />
          {props.variant === 'home' ? (
            <div className="min-w-0">
              <p
                className="text-xs leading-tight"
                style={{ color: 'var(--theme-text-on-brand)', opacity: 0.75 }}
              >
                Xin chào,
              </p>
              <p
                className="text-sm font-semibold leading-tight truncate"
                style={{ color: 'var(--theme-text-on-brand)' }}
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
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--theme-text-on-brand)' }}
                  aria-label="Quay lại"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <p
                className="text-sm font-semibold truncate"
                style={{ color: 'var(--theme-text-on-brand)' }}
              >
                {props.title}
              </p>
            </>
          )}
        </div>

        {/* ── Right ── */}
        <div className="flex items-center gap-1 shrink-0">
          {props.actions}
          {props.variant === 'home' && (
            <>
              {props.onNotifications && (
                <button
                  onClick={handleBellClick}
                  className="w-8 h-8 flex items-center justify-center rounded-full relative touch-manipulation"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--theme-text-on-brand)' }}
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
              )}
              {props.onProfile && (
                <button
                  onClick={props.onProfile}
                  className="w-8 h-8 flex items-center justify-center rounded-full touch-manipulation"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--theme-text-on-brand)' }}
                  aria-label="Tài khoản"
                >
                  <UserCircle className="w-[17px] h-[17px]" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}
