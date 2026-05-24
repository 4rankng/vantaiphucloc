import { ArrowUp, X } from 'lucide-react'
import type { LocationAlias } from '@/data/domain'

export interface AliasChipProps {
  alias: LocationAlias
  onPromote: () => void
  onDelete: () => void
  disabled?: boolean
}

export function AliasChip({ alias, onPromote, onDelete, disabled }: AliasChipProps) {
  return (
    <span
      className="group inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-[12px] transition-colors"
      style={{
        background: 'var(--accent-soft)',
        color: 'var(--accent)',
        border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
      }}
    >
      <span className="font-medium leading-none">{alias.alias}</span>
      {alias.source && alias.source !== 'manual' && (
        <span
          className="text-[9px] uppercase tracking-wide px-1 py-px rounded"
          style={{ background: 'var(--surface)', color: 'var(--ink-3)' }}
        >
          {alias.source}
        </span>
      )}
      <span className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
        <button
          type="button"
          onClick={onPromote}
          disabled={disabled}
          className="flex items-center justify-center rounded-full"
          style={{ width: 18, height: 18, color: 'var(--accent)' }}
          title="Đặt làm tên chính"
        >
          <ArrowUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center justify-center rounded-full"
          style={{ width: 18, height: 18, color: 'var(--accent)' }}
          title="Xoá tên phụ"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    </span>
  )
}
