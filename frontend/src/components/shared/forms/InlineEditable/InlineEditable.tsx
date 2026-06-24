import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Check, X, Pencil } from 'lucide-react'

interface InlineEditableProps {
  display: ReactNode
  value: string
  onSave: (value: string) => void | Promise<void>
  inputType?: 'text' | 'number' | 'date'
  placeholder?: string
  className?: string
  editLabel?: string
  validate?: (value: string) => string | null | Promise<string | null>
}

export function InlineEditable({
  display,
  value,
  onSave,
  inputType = 'text',
  placeholder = '',
  className = '',
  editLabel,
  validate,
}: InlineEditableProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    if (draft === value) { setEditing(false); setError(null); return }
    if (validate) {
      setValidating(true)
      try {
        const err = await validate(draft)
        if (err) {
          setError(err)
          setValidating(false)
          return
        }
      } catch {
        setError('Lỗi kết nối kiểm tra số container')
        setValidating(false)
        return
      }
      setValidating(false)
    }
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
      setError(null)
    } catch {
      setError('Không thể lưu thay đổi')
    } finally {
      setSaving(false)
    }
  }

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const related = e.relatedTarget as HTMLElement
    if (related && related.closest('.inline-editable-btn')) {
      return
    }
    if (draft === value) {
      setEditing(false)
      setError(null)
      return
    }
    if (validate) {
      setValidating(true)
      try {
        const err = await validate(draft)
        if (err) {
          setError(err)
          setValidating(false)
          return
        }
      } catch {
        setError('Lỗi kết nối kiểm tra số container')
        setValidating(false)
        return
      }
      setValidating(false)
    }
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
      setError(null)
    } catch {
      setError('Không thể lưu thay đổi')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setDraft(value); setError(null); setEditing(false) }
  }

  if (editing) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div className="flex items-center gap-1.5 w-full">
          <input
            ref={inputRef}
            type={inputType}
            value={draft}
            onChange={e => {
              setDraft(e.target.value)
              if (error) setError(null)
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={saving || validating}
            className="flex-1 min-w-0 rounded-md border px-2 py-1 text-sm outline-none"
            style={{
              background: 'var(--theme-bg-primary)',
              borderColor: error ? 'var(--theme-status-error)' : 'var(--theme-brand-primary)',
              color: 'var(--theme-text-primary)',
            }}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || validating}
            className="inline-editable-btn flex h-6 w-6 items-center justify-center rounded-md text-white shrink-0"
            style={{ background: 'var(--theme-status-success)' }}
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => { setDraft(value); setError(null); setEditing(false) }}
            className="inline-editable-btn flex h-6 w-6 items-center justify-center rounded-md shrink-0"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        {error && (
          <p className="text-xs font-medium px-1" style={{ color: 'var(--theme-status-error)' }}>
            {error}
          </p>
        )}
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
