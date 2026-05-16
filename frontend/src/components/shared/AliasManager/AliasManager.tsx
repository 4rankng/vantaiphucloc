import { useState } from 'react'
import { Star, Plus, Check, X, Loader2 } from 'lucide-react'
import { InfoTip } from '@/components/shared/InfoTip'

interface Alias {
  id: number | string
  alias: string
  status?: 'PENDING' | 'CONFIRMED' | 'REJECTED'
  isPrimary?: boolean
}

interface AliasManagerProps {
  aliases: Alias[]
  primaryName: string
  onAddAlias: (alias: string) => void | Promise<void>
  onConfirmAlias?: (id: number | string) => void | Promise<void>
  onRejectAlias?: (id: number | string) => void | Promise<void>
  onPromoteAlias?: (id: number | string) => void | Promise<void>
  loading?: boolean
}

export function AliasManager({
  aliases,
  primaryName,
  onAddAlias,
  onConfirmAlias,
  onRejectAlias,
  onPromoteAlias,
  loading,
}: AliasManagerProps) {
  const [showInput, setShowInput] = useState(false)
  const [newAlias, setNewAlias] = useState('')
  const [adding, setAdding] = useState(false)

  const confirmedAliases = aliases.filter(a => a.status === 'CONFIRMED' || a.status === undefined)
  const pendingAliases = aliases.filter(a => a.status === 'PENDING')

  const handleAdd = async () => {
    const trimmed = newAlias.trim()
    if (!trimmed) return
    setAdding(true)
    try {
      await onAddAlias(trimmed)
      setNewAlias('')
      setShowInput(false)
    } finally {
      setAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') { setNewAlias(''); setShowInput(false) }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Primary name badge */}
        <span
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
          style={{
            background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)',
            color: 'var(--theme-brand-primary)',
          }}
        >
          <Star className="h-2.5 w-2.5" fill="currentColor" />
          {primaryName}
        </span>

        {/* Confirmed aliases */}
        {confirmedAliases.map(a => (
          <span
            key={a.id}
            className="group inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              background: 'var(--theme-bg-tertiary)',
              color: 'var(--theme-text-secondary)',
            }}
          >
            {a.alias}
            {onPromoteAlias && (
              <button
                onClick={() => onPromoteAlias(a.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                title="Đặt làm tên chính"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                <Star className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        ))}

        {/* Add alias button */}
        {!showInput && (
          <button
            onClick={() => setShowInput(true)}
            className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors"
            style={{
              color: 'var(--theme-text-muted)',
              border: '1px dashed var(--theme-border-default)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-brand-primary)'
              (e.currentTarget as HTMLElement).style.color = 'var(--theme-brand-primary)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-border-default)'
              (e.currentTarget as HTMLElement).style.color = 'var(--theme-text-muted)'
            }}
          >
            <Plus className="h-2.5 w-2.5" />
            alias
          </button>
        )}
      </div>

      {/* Add alias input */}
      {showInput && (
        <div className="flex items-center gap-1.5 ml-1">
          <input
            value={newAlias}
            onChange={e => setNewAlias(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tên alias mới"
            disabled={adding}
            autoFocus
            className="rounded-md border px-2 py-1 text-xs outline-none w-40"
            style={{
              background: 'var(--theme-bg-primary)',
              borderColor: 'var(--theme-brand-primary)',
              color: 'var(--theme-text-primary)',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newAlias.trim()}
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: 'var(--theme-status-success)', color: '#fff' }}
          >
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </button>
          <button
            onClick={() => { setNewAlias(''); setShowInput(false) }}
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Pending aliases */}
      {pendingAliases.length > 0 && (
        <div className="space-y-1 ml-1">
          {pendingAliases.map(a => (
            <div
              key={a.id}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px]"
              style={{
                background: 'color-mix(in srgb, var(--theme-status-warning) 8%, transparent)',
                color: 'var(--theme-status-warning)',
                border: '1px solid color-mix(in srgb, var(--theme-status-warning) 20%, transparent)',
              }}
            >
              <span className="font-medium">{a.alias}</span>
              <span style={{ color: 'var(--theme-text-muted)', fontSize: 10 }}>chờ duyệt</span>
              {onConfirmAlias && (
                <button
                  onClick={() => onConfirmAlias(a.id)}
                  className="flex h-4 w-4 items-center justify-center rounded"
                  style={{ background: 'var(--theme-status-success)', color: '#fff' }}
                  title="Xác nhận"
                >
                  <Check className="h-2.5 w-2.5" />
                </button>
              )}
              {onRejectAlias && (
                <button
                  onClick={() => onRejectAlias(a.id)}
                  className="flex h-4 w-4 items-center justify-center rounded"
                  style={{ background: 'var(--theme-status-error)', color: '#fff' }}
                  title="Từ chối"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
