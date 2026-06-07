import { useCallback, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  LogOut,
  Bell,
  UserCircle,
  ChevronLeft,
  Building2,
  Container,
  ClipboardCheck,
  Fuel,
  Wallet,
  TrendingUp,
  MapPin,
  KeyRound,
  Wrench,
  Calendar,
  Route,
  Truck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useUnreadCount } from '@/components/shared/data-display/NotificationPanel/useUnreadCount'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'
import { UserInfoDialog, ProfileDialog } from '@/components/shared/overlays/ProfileDialog'

export interface SidebarItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
  /** When true, only highlight on an exact pathname match. */
  exact?: boolean
}

interface SidebarSection {
  /** Section label shown when expanded. `null` = ungrouped (no label, no divider above). */
  label: string | null
  items: SidebarItem[]
}

const ACCOUNTANT_NAV_SECTIONS: SidebarSection[] = [
  {
    label: null,
    items: [
      { label: 'Tổng quan', href: '/accountant', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Quản lý',
    items: [
      { label: 'Chủ hàng', href: '/accountant/clients', icon: Building2 },
      { label: 'Vận tải', href: '/accountant/transporters', icon: Container },
    ],
  },
  {
    label: 'Nghiệp vụ',
    items: [
      { label: 'Đối soát', href: '/accountant/doi-soat', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Tài chính',
    items: [
      { label: 'Chi phí xe', href: '/accountant/expenses', icon: Fuel },
      { label: 'Lương', href: '/accountant/salary', icon: Wallet },
      { label: 'Tổng hợp', href: '/accountant/pnl', icon: TrendingUp },
    ],
  },
  {
    label: 'CÀI ĐẶT',
    items: [
      { label: 'Địa điểm', href: '/accountant/locations', icon: MapPin },
      { label: 'Kỳ lương', href: '/accountant/settings/ky-luong', icon: Calendar },
      { label: 'Bảng giá cước', href: '/accountant/settings/cuoc-tuyen', icon: Route },
      { label: 'Bảng phí thuê xe', href: '/accountant/settings/cuoc-tra-xe-ngoai', icon: Truck },
      { label: 'Loại tác nghiệp', href: '/accountant/settings/tac-nghiep', icon: Wrench },
    ],
  },
]

const DIRECTOR_NAV_SECTION: SidebarSection = {
  label: 'GIÁM ĐỐC',
  items: [
    { label: 'Tổng quan', href: '/superadmin/dashboard', icon: LayoutDashboard },
    { label: 'Đối tác', href: '/superadmin/partners', icon: Building2 },
    { label: 'Bảng giá', href: '/superadmin/pricing', icon: Route },
    { label: 'Thông báo', href: '/superadmin/notifications', icon: Bell },
  ],
}

export interface AccountantSidebarProps {
  collapsed?: boolean
  badges?: Record<string, number>
  onNotificationsOpen?: () => void
  /** Called when the user clicks the collapse/expand toggle (desktop only). */
  onToggle?: () => void
  /** When true, removes the lg:flex guard so the sidebar renders on mobile (e.g. inside a drawer). */
  forceVisible?: boolean
  /** Override the navigation items (defaults to accountant nav). */
  items?: SidebarItem[]
  /** Path used for the "active root" check — defaults to '/accountant'. */
  rootPath?: string
  /** Path for the Notifications dropdown item; if omitted, item is hidden. */
  notificationsPath?: string
  /** Path for the Profile dropdown item; if omitted, item is hidden. */
  profilePath?: string
}

export function AccountantSidebar({
  collapsed = false,
  badges = {},
  onToggle,
  forceVisible = false,
  items,
  rootPath = '/accountant',
  notificationsPath,
  profilePath = '/accountant/profile',
}: AccountantSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const unread = useUnreadCount()
  const [showInfoDialog, setShowInfoDialog] = useState(false)
  const [showPwDialog, setShowPwDialog] = useState(false)

  const sections: SidebarSection[] = items
    ? [{ label: null, items }]
    : user?.role === 'superadmin'
      ? [
          ...ACCOUNTANT_NAV_SECTIONS,
          DIRECTOR_NAV_SECTION,
          {
            label: 'HỆ THỐNG',
            items: [
              { label: 'Quản lý tài khoản', href: '/superadmin', icon: UserCircle, exact: true },
            ],
          },
        ]
      : ACCOUNTANT_NAV_SECTIONS

  const isActive = useCallback(
    (href: string, exact?: boolean) => {
      if (exact || href === rootPath) return location.pathname === href
      return location.pathname.startsWith(href)
    },
    [location.pathname, rootPath],
  )

  const handleLogout = useCallback(() => {
    logout()
    navigate('/')
  }, [logout, navigate])

  const brandInitial = (user?.name ?? 'N').charAt(0).toUpperCase()

  return (
    <aside
      className={`${forceVisible ? 'flex' : 'hidden lg:flex'} flex-col shrink-0 h-full transition-[width] duration-200 relative ${
        collapsed ? 'w-[64px]' : forceVisible ? 'w-full' : 'w-[248px]'
      }`}
      style={{
        background: 'var(--theme-sidebar)',
      }}
    >
      {/* Brand area */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 shrink-0">
        <div className="nepo-sidebar-brand-mark">
          <img
            src="/logo.avif"
            alt="TTransport"
            className="h-7 w-7 object-contain"
            style={{ borderRadius: 6 }}
          />
        </div>
        {!collapsed && (
          <p className="text-[16px] font-bold text-white leading-tight truncate" style={{ letterSpacing: '-0.02em' }}>
            TTransport
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-3 overflow-y-auto sidebar-scroll">
        {sections.map((section, sectionIdx) => (
          <div key={section.label ?? `section-${sectionIdx}`}>
            {section.label && !collapsed && (
              <p className="nepo-sidebar-section-label px-3 mt-4 mb-1.5">
                {section.label}
              </p>
            )}
            {section.label && collapsed && sectionIdx > 0 && (
              <div
                aria-hidden
                className="mx-3 my-2 h-px"
                style={{ background: 'var(--sb-line)' }}
              />
            )}
            <div className="space-y-[2px]">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href, item.exact)
                const badge = badges[item.href]

                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`nepo-nav-item ${active ? 'is-active' : ''} flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate" style={{ letterSpacing: '-0.005em' }}>{item.label}</span>
                        {badge && badge > 0 ? (
                          <span
                            className="shrink-0 flex h-[18px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                            style={{
                              background: 'var(--theme-bg-secondary)',
                              color: 'var(--accent)',
                              fontFamily: 'var(--theme-font-mono)',
                            }}
                          >
                            {badge > 99 ? '99+' : badge}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Sidebar art — road transport motif (background, no overlap) ── */}
      {!collapsed && (
        <div
          aria-hidden="true"
          className="absolute bottom-[68px] left-0 right-0 px-4 pb-2 pointer-events-none"
          style={{ opacity: 0.35 }}
        >
          <svg
            viewBox="0 0 200 68"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', display: 'block' }}
          >
            <circle cx="18"  cy="10" r="1"   fill="white" fillOpacity="0.5"/>
            <circle cx="60"  cy="6"  r="0.8" fill="white" fillOpacity="0.4"/>
            <circle cx="120" cy="9"  r="1.1" fill="white" fillOpacity="0.55"/>
            <circle cx="170" cy="5"  r="0.9" fill="white" fillOpacity="0.4"/>
            <circle cx="190" cy="14" r="0.8" fill="white" fillOpacity="0.35"/>
            <circle cx="88"  cy="18" r="0.7" fill="white" fillOpacity="0.3"/>
            <path d="M0 32 Q50 22 100 28 Q150 34 200 24 L200 36 L0 36 Z" fill="white" fillOpacity="0.05"/>
            <rect x="0" y="36" width="200" height="32" fill="white" fillOpacity="0.05" rx="2"/>
            <g stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.25">
              <line x1="0"   y1="52" x2="22"  y2="52"/>
              <line x1="34"  y1="52" x2="56"  y2="52"/>
              <line x1="68"  y1="52" x2="90"  y2="52"/>
              <line x1="102" y1="52" x2="124" y2="52"/>
              <line x1="136" y1="52" x2="158" y2="52"/>
              <line x1="170" y1="52" x2="192" y2="52"/>
            </g>
            <line x1="0" y1="36" x2="200" y2="36" stroke="white" strokeWidth="1" strokeOpacity="0.12"/>
            <g transform="translate(18 37)">
              <rect x="0" y="2" width="62" height="26" rx="2.5" fill="white" fillOpacity="0.12"/>
              <rect x="0" y="2" width="62" height="4"  rx="2" fill="white" fillOpacity="0.08"/>
              <path d="M62 6 L80 6 Q84 6 84 10 L84 28 L62 28 Z" fill="white" fillOpacity="0.16"/>
              <rect x="64" y="9" width="18" height="11" rx="1.5" fill="white" fillOpacity="0.1"/>
              <rect x="82" y="10" width="3" height="4" rx="1" fill="white" fillOpacity="0.35"/>
              <circle cx="15"  cy="31" r="5.5" fill="white" fillOpacity="0.18"/>
              <circle cx="15"  cy="31" r="2.2" fill="white" fillOpacity="0.1"/>
              <circle cx="68"  cy="31" r="5.5" fill="white" fillOpacity="0.18"/>
              <circle cx="68"  cy="31" r="2.2" fill="white" fillOpacity="0.1"/>
            </g>
            <g transform="translate(130 41)" opacity="0.55">
              <rect x="0" y="1" width="36" height="16" rx="2" fill="white" fillOpacity="0.1"/>
              <path d="M36 3 L48 3 Q51 3 51 6 L51 17 L36 17 Z" fill="white" fillOpacity="0.13"/>
              <circle cx="8"  cy="19" r="3.5" fill="white" fillOpacity="0.14"/>
              <circle cx="42" cy="19" r="3.5" fill="white" fillOpacity="0.14"/>
            </g>
            <g stroke="white" strokeLinecap="round" strokeOpacity="0.1">
              <line x1="0"  y1="44" x2="14" y2="44" strokeWidth="2"/>
              <line x1="0"  y1="49" x2="10" y2="49" strokeWidth="1.5"/>
              <line x1="0"  y1="54" x2="7"  y2="54" strokeWidth="1"/>
            </g>
          </svg>
        </div>
      )}

      {/* Footer — user menu */}
      <div style={{ borderTop: '1px solid var(--sb-line)' }} className="p-3 shrink-0">
        {collapsed ? (
          <button
            type="button"
            onClick={handleLogout}
            className="nepo-sidebar-footer-btn h-9 w-9 flex items-center justify-center mx-auto rounded-lg"
            aria-label="Đăng xuất"
          >
            <LogOut className="w-4 h-4 shrink-0" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="nepo-sidebar-footer-btn relative flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer outline-none"
                >
                  <div
                    className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-[12px] font-semibold"
                    style={{
                      background: 'linear-gradient(135deg, #6E9DCB, #3D6FA3)',
                      color: 'var(--theme-text-on-brand)',
                    }}
                  >
                    {brandInitial}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 text-left">
                    <span className="text-[13px] font-semibold truncate leading-tight" style={{ color: 'var(--theme-text-on-brand)' }}>
                      {user?.name ?? 'Người dùng'}
                    </span>
                    <span
                      className="text-[11px] truncate leading-tight"
                      style={{ color: 'var(--sb-text-muted)', letterSpacing: '0.01em' }}
                    >
                      {user?.role === 'accountant'
                        ? 'Kế toán'
                        : user?.role === 'director'
                          ? 'Giám đốc'
                          : user?.role === 'superadmin'
                            ? 'Quản trị'
                            : user?.role}
                    </span>
                  </div>
                  {unread > 0 && (
                    <span
                      className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center px-1 text-[9px] font-bold rounded-full"
                      style={{ background: 'var(--theme-status-error)', color: 'var(--theme-text-on-brand)' }}
                    >
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 z-[9999]" side="top" align="start" sideOffset={8}>
                {notificationsPath && (
                  <DropdownMenuItem onClick={() => navigate(notificationsPath)}>
                    <Bell className="mr-2 h-4 w-4" />
                    Thông báo
                  </DropdownMenuItem>
                )}
                {profilePath && (
                  <DropdownMenuItem onClick={() => setShowInfoDialog(true)}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    Thông tin cá nhân
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowPwDialog(true)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Đổi mật khẩu
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={handleLogout}
              className="nepo-sidebar-footer-btn h-9 w-9 flex items-center justify-center rounded-lg shrink-0"
              aria-label="Đăng xuất"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          </div>
        )}
      </div>

      {/* Collapse / expand toggle */}
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          className="absolute top-[44px] -right-3 z-10 w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:brightness-110"
          style={{
            background: 'var(--theme-sidebar)',
            border: '1px solid var(--sb-line)',
            color: 'var(--sb-text-muted)',
          }}
        >
          <ChevronLeft
            className={`w-3 h-3 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      <UserInfoDialog open={showInfoDialog} onClose={() => setShowInfoDialog(false)} />
      <ProfileDialog open={showPwDialog} onClose={() => setShowPwDialog(false)} />
    </aside>
  )
}
