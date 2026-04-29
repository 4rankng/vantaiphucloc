import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { useToast } from '@/components/atoms/Toast'
import { api } from '@/services/api/client'
import type { Role } from '@/data/domain'
import { ROLE_LABELS } from '@/data/domain'

const PHUC_LOC = 'Phúc Lộc'

const CREATEABLE_ROLES: { value: Role; label: string }[] = [
  { value: 'director', label: ROLE_LABELS.director },
  { value: 'driver', label: ROLE_LABELS.driver },
  { value: 'accountant', label: ROLE_LABELS.accountant },
]

export function CreateUserDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    username: '',
    phone: '',
    role: 'driver' as Role,
    vendor: PHUC_LOC,
    password: '',
    tractorPlate: '',
  })

  const handleSubmit = async () => {
    if (!form.username.trim() || !form.phone.trim() || !form.password.trim()) return
    setSaving(true)
    try {
      await api.post('/users', {
        username: form.username.trim(),
        phone: form.phone.trim(),
        role: form.role,
        password: form.password,
        vendor: form.role === 'driver' ? form.vendor : undefined,
        tractor_plate: form.role === 'driver' && form.tractorPlate.trim() ? form.tractorPlate.trim() : undefined,
      })
      toast.success('Đã tạo tài khoản')
      setForm({ username: '', phone: '', role: 'driver', vendor: PHUC_LOC, password: '', tractorPlate: '' })
      onClose()
      onCreated()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Lỗi không xác định'
      toast.error('Lỗi', detail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo tài khoản</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tên đăng nhập</Label>
            <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="nguyenvana" className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số điện thoại</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0901 234 567" className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Vai trò</Label>
            <InlineSelect
              options={CREATEABLE_ROLES}
              value={form.role}
              onChange={v => {
                const newRole = v as Role
                setForm(f => ({
                  ...f,
                  role: newRole,
                  vendor: (newRole === 'director' || newRole === 'accountant') ? PHUC_LOC : f.vendor,
                }))
              }}
              placeholder="Chọn vai trò"
            />
          </div>
          {form.role === 'driver' && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Nhà thầu</Label>
              <Input
                value={form.vendor}
                onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                placeholder={PHUC_LOC}
                className="text-sm"
              />
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                Mặc định "Phúc Lộc". Đổi thành tên nhà thầu nếu tài xế thuê ngoài.
              </p>
            </div>
          )}
          {form.role === 'driver' && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Biển số đầu kéo</Label>
              <Input value={form.tractorPlate} onChange={e => setForm(f => ({ ...f, tractorPlate: e.target.value }))} placeholder="15C-123.45" className="text-sm font-mono" />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu</Label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button onClick={handleSubmit}
            disabled={!form.username.trim() || !form.phone.trim() || !form.password.trim() || saving}
            className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            {saving ? 'Đang tạo...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
