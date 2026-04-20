import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, ChevronRight, User, KeyRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS } from '@/data/mockData'

export interface SidebarNavItem {
  label: string
  icon: LucideIcon
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
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-navy-950 text-white shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center text-navy-950 font-bold text-lg font-display shadow-lg shadow-gold-400/20">
            T
          </div>
          <div>
            <h1 className="text-base font-bold font-display tracking-tight">
              <span className="text-gold-400">T</span>ransport
            </h1>
            <p className="text-[10px] text-white/40 font-medium tracking-wider uppercase">{title}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto sidebar-scroll">
        <div className="px-3 mb-2">
          <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-3">Menu</span>
        </div>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === basePath}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-[13px] font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={cn(isActive && 'text-gold-400')} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={14} className="text-gold-400/60" />}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User account section */}
      <div className="border-t border-white/[0.06] p-3 space-y-1">
        <button
          onClick={() => setShowProfile(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-navy-800 flex items-center justify-center text-gold-400 text-sm font-bold">
            {roleLabel ? roleLabel[0] : 'U'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-medium text-white/80 truncate">{roleLabel}</p>
            <p className="text-[10px] text-white/30">Phiên bản demo</p>
          </div>
        </button>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-[13px] text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all"
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
              <div className="w-14 h-14 rounded-full bg-navy-900 flex items-center justify-center text-gold-400 text-xl font-bold">
                {roleLabel ? roleLabel[0] : 'U'}
              </div>
              <div>
                <p className="font-semibold text-navy-900">{roleLabel}</p>
                <p className="text-sm text-gray-500">Vai trò: {roleLabel}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-navy-100">
                <span className="text-gray-500">Email</span>
                <span className="text-navy-900 font-medium">{role}@ttransport.vn</span>
              </div>
              <div className="flex justify-between py-2 border-b border-navy-100">
                <span className="text-gray-500">Trạng thái</span>
                <span className="text-emerald-600 font-medium">● Hoạt động</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Phiên bản</span>
                <span className="text-navy-900 font-medium">v1.0.0</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout Confirm Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Đăng xuất</DialogTitle>
            <DialogDescription>Bạn có chắc muốn đăng xuất?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-2">
            <DialogClose asChild>
              <Button variant="outline">Huỷ</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleLogout}>Đăng xuất</Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
