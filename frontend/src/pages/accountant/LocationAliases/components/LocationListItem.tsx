import { AlertTriangle } from 'lucide-react'
import type { Location } from '@/data/domain'

export function LocationListItem({
  location, aliasCount, isSelected, isDuplicateCandidate, onClick,
}: {
  location: Location
  aliasCount: number
  isSelected: boolean
  isDuplicateCandidate: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center justify-between gap-2 px-3.5 py-2.5 transition-colors"
      style={{
        borderLeft: '3px solid',
        borderLeftColor: isSelected ? 'var(--accent)' : 'transparent',
        background: isSelected ? 'var(--surface)' : 'transparent',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="text-[13px] font-medium truncate"
          style={{ color: isSelected ? 'var(--ink)' : 'var(--ink-2)' }}
        >
          {location.name}
        </span>
        {isDuplicateCandidate && (
          <AlertTriangle
            className="h-3 w-3 shrink-0"
            style={{ color: 'var(--warning)' }}
            aria-label="Có thể trùng với địa điểm khác"
          />
        )}
      </div>
      <span
        className="text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded shrink-0"
        title={`${aliasCount} tên phụ`}
        style={
          aliasCount > 0
            ? {
                background: isSelected ? 'var(--accent-soft)' : 'var(--surface-3)',
                color: isSelected ? 'var(--accent)' : 'var(--ink-3)',
              }
            : {
                background: 'transparent',
                color: 'var(--ink-4)',
              }
        }
      >
        {aliasCount}
      </span>
    </button>
  )
}
