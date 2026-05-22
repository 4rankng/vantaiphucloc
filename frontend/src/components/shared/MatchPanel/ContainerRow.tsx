import { useState } from 'react'
import { CheckCircle2, Pencil } from 'lucide-react'
import { ContBadge } from '@/components/shared/ContBadge'

export function ContainerRow({
  workType, containerNumber, matched, onEditType, onEditNumber,
}: {
  workType: string
  containerNumber: string
  matched: boolean
  onEditType: (v: string) => void
  onEditNumber: (v: string) => void
}) {
  const [editingType, setEditingType] = useState(false)
  const [editingNumber, setEditingNumber] = useState(false)
  const [draftType, setDraftType] = useState(workType)
  const [draftNumber, setDraftNumber] = useState(containerNumber)

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
      style={{
        background: matched ? 'color-mix(in srgb, var(--theme-status-success) 8%, transparent)' : 'var(--theme-bg-secondary)',
        border: `1px solid ${matched ? 'var(--theme-status-success)' : 'var(--theme-border-default)'}`,
      }}
    >
      {editingType ? (
        <input
          autoFocus
          value={draftType}
          onChange={e => setDraftType(e.target.value.toUpperCase())}
          onBlur={() => { onEditType(draftType); setEditingType(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { onEditType(draftType); setEditingType(false) } if (e.key === 'Escape') setEditingType(false) }}
          className="w-14 px-1.5 py-0.5 rounded text-xs font-bold text-center border"
          style={{ borderColor: 'var(--theme-brand-primary)', background: 'var(--theme-bg-primary)', color: 'var(--theme-brand-primary)' }}
        />
      ) : (
        <button onClick={() => { setDraftType(workType); setEditingType(true) }} className="shrink-0">
          <ContBadge type={workType} />
        </button>
      )}

      <div className="flex-1 min-w-0">
        {editingNumber ? (
          <input
            autoFocus
            value={draftNumber}
            onChange={e => setDraftNumber(e.target.value.toUpperCase())}
            onBlur={() => { onEditNumber(draftNumber); setEditingNumber(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { onEditNumber(draftNumber); setEditingNumber(false) } if (e.key === 'Escape') setEditingNumber(false) }}
            className="w-full px-2 py-1 rounded text-sm font-mono border"
            style={{ borderColor: 'var(--theme-brand-primary)', background: 'var(--theme-bg-primary)', color: 'var(--theme-text-primary)' }}
          />
        ) : (
          <button
            onClick={() => { setDraftNumber(containerNumber); setEditingNumber(true) }}
            className="flex items-center gap-1.5 group/num"
          >
            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {containerNumber}
            </span>
            <Pencil className="w-3 h-3 opacity-0 group-hover/num:opacity-50 transition-opacity" style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        )}
      </div>

      <div className="shrink-0 w-5 h-5 flex items-center justify-center">
        {matched ? (
          <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--theme-status-success)' }} />
        ) : (
          <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: 'var(--theme-border-default)' }} />
        )}
      </div>
    </div>
  )
}
