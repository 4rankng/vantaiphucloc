import { useState, useRef, useEffect } from 'react'
import { Check, X, Pencil } from 'lucide-react'

export interface EditableLocationNameProps {
  name: string
  onSave: (newName: string) => void
  saving: boolean
}

export function EditableLocationName({ name, onSave, saving }: EditableLocationNameProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
 setValue(name); setEditing(false) }, [name])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = () => {
    const v = value.trim()
    if (!v || v === name) { setEditing(false); setValue(name); return }
    onSave(v)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit() }
            if (e.key === 'Escape') { setEditing(false); setValue(name) }
          }}
          className="nepo-input"
          style={{ fontSize: 20, fontWeight: 600, flex: 1, maxWidth: 360 }}
        />
        <button
          type="button"
          onClick={commit}
          disabled={saving}
          className="flex items-center justify-center rounded"
          style={{ width: 28, height: 28, background: 'var(--success)', color: '#fff' }}
          title="Lưu (Enter)"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setValue(name) }}
          className="flex items-center justify-center rounded"
          style={{ width: 28, height: 28, background: 'var(--surface-3)', color: 'var(--ink-2)' }}
          title="Huỷ (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group">
      <h2
        className="m-0"
        style={{
          fontFamily: 'var(--theme-font-display)',
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
        }}
      >
        {name}
      </h2>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: 26, height: 26, color: 'var(--ink-3)' }}
        title="Sửa tên"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
