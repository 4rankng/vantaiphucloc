import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, User, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { DialogClose } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import type { NavItem } from './navConfig'

export function DesktopSidebar({
  navItems,
  label,
}: {
  navItems: NavItem[]
  label: string
}) {
  const location = useLocation()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const mainItems = navItems.filter(i => i.section !== 'admin')
  const adminItems = navItems.filter(i => i.section === 'admin')
  const hasAdmin = adminItems.length > 0

  return (
    <aside
      className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40"
      style={{
        background: 'var(--theme-sidebar, #047857)',
        color: 'var(--theme-sidebar-text, #e8f5ed)',
        borderRight: '1px solid var(--theme-sidebar-border, rgba(0,0,0,0.08))',
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-3 px-[22px] py-5 shrink-0"
        style={{ borderBottom: '1px solid var(--theme-sidebar-border, rgba(0,0,0,0.08))' }}
      >
        <div
          className="w-8 h-8 rounded-[var(--theme-radius-md,8px)] overflow-hidden flex items-center justify-center"
          style={{ background: '#fff' }}
        >
          <img
            src="/logo.avif"
            alt="TTransport"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="leading-tight">
          <strong className="block text-sm font-bold tracking-tight" style={{ color: '#fff' }}>
            TTransport
          </strong>
          <span
            className="text-[10px] font-semibold uppercase"
            style={{
              color: 'var(--theme-sidebar-text-muted, rgba(232,245,237,0.60))',
              letterSpacing: '0.1em',
            }}
          >
            Phúc Lộc
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto pb-3 sidebar-scroll">
        {/* Main section */}
        <div
          className="text-[10px] font-bold uppercase"
          style={{
            color: 'var(--theme-sidebar-text-muted, rgba(232,245,237,0.60))',
            letterSpacing: '0.12em',
            padding: '18px 26px 8px',
          }}
        >
          ĐIỀU HÀNH
        </div>

        {mainItems.map(item => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 rounded-[var(--theme-radius-md,8px)] text-[13px] font-medium transition-all duration-150 no-underline"
              style={{
                padding: '9px 12px',
                margin: '1px 12px',
                width: 'calc(100% - 24px)',
                background: isActive ? 'var(--theme-sidebar-active, rgba(255,255,255,0.12))' : 'transparent',
                color: isActive ? 'var(--theme-sidebar-active-text, #ffffff)' : 'var(--theme-sidebar-text, #e8f5ed)',
                fontWeight: isActive ? 600 : 500,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--theme-sidebar-hover, rgba(255,255,255,0.06))'
                  e.currentTarget.style.color = '#fff'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--theme-sidebar-text, #e8f5ed)'
                }
              }}
            >
              <Icon size={16} strokeWidth={1.8} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight size={12} className="opacity-60" />}
            </Link>
          )
        })}

        {/* Admin section */}
        {hasAdmin && (
          <>
            <div
              className="text-[10px] font-bold uppercase"
              style={{
                color: 'var(--theme-sidebar-text-muted, rgba(232,245,237,0.60))',
                letterSpacing: '0.12em',
                padding: '22px 26px 8px',
              }}
            >
              THIẾT LẬP
            </div>

            {adminItems.map(item => {
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 rounded-[var(--theme-radius-md,8px)] text-[13px] font-medium transition-all duration-150 no-underline"
                  style={{
                    padding: '9px 12px',
                    margin: '1px 12px',
                    width: 'calc(100% - 24px)',
                    background: isActive ? 'var(--theme-sidebar-active, rgba(255,255,255,0.12))' : 'transparent',
                    color: isActive ? 'var(--theme-sidebar-active-text, #ffffff)' : 'var(--theme-sidebar-text, #e8f5ed)',
                    fontWeight: isActive ? 600 : 500,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--theme-sidebar-hover, rgba(255,255,255,0.06))'
                      e.currentTarget.style.color = '#fff'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--theme-sidebar-text, #e8f5ed)'
                    }
                  }}
                >
                  <Icon size={16} strokeWidth={1.8} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={12} className="opacity-60" />}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Footer user section */}
      <div
        className="p-3 shrink-0"
        style={{ borderTop: '1px solid var(--theme-sidebar-border, rgba(0,0,0,0.08))' }}
      >
        <div
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--theme-radius-md,8px)] transition-all duration-150"
          style={{ color: 'var(--theme-sidebar-text, #e8f5ed)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}
          >
            <User size={18} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] font-semibold truncate" style={{ color: '#fff' }}>
              {label}
            </div>
            <div
              className="text-[11px] truncate"
              style={{ color: 'var(--theme-sidebar-text-muted, rgba(232,245,237,0.60))' }}
            >
              TTransport
            </div>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="p-1 rounded transition-colors hover:bg-[rgba(255,255,255,0.08)]"
            style={{ color: 'var(--theme-sidebar-text-muted, rgba(232,245,237,0.60))' }}
            title="Đăng xuất"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Logout Confirm Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Đăng xuất</DialogTitle>
            <DialogDescription>Bạn có chắc muốn đăng xuất?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-2">
            <DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose>
            <Button variant="destructive" onClick={handleLogout}>Đăng xuất</Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
