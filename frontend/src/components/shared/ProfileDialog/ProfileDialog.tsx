import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Phone, Truck, LogOut, KeyRound, UserCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'

const ROLE_LABELS: Record<string, string> = {
  driver: 'Tài xế',
  director: 'Giám đốc',
  accountant: 'Kế toán',
  superadmin: 'SuperAdmin',
}

interface ProfileDialogProps {
  open: boolean
  onClose: () => void
  /** Extra driver-specific info (phone, plate) — only for driver role */
  driverMeta?: { phone: string; plate: string }
}

export function ProfileDialog({ open, onClose, driverMeta }: ProfileDialogProps) {
  const { user, logout } = useAuth()

  const name = user?.name ?? ''
  const phone = driverMeta?.phone ?? ''
  const plate = driverMeta?.plate ?? ''
  const role = user?.role ?? 'driver'
  const roleLabel = ROLE_LABELS[role] ?? role

  const [pwStep, setPwStep] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const handleChangePw = () => {
    setPwStep(false)
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
  }

  const handleClose = () => {
    setPwStep(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        {pwStep ? (
          <>
            <DialogHeader><DialogTitle>Đổi mật khẩu</DialogTitle></DialogHeader>
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
              <Button variant="outline" onClick={() => setPwStep(false)} className="flex-1">Huỷ</Button>
              <Button onClick={handleChangePw} disabled={!currentPw || !newPw || newPw !== confirmPw} className="flex-1"
                style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
              >
                Xác nhận
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader><DialogTitle>Tài khoản</DialogTitle></DialogHeader>

            {/* User info */}
            <div className="flex items-center gap-3 py-2">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
                <UserCircle className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{name}</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5"
                  style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-1">
              {phone && (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--theme-bg-tertiary)' }}>
                    <Phone className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Số điện thoại</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{phone}</p>
                  </div>
                </div>
              )}
              {plate && (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--theme-bg-tertiary)' }}>
                    <Truck className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Biển số đầu kéo</p>
                    <p className="text-sm font-medium font-mono" style={{ color: 'var(--theme-text-primary)' }}>{plate}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setPwStep(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl touch-manipulation"
                style={{ background: 'var(--theme-bg-tertiary)' }}
              >
                <KeyRound className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Đổi mật khẩu</span>
              </button>
              <button
                onClick={() => { logout(); handleClose() }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold touch-manipulation"
                style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error-text)' }}
              >
                <LogOut className="w-4 h-4" /> Đăng xuất
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
