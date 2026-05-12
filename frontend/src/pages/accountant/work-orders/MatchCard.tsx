import { useState, useCallback } from 'react'
import { Check, X, Pencil, CheckCircle2, XCircle } from 'lucide-react'
import { useUpdateTripOrder } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { fmtDate } from '@/lib/date-utils'
import type { CriterionBreakdown, WorkOrder, TripOrder } from '@/data/domain'

function scoreColor(matchScore: number, maxScore: number): string {
  const ratio = maxScore > 0 ? matchScore / maxScore : 0
  if (ratio >= 1) return 'var(--theme-status-success)'
  if (ratio >= 0.66) return 'var(--theme-status-warning)'
  if (ratio >= 0.33) return '#EA580C'
  return 'var(--theme-text-muted)'
}

// ─── Single-column criterion row ─────────────────────────────────────────────
// Shows only the order's (TO) value per criterion. The trip's (WO) value is
// already displayed in the TripDetailCard at the top of the section, so we
// avoid the redundant `↔` comparison. The ✅/❌ icon indicates match status;
// mismatched rows get a subtle red tint and a hover tooltip with the trip value.

function CriterionRow({
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

  const icon = criterion.match ? (
    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-success)' }} />
  ) : (
    <XCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-error)' }} />
  )

  const bgStyle = criterion.match
    ? { background: 'color-mix(in srgb, var(--theme-status-success) 6%, transparent)' }
    : { background: 'color-mix(in srgb, var(--theme-status-error) 5%, transparent)' }

  const borderColor = criterion.match
    ? 'color-mix(in srgb, var(--theme-status-success) 20%, transparent)'
    : 'color-mix(in srgb, var(--theme-status-error) 18%, transparent)'

  // Hover tooltip showing trip value for on-demand comparison
  const tooltip = !criterion.match && criterion.woValue
    ? `Chuyến đi: ${criterion.woValue}`
    : undefined

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
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
              className="flex-1 px-1.5 py-0.5 rounded text-xs border"
              style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--theme-brand-primary)', color: 'var(--theme-text-primary)' }}
            />
            <button onClick={saveTo} className="p-0.5" style={{ color: 'var(--theme-status-success)' }}><Check className="w-3 h-3" /></button>
            <button onClick={() => setEditingTo(false)} className="p-0.5" style={{ color: 'var(--theme-text-muted)' }}><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <button
            onClick={() => { if (!criterion.match) { setToDraft(criterion.toValue ?? ''); setEditingTo(true) } }}
            className="text-xs truncate text-left w-full group/edit"
            style={{ color: criterion.toValue ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}
          >
            {criterion.toValue || '—'}
            {!criterion.match && (
              <Pencil className="w-2.5 h-2.5 inline ml-1 opacity-0 group-hover/edit:opacity-60 transition-opacity" style={{ color: 'var(--theme-text-muted)' }} />
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Match card ──────────────────────────────────────────────────────────────

interface MatchCardProps {
  matchScore: number
  maxScore: number
  criteria: CriterionBreakdown[]
  tripOrder: TripOrder
  /** Trip (WO) context — kept in the prop shape for callers; not rendered
   *  here because the trip detail is already shown at the top of the section. */
  workOrder: WorkOrder
  onConfirm: () => void
  submitting: boolean
  onEdited: () => void
}

export function MatchCard({
  matchScore, maxScore, criteria, tripOrder,
  onConfirm, submitting, onEdited,
}: MatchCardProps) {
  const color = scoreColor(matchScore, maxScore)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isLowConfidence = matchScore < maxScore && matchScore >= 2

  const handleGhep = useCallback(() => {
    if (isLowConfidence) {
      setConfirmOpen(true)
    } else {
      onConfirm()
    }
  }, [isLowConfidence, onConfirm])

  const handleConfirmYes = useCallback(() => {
    setConfirmOpen(false)
    onConfirm()
  }, [onConfirm])

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: `1px solid var(--theme-border-default)`,
        background: 'var(--theme-bg-secondary)',
      }}
    >
      {/* Header: TO code + date + score */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg"
          style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <span className="text-[11px] font-bold tabular-nums leading-none" style={{ color }}>
            {matchScore}/{maxScore}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {tripOrder.partner?.name || '—'}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
              {fmtDate(tripOrder.tripDate)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {tripOrder.containers.slice(0, 3).map((c, i) => (
              <span key={i} className="text-[10px] font-mono" style={{ color: 'var(--theme-text-secondary)' }}>
                {c.containerNumber || c.workType}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Criteria breakdown — single-column TO values; trip values are at top */}
      <div className="px-3 pb-1 space-y-1">
        {criteria.map(c => (
          <CriterionRow
            key={c.name}
            criterion={c}
            toId={tripOrder.id}
            onEdited={onEdited}
          />
        ))}
      </div>

      {/* Subtle counter below criteria */}
      {criteria.length > 0 && (
        <div className="px-4 pb-2 text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
          {matchScore} chỉ tiêu khớp · {Math.max(maxScore - matchScore, 0)} chưa khớp
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-3 pt-1">
        <button
          onClick={handleGhep}
          disabled={submitting || matchScore < 2}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          <Check className="w-3.5 h-3.5" />
          {submitting ? 'Đang ghép...' : 'Ghép'}
        </button>
      </div>

      {/* Low-confidence confirmation overlay */}
      {confirmOpen && (
        <div
          className="px-4 pb-3 pt-2"
          style={{ borderTop: '1px solid var(--theme-border-default)', background: 'color-mix(in srgb, var(--theme-status-warning) 6%, transparent)' }}
        >
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--theme-status-warning)' }}>
            Mức độ phù hợp thấp ({matchScore}/{maxScore}) — Các trường không khớp:
          </p>
          <div className="space-y-1 mb-2">
            {criteria.filter(c => !c.match).map(c => (
              <div key={c.name} className="flex items-start gap-1.5 text-[11px]" title={c.woValue ? `Chuyến đi: ${c.woValue}` : undefined}>
                <XCircle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'var(--theme-status-error)' }} />
                <span style={{ color: 'var(--theme-text-primary)' }}>
                  <span className="font-semibold" style={{ color: 'var(--theme-text-muted)' }}>{c.label}:</span>{' '}
                  {c.toValue || '—'}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirmYes}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              <Check className="w-3 h-3" /> Xác nhận ghép
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
            >
              <X className="w-3 h-3" /> Huỷ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export { scoreColor }
