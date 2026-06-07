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
import { useIsMobile } from '@/hooks/use-mobile'
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
    <div className="flex items-center gap-1.5 mb-2">
      <div
        className="flex h-5 w-5 items-center justify-center rounded"
        style={{
          background: 'var(--surface-3)',
          color: 'var(--accent)',
        }}
      >
        <Icon className="h-3 w-3" />
      </div>
      <h3
        className="text-[11px] font-semibold uppercase tracking-[0.05em]"
        style={{ color: 'var(--ink-2)' }}
      >
        {title}
      </h3>
      {hint && (
        <span
          className="text-[10px] font-normal normal-case tracking-normal ml-auto"
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
      className="text-[10px] font-medium"
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
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium"
        style={{ color: 'var(--ink-3)' }}
      >
        ₫
      </span>
    </div>
  )
}

/** Full-width price row: "Cước F20" label + input — used on mobile */
function StackedPriceRow({ label, tone, value, onChange, ariaLabel }: {
  label: string
  tone: 'fare' | 'salary'
  value: string
  onChange: (v: string) => void
  ariaLabel: string
}) {
  const dotColor = tone === 'fare' ? 'var(--theme-status-info)' : 'var(--theme-status-warning)'
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />
        <span className="text-[10px] font-medium" style={{ color: 'var(--ink-2)' }}>{label}</span>
      </div>
      <MoneyInput value={value} onChange={onChange} ariaLabel={ariaLabel} />
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
  const isMobile = useIsMobile(768)

  const updateField = useCallback(
    <K extends keyof RoutePricingFormData>(key: K, value: RoutePricingFormData[K]) => {
      onFormChange({ ...form, [key]: value })
    },
    [form, onFormChange],
  )

  const clientOptions = useMemo(
    () => clients.map((c) => ({ value: c.id.toString(), label: c.name })),
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
      <DialogContent
        className={`sm:max-w-3xl p-0 gap-0 ${isMobile ? 'flex flex-col' : ''}`}
        {...(isMobile ? { 'data-mobile-fullscreen': '' } : {})}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <DialogHeader
          className={`pt-5 pb-3 ${isMobile ? 'px-4' : 'px-6'}`}
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <DialogTitle>
            {editingId ? 'Sửa cước tuyến' : 'Thêm cước tuyến'}
          </DialogTitle>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
            Cấu hình giá cước và lương sản lượng theo từng tuyến vận chuyển.
          </p>
        </DialogHeader>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className={`py-4 space-y-5 overflow-y-auto ${isMobile ? 'px-4 flex-1' : 'px-6'}`}>
          {/* Section 1: Route info */}
          <section>
            <SectionHeader icon={Route} title="Thông tin tuyến" />
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <div className="space-y-1">
                <FieldLabel>Chủ hàng</FieldLabel>
                <InlineSelect
                  placeholder="Chọn chủ hàng"
                  value={form.clientId ? form.clientId.toString() : ''}
                  options={clientOptions}
                  onChange={(v) => updateField('clientId', Number(v))}
                />
              </div>

              <div className="space-y-1">
                <FieldLabel>Loại tác nghiệp</FieldLabel>
                <InlineSelect
                  placeholder="Chọn loại tác nghiệp"
                  value={form.workType}
                  options={workTypeOptions}
                  onChange={(v) => updateField('workType', v as WorkType)}
                />
              </div>

              <div className="space-y-1">
                <FieldLabel>
                  <span className="inline-flex items-center gap-1">
                    Điểm đi
                    <ArrowRight className="h-3 w-3" style={{ color: 'var(--ink-3)' }} />
                  </span>
                </FieldLabel>
                <InlineSelect
                  placeholder="Chọn điểm đi"
                  value={form.pickupLocationId ? form.pickupLocationId.toString() : ''}
                  options={locationOptions}
                  onChange={(v) => updateField('pickupLocationId', Number(v))}
                />
              </div>

              <div className="space-y-1">
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
            className={`rounded-lg p-3 ${isMobile ? '' : ''}`}
            style={{
              background: 'var(--surface-2)',
              ...(isMobile ? {} : { border: '1px solid var(--line)' }),
            }}
          >
            <SectionHeader icon={Banknote} title="Cước vận chuyển" hint={isMobile ? undefined : 'Đơn giá theo loại cont'} />

            {isMobile ? (
              /* ── Mobile: 2-column compact grid ── */
              <div className="space-y-3">
                {/* Fares */}
                <div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {CONTAINER_TYPES.map((c) => (
                      <StackedPriceRow
                        key={c.key}
                        label={c.label}
                        tone="fare"
                        value={fareValueOf(c.key)}
                        onChange={(v) => setFareValue(c.key, v)}
                        ariaLabel={`Cước ${c.label}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Salaries */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Wallet className="h-2.5 w-2.5" style={{ color: 'var(--accent)' }} />
                    <span className="type-overline" style={{ color: 'var(--theme-status-warning)' }}>
                      Lương sản lượng
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {CONTAINER_TYPES.map((c) => (
                      <StackedPriceRow
                        key={c.key}
                        label={c.label}
                        tone="salary"
                        value={salaryValueOf(c.key)}
                        onChange={(v) => setSalaryValue(c.key, v)}
                        ariaLabel={`Lương sản lượng ${c.label}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ── Desktop: 4-column grid ── */
              <>
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
              </>
            )}

            <p
              className="text-[10px] mt-2"
              style={{ color: 'var(--ink-3)' }}
            >
              Lương sản lượng là khoản chi trả cho tài xế tính trên mỗi container vận chuyển.
            </p>
          </section>
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <DialogFooter
          className={`py-3 mt-0 ${isMobile ? 'px-4' : 'px-6'}`}
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
