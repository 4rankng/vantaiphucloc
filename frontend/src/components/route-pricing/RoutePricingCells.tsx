import { formatCurrency, WORK_TYPE_LABELS } from '@/data/domain'
import type { WorkType } from '@/data/domain'

export type { PriceField } from './RoutePricingTable.constants'

export function OpBadge({ type }: { type: string }) {
  const label = WORK_TYPE_LABELS[type as WorkType] ?? type
  return (
    <span className="text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>
      {label}
    </span>
  )
}

export function PriceCell({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <span className="font-mono-num text-xs" style={{ color: 'var(--theme-text-muted)', letterSpacing: '0.05em' }}>
        —
      </span>
    )
  }
  return (
    <span className="font-mono-num text-xs tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
      {formatCurrency(value)}
    </span>
  )
}
