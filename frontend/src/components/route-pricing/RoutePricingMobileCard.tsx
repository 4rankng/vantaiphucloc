import { ArrowRight, Trash2 } from 'lucide-react'
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

  return (
    <div
      role="group"
      aria-label={`Tuyến ${rp.pickupLocation.name} → ${rp.dropoffLocation.name}`}
      className="relative rounded-xl border p-3 transition-colors"
      style={{
        background: 'var(--theme-bg-secondary, #ffffff)',
        borderColor: 'var(--theme-border-default, #e4e4e7)',
      }}
    >
      {/* Stretched link — invisible button covering the card for "tap to edit" */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Chỉnh sửa tuyến ${rp.pickupLocation.name} → ${rp.dropoffLocation.name}`}
        className="absolute inset-0 z-0 rounded-xl cursor-pointer active:bg-black/[0.03] transition-colors"
        tabIndex={-1}
      />

      {/* Header: route + work type + delete action */}
      <div className="relative z-10 flex items-start justify-between gap-2 mb-2">
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

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          aria-label="Xoá tuyến"
          className="relative min-h-[44px] min-w-[44px] w-8 h-8 flex items-center justify-center rounded-lg border touch-target z-10"
          style={{ borderColor: 'var(--theme-border-default)', color: 'var(--theme-status-error, var(--status-error, #e53e3e))' }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Price table — full width rows with Cước | Lương */}
      <div className="relative z-10" style={{ borderTop: '1px solid var(--line)' }}>
        {/* Column headers */}
        <div className="grid grid-cols-[40px_1fr_1fr] gap-x-2 mb-1">
          <span />
          <span className="text-[11px] font-bold uppercase tracking-wider text-center" style={{ color: 'var(--theme-status-info)' }}>Cước</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-center" style={{ color: 'var(--theme-status-warning)' }}>Lương</span>
        </div>
        {FIELDS.map(({ key, label }) => {
          const fare = getFare(rp, key)
          const salary = getSalary(rp, key)
          if (fare == null && salary == null) return null
          return (
            <div
              key={key}
              className="grid grid-cols-[40px_1fr_1fr] gap-x-2 items-center py-1"
            >
              <span className="text-[11px] font-semibold" style={{ color: 'var(--ink-3)' }}>{label}</span>
              <span
                className="text-[13px] font-bold tabular-nums text-center overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ ...monoStyle, color: fare != null ? 'var(--ink)' : 'var(--ink-4, #a1a1aa)' }}
              >
                {fare != null ? formatCurrency(fare) : '—'}
              </span>
              <span
                className="text-[13px] font-bold tabular-nums text-center overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ ...monoStyle, color: salary != null ? 'var(--ink)' : 'var(--ink-4, #a1a1aa)' }}
              >
                {salary != null ? formatCurrency(salary) : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
