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

function clientInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0][0].toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

function clientAvatarColor(id: number): string {
  const hues = [210, 160, 30, 340, 270, 190, 45, 300, 120, 15]
  const hue = hues[id % hues.length]
  return `hsl(${hue}, 55%, 88%)`
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
          className="inline-flex items-center justify-center h-7 w-7 rounded-full text-[10.5px] font-bold shrink-0"
          style={{ background: clientAvatarColor(group.clientId), color: 'var(--theme-text-primary)' }}
        >
          {clientInitials(group.clientName)}
        </span>
        <span className="text-sm font-bold truncate flex-1 text-left" style={{ color: 'var(--theme-text-primary)' }}>
          {label}
        </span>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--theme-text-primary) 7%, transparent)',
            color: 'var(--theme-text-muted)',
          }}
        >
          {group.routeCount} tuyến
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
