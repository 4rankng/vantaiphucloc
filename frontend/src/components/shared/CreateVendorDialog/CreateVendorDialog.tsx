import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button, Input, Label } from '@/components/ui'
import type { VendorFormData, VendorType } from '@/services/api/vendors.api'

const VN_PHONE_RE = /^(0|\+?84)[35789]\d{8}$/
const VN_TAX_RE = /^\d{10}(\d{3})?$/

interface CreateVendorDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: VendorFormData) => Promise<void> | void
}

const EMPTY_FORM: VendorFormData = {
  name: '',
  type: 'company',
  phone: '',
  taxCode: '',
  address: '',
  contactPerson: '',
}

export function CreateVendorDialog({ open, onClose, onConfirm }: CreateVendorDialogProps) {
  const [form, setForm] = useState<VendorFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const updateField = <K extends keyof VendorFormData>(key: K, value: VendorFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const handleClose = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    onClose()
  }

  const handleConfirm = async () => {
    if (!form.name.trim()) return
    const errs: Record<string, string> = {}
    if (form.phone && !VN_PHONE_RE.test(form.phone.replace(/[\s-]/g, ''))) {
      errs.phone = 'SĐT không hợp lệ (VD: 0912345678)'
    }
    if (form.taxCode && !VN_TAX_RE.test(form.taxCode)) {
      errs.taxCode = 'MST phải 10 hoặc 13 chữ số'
    }
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    try {
      await onConfirm({ ...form, name: form.name.trim() })
      setForm(EMPTY_FORM)
      setErrors({})
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm nhà thầu</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tên */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Tên nhà thầu <span style={{ color: 'var(--theme-error, #ef4444)' }}>*</span>
            </Label>
            <Input
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="Tên nhà thầu"
              className="text-sm"
              autoFocus
            />
          </div>

          {/* Loại */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Loại</Label>
            <div className="flex gap-2">
              {(['company', 'individual'] as VendorType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateField('type', t)}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: form.type === t ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                    color: form.type === t ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                  }}
                >
                  {t === 'company' ? 'Công ty' : 'Cá nhân'}
                </button>
              ))}
            </div>
          </div>

          {/* Điện thoại + Mã số thuế */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Điện thoại</Label>
              <Input
                value={form.phone ?? ''}
                onChange={e => updateField('phone', e.target.value)}
                placeholder="0901234567"
                className="text-sm"
              />
              {errors.phone && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mã số thuế</Label>
              <Input
                value={form.taxCode ?? ''}
                onChange={e => updateField('taxCode', e.target.value)}
                placeholder="0123456789"
                className="text-sm"
              />
              {errors.taxCode && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{errors.taxCode}</p>}
            </div>
          </div>

          {/* Địa chỉ */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Địa chỉ</Label>
            <Input
              value={form.address ?? ''}
              onChange={e => updateField('address', e.target.value)}
              placeholder="Địa chỉ"
              className="text-sm"
            />
          </div>

          {/* Người liên hệ */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Người liên hệ</Label>
            <Input
              value={form.contactPerson ?? ''}
              onChange={e => updateField('contactPerson', e.target.value)}
              placeholder="Họ tên người liên hệ"
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="flex-1">Huỷ</Button>
          <Button
            onClick={handleConfirm}
            disabled={!form.name.trim() || saving}
            className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            {saving ? 'Đang tạo...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
