import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/services/api'
import { api } from '@/services/api/client'
import { useToast } from '@/components/atoms/Toast'
import { Phone, TruckIcon, LogOut, KeyRound, ChevronRight, UserCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'

export function Profile() {
  const { user, logout } = useAuth()
  const toast = useToast()

  const [driverPlate, setDriverPlate] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (user) {
      apiClient.getDrivers()
        .then(res => {
          if (res.success) {
            const d = res.data.find((d: { id: number; tractorPlate?: string; phone?: string }) => d.id === Number(user.id))
            if (d) {
              setDriverPlate(d.tractorPlate ?? '')
              setPhone(d.phone ?? '')
            }
          }
        })
        .catch((err) => { console.error('Failed to load driver data:', err) })
    }
  }, [user])

  const [pwDialog, setPwDialog] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChangePw = async () => {
    if (newPw !== confirmPw) {
      toast.error('Lỗi', 'Mật khẩu xác nhận không khớp')
      return
    }
    setSaving(true)
    try {
      await api.post('/users/change-password', {
        current_password: currentPw,
        new_password: newPw,
      })
      toast.success('Đã đổi mật khẩu')
      setPwDialog(false)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Lỗi không xác định'
      toast.error('Lỗi', detail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pb-6 space-y-4">
        {/* Avatar + name */}
        <div
          className="flex items-center gap-3 rounded-2xl p-4"
          style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            <UserCircle className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>{user?.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Phone className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{phone}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <TruckIcon className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--theme-brand-primary)' }}>{driverPlate}</span>
            </div>
          </div>
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full shrink-0"
            style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
          >
            Tài xế
          </span>
        </div>

        {/* Info */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          {[
            { label: 'Mã tài xế', value: user?.id },
            { label: 'Biển số đầu kéo', value: driverPlate },
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
            <Button variant="outline" onClick={() => setPwDialog(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleChangePw} disabled={!currentPw || !newPw || newPw !== confirmPw || saving} className="flex-1"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
