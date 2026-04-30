import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button, Input, Label } from '@/components/ui'
import type { Client, ClientType } from '@/data/domain'

type ClientFormData = Omit<Client, 'id' | 'outstandingDebt'>

interface CreateClientDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: ClientFormData) => Promise<void> | void
}

const EMPTY_FORM: ClientFormData = {
  name: '',
  type: 'company',
  phone: '',
  taxCode: '',
  address: '',
  contactPerson: '',
}

export function CreateClientDialog({ open, onClose, onConfirm }: CreateClientDialogProps) {
  const [form, setForm] = useState<ClientFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const updateField = <K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleClose = () => {
    setForm(EMPTY_FORM)
    onClose()
  }

  const handleConfirm = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onConfirm({ ...form, name: form.name.trim() })
      setForm(EMPTY_FORM)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm khách hàng</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tên */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Tên khách hàng <span style={{ color: 'var(--theme-error, #ef4444)' }}>*</span>
            </Label>
            <Input
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="Tên khách hàng"
              className="text-sm"
              autoFocus
            />
          </div>

          {/* Loại */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Loại</Label>
            <div className="flex gap-2">
              {(['company', 'individual'] as ClientType[]).map(t => (
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
                placeholder="0225-123-456"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mã số thuế</Label>
              <Input
                value={form.taxCode ?? ''}
                onChange={e => updateField('taxCode', e.target.value)}
                placeholder="0123456789"
                className="text-sm"
              />
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
