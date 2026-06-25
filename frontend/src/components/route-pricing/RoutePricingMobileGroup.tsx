import { ChevronRight } from 'lucide-react'
import { RoutePricingMobileCard } from './RoutePricingMobileCard'
import type { ClientGroup } from './RoutePricingTable.types'
import type { RoutePricing } from '@/data/domain'

export interface RoutePricingMobileGroupProps {
  group: ClientGroup
  isExpanded: boolean
  onToggle: () => void
  rowOffset: number
  onDelete: (id: number) => void
  onEditOpenDialog: (rp: RoutePricing) => void
}

function clientAvatarColor(id: number): string {
  const colors = [
    'color-mix(in srgb, var(--theme-brand-primary) 16%, var(--theme-bg-secondary))',
    'color-mix(in srgb, var(--theme-status-info) 15%, var(--theme-bg-secondary))',
    'color-mix(in srgb, var(--theme-status-warning) 16%, var(--theme-bg-secondary))',
    'color-mix(in srgb, var(--theme-express-color) 14%, var(--theme-bg-secondary))',
    'color-mix(in srgb, var(--theme-status-success) 14%, var(--theme-bg-secondary))',
  ]
  return colors[id % colors.length]
}

export function RoutePricingMobileGroup({
  group,
  isExpanded,
  onToggle,
  rowOffset,
  onDelete,
  onEditOpenDialog,
}: RoutePricingMobileGroupProps) {
  const label = group.clientCode ? `${group.clientCode} – ${group.clientName}` : group.clientName

  return (
    <div className="space-y-2.5">
      {/* Group header — clickable to expand/collapse */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors active:scale-[0.99] touch-manipulation"
        style={{
          background: isExpanded ? 'var(--theme-bg-tertiary)' : 'var(--theme-bg-secondary, #ffffff)',
          borderColor: 'var(--theme-border-default, #e4e4e7)',
        }}
      >
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
          style={{
            color: 'var(--theme-text-muted)',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums"
          style={{ background: clientAvatarColor(group.clientId), color: 'var(--theme-text-primary)' }}
          title={`${group.routeCount} tuyến`}
        >
          {group.routeCount}
        </span>
        <span className="text-sm font-bold truncate flex-1 text-left" style={{ color: 'var(--theme-text-primary)' }}>
          {label}
        </span>
      </button>

      {/* Routes stack */}
      {isExpanded && (
        <div className="flex flex-col gap-2.5">
          {group.routes.map((rp, idx) => (
            <RoutePricingMobileCard
              key={rp.id}
              rp={rp}
              idx={rowOffset + idx}
              onEdit={() => onEditOpenDialog(rp)}
              onDelete={() => onDelete(rp.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
