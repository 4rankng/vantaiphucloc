import { useState } from 'react'
import { Check, CheckCircle2, Pencil, X } from 'lucide-react'

export function InlineField({
  label, value, onChange, placeholder, matched,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  matched?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    onChange(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            className="flex-1 px-2 py-1 rounded text-sm border"
            style={{
              background: 'var(--theme-bg-primary)',
              borderColor: 'var(--theme-brand-primary)',
              color: 'var(--theme-text-primary)',
              outline: 'none',
            }}
          />
          <button onClick={commit} className="p-1 rounded" style={{ color: 'var(--theme-status-success)' }}>
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setEditing(false)} className="p-1 rounded" style={{ color: 'var(--theme-text-muted)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
      style={{
        background: matched ? 'color-mix(in srgb, var(--theme-status-success) 8%, transparent)' : 'transparent',
        border: `1px solid ${matched ? 'var(--theme-status-success)' : 'var(--theme-border-default)'}`,
      }}
    >
      <div className="flex-1 min-w-0 group/field">
        <span className="text-[10px] font-semibold uppercase tracking-wide block mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
        <button
          onClick={() => { setDraft(value); setEditing(true) }}
          className="flex items-center gap-1.5 text-left w-full"
        >
          <span className="text-sm font-medium" style={{ color: value ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>
            {value || placeholder || '—'}
          </span>
          <Pencil className="w-3 h-3 opacity-0 group-hover/field:opacity-60 transition-opacity shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
        </button>
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
