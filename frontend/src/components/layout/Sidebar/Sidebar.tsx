import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, ChevronRight, User } from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { DialogClose } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ROLE_LABELS } from '@/data/domain'

export interface SidebarNavItem {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  path: string
  section?: 'main' | 'admin'
}

interface SidebarProps {
  items: SidebarNavItem[]
  basePath: string
}

export function Sidebar({ items, basePath }: SidebarProps) {
  const { role, logout } = useAuth()
  const navigate = useNavigate()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const roleLabel = role ? ROLE_LABELS[role] : ''
  const mainItems = items.filter(i => i.section !== 'admin')
  const adminItems = items.filter(i => i.section === 'admin')
  const hasAdmin = adminItems.length > 0

  return (
    <aside
      className="hidden lg:flex flex-col w-64 min-h-screen text-white shrink-0"
      style={{
        background: 'var(--theme-sidebar, #047857)',
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
          style={{ background: 'var(--theme-bg-secondary)' }}
        >
          <img src="/logo.avif" alt="TTransport" className="w-full h-full object-cover" />
        </div>
        <div className="leading-tight">
          <strong className="block text-sm font-bold tracking-tight" style={{ color: 'var(--theme-text-on-brand)' }}>
            TTransport
          </strong>
          <span
            className="type-overline"
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
          className="type-overline"
          style={{
            color: 'var(--theme-sidebar-text-muted, rgba(232,245,237,0.60))',
            letterSpacing: '0.12em',
            padding: '18px 26px 8px',
          }}
        >
          ĐIỀU HÀNH
        </div>

        {mainItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === basePath}
              className={() =>
                cn(
                  'flex items-center gap-3 rounded-[var(--theme-radius-md,8px)] text-[13px] font-medium transition-all duration-150 group no-underline',
                )
              }
              style={({ isActive }) => ({
                padding: '9px 12px',
                margin: '1px 12px',
                width: 'calc(100% - 24px)',
                background: isActive ? 'var(--theme-sidebar-active, rgba(255,255,255,0.12))' : 'transparent',
                color: isActive ? 'var(--theme-sidebar-active-text, #ffffff)' : 'var(--theme-sidebar-text, #e8f5ed)',
                fontWeight: isActive ? 600 : 500,
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className="shrink-0" style={{ strokeWidth: 1.8 }} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={12} className="opacity-60" />}
                </>
              )}
            </NavLink>
          )
        })}

        {/* Admin section */}
        {hasAdmin && (
          <>
            <div
              className="type-overline"
              style={{
                color: 'var(--theme-sidebar-text-muted, rgba(232,245,237,0.60))',
                letterSpacing: '0.12em',
                padding: '22px 26px 8px',
              }}
            >
              THIẾT LẬP
            </div>

            {adminItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === basePath}
                  className={() =>
                    cn(
                      'flex items-center gap-3 rounded-[var(--theme-radius-md,8px)] text-[13px] font-medium transition-all duration-150 group no-underline',
                    )
                  }
                  style={({ isActive }) => ({
                    padding: '9px 12px',
                    margin: '1px 12px',
                    width: 'calc(100% - 24px)',
                    background: isActive ? 'var(--theme-sidebar-active, rgba(255,255,255,0.12))' : 'transparent',
                    color: isActive ? 'var(--theme-sidebar-active-text, #ffffff)' : 'var(--theme-sidebar-text, #e8f5ed)',
                    fontWeight: isActive ? 600 : 500,
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={16} className="shrink-0" style={{ strokeWidth: 1.8 }} />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight size={12} className="opacity-60" />}
                    </>
                  )}
                </NavLink>
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
            <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--theme-text-on-brand)' }}>
              {roleLabel}
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

      {/* Profile Dialog */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hồ sơ người dùng</DialogTitle>
            <DialogDescription>Thông tin tài khoản của bạn</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}>
                <User size={28} />
              </div>
              <div>
                <p className="font-semibold text-[var(--theme-text-primary)]">{roleLabel}</p>
                <p className="text-sm text-[var(--theme-text-muted)]">Vai trò: {roleLabel}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
                <span className="text-[var(--theme-text-muted)]">Vai trò</span>
                <span className="text-[var(--theme-text-primary)] font-medium">{roleLabel}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--theme-text-muted)]">Trạng thái</span>
                <span className="text-emerald-600 font-medium">● Hoạt động</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout Confirm */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Đăng xuất</DialogTitle>
            <DialogDescription>Bạn có chắc muốn đăng xuất?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-2">
            <DialogClose asChild><Button variant="outline" size="sm">Huỷ</Button></DialogClose>
            <Button variant="destructive" size="sm" onClick={handleLogout}>Đăng xuất</Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
