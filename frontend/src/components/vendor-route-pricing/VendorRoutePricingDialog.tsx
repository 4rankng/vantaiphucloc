import { memo, useCallback, useMemo } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
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
import { InlineSelect } from '@/components/shared/forms/InlineSelect/InlineSelect'
import { WORK_TYPE_LABELS } from '@/data/domain'
import type { WorkType } from '@/data/domain'
import type { VendorRoutePricingFormData } from './useVendorRoutePricing'

interface VendorRoutePricingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingId: number | null
  form: VendorRoutePricingFormData
  onFormChange: (form: VendorRoutePricingFormData) => void
  onSubmit: () => void
  isSubmitting: boolean
  vendors: Array<{ id: number; name: string; code?: string | null }>
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

export const VendorRoutePricingDialog = memo(function VendorRoutePricingDialog({
  open,
  onOpenChange,
  editingId,
  form,
  onFormChange,
  onSubmit,
  isSubmitting,
  vendors,
  locations,
}: VendorRoutePricingDialogProps) {
  const isMobile = useIsMobile()
  const updateField = useCallback(
    <K extends keyof VendorRoutePricingFormData>(key: K, value: VendorRoutePricingFormData[K]) => {
      onFormChange({ ...form, [key]: value })
    },
    [form, onFormChange],
  )

  const vendorOptions = useMemo(
    () => vendors.map((v) => ({ value: v.id.toString(), label: v.code ? `${v.code} - ${v.name}` : v.name })),
    [vendors],
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
      <DialogContent
        className={`sm:max-w-lg ${isMobile ? 'flex flex-col' : ''}`}
        {...(isMobile ? { 'data-mobile-fullscreen': '' } : {})}
      >
        <DialogHeader>
          <DialogTitle>
            {editingId ? 'Sửa cước trả' : 'Thêm cước trả'}
          </DialogTitle>
        </DialogHeader>

        <div className={isMobile ? 'flex-1 overflow-y-auto px-4' : ''}>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
              Nhà thầu
            </Label>
            <InlineSelect
              placeholder="Chọn nhà thầu"
              value={form.vendorId ? form.vendorId.toString() : ''}
              options={vendorOptions}
              onChange={(v) => updateField('vendorId', Number(v))}
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
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="flex-1">
            Huỷ
          </Button>
          <Button
            size="sm"
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
