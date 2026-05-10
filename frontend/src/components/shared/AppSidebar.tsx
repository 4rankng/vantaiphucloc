import { useState, useCallback, useMemo, useRef, useEffect, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LogOut, ChevronDown, ChevronUp,
  Home, Handshake, Route, Plus, Receipt, Settings, Wallet,
  Users, Truck, TrendingUp, ClipboardList, Clock, FileText,
  UserCog, History, Bell as BellIcon,
} from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useUnreadCount } from '@/components/shared/NotificationPanel/NotificationPanel'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip'

// ─── Types ──────────────────────────────────────────────────────────

type MenuItem = {
  title: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  end?: boolean
  group: string
}

// ─── Nav Item ───────────────────────────────────────────────────────

interface NavItemProps {
  item: MenuItem
  isCollapsed: boolean
  onNavigate: () => void
}

const NavItem = ({ item, isCollapsed, onNavigate }: NavItemProps) => {
  const location = useLocation()
  const isActive = item.end
    ? location.pathname === item.path
    : location.pathname.startsWith(item.path)

  const inner = (
    <NavLink to={item.path} className="block w-full" onClick={onNavigate}>
      <div
        className={cn(
          'relative flex items-center gap-2.5 rounded-xl transition-all duration-150 ease-out cursor-pointer select-none',
          isCollapsed
            ? isActive
              ? 'h-9 w-9 justify-center mx-auto bg-white/[0.08] ring-1 ring-white/[0.12]'
              : 'h-9 w-9 justify-center mx-auto'
            : 'h-8 px-2.5',
          isActive
            ? 'bg-white/[0.20] shadow-[-3px_0_8px_-2px_rgba(255,255,255,0.15)]'
            : 'hover:bg-white/[0.10] hover:translate-x-0.5'
        )}
        style={{ color: isActive ? 'var(--theme-sidebar-active-text, #ffffff)' : 'var(--theme-sidebar-text, #e8f5ed)' }}
      >
        {isActive && !isCollapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full animate-pill-appear"
            style={{ background: 'var(--theme-sidebar-active-text, #ffffff)' }} />
        )}
        <item.icon
          className={cn(
            'shrink-0 transition-all duration-150',
            isCollapsed ? 'w-[17px] h-[17px]' : 'w-[15px] h-[15px]',
          )}
          style={{
            color: isActive ? 'var(--theme-sidebar-active-text)' : 'var(--theme-sidebar-text)',
            filter: isActive ? 'drop-shadow(0 0 5px rgba(255,255,255,0.95)) brightness(1.3)' : 'none',
          }}
        />
        {!isCollapsed && (
          <span className={cn(
            'text-[13px] leading-none truncate flex-1 transition-all duration-150',
            isActive ? 'font-medium' : 'font-normal'
          )}>
            {item.title}
          </span>
        )}
      </div>
    </NavLink>
  )

  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <Tooltip>
          <TooltipTrigger asChild>{inner}</TooltipTrigger>
          <TooltipContent side="right" align="center" className="font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    )
  }

  return <SidebarMenuItem>{inner}</SidebarMenuItem>
}

// ─── Nav Group ──────────────────────────────────────────────────────

interface NavGroupProps {
  label: string
  groupKey: string
  items: MenuItem[]
  isCollapsed: boolean
  isExpanded: boolean
  onToggle: (key: string) => void
  onNavigate: () => void
}

const NavGroup = ({ label, groupKey, items, isCollapsed, isExpanded, onToggle, onNavigate }: NavGroupProps) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    setContentHeight(el.scrollHeight)
    const ro = new ResizeObserver(() => setContentHeight(el.scrollHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [isCollapsed, items])

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-1 py-1.5">
        <div className="w-5 h-px bg-white/[0.08] my-1" />
        {items.map((item) => (
          <NavItem key={item.path} item={item} isCollapsed={isCollapsed} onNavigate={onNavigate} />
        ))}
      </div>
    )
  }

  return (
    <div data-group={groupKey}>
      <button
        type="button"
        onClick={() => onToggle(groupKey)}
        className="flex items-center w-full px-2.5 py-1 mt-4 select-none cursor-pointer group/label"
        aria-expanded={isExpanded}
      >
        <span
          className="flex-1 text-left text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors"
          style={{ color: 'var(--theme-sidebar-text-muted, rgba(232,245,237,0.60))' }}
        >
          {label}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 shrink-0 transition-all duration-200',
            isExpanded && 'rotate-180'
          )}
          style={{ color: 'var(--theme-sidebar-text-muted, rgba(232,245,237,0.60))' }}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden',
          contentHeight !== undefined && 'transition-[height,opacity] duration-300 ease-out'
        )}
        style={{
          height: isExpanded ? (contentHeight ?? 'auto') : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        aria-hidden={!isExpanded}
      >
        <div ref={contentRef}>
          <SidebarMenu className="px-2 pb-1 gap-0.5">
            {items.map((item) => (
              <NavItem key={item.path} item={item} isCollapsed={isCollapsed} onNavigate={onNavigate} />
            ))}
          </SidebarMenu>
        </div>
      </div>
    </div>
  )
}

// ─── Menu Definitions per Role ──────────────────────────────────────


const ACCOUNTANT_MENU: MenuItem[] = [
  { title: 'Tổng quan', icon: Home, path: '/accountant', end: true, group: 'top' },
  { title: 'Thông báo', icon: BellIcon, path: '/accountant/notifications', group: 'top' },
  { title: 'Chuyến', icon: Truck, path: '/accountant/trips', group: 'hang-hoa' },
  { title: 'Đối soát tài xế', icon: ClipboardList, path: '/accountant/work-orders', group: 'hang-hoa' },
  { title: 'Bảng giá', icon: Receipt, path: '/accountant/pricing', group: 'danh-muc' },
  { title: 'Đối tác', icon: Handshake, path: '/accountant/partners', group: 'danh-muc' },
  { title: 'Cung đường', icon: Route, path: '/accountant/routes', group: 'danh-muc' },
  { title: 'Thiết lập kỳ lương', icon: Settings, path: '/accountant/salary-setup', group: 'tai-chinh' },
]

const DIRECTOR_MENU: MenuItem[] = [
  { title: 'Tổng quan', icon: Home, path: '/director', end: true, group: 'top' },
  { title: 'Thông báo', icon: BellIcon, path: '/director/notifications', group: 'top' },
  { title: 'Quản lý tài khoản', icon: UserCog, path: '/director/users', group: 'quan-ly' },
]

const DRIVER_MENU: MenuItem[] = [
  { title: 'Trang chủ', icon: Home, path: '/driver', end: true, group: 'top' },
  { title: 'Tạo chuyến', icon: Plus, path: '/driver/work-orders/new', group: 'hang-hoa' },
  { title: 'Lịch sử', icon: History, path: '/driver/history', group: 'hang-hoa' },
  { title: 'Thông báo', icon: BellIcon, path: '/driver/notifications', group: 'top' },
  { title: 'Hồ sơ', icon: Users, path: '/driver/profile', group: 'top' },
]

interface MenuGroup {
  key: string
  label: string | null
}

const ACCOUNTANT_GROUPS: MenuGroup[] = [
  { key: 'top', label: null },
  { key: 'hang-hoa', label: 'Hàng hóa' },
  { key: 'danh-muc', label: 'Danh mục' },
  { key: 'tai-chinh', label: 'Tài chính' },
]

const DIRECTOR_GROUPS: MenuGroup[] = [
  { key: 'top', label: null },
  { key: 'quan-ly', label: null },
]

const DRIVER_GROUPS: MenuGroup[] = [
  { key: 'top', label: null },
  { key: 'hang-hoa', label: 'Hàng hóa' },
]

// ─── App Sidebar ────────────────────────────────────────────────────

interface AppSidebarProps {
  role: 'accountant' | 'director' | 'driver'
}

export function AppSidebar({ role }: AppSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { isMobile, setOpenMobile, open, openMobile } = useSidebar()
  const [showProfile, setShowProfile] = useState(false)
  const isCollapsed = !open && !openMobile
  const unread = useUnreadCount()

  const menuItems = role === 'accountant' ? ACCOUNTANT_MENU
    : role === 'director' ? DIRECTOR_MENU
    : DRIVER_MENU

  const menuGroups = role === 'accountant' ? ACCOUNTANT_GROUPS
    : role === 'director' ? DIRECTOR_GROUPS
    : DRIVER_GROUPS

  const allGroupKeys = useMemo(
    () => new Set(menuGroups.filter((g) => g.label !== null).map((g) => g.key)),
    [menuGroups]
  )

  const activeGroupKey = useMemo(() => {
    for (const item of menuItems) {
      const isActive = item.end
        ? location.pathname === item.path
        : location.pathname.startsWith(item.path)
      if (isActive) return item.group
    }
    return null
  }, [location.pathname, menuItems])

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(allGroupKeys)

  // Auto-expand active group
  useEffect(() => {
    if (activeGroupKey && activeGroupKey !== 'top') {
      setExpandedGroups((prev) => {
        if (prev.has(activeGroupKey)) return prev
        const next = new Set(prev)
        next.add(activeGroupKey)
        return next
      })
    }
  }, [activeGroupKey])

  const handleToggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleNavigate = useCallback(() => {
    if (isMobile) setOpenMobile(false)
  }, [isMobile, setOpenMobile])

  const handleLogout = useCallback(() => {
    logout()
    navigate('/')
  }, [logout, navigate])

  const topItems = useMemo(() => menuItems.filter((i) => i.group === 'top'), [menuItems])
  const groupedSections = useMemo(() => menuGroups.filter((g) => g.label !== null), [menuGroups])

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r border-white/[0.06]"
        style={{ background: 'var(--theme-sidebar, #00782f)' } as React.CSSProperties}
      >
        {/* Header — logo */}
        <SidebarHeader className="p-0 shrink-0 border-b border-white/[0.06]">
          <div className="flex items-center justify-center h-14">
            {isCollapsed ? (
              <img src="/logo.avif" alt="Logo" className="h-7 w-7 object-contain rounded-md" />
            ) : (
              <div className="flex items-center gap-2 px-4">
                <img src="/logo.avif" alt="Logo" className="h-7 w-7 object-contain rounded-md" />
                <span className="text-sm font-semibold text-white/90">TTransport</span>
              </div>
            )}
          </div>
        </SidebarHeader>

        {/* Nav */}
        <SidebarContent
          className="py-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {/* Top items */}
          <SidebarMenu className={cn('px-2 gap-0.5', isCollapsed && 'items-center')}>
            {topItems.map((item) => (
              <NavItem key={item.path} item={item} isCollapsed={isCollapsed} onNavigate={handleNavigate} />
            ))}
          </SidebarMenu>

          {/* Grouped sections */}
          {groupedSections.map(({ key, label }) => {
            const items = menuItems.filter((i) => i.group === key)
            if (!items.length) return null
            return (
              <NavGroup
                key={key}
                label={label!}
                groupKey={key}
                items={items}
                isCollapsed={isCollapsed}
                isExpanded={expandedGroups.has(key)}
                onToggle={handleToggleGroup}
                onNavigate={handleNavigate}
              />
            )
          })}
        </SidebarContent>

        {/* Footer — user menu */}
        <SidebarSeparator className="bg-white/[0.06] m-0 shrink-0" />
        <SidebarFooter className="p-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'relative flex items-center w-full rounded-xl transition-all duration-200 cursor-pointer outline-none',
                  'bg-white/[0.04] border border-white/[0.06]',
                  'hover:bg-white/[0.08] hover:border-white/[0.1]',
                  isCollapsed ? 'h-9 w-9 justify-center mx-auto' : 'h-auto min-h-[40px] px-2.5 py-2 gap-2.5'
                )}
              >
                {isCollapsed && user && (
                  <span className="text-[11px] font-bold" style={{ color: 'var(--theme-sidebar-text, #e8f5ed)' }}>
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
                {!isCollapsed && user && (
                  <>
                    <div className="flex flex-col min-w-0 flex-1 text-left">
                      <span className="text-[10px] truncate leading-tight uppercase font-semibold tracking-wide" style={{ color: 'var(--theme-sidebar-text-muted, rgba(232,245,237,0.60))' }}>Xin chào</span>
                      <span className="text-[13px] font-medium truncate leading-tight" style={{ color: 'var(--theme-sidebar-text, #e8f5ed)' }}>{user.name}</span>
                    </div>
                    <ChevronUp className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--theme-sidebar-text-muted, rgba(232,245,237,0.60))' }} />
                  </>
                )}
                {unread > 0 && (
                  <span className={cn(
                    'absolute -top-1.5 -right-1.5 h-4 min-w-4 flex items-center justify-center px-1',
                    'text-[10px] font-semibold rounded-full text-white animate-badge-pulse',
                    { background: 'var(--theme-status-error, #ef4444)' }
                  )}>
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={isCollapsed ? 'right' : 'top'}
              align={isCollapsed ? 'start' : 'end'}
              className="w-56"
            >
              <DropdownMenuItem onClick={() => setShowProfile(true)} className="cursor-pointer">
                Hồ sơ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <UserDropdown open={showProfile} onClose={() => setShowProfile(false)} />
    </>
  )
}
