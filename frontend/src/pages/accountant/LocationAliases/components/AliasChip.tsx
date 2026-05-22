import { ArrowUp, X } from 'lucide-react'
import type { LocationAlias } from '@/data/domain'

export function AliasChip({
  alias, onPromote, onDelete, disabled,
}: {
  alias: LocationAlias
  onPromote: () => void
  onDelete: () => void
  disabled?: boolean
}) {
  return (
    <span
      className="group inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-[12px]"
      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
    >
      <span className="font-medium">{alias.alias}</span>
      {alias.source && alias.source !== 'manual' && (
        <span
          className="text-[9px] uppercase tracking-wide px-1 py-px rounded"
          style={{ background: 'var(--surface)', color: 'var(--ink-3)' }}
        >
          {alias.source}
        </span>
      )}
      <button
        type="button"
        onClick={onPromote}
        disabled={disabled}
        className="flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: 18, height: 18, color: 'var(--accent)' }}
        title="Đặt làm tên chính"
      >
        <ArrowUp className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: 18, height: 18, color: 'var(--accent)' }}
        title="Xoá tên phụ"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
