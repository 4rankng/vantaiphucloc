import { useEffect, useState } from 'react'
import { CheckCircle, Fuel, Wrench, FileText, MoreHorizontal } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import type { VehicleExpenseCategory } from '@/services/api/vehicleExpenses.api'
import { EXPENSE_CATEGORY_LABELS } from '@/services/api/vehicleExpenses.api'
import { formatCurrency } from '@/data/domain'

const CATEGORIES: VehicleExpenseCategory[] = ['XANG_DAU', 'SUA_CHUA', 'TIEN_LUAT', 'KHAC']

const CATEGORY_ICONS: Record<VehicleExpenseCategory, React.ComponentType<{ className?: string }>> = {
  XANG_DAU: Fuel,
  SUA_CHUA: Wrench,
  TIEN_LUAT: FileText,
  KHAC: MoreHorizontal,
}

export type CreateExpenseFormData = {
  vehicleId: number
  category: VehicleExpenseCategory
  amount: number
  expenseDate: string
  description: string
}

const emptyForm = (): CreateExpenseFormData => ({
  vehicleId: 0,
  category: 'XANG_DAU',
  amount: 0,
  expenseDate: new Date().toISOString().slice(0, 10),
  description: '',
})

interface CreateExpenseDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: CreateExpenseFormData) => Promise<void> | void
  vehicles: { id: number; plate: string }[]
  saving?: boolean
}

export function CreateExpenseDialog({ open, onClose, onConfirm, vehicles, saving }: CreateExpenseDialogProps) {
  const [form, setForm] = useState<CreateExpenseFormData>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog is reopened
  useEffect(() => {
    if (open) {
      setForm(emptyForm())
      setErrors({})
    }
  }, [open])

  const updateField = <K extends keyof CreateExpenseFormData>(key: K, value: CreateExpenseFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const handleClose = () => {
    if (saving) return
    setForm(emptyForm())
    setErrors({})
    onClose()
  }

  const validate = (f: CreateExpenseFormData) => {
    const errs: Record<string, string> = {}
    if (!f.vehicleId) errs.vehicleId = 'Chọn xe'
    if (!f.amount || f.amount <= 0) errs.amount = 'Nhập số tiền'
    if (!f.expenseDate) errs.expenseDate = 'Chọn ngày'
    return errs
  }

  const handleConfirm = async () => {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    await onConfirm(form)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm chi phí xe</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ngày + Xe */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Ngày <span style={{ color: 'var(--theme-error, #ef4444)' }}>*</span>
              </Label>
              <Input
                type="date"
                value={form.expenseDate}
                onChange={e => updateField('expenseDate', e.target.value)}
                className="text-sm"
                error={errors.expenseDate}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Xe <span style={{ color: 'var(--theme-error, #ef4444)' }}>*</span>
              </Label>
              <InlineSelect
                placeholder="— Chọn xe —"
                value={form.vehicleId ? String(form.vehicleId) : ''}
                options={[
                  { value: '', label: '— Chọn xe —' },
                  ...vehicles.map(v => ({ value: String(v.id), label: v.plate })),
                ]}
                onChange={v => updateField('vehicleId', Number(v) || 0)}
              />
              {errors.vehicleId && (
                <p className="text-xs" style={{ color: 'var(--theme-status-error, #ef4444)' }}>{errors.vehicleId}</p>
              )}
            </div>
          </div>

          {/* Loại chi phí */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Loại chi phí</Label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(c => {
                const selected = form.category === c
                const Icon = CATEGORY_ICONS[c]
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateField('category', c)}
                    className="min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:translate-y-[1px] touch-manipulation"
                    style={{
                      background: selected ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                      color: selected ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                      border: `2px solid ${selected ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
                      boxShadow: selected ? 'none' : 'var(--theme-shadow-card)',
                      padding: '0 10px',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="whitespace-nowrap">{EXPENSE_CATEGORY_LABELS[c]}</span>
                    {selected && <CheckCircle className="w-3 h-3 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Số tiền */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Số tiền <span style={{ color: 'var(--theme-error, #ef4444)' }}>*</span>
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              value={form.amount ? formatCurrency(form.amount) : ''}
              onChange={e => updateField('amount', Number(e.target.value.replace(/\D/g, '')) || 0)}
              placeholder="0 ₫"
              className="text-sm tabular-nums text-right"
              error={errors.amount}
            />
          </div>

          {/* Mô tả */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mô tả</Label>
            <Input
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Ghi chú thêm (không bắt buộc)..."
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving} className="flex-1">Huỷ</Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            {saving ? 'Đang lưu...' : 'Thêm chi phí'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
