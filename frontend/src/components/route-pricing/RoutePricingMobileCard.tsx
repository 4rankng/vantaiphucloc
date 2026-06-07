import { ArrowRight, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency, WORK_TYPE_LABELS } from '@/data/domain'
import type { RoutePricing, WorkType } from '@/data/domain'

export interface RoutePricingMobileCardProps {
  rp: RoutePricing
  idx: number
  onEdit: () => void
  onDelete: () => void
}

const monoStyle: React.CSSProperties = { fontFamily: 'var(--theme-font-mono)' }

type PriceField = 'f20' | 'f40' | 'e20' | 'e40'

function getFare(rp: RoutePricing, field: PriceField): number | null {
  switch (field) {
    case 'f20': return rp.f20Price
    case 'f40': return rp.f40Price
    case 'e20': return rp.e20Price
    case 'e40': return rp.e40Price
  }
}

function getSalary(rp: RoutePricing, field: PriceField): number | null {
  switch (field) {
    case 'f20': return rp.f20DriverSalary
    case 'f40': return rp.f40DriverSalary
    case 'e20': return rp.e20DriverSalary
    case 'e40': return rp.e40DriverSalary
  }
}

const FIELDS: { key: PriceField; label: string }[] = [
  { key: 'f20', label: 'F20' },
  { key: 'f40', label: 'F40' },
  { key: 'e20', label: 'E20' },
  { key: 'e40', label: 'E40' },
]

export function RoutePricingMobileCard({ rp, idx, onEdit, onDelete }: RoutePricingMobileCardProps) {
  const workTypeLabel = WORK_TYPE_LABELS[rp.workType as WorkType] ?? rp.workType

  const hasAnyFare = FIELDS.some(f => getFare(rp, f.key) != null)
  const hasAnySalary = FIELDS.some(f => getSalary(rp, f.key) != null)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit() }
      }}
      aria-label={`Chỉnh sửa tuyến ${rp.pickupLocation.name} → ${rp.dropoffLocation.name}`}
      className="rounded-xl border p-3 transition-colors active:scale-[0.99] touch-manipulation cursor-pointer"
      style={{
        background: 'var(--theme-bg-secondary, #ffffff)',
        borderColor: 'var(--theme-border-default, #e4e4e7)',
      }}
    >
      {/* Header: route + work type + actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[13px] font-bold leading-tight" style={{ color: 'var(--ink)' }}>
            <span className="truncate">{rp.pickupLocation.name}</span>
            <ArrowRight className="h-3 w-3 shrink-0" style={{ color: 'var(--ink-3)' }} />
            <span className="truncate">{rp.dropoffLocation.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10.5px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
              {workTypeLabel}
            </span>
            <span className="font-mono text-[10.5px] tabular-nums" style={{ color: 'var(--ink-4)' }}>
              #{idx + 1}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Chỉnh sửa"
            className="min-h-[44px] min-w-[44px] w-8 h-8 flex items-center justify-center rounded-lg border touch-target"
            style={{ borderColor: 'var(--theme-border-default)', color: 'var(--ink-3)' }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Xoá tuyến"
            className="min-h-[44px] min-w-[44px] w-8 h-8 flex items-center justify-center rounded-lg border touch-target"
            style={{ borderColor: 'var(--theme-border-default)', color: 'var(--theme-status-error, var(--status-error, #e53e3e))' }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Price table — full width rows with Cước | Lương */}
      {(hasAnyFare || hasAnySalary) && (
        <div style={{ borderTop: '1px solid var(--line)' }} className="pt-2">
          {/* Column headers */}
          <div className="grid grid-cols-[40px_1fr_1fr] gap-x-2 mb-1">
            <span />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-center" style={{ color: 'var(--theme-status-info)' }}>Cước</span>
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-center" style={{ color: 'var(--theme-status-warning)' }}>Lương</span>
          </div>
          {FIELDS.map(({ key, label }) => {
            const fare = getFare(rp, key)
            const salary = getSalary(rp, key)
            const hasData = fare != null || salary != null
            if (!hasData) return null
            return (
              <div
                key={key}
                className="grid grid-cols-[40px_1fr_1fr] gap-x-2 items-center py-1"
              >
                <span className="text-[11px] font-semibold" style={{ color: 'var(--ink-3)' }}>{label}</span>
                <span
                  className="text-[12px] font-bold tabular-nums text-center"
                  style={{ ...monoStyle, color: fare != null ? 'var(--ink)' : 'var(--ink-4, #a1a1aa)' }}
                >
                  {fare != null ? formatCurrency(fare) : '—'}
                </span>
                <span
                  className="text-[12px] font-bold tabular-nums text-center"
                  style={{ ...monoStyle, color: salary != null ? 'var(--ink)' : 'var(--ink-4, #a1a1aa)' }}
                >
                  {salary != null ? formatCurrency(salary) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
