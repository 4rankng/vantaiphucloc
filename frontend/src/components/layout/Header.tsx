import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/data/mockData'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
          <DialogClose asChild>
            <Button variant="outline">Huỷ</Button>
          </DialogClose>
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
        className="lg:hidden sticky top-0 z-40 border-b border-white/30"
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(20px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-base font-bold font-display text-navy-900 truncate">{title}</h1>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-navy-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-navy-900 flex items-center justify-center text-gold-400 text-xs font-bold">
                {roleLabel ? roleLabel[0] : 'U'}
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold text-navy-900">{roleLabel}</p>
                <p className="text-xs text-gray-400">{role}@ttransport.vn</p>
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
      <header className="hidden lg:flex items-center justify-between px-6 h-14 border-b border-navy-100/50 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <h2 className="text-base font-bold font-display text-navy-900">{title}</h2>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-navy-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-navy-900 flex items-center justify-center text-gold-400 text-xs font-bold">
                {roleLabel ? roleLabel[0] : 'U'}
              </div>
              <span className="text-sm font-medium text-navy-900">{roleLabel}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-xs text-gray-400">{role}@ttransport.vn</p>
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
