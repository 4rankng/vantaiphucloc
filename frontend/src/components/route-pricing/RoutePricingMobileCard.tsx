import { ArrowRight, MoreVertical } from 'lucide-react'
import { formatCurrency, WORK_TYPE_LABELS } from '@/data/domain'
import type { RoutePricing, WorkType } from '@/data/domain'

export interface RoutePricingMobileCardProps {
  rp: RoutePricing
  idx: number
  onEdit: () => void
  onDelete: () => void
}

interface PriceTile {
  field: 'f20' | 'f40' | 'e20' | 'e40'
  label: string
  value: number | null
  tone: 'fare' | 'salary'
}

const FARES: PriceTile[] = [
  { field: 'f20', label: 'F20', value: null, tone: 'fare' },
  { field: 'f40', label: 'F40', value: null, tone: 'fare' },
  { field: 'e20', label: 'E20', value: null, tone: 'fare' },
  { field: 'e40', label: 'E40', value: null, tone: 'fare' },
]

function getFare(rp: RoutePricing, field: PriceTile['field']): number | null {
  switch (field) {
    case 'f20': return rp.f20Price
    case 'f40': return rp.f40Price
    case 'e20': return rp.e20Price
    case 'e40': return rp.e40Price
  }
}

function getSalary(rp: RoutePricing, field: PriceTile['field']): number | null {
  switch (field) {
    case 'f20': return rp.f20DriverSalary
    case 'f40': return rp.f40DriverSalary
    case 'e20': return rp.e20DriverSalary
    case 'e40': return rp.e40DriverSalary
  }
}

export function RoutePricingMobileCard({ rp, idx, onEdit, onDelete }: RoutePricingMobileCardProps) {
  const workTypeLabel = WORK_TYPE_LABELS[rp.workType as WorkType] ?? rp.workType

  return (
    <div
      onClick={onEdit}
      className="rounded-xl border p-3 transition-colors active:scale-[0.99] touch-manipulation cursor-pointer"
      style={{
        background: 'var(--theme-bg-secondary, #ffffff)',
        borderColor: 'var(--theme-border-default, #e4e4e7)',
      }}
    >
      {/* Header: idx + route + work type + overflow */}
      <div className="flex items-start gap-2 mb-2.5">
        <span
          className="font-mono text-[10.5px] font-semibold shrink-0 mt-0.5 tabular-nums"
          style={{ color: 'var(--ink-3)' }}
        >
          #{idx + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[13px] font-bold leading-tight" style={{ color: 'var(--ink)' }}>
            <span className="truncate">{rp.pickupLocation.name}</span>
            <ArrowRight className="h-3 w-3 shrink-0" style={{ color: 'var(--ink-3)' }} />
            <span className="truncate">{rp.dropoffLocation.name}</span>
          </div>
          <div
            className="text-[10.5px] font-medium mt-0.5"
            style={{ color: 'var(--ink-3)' }}
          >
            {workTypeLabel}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="w-7 h-7 flex items-center justify-center rounded-md border shrink-0"
          style={{
            borderColor: 'var(--line)',
            color: 'var(--ink-3)',
          }}
          title="Xoá"
          aria-label="Xoá tuyến"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Fare section */}
      <div className="space-y-1.5">
        <div
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--ink-3)' }}
        >
          Cước chủ hàng
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {FARES.map((t) => {
            const v = getFare(rp, t.field)
            const hasValue = v != null
            return (
              <div
                key={t.field}
                className="rounded-md py-1.5 px-1 text-center"
                style={{
                  background: hasValue ? 'var(--theme-status-info-soft, rgba(59, 130, 246, 0.08))' : 'var(--surface-3)',
                  border: `1px solid ${hasValue ? 'color-mix(in srgb, var(--theme-status-info, #3b82f6) 25%, transparent)' : 'var(--line-2, transparent)'}`,
                }}
              >
                <div
                  className="text-[10px] font-bold mb-0.5"
                  style={{ color: hasValue ? 'var(--theme-status-info, #3b82f6)' : 'var(--ink-3)' }}
                >
                  {t.label}
                </div>
                <div
                  className="text-[11px] font-bold tabular-nums leading-tight"
                  style={{ color: hasValue ? 'var(--ink)' : 'var(--ink-4, #a1a1aa)' }}
                >
                  {hasValue ? formatCurrency(v!) : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Salary section */}
      <div className="space-y-1.5 mt-2.5">
        <div
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--ink-3)' }}
        >
          Lương tài xế
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {FARES.map((t) => {
            const v = getSalary(rp, t.field)
            const hasValue = v != null
            return (
              <div
                key={t.field}
                className="rounded-md py-1.5 px-1 text-center"
                style={{
                  background: hasValue ? 'var(--theme-status-warning-soft, rgba(245, 158, 11, 0.08))' : 'var(--surface-3)',
                  border: `1px solid ${hasValue ? 'color-mix(in srgb, var(--theme-status-warning, #f59e0b) 25%, transparent)' : 'var(--line-2, transparent)'}`,
                }}
              >
                <div
                  className="text-[10px] font-bold mb-0.5"
                  style={{ color: hasValue ? 'var(--theme-status-warning, #f59e0b)' : 'var(--ink-3)' }}
                >
                  {t.label}
                </div>
                <div
                  className="text-[11px] font-bold tabular-nums leading-tight"
                  style={{ color: hasValue ? 'var(--ink)' : 'var(--ink-4, #a1a1aa)' }}
                >
                  {hasValue ? formatCurrency(v!) : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
