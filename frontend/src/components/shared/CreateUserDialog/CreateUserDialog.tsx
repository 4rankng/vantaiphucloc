import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { CreateVendorDialog } from '@/components/shared/CreateVendorDialog'
import { useToast } from '@/components/atoms/Toast'
import { api } from '@/services/api/client'
import type { Role } from '@/data/domain'
import { ROLE_LABELS } from '@/data/domain'
import { useVendors, useCreateVendor } from '@/hooks/use-queries'

const PHUC_LOC = 'Phúc Lộc'

const CREATEABLE_ROLES: { value: Role; label: string }[] = [
  { value: 'director', label: ROLE_LABELS.director },
  { value: 'driver', label: ROLE_LABELS.driver },
  { value: 'accountant', label: ROLE_LABELS.accountant },
]

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
      {children} <span className="text-xs" style={{ color: 'var(--theme-status-error)' }}>*</span>
    </Label>
  )
}

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
  const { data: vendors } = useVendors()
  const createVendor = useCreateVendor()
  const [createVendorOpen, setCreateVendorOpen] = useState(false)
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    phone: '',
    cccd: '',
    role: 'driver' as Role,
    vendor: '',
    password: '',
    tractorPlate: '',
  })

  useEffect(() => {
    if (form.vendor === '' && vendors && vendors.length > 0) {
      setForm(f => ({ ...f, vendor: String(vendors[0].id) }))
    }
  }, [vendors, form.vendor])

  const handleSubmit = async () => {
    if (!form.username.trim() || !form.password.trim()) return
    setSaving(true)
    try {
      const vendorObj = vendors?.find(v => String(v.id) === form.vendor)
      await api.post('/users', {
        username: form.username.trim(),
        full_name: form.fullName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        cccd: form.cccd.trim() || undefined,
        role: form.role,
        password: form.password,
        vendor: form.role === 'driver' ? (vendorObj?.name ?? PHUC_LOC) : undefined,
        tractor_plate: form.role === 'driver' && form.tractorPlate.trim() ? form.tractorPlate.trim() : undefined,
      })
      toast.success('Đã tạo tài khoản')
      setForm({ username: '', fullName: '', phone: '', cccd: '', role: 'driver', vendor: '', password: '', tractorPlate: '' })
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
    <>
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !createVendorOpen) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo tài khoản</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Row 1: Username + Full name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <RequiredLabel>Tên đăng nhập</RequiredLabel>
              <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="nguyenvana" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Họ và tên</Label>
              <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Nguyễn Văn A" className="text-sm" />
            </div>
          </div>

          {/* Row 2: Phone + CCCD */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số điện thoại</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0901 234 567" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>CCCD</Label>
              <Input value={form.cccd} onChange={e => setForm(f => ({ ...f, cccd: e.target.value }))} placeholder="001234567890" className="text-sm font-mono" />
            </div>
          </div>

          {/* Row 3: Role + Vendor/Tractor plate (driver only) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <RequiredLabel>Vai trò</RequiredLabel>
              <InlineSelect
                options={CREATEABLE_ROLES}
                value={form.role}
                onChange={v => {
                  const newRole = v as Role
                  setForm(f => ({
                    ...f,
                    role: newRole,
                    vendor: (newRole === 'director' || newRole === 'accountant') ? '' : f.vendor,
                  }))
                }}
                placeholder="Chọn vai trò"
              />
            </div>
            {form.role === 'driver' ? (
              <div className="space-y-2">
                <RequiredLabel>Nhà thầu</RequiredLabel>
                <InlineSelect
                  options={(vendors ?? []).map(v => ({ value: String(v.id), label: v.name }))}
                  value={form.vendor}
                  onChange={v => setForm(f => ({ ...f, vendor: v }))}
                  placeholder="Chọn nhà thầu"
                  onCreateNew={() => setCreateVendorOpen(true)}
                  createNewLabel="Tạo nhà thầu mới"
                />
              </div>
            ) : <div />}
          </div>

          {/* Row 4: Tractor plate + Password (driver) or Password full-width (others) */}
          {form.role === 'driver' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Biển số đầu kéo</Label>
                <Input value={form.tractorPlate} onChange={e => setForm(f => ({ ...f, tractorPlate: e.target.value }))} placeholder="15C-123.45" className="text-sm font-mono" />
              </div>
              <div className="space-y-2">
                <RequiredLabel>Mật khẩu</RequiredLabel>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="text-sm" />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <RequiredLabel>Mật khẩu</RequiredLabel>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="text-sm" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button onClick={handleSubmit}
            disabled={!form.username.trim() || !form.password.trim() || saving}
            className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            {saving ? 'Đang tạo...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <CreateVendorDialog
      open={createVendorOpen}
      onClose={() => setCreateVendorOpen(false)}
      onConfirm={(data) => {
        createVendor.mutate(data, {
          onSuccess: (res) => {
            setCreateVendorOpen(false)
            if (res.success && res.data?.id) {
              setForm(f => ({ ...f, vendor: String(res.data.id) }))
            }
          },
        })
      }}
    />
    </>
  )
}
