import { useState } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { DialogClose } from '@/components/ui/Dialog'
import { LogoutConfirmDialog } from '@/components/layout/Header'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { mockDrivers } from '@/data/mockData'
import { User, Phone, Truck, KeyRound, LogOut, ChevronRight, Shield, Palette } from 'lucide-react'
import { useTheme } from '@/themes'
import { cn } from '@/lib/utils'

function ThemeSwitcher() {
  const { theme, setThemeByName, allThemes } = useTheme()
  return (
    <div className="grid grid-cols-3 gap-2">
      {allThemes.map((t) => (
        <button
          key={t.name}
          onClick={() => setThemeByName(t.name)}
          className={cn(
            'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center',
            theme.name === t.name
              ? 'border-[var(--theme-brand-secondary)] ring-1 ring-[var(--theme-brand-secondary)]/30'
              : 'border-[var(--theme-border-default)] hover:bg-[var(--theme-bg-tertiary)]'
          )}
        >
          <div className="flex gap-1">
            <span className="w-4 h-4 rounded-full" style={{ background: t.colors.brandPrimary }} />
            <span className="w-4 h-4 rounded-full" style={{ background: t.colors.brandSecondary }} />
          </div>
          <span className="text-[11px] font-medium text-[var(--theme-text-secondary)]">{t.label}</span>
        </button>
      ))}
    </div>
  )
}

export default function DriverAccount() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const driver = mockDrivers[0]
  const [showLogout, setShowLogout] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="space-y-5">
      {/* Profile card */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0" style={{background:'var(--theme-brand-primary-light)', color:'var(--theme-brand-secondary)'}}>
            {driver.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--theme-text-primary)] font-display">{driver.name}</h2>
            <p className="text-sm text-[var(--theme-text-muted)]">Tài xế</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm" style={{color:'var(--theme-brand-secondary)'}}>⭐ {driver.rating}</span>
              <span className="text-[11px] text-[var(--theme-text-muted)]">· {driver.totalTrips} chuyến</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Info */}
      <GlassCard className="divide-y" style={{borderColor:'var(--theme-border-light)'}}>
        <div className="flex items-center gap-3 px-5 py-4">
          <Phone size={18} className="text-[var(--theme-text-muted)] shrink-0" />
          <div className="flex-1"><p className="text-[11px] text-[var(--theme-text-muted)]">Số điện thoại</p><p className="text-sm font-medium text-[var(--theme-text-primary)] font-mono-num">{driver.phone}</p></div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4" style={{borderColor:'var(--theme-border-light)'}}>
          <Truck size={18} className="text-[var(--theme-text-muted)] shrink-0" />
          <div className="flex-1"><p className="text-[11px] text-[var(--theme-text-muted)]">Đầu kéo</p><p className="text-sm font-medium text-[var(--theme-text-primary)] font-mono-num">{driver.tractorPlate}</p></div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4" style={{borderColor:'var(--theme-border-light)'}}>
          <Shield size={18} className="text-[var(--theme-text-muted)] shrink-0" />
          <div className="flex-1"><p className="text-[11px] text-[var(--theme-text-muted)]">Trạng thái</p><p className="text-sm font-medium text-emerald-600">● Đang hoạt động</p></div>
        </div>
      </GlassCard>

      {/* Actions */}
      <GlassCard>
        <button onClick={() => setShowPassword(true)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[var(--theme-bg-tertiary)] transition-colors text-left rounded-xl">
          <KeyRound size={18} className="text-[var(--theme-text-muted)] shrink-0" />
          <span className="flex-1 text-sm font-medium text-[var(--theme-text-primary)]">Đổi mật khẩu</span>
          <ChevronRight size={16} className="text-[var(--theme-text-muted)]" />
        </button>
      </GlassCard>

      {/* Theme Switcher */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <Palette size={18} className="text-[var(--theme-text-muted)]" />
          <span className="text-sm font-semibold text-[var(--theme-text-primary)]">Giao diện</span>
        </div>
        <ThemeSwitcher />
      </GlassCard>

      {/* Logout */}
      <Button onClick={() => setShowLogout(true)} variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-2 h-12 font-semibold">
        <LogOut size={18} /> Đăng xuất
      </Button>

      {/* Change Password Dialog */}
      <Dialog open={showPassword} onOpenChange={setShowPassword}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Đổi mật khẩu</DialogTitle><DialogDescription>Nhập mật khẩu mới</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Mật khẩu hiện tại</Label><Input type="password" /></div>
            <div className="space-y-2"><Label>Mật khẩu mới</Label><Input type="password" /></div>
            <div className="space-y-2"><Label>Xác nhận mật khẩu</Label><Input type="password" /></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose><Button style={{background:'var(--theme-brand-secondary)', color:'var(--theme-text-inverse)'}}>Cập nhật</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <LogoutConfirmDialog open={showLogout} onOpenChange={setShowLogout} onConfirm={handleLogout} />
    </div>
  )
}
