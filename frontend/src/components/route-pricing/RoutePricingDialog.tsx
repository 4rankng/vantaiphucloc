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
import { InlineSelect } from '@/components/shared/forms/InlineSelect/InlineSelect'
import { WORK_TYPE_LABELS } from '@/data/domain'
import type { WorkType } from '@/data/domain'
import { Route, Banknote, Wallet, ArrowRight } from 'lucide-react'
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

/* ───────────────────────── Subcomponents ───────────────────────── */

function SectionHeader({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  title: string
  hint?: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        className="flex h-6 w-6 items-center justify-center rounded-md"
        style={{
          background: 'var(--surface-3)',
          color: 'var(--accent)',
        }}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h3
        className="text-[12px] font-semibold uppercase tracking-[0.06em]"
        style={{ color: 'var(--ink-2)' }}
      >
        {title}
      </h3>
      {hint && (
        <span
          className="text-[11px] font-normal normal-case tracking-normal ml-auto"
          style={{ color: 'var(--ink-3)' }}
        >
          {hint}
        </span>
      )}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label
      className="text-[11px] font-medium"
      style={{ color: 'var(--ink-3)', letterSpacing: '0.01em' }}
    >
      {children}
    </Label>
  )
}

function MoneyInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  ariaLabel: string
}) {
  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="numeric"
        placeholder="0"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-7 text-right tabular-nums"
      />
      <span
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium"
        style={{ color: 'var(--ink-3)' }}
      >
        ₫
      </span>
    </div>
  )
}

/* ───────────────────────── Dialog ───────────────────────── */

const CONTAINER_TYPES: { key: 'f20' | 'f40' | 'e20' | 'e40'; label: string }[] = [
  { key: 'f20', label: 'F20' },
  { key: 'f40', label: 'F40' },
  { key: 'e20', label: 'E20' },
  { key: 'e40', label: 'E40' },
]

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

  const fareValueOf = (k: 'f20' | 'f40' | 'e20' | 'e40') =>
    k === 'f20' ? form.f20Price : k === 'f40' ? form.f40Price : k === 'e20' ? form.e20Price : form.e40Price
  const setFareValue = (k: 'f20' | 'f40' | 'e20' | 'e40', v: string) =>
    updateField(
      k === 'f20' ? 'f20Price' : k === 'f40' ? 'f40Price' : k === 'e20' ? 'e20Price' : 'e40Price',
      v,
    )
  const salaryValueOf = (k: 'f20' | 'f40' | 'e20' | 'e40') =>
    k === 'f20'
      ? form.f20DriverSalary
      : k === 'f40'
      ? form.f40DriverSalary
      : k === 'e20'
      ? form.e20DriverSalary
      : form.e40DriverSalary
  const setSalaryValue = (k: 'f20' | 'f40' | 'e20' | 'e40', v: string) =>
    updateField(
      k === 'f20'
        ? 'f20DriverSalary'
        : k === 'f40'
        ? 'f40DriverSalary'
        : k === 'e20'
        ? 'e20DriverSalary'
        : 'e40DriverSalary',
      v,
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0">
        {/* ── Header ─────────────────────────────────────────── */}
        <DialogHeader
          className="px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <DialogTitle>
            {editingId ? 'Sửa cước tuyến' : 'Thêm cước tuyến'}
          </DialogTitle>
          <p className="text-[12.5px] mt-1" style={{ color: 'var(--ink-3)' }}>
            Cấu hình giá cước và lương sản lượng theo từng tuyến vận chuyển.
          </p>
        </DialogHeader>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-6 overflow-y-auto">
          {/* Section 1: Route info — 2 columns */}
          <section>
            <SectionHeader icon={Route} title="Thông tin tuyến" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="space-y-1.5">
                <FieldLabel>Chủ hàng</FieldLabel>
                <InlineSelect
                  placeholder="Chọn chủ hàng"
                  value={form.clientId ? form.clientId.toString() : ''}
                  options={clientOptions}
                  onChange={(v) => updateField('clientId', Number(v))}
                />
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Loại tác nghiệp</FieldLabel>
                <InlineSelect
                  placeholder="Chọn loại tác nghiệp"
                  value={form.workType}
                  options={workTypeOptions}
                  onChange={(v) => updateField('workType', v as WorkType)}
                />
              </div>

              <div className="space-y-1.5">
                <FieldLabel>
                  <span className="inline-flex items-center gap-1">
                    Điểm đi
                    <ArrowRight
                      className="h-3 w-3"
                      style={{ color: 'var(--ink-3)' }}
                    />
                  </span>
                </FieldLabel>
                <InlineSelect
                  placeholder="Chọn điểm đi"
                  value={form.pickupLocationId ? form.pickupLocationId.toString() : ''}
                  options={locationOptions}
                  onChange={(v) => updateField('pickupLocationId', Number(v))}
                />
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Điểm đến</FieldLabel>
                <InlineSelect
                  placeholder="Chọn điểm đến"
                  value={form.dropoffLocationId ? form.dropoffLocationId.toString() : ''}
                  options={locationOptions}
                  onChange={(v) => updateField('dropoffLocationId', Number(v))}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Pricing matrix */}
          <section
            className="rounded-xl p-4"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
            }}
          >
            <SectionHeader icon={Banknote} title="Cước vận chuyển" hint="Đơn giá theo loại cont" />

            {/* Column headers */}
            <div className="grid grid-cols-[80px_repeat(4,minmax(0,1fr))] gap-2 mb-2">
              <div />
              {CONTAINER_TYPES.map((c) => (
                <div
                  key={c.key}
                  className="text-center text-[11px] font-semibold tracking-wider"
                  style={{ color: 'var(--ink-3)' }}
                >
                  {c.label}
                </div>
              ))}
            </div>

            {/* Row: Cước */}
            <div className="grid grid-cols-[80px_repeat(4,minmax(0,1fr))] gap-2 items-center">
              <div
                className="text-[12px] font-medium flex items-center gap-1.5"
                style={{ color: 'var(--ink-2)' }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
                Cước
              </div>
              {CONTAINER_TYPES.map((c) => (
                <MoneyInput
                  key={c.key}
                  value={fareValueOf(c.key)}
                  onChange={(v) => setFareValue(c.key, v)}
                  ariaLabel={`Cước ${c.label}`}
                />
              ))}
            </div>

            {/* Divider */}
            <div className="my-3" style={{ borderTop: '1px dashed var(--line-2)' }} />

            {/* Row: Lương sản lượng */}
            <div className="grid grid-cols-[80px_repeat(4,minmax(0,1fr))] gap-2 items-center">
              <div
                className="text-[12px] font-medium flex items-center gap-1.5"
                style={{ color: 'var(--ink-2)' }}
              >
                <Wallet className="h-3 w-3" style={{ color: 'var(--accent)' }} />
                Lương SL
              </div>
              {CONTAINER_TYPES.map((c) => (
                <MoneyInput
                  key={c.key}
                  value={salaryValueOf(c.key)}
                  onChange={(v) => setSalaryValue(c.key, v)}
                  ariaLabel={`Lương sản lượng ${c.label}`}
                />
              ))}
            </div>

            <p
              className="text-[11px] mt-3"
              style={{ color: 'var(--ink-3)' }}
            >
              Lương sản lượng là khoản chi trả cho tài xế tính trên mỗi container vận chuyển.
            </p>
          </section>
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <DialogFooter
          className="px-6 py-4 mt-0"
          style={{ borderTop: '1px solid var(--line)', background: 'var(--theme-bg-primary)' }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="min-w-[96px]"
          >
            Huỷ
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Đang lưu…' : editingId ? 'Cập nhật' : 'Thêm cước tuyến'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
