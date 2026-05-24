import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { HighlightText } from '@/components/shared/HighlightText'
import type { Location } from '@/data/domain'

export interface LocationListItemProps {
  location: Location
  aliasCount: number
  isSelected: boolean
  isDuplicateCandidate: boolean
  onClick: () => void
  query?: string
  'data-loc-id'?: number
}

export function LocationListItem({
  location, aliasCount, isSelected, isDuplicateCandidate, onClick, query, 'data-loc-id': dataLocId,
}: LocationListItemProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      data-loc-id={dataLocId}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left flex items-center justify-between gap-2 px-3.5 py-2.5 transition-colors"
      style={{
        borderLeft: '3px solid',
        borderLeftColor: isSelected ? 'var(--accent)' : 'transparent',
        background: isSelected
          ? 'var(--surface)'
          : hovered
          ? 'color-mix(in srgb, var(--accent) 4%, var(--surface-2))'
          : 'transparent',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="text-[13px] font-medium truncate"
          style={{ color: isSelected ? 'var(--ink)' : hovered ? 'var(--ink)' : 'var(--ink-2)' }}
        >
          <HighlightText text={location.name} query={query ?? ''} />
        </span>
        {isDuplicateCandidate && (
          <AlertTriangle
            className="h-3 w-3 shrink-0"
            style={{ color: 'var(--warning)' }}
            aria-label="Có thể trùng với địa điểm khác"
          />
        )}
      </div>
      {aliasCount > 0 && (
        <span
          className="text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded shrink-0"
          title={`${aliasCount} tên phụ`}
          style={{
            background: isSelected ? 'var(--accent-soft)' : 'var(--surface-3)',
            color: isSelected ? 'var(--accent)' : 'var(--ink-3)',
          }}
        >
          {aliasCount}
        </span>
      )}
    </button>
  )
}
