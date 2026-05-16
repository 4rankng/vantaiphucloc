import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Check, X, Pencil } from 'lucide-react'

interface InlineEditableProps {
  display: ReactNode
  value: string
  onSave: (value: string) => void | Promise<void>
  inputType?: 'text' | 'number'
  placeholder?: string
  className?: string
  editLabel?: string
}

export function InlineEditable({
  display,
  value,
  onSave,
  inputType = 'text',
  placeholder = '',
  className = '',
  editLabel,
}: InlineEditableProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  useEffect(() => {
    setDraft(value)
  }, [value])

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setDraft(value); setEditing(false) }
  }

  if (editing) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <input
          ref={inputRef}
          type={inputType}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={saving}
          className="flex-1 min-w-0 rounded-md border px-2 py-1 text-sm outline-none"
          style={{
            background: 'var(--theme-bg-primary)',
            borderColor: 'var(--theme-brand-primary)',
            color: 'var(--theme-text-primary)',
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{ background: 'var(--theme-status-success)', color: '#fff' }}
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={() => { setDraft(value); setEditing(false) }}
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors text-left ${className}`}
      style={{ background: 'transparent' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      title={editLabel ?? 'Nhấn để sửa'}
    >
      {display}
      <span
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--theme-text-muted)' }}
      >
        <Pencil className="h-3 w-3" />
      </span>
    </button>
  )
}
