import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button, Input, Label } from '@/components/ui'
import type { Client } from '@/data/domain'

export type ClientFormData = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>

interface CreateClientDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: ClientFormData) => Promise<void> | void
  defaultName?: string
  /** When provided, dialog runs in "edit" mode — title and CTA change. */
  initial?: ClientFormData | null
  saving?: boolean
}

const VN_TAX_RE = /^\d{10}(\d{3})?$/

const EMPTY_FORM: ClientFormData = {
  code: '',
  name: '',
  type: 'company',
  phone: '',
  taxCode: '',
  address: '',
  contactPerson: '',
}

export function CreateClientDialog({ open, onClose, onConfirm, defaultName, initial, saving: externalSaving }: CreateClientDialogProps) {
  const isEdit = !!initial
  const [form, setForm] = useState<ClientFormData>(EMPTY_FORM)
  const [internalSaving, setInternalSaving] = useState(false)
  const saving = externalSaving ?? internalSaving
  const [errors, setErrors] = useState<{ phone?: string; taxCode?: string }>({})

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(
        initial
          ? { ...EMPTY_FORM, ...initial }
          : defaultName
            ? { ...EMPTY_FORM, name: defaultName }
            : EMPTY_FORM,
      )
      setErrors({})
    }
  }, [open, defaultName, initial])

  const updateField = <K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (key === 'phone' || key === 'taxCode') {
      setErrors(prev => ({ ...prev, [key]: undefined }))
    }
  }

  const handleClose = () => {
    if (saving) return
    setForm(EMPTY_FORM)
    setErrors({})
    onClose()
  }

  const handleConfirm = async () => {
    const errs: typeof errors = {}
    if (form.taxCode && !VN_TAX_RE.test(form.taxCode)) {
      errs.taxCode = 'MST phải 10 hoặc 13 chữ số'
    }
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    if (!form.name.trim()) return
    setInternalSaving(true)
    try {
      await onConfirm({ ...form, name: form.name.trim() })
      setForm(EMPTY_FORM)
      setErrors({})
    } finally {
      setInternalSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa khách hàng' : 'Thêm khách hàng'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tên + Mã khách */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Tên khách hàng <span style={{ color: 'var(--theme-status-error)' }}>*</span>
              </Label>
              <Input
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="Tên khách hàng"
                className="text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mã KH</Label>
              <Input
                value={form.code ?? ''}
                onChange={e => updateField('code', e.target.value)}
                placeholder="VD: PAN"
                className="text-sm"
              />
            </div>
          </div>

          {/* Loại */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Loại</Label>
            <div className="flex gap-2">
              {(['company', 'individual'] as const).map(t => (
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
                value={form.phone}
                onChange={e => updateField('phone', e.target.value)}
                placeholder="0912345678"
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
          <Button variant="outline" onClick={handleClose} disabled={saving} className="flex-1">Huỷ</Button>
          <Button
            onClick={handleConfirm}
            disabled={!form.name.trim() || saving}
            className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            {saving ? (isEdit ? 'Đang lưu...' : 'Đang tạo...') : (isEdit ? 'Lưu thay đổi' : 'Xác nhận')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
