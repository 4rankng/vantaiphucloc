import { useState, useRef, useEffect } from 'react'
import { Plus, Check, X } from 'lucide-react'

export interface NewLocationInputProps {
  onCreate: (name: string) => void
  onCancel: () => void
  saving: boolean
}

export function NewLocationInput({ onCreate, onCancel, saving }: NewLocationInputProps) {
  const [name, setName] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const submit = () => {
    if (!name.trim()) { onCancel(); return }
    onCreate(name.trim())
  }

  return (
    <div
      className="flex items-center gap-1 px-3 py-2"
      style={{ borderBottom: '1px solid var(--line)', background: 'var(--accent-soft)' }}
    >
      <input
        ref={ref}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); submit() }
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Tên địa điểm mới…"
        className="nepo-input text-[13px] flex-1"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!name.trim() || saving}
        className="flex items-center justify-center rounded"
        style={{ width: 26, height: 26, background: 'var(--success)', color: '#fff', opacity: !name.trim() ? 0.5 : 1 }}
        title="Tạo (Enter)"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center justify-center rounded"
        style={{ width: 26, height: 26, background: 'var(--surface-3)', color: 'var(--ink-2)' }}
        title="Huỷ (Esc)"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
