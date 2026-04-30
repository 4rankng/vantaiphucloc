import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { DialogClose } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ROLE_LABELS } from '@/data/domain'

export interface SidebarNavItem {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  path: string
}

interface SidebarProps {
  items: SidebarNavItem[]
  title: string
  basePath: string
}

export function Sidebar({ items, title, basePath }: SidebarProps) {
  const { role, logout } = useAuth()
  const navigate = useNavigate()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const roleLabel = role ? ROLE_LABELS[role] : ''

  return (
    <aside
      className="hidden lg:flex flex-col w-64 min-h-screen text-white shrink-0"
      style={{ background: 'var(--theme-sidebar)' }}
    >
      {/* Logo */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--theme-sidebar-border)' }}>
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="TTransport"
            className="h-8 w-auto"
          />
          <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--theme-sidebar-text-muted)' }}>{title}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto sidebar-scroll">
        <div className="px-3 mb-2">
          <span className="text-xs font-semibold uppercase tracking-widest px-3" style={{ color: 'var(--theme-sidebar-text-muted)' }}>Menu</span>
        </div>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === basePath}
              className={() => cn(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-[var(--theme-radius-md)] text-sm font-medium transition-all duration-150 group',
              )}
              style={({ isActive }) => ({
                background: isActive ? 'var(--theme-sidebar-active)' : 'transparent',
                color: isActive ? 'var(--theme-sidebar-active-text)' : 'var(--theme-sidebar-text)',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-[var(--theme-brand-secondary)]' : ''} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={14} className="opacity-60 text-[var(--theme-brand-secondary)]" />}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User account section */}
      <div className="p-3 space-y-1" style={{ borderTop: '1px solid var(--theme-sidebar-border)' }}>
        <button
          onClick={() => setShowProfile(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--theme-radius-md)] transition-all duration-150"
          style={{ color: 'var(--theme-sidebar-text)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-sidebar-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-secondary)' }}
          >
            {roleLabel ? roleLabel[0] : 'U'}
          </div>
      <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-sidebar-active-text)', opacity: 0.8 }}>{roleLabel}</p>
          <p className="text-xs" style={{ color: 'var(--theme-sidebar-text-muted)' }}>Phúc Lộc</p>
        </div>
        </button>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-[var(--theme-radius-md)] text-sm transition-all duration-150 hover:text-red-400"
          style={{ color: 'var(--theme-sidebar-text-muted)' }}
        >
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
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
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-secondary)' }}>
                {roleLabel ? roleLabel[0] : 'U'}
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
            <DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose>
            <Button variant="destructive" onClick={handleLogout}>Đăng xuất</Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
