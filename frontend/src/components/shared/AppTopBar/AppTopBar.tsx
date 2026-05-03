import { type ReactNode, useState, useCallback, useRef } from 'react'
import { Bell, UserCircle, ArrowLeft, Menu } from 'lucide-react'
import { NotificationPanel, useUnreadCount } from '@/components/shared/NotificationPanel/NotificationPanel'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { OfflineTopBarIcon } from '@/components/shared/OfflineIndicator/OfflineIndicator'

/**
 * AppTopBar — top bar used across all mobile app screens.
 *
 * Two visual themes:
 *  - "light"  (default): glass effect over the green body gradient — used by driver/other roles
 *  - "dark":  solid dark-green bar matching the sidebar — used by accountant mobile shell
 *
 * Layout:
 *  Left  → [hamburger?] [back arrow?] [logo | greeting | title]
 *  Right → [actions] [offline] [bell] [profile]
 *
 * When both onMenu and onBack are provided (sub-pages with drawer nav),
 * the hamburger and back arrow are both shown.
 */

// Light theme tokens (glass over green gradient)
const LIGHT = {
  iconBg: 'rgba(5, 150, 105, 0.08)',
  iconColor: 'var(--theme-brand-primary)',
  titleColor: 'var(--theme-brand-primary)',
  subtitleColor: 'rgba(5, 150, 105, 0.6)',
}

// Dark theme tokens (solid dark-green bar)
const DARK = {
  iconBg: 'rgba(255,255,255,0.10)',
  iconColor: 'rgba(255,255,255,0.90)',
  titleColor: '#ffffff',
  subtitleColor: 'rgba(255,255,255,0.55)',
}

interface AppTopBarBaseProps {
  actions?: ReactNode
  /** Visual theme. Defaults to "light". */
  theme?: 'light' | 'dark'
}

interface HomeVariantProps extends AppTopBarBaseProps {
  variant: 'home'
  name: string
  onNotifications?: () => void
  onMenu?: () => void
}

interface PageVariantProps extends AppTopBarBaseProps {
  variant: 'page'
  title: string
  onBack?: () => void
  onMenu?: () => void
  /**
   * If true, show the back button in the top bar. Default: false.
   * Recommended: add back navigation inline in the page body instead.
   */
  showBackButton?: boolean
}

export type AppTopBarProps = HomeVariantProps | PageVariantProps

export function AppTopBar(props: AppTopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileBtnRef = useRef<HTMLDivElement>(null)
  const unread = useUnreadCount()

  const t = props.theme === 'dark' ? DARK : LIGHT

  const handleBellClick = useCallback(() => {
    setNotifOpen(true)
  }, [])

  return (
    <>
      <div className="px-4 py-2.5 flex items-center justify-between gap-2 relative overflow-hidden">
        {/* Home-variant horizon watermark (light theme only) */}
        {props.variant === 'home' && props.theme !== 'dark' && (
          <svg
            viewBox="0 0 320 52"
            preserveAspectRatio="xMidYMid meet"
            fill="none"
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: 120,
              bottom: 0,
              top: 0,
              height: '100%',
              width: 'auto',
              opacity: 0.065,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            {/* Distant hills */}
            <path d="M60 36 Q90 20 120 30 Q150 40 170 26 Q200 12 230 24 Q260 36 290 20 L320 18 L320 52 L0 52 Z"
              fill="#059669"/>
            {/* Road perspective lines */}
            <path d="M160 52 L140 32" stroke="#059669" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round"/>
            <path d="M160 52 L180 32" stroke="#059669" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round"/>
            {/* Small truck silhouette */}
            <g transform="translate(220 26)">
              <rect x="0"  y="2" width="28" height="10" rx="1.5" fill="#059669"/>
              <path d="M28 3 L38 3 Q40 3 40 5 L40 12 L28 12 Z" fill="#059669"/>
              <circle cx="6"  cy="13" r="3" fill="#059669"/>
              <circle cx="33" cy="13" r="3" fill="#059669"/>
            </g>
            {/* Crane silhouette */}
            <line x1="60" y1="12" x2="60" y2="36" stroke="#059669" strokeWidth="2" strokeOpacity="0.8"/>
            <line x1="42" y1="12" x2="72" y2="12" stroke="#059669" strokeWidth="2" strokeOpacity="0.8"/>
            {/* Sun circle */}
            <circle cx="155" cy="18" r="8" fill="#059669" fillOpacity="0.5"/>
            {/* Dotted road centre */}
            <line x1="152" y1="40" x2="152" y2="52" stroke="#059669" strokeWidth="1.5" strokeDasharray="4 3"/>
          </svg>
        )}
        {/* ── Left ── */}
        <div className="flex items-center gap-1.5 min-w-0 relative z-10">
          {/* Hamburger — always shown when onMenu is provided */}
          {props.onMenu && (
            <button
              onClick={props.onMenu}
              className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 touch-manipulation"
              style={{ background: t.iconBg, color: t.iconColor }}
              aria-label="Menu"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>
          )}

          {/* Logo — only when no onMenu */}
          {!props.onMenu && (
            <img src="/logo.avif" alt="" className="w-8 h-8 shrink-0 object-contain rounded-md" />
          )}

          {/* Back arrow — shown on page variant when showBackButton is true AND onBack provided */}
          {props.variant === 'page' && props.showBackButton && props.onBack && (
            <button
              onClick={props.onBack}
              className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 touch-manipulation"
              style={{ background: t.iconBg, color: t.iconColor }}
              aria-label="Quay lại"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Title / greeting */}
          {props.variant === 'home' ? (
            <div className="min-w-0 ml-0.5">
              <p className="text-[11px] leading-tight" style={{ color: t.subtitleColor }}>
                Xin chào,
              </p>
              <p className="text-sm font-semibold leading-tight truncate" style={{ color: t.titleColor }}>
                {props.name}
              </p>
            </div>
          ) : (
            <p className="text-sm font-semibold truncate ml-0.5" style={{ color: t.titleColor }}>
              {props.title}
            </p>
          )}
        </div>

        {/* ── Right ── */}
        <div className="flex items-center gap-2 shrink-0 relative z-10">
          {props.actions}

          {/* Offline icon */}
          <OfflineTopBarIcon />

          {/* Bell */}
          <button
            onClick={handleBellClick}
            className="w-8 h-8 flex items-center justify-center rounded-full relative touch-manipulation"
            style={{ background: t.iconBg, color: t.iconColor }}
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
              style={{ background: t.iconBg, color: t.iconColor }}
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

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}
