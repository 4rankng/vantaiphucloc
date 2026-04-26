import { useState } from 'react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { useAuth } from '@/contexts/AuthContext'
import { Phone, TruckIcon, LogOut, KeyRound, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'

export function Profile() {
  const { driver } = useDriverStore()
  const { logout } = useAuth()
  const initials = driver.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const [pwDialog, setPwDialog] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const handleChangePw = () => {
    // In real app: call API to change password
    setPwDialog(false)
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
  }

  return (
    <div className="pb-6">
      <div className="px-4 pt-4 space-y-4">
        {/* Avatar + name */}
        <div
          className="flex items-center gap-3 rounded-2xl p-4"
          style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold shrink-0"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold" style={{ color: 'var(--theme-text-primary)' }}>{driver.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Phone className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{driver.phone}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <TruckIcon className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--theme-brand-primary)' }}>{driver.tractorPlate}</span>
            </div>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0"
            style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
          >
            Tài xế
          </span>
        </div>

        {/* Info */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          {[
            { label: 'Mã tài xế', value: driver.id },
            { label: 'Biển số đầu kéo', value: driver.tractorPlate },
          ].map(({ label, value }, i, arr) => (
            <div key={label}>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{value}</span>
              </div>
              {i < arr.length - 1 && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }} />}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          <button
            onClick={() => setPwDialog(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <KeyRound className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Đổi mật khẩu</span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm touch-manipulation"
          style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error-text)' }}
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>

      {/* Change password dialog */}
      <Dialog open={pwDialog} onOpenChange={setPwDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu hiện tại</Label>
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu mới</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Xác nhận mật khẩu mới</Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwDialog(false)}>Huỷ</Button>
            <Button onClick={handleChangePw} disabled={!currentPw || !newPw || newPw !== confirmPw}>
              Đổi mật khẩu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
