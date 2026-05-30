import { useState } from 'react'
import { CheckCircle2, ArrowLeftRight, Pencil, Link2 } from 'lucide-react'
import { InlineSelect } from '@/components/shared/forms/InlineSelect'
import type { InlineSelectOption } from '@/components/shared/forms/InlineSelect'

interface EditConfig {
  options: InlineSelectOption[]
  onChange: (value: string) => void
  placeholder: string
}

export function CompareRow({ label, left, right, leftLabel, rightLabel, matched, onTapLeft, onTapRight, editLeft, editRight, onConfirmSame, confirmSameLoading }: {
  label: string; left: string; right: string; matched?: boolean
  leftLabel?: string; rightLabel?: string
  onTapLeft?: () => void; onTapRight?: () => void
  editLeft?: EditConfig
  editRight?: EditConfig
  onConfirmSame?: () => void
  confirmSameLoading?: boolean
}) {
  const [editingSide, setEditingSide] = useState<'left' | 'right' | null>(null)

  const renderCell = (side: 'left' | 'right', value: string, sideLabel?: string, onTap?: () => void, edit?: EditConfig) => {
    const isEditing = editingSide === side && edit

    if (isEditing && edit) {
      return (
        <div className="min-w-0 rounded-lg px-2 py-1.5 -mx-2" style={{ background: 'var(--theme-bg-tertiary)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: side === 'left' ? 'var(--theme-status-warning)' : 'var(--theme-brand-primary)' }}>{sideLabel ?? (side === 'left' ? 'Yêu cầu' : 'Đã chạy')}</p>
          <InlineSelect
            placeholder={edit.placeholder}
            value={value}
            options={edit.options}
            onChange={v => { edit.onChange(v); setEditingSide(null) }}
          />
        </div>
      )
    }

    return (
      <button
        onClick={() => edit ? setEditingSide(side) : onTap?.()}
        className="min-w-0 text-left rounded-lg px-2 py-1.5 -mx-2 transition-colors touch-manipulation active:opacity-70 group"
        style={{ background: 'transparent' }}
      >
        <p className="text-xs font-medium" style={{ color: side === 'left' ? 'var(--theme-status-warning)' : 'var(--theme-brand-primary)' }}>{sideLabel ?? (side === 'left' ? 'Yêu cầu' : 'Đã chạy')}</p>
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{value || '-'}</p>
          {edit && <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: 'var(--theme-text-muted)' }} />}
        </div>
      </button>
    )
  }

  const showConfirmSame = !matched && left && right && onConfirmSame

  return (
    <div className="rounded-xl p-3" style={{
      background: matched ? 'var(--theme-status-success-light)' : 'var(--theme-bg-secondary)',
      border: matched ? '1px solid var(--theme-status-success)' : '1px solid var(--theme-border-default)',
    }}>
      <div className="flex items-center gap-1.5 mb-2">
        {matched && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-success)' }} />}
        <p className="text-xs font-bold uppercase tracking-wide" style={{
          color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)',
        }}>{label}</p>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        {renderCell('left', left, leftLabel, onTapLeft, editLeft)}
        <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" style={{ color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)' }} />
        {renderCell('right', right, rightLabel, onTapRight, editRight)}
      </div>
      {showConfirmSame && (
        <button
          onClick={onConfirmSame}
          disabled={confirmSameLoading}
          className="mt-2 flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg transition-colors active:opacity-70 touch-manipulation"
          style={{ color: 'var(--theme-brand-primary)', background: 'var(--theme-brand-primary-light, rgba(59,130,246,0.08))' }}
        >
          <Link2 className="w-3 h-3" />
          {confirmSameLoading ? 'Đang xác nhận...' : 'Cùng địa điểm'}
        </button>
      )}
    </div>
  )
}
