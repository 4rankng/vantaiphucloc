import { memo, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
} from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import { WORK_TYPE_LABELS } from '@/data/domain'
import type { WorkType } from '@/data/domain'
import type { RoutePricingFormData } from './useRoutePricing'

interface RoutePricingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingId: number | null
  form: RoutePricingFormData
  onFormChange: (form: RoutePricingFormData) => void
  onSubmit: () => void
  isSubmitting: boolean
  clients: Array<{ id: number; name: string; code?: string | null }>
  locations: Array<{ id: number; name: string }>
}

function PriceInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
        {label}
      </Label>
      <Input
        type="text"
        inputMode="numeric"
        placeholder="—"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export const RoutePricingDialog = memo(function RoutePricingDialog({
  open,
  onOpenChange,
  editingId,
  form,
  onFormChange,
  onSubmit,
  isSubmitting,
  clients,
  locations,
}: RoutePricingDialogProps) {
  const updateField = useCallback(
    <K extends keyof RoutePricingFormData>(key: K, value: RoutePricingFormData[K]) => {
      onFormChange({ ...form, [key]: value })
    },
    [form, onFormChange],
  )

  const clientOptions = useMemo(
    () => clients.map((c) => ({ value: c.id.toString(), label: c.code ? `${c.code} - ${c.name}` : c.name })),
    [clients],
  )
  const locationOptions = useMemo(
    () => locations.map((l) => ({ value: l.id.toString(), label: l.name })),
    [locations],
  )
  const workTypeOptions = useMemo(
    () =>
      (Object.entries(WORK_TYPE_LABELS) as [WorkType, string][])
        .filter(([key]) => !['E20', 'E40', 'F20', 'F40'].includes(key))
        .map(([key, label]) => ({ value: key, label })),
    [],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingId ? 'Sửa cước tuyến' : 'Thêm cước tuyến'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
              Chủ hàng
            </Label>
            <InlineSelect
              placeholder="Chọn chủ hàng"
              value={form.clientId ? form.clientId.toString() : ''}
              options={clientOptions}
              onChange={(v) => updateField('clientId', Number(v))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
                Điểm đi
              </Label>
              <InlineSelect
                placeholder="Chọn điểm đi"
                value={form.pickupLocationId ? form.pickupLocationId.toString() : ''}
                options={locationOptions}
                onChange={(v) => updateField('pickupLocationId', Number(v))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
                Điểm đến
              </Label>
              <InlineSelect
                placeholder="Chọn điểm đến"
                value={form.dropoffLocationId ? form.dropoffLocationId.toString() : ''}
                options={locationOptions}
                onChange={(v) => updateField('dropoffLocationId', Number(v))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
              Loại tác nghiệp
            </Label>
            <InlineSelect
              placeholder="Chọn loại tác nghiệp"
              value={form.workType}
              options={workTypeOptions}
              onChange={(v) => updateField('workType', v as WorkType)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <PriceInput
              label="Cước F20 (₫)"
              value={form.f20Price}
              onChange={(v) => updateField('f20Price', v)}
            />
            <PriceInput
              label="Cước F40 (₫)"
              value={form.f40Price}
              onChange={(v) => updateField('f40Price', v)}
            />
            <PriceInput
              label="Cước E20 (₫)"
              value={form.e20Price}
              onChange={(v) => updateField('e20Price', v)}
            />
            <PriceInput
              label="Cước E40 (₫)"
              value={form.e40Price}
              onChange={(v) => updateField('e40Price', v)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Huỷ
          </Button>
          <Button
            variant="default"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
