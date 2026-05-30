import { useState, useRef, useEffect } from 'react'

interface InlineCellProps {
  value: string
  onSave: (v: string) => void
  placeholder?: string
  type?: 'text' | 'tel'
}

export function InlineCell({ value, onSave, placeholder, type }: InlineCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) { ref.current?.focus(); ref.current?.select() } }, [editing])
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
 setDraft(value) }, [value])

  const save = () => {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
        placeholder={placeholder}
        type={type}
        className="w-full border-none bg-transparent text-sm font-medium outline-none p-0"
        style={{ color: 'var(--theme-text-primary)' }}
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full text-left text-sm font-medium rounded px-1 -mx-1 py-0.5 transition-colors"
      style={{ color: value ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)', background: 'transparent' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      {value || placeholder || '—'}
    </button>
  )
}
