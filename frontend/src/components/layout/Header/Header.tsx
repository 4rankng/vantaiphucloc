import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/data/domain'
import { api } from '@/services/api/client'
import { useToast } from '@/components/atoms/Toast'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { DialogClose } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LogOut, User, ChevronDown, KeyRound } from 'lucide-react'
import { useState } from 'react'

// ─── Shared Logout Dialog ─────────────────────────────────
export function LogoutConfirmDialog({ open, onOpenChange, onConfirm }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Đăng xuất</DialogTitle>
          <DialogDescription>Bạn có chắc muốn đăng xuất? Bạn sẽ cần chọn lại vai trò để tiếp tục.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 justify-end mt-2">
          <DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose>
          <Button variant="destructive" onClick={onConfirm}>Đăng xuất</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Profile Dialog ───────────────────────────────────────
export function ProfileDialog({ open, onOpenChange }: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { role } = useAuth()
  const roleLabel = role ? ROLE_LABELS[role] : ''
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <span className="text-[var(--theme-text-muted)]">Email</span>
              <span className="text-[var(--theme-text-primary)] font-medium">{role}@ttransport.vn</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
              <span className="text-[var(--theme-text-muted)]">Trạng thái</span>
              <span className="text-emerald-600 font-medium">● Hoạt động</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[var(--theme-text-muted)]">Phiên bản</span>
              <span className="text-[var(--theme-text-primary)] font-medium">v1.0.0</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Mobile Header ────────────────────────────────────────
interface MobileHeaderProps {
  title: string
}

export function MobileHeader({ title }: MobileHeaderProps) {
  const { role, logout } = useAuth()
  const navigate = useNavigate()
  const [showLogout, setShowLogout] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const roleLabel = role ? ROLE_LABELS[role] : ''

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <>
      <header
        className="lg:hidden sticky top-0 z-40"
        style={{
          background: 'var(--theme-header)',
          backdropFilter: 'var(--theme-glass-blur)',
          WebkitBackdropFilter: 'var(--theme-glass-blur)',
          borderBottom: '1px solid var(--theme-header-border)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-base font-bold font-display text-[var(--theme-text-primary)] truncate">{title}</h1>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors hover:bg-[var(--theme-bg-tertiary)]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-secondary)' }}>
                {roleLabel ? roleLabel[0] : 'U'}
              </div>
              <ChevronDown size={14} className="text-[var(--theme-text-muted)]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold text-[var(--theme-text-primary)]">{roleLabel}</p>
                <p className="text-xs text-[var(--theme-text-muted)]">{role}@ttransport.vn</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowProfile(true)} className="gap-2 cursor-pointer">
                <User size={16} /> <span>Hồ sơ</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {}} className="gap-2 cursor-pointer">
                <KeyRound size={16} /> <span>Đổi mật khẩu</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowLogout(true)} className="text-red-600 gap-2 cursor-pointer">
                <LogOut size={16} /> <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <ProfileDialog open={showProfile} onOpenChange={setShowProfile} />
      <LogoutConfirmDialog open={showLogout} onOpenChange={setShowLogout} onConfirm={handleLogout} />
    </>
  )
}

// ─── Desktop Header ───────────────────────────────────────
interface DesktopHeaderProps {
  title: string
}

export function DesktopHeader({ title }: DesktopHeaderProps) {
  const { role, logout } = useAuth()
  const navigate = useNavigate()
  const [showLogout, setShowLogout] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const roleLabel = role ? ROLE_LABELS[role] : ''

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <>
      <header
        className="hidden lg:flex items-center justify-between px-6 h-14 sticky top-0 z-40"
        style={{
          background: 'var(--theme-header)',
          backdropFilter: 'var(--theme-glass-blur)',
          WebkitBackdropFilter: 'var(--theme-glass-blur)',
          borderBottom: '1px solid var(--theme-header-border)',
        }}
      >
        <h2 className="text-base font-bold font-display text-[var(--theme-text-primary)]">{title}</h2>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-[var(--theme-bg-tertiary)]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-secondary)' }}>
                {roleLabel ? roleLabel[0] : 'U'}
              </div>
              <span className="text-sm font-medium text-[var(--theme-text-primary)]">{roleLabel}</span>
              <ChevronDown size={14} className="text-[var(--theme-text-muted)]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-xs text-[var(--theme-text-muted)]">{role}@ttransport.vn</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowProfile(true)} className="gap-2 cursor-pointer">
                <User size={16} /> <span>Hồ sơ</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <KeyRound size={16} /> <span>Đổi mật khẩu</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowLogout(true)} className="text-red-600 gap-2 cursor-pointer">
                <LogOut size={16} /> <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <ProfileDialog open={showProfile} onOpenChange={setShowProfile} />
      <LogoutConfirmDialog open={showLogout} onOpenChange={setShowLogout} onConfirm={handleLogout} />
    </>
  )
}
