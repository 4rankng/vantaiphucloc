import { useState, useCallback } from 'react'
import { Star, Plus, Check, X, Loader2 } from 'lucide-react'

interface Alias {
  id: number
  alias: string
}

interface AliasManagerProps {
  aliases: Alias[]
  onAddAlias: (alias: string) => Promise<void>
  onPromoteAlias: (id: number) => Promise<void>
  onDeleteAlias?: (id: number) => Promise<void>
}

export function AliasManager({ aliases, onAddAlias, onPromoteAlias, onDeleteAlias }: AliasManagerProps) {
  const [showInput, setShowInput] = useState(false)
  const [newAlias, setNewAlias] = useState('')
  const [adding, setAdding] = useState(false)
  const [pendingId, setPendingId] = useState<number | null>(null)

  const handleAdd = useCallback(async () => {
    const trimmed = newAlias.trim()
    if (!trimmed || adding) return
    setAdding(true)
    try {
      await onAddAlias(trimmed)
      setNewAlias('')
      setShowInput(false)
    } finally {
      setAdding(false)
    }
  }, [newAlias, adding, onAddAlias])

  const handlePromote = useCallback(async (id: number) => {
    setPendingId(id)
    try {
      await onPromoteAlias(id)
    } finally {
      setPendingId(null)
    }
  }, [onPromoteAlias])

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
        Tên phụ
        {aliases.length > 0 && (
          <span className="ml-1.5 font-normal normal-case">{aliases.length}</span>
        )}
      </p>

      <div className="space-y-0.5">
        {aliases.length === 0 && !showInput && (
          <p className="text-xs italic" style={{ color: 'var(--theme-text-muted)' }}>Chưa có tên phụ nào.</p>
        )}
        {aliases.map(a => (
          <div
            key={a.id}
            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
            style={{ background: 'transparent' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <span className="flex-1 text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
              {a.alias}
            </span>
            <button
              onClick={() => handlePromote(a.id)}
              disabled={pendingId === a.id}
              className="shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors"
              style={{
                background: 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)',
                color: 'var(--theme-brand-primary)',
              }}
              title="Đặt làm tên chính"
            >
              {pendingId === a.id ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <Star className="h-2.5 w-2.5" />
              )}
              Đặt chính
            </button>
            {onDeleteAlias && (
              <button
                onClick={() => onDeleteAlias(a.id)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100"
                title="Xoá tên phụ"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {showInput ? (
        <div className="flex items-center gap-1.5">
          <input
            value={newAlias}
            onChange={e => setNewAlias(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setNewAlias(''); setShowInput(false) }
            }}
            placeholder="Nhập tên phụ..."
            autoFocus
            disabled={adding}
            className="flex-1 rounded-md border px-2 py-1.5 text-xs outline-none"
            style={{
              background: 'var(--theme-bg-primary)',
              borderColor: 'var(--theme-brand-primary)',
              color: 'var(--theme-text-primary)',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newAlias.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            style={{ background: 'var(--theme-status-success)', color: 'var(--theme-text-on-brand)' }}
          >
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </button>
          <button
            onClick={() => { setNewAlias(''); setShowInput(false) }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
          style={{ border: '1px dashed var(--theme-border-default)', color: 'var(--theme-text-muted)' }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-brand-primary)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--theme-brand-primary)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-border-default)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--theme-text-muted)'
          }}
        >
          <Plus className="h-3 w-3" />
          Thêm tên phụ
        </button>
      )}
    </div>
  )
}
