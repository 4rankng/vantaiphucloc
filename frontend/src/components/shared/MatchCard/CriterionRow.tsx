import { useState, useCallback } from 'react'
import { Check, X, Pencil, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { useUpdateTripOrder } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { fmtDate } from '@/lib/date-utils'
import type { CriterionBreakdown } from '@/data/domain'

export function scoreColor(matchScore: number, maxScore: number): string {
  const ratio = maxScore > 0 ? matchScore / maxScore : 0
  if (ratio >= 1) return 'var(--theme-status-success)'
  if (ratio >= 0.66) return 'var(--theme-status-warning)'
  if (ratio >= 0.33) return '#EA580C'
  return 'var(--theme-text-muted)'
}

export function CriterionRow({
  criterion,
  toId,
  onEdited,
}: {
  criterion: CriterionBreakdown
  toId: number
  onEdited: () => void
}) {
  const [editingTo, setEditingTo] = useState(false)
  const [toDraft, setToDraft] = useState(criterion.toValue ?? '')

  const updateTo = useUpdateTripOrder()
  const toast = useToast()

  const saveTo = useCallback(async () => {
    setEditingTo(false)
    try {
      const field = criterion.name === 'container_number' ? 'containers' : criterion.name === 'client' ? 'clientId' : criterion.name === 'pickup_location' ? 'pickupLocationId' : criterion.name === 'dropoff_location' ? 'dropoffLocationId' : null
      if (!field) return
      await updateTo.mutateAsync({
        id: toId,
        data: { [field]: toDraft } as Record<string, unknown>,
      })
      onEdited()
    } catch {
      toast.error('Lỗi', 'Không thể cập nhật đơn hàng')
    }
  }, [criterion.name, toDraft, toId, updateTo, onEdited, toast])

  const icon = criterion.fuzzy ? (
    <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-warning)' }} />
  ) : criterion.match ? (
    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-success)' }} />
  ) : (
    <XCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-error)' }} />
  )

  const bgStyle = criterion.fuzzy
    ? { background: 'color-mix(in srgb, var(--theme-status-warning) 8%, transparent)' }
    : criterion.match
      ? { background: 'color-mix(in srgb, var(--theme-status-success) 6%, transparent)' }
      : { background: 'color-mix(in srgb, var(--theme-status-error) 5%, transparent)' }

  const borderColor = criterion.fuzzy
    ? 'color-mix(in srgb, var(--theme-status-warning) 25%, transparent)'
    : criterion.match
      ? 'color-mix(in srgb, var(--theme-status-success) 20%, transparent)'
      : 'color-mix(in srgb, var(--theme-status-error) 18%, transparent)'

  const formatVal = (val: string | null | undefined) =>
    criterion.name === 'date' && val ? fmtDate(val) : (val ?? '')

  const tooltip = criterion.fuzzy
    ? `Gần đúng (có sai lệch nhỏ): ${formatVal(criterion.woValue)} ≈ ${formatVal(criterion.toValue)}`
    : !criterion.match && criterion.woValue
      ? `Chuyến đi: ${formatVal(criterion.woValue)}`
      : undefined

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{ ...bgStyle, border: `1px solid ${borderColor}` }}
      title={tooltip}
    >
      {icon}
      <span className="text-[11px] font-semibold shrink-0 w-24" style={{ color: 'var(--theme-text-muted)' }}>
        {criterion.label}
      </span>

      <div className="flex-1 min-w-0">
        {editingTo ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={toDraft}
              onChange={e => setToDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveTo(); if (e.key === 'Escape') setEditingTo(false) }}
              className="flex-1 px-1.5 py-0.5 rounded text-[11px] border"
              style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--theme-brand-primary)', color: 'var(--theme-text-primary)' }}
            />
            <button onClick={saveTo} className="p-0.5" style={{ color: 'var(--theme-status-success)' }}><Check className="w-3 h-3" /></button>
            <button onClick={() => setEditingTo(false)} className="p-0.5" style={{ color: 'var(--theme-text-muted)' }}><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <button
            onClick={() => { if (!criterion.match) { setToDraft(criterion.toValue ?? ''); setEditingTo(true) } }}
            className="text-[11px] truncate text-left w-full group/edit"
            style={{ color: criterion.toValue ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}
          >
            {formatVal(criterion.toValue) || '—'}
            {!criterion.match && (
              <Pencil className="w-2.5 h-2.5 inline ml-1 opacity-0 group-hover/edit:opacity-60 transition-opacity" style={{ color: 'var(--theme-text-muted)' }} />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
