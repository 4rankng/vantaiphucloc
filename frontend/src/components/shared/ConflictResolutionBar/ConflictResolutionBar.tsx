import { X, CheckCircle2, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { fmtDate } from '@/lib/date-utils'
import type { MatchSuggestion } from '@/data/domain'

interface ConflictResolutionBarProps {
  conflictState: { suggestion: MatchSuggestion; resolutions: Record<string, 'wo' | 'to'> }
  onResolutionChange: (criterionName: string, side: 'wo' | 'to') => void
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}

export function ConflictResolutionBar({
  conflictState,
  onResolutionChange,
  onConfirm,
  onCancel,
  isPending,
}: ConflictResolutionBarProps) {
  const mismatchedCriteria = conflictState.suggestion.criteria.filter(c => !c.match)
  const resolvedCount = mismatchedCriteria.filter(c => conflictState.resolutions[c.name]).length
  const allResolved = resolvedCount === mismatchedCriteria.length

  return (
    <div
      className="sticky bottom-0 rounded-xl overflow-hidden shadow-lg"
      style={{ border: '1px solid var(--theme-status-warning)', background: 'var(--theme-bg-primary)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: 'color-mix(in srgb, var(--theme-status-warning) 10%, transparent)',
          borderBottom: '1px solid color-mix(in srgb, var(--theme-status-warning) 25%, transparent)',
        }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" style={{ color: 'var(--theme-status-warning)' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--theme-status-warning)' }}>
            Xử lý xung đột — chọn giá trị đúng cho từng trường
          </span>
        </div>
        <button onClick={onCancel} className="p-1 rounded opacity-60 hover:opacity-100 transition-opacity">
          <X className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-secondary)' }} />
        </button>
      </div>

      {/* One row per mismatched criterion */}
      <div className="p-3 space-y-2.5">
        {mismatchedCriteria.map(criterion => {
          const chosen = conflictState.resolutions[criterion.name]
          return (
            <div key={criterion.name}>
              <div
                className="text-[9px] font-bold uppercase tracking-widest mb-1 px-0.5"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {criterion.label}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {/* WO (driver) side */}
                <button
                  onClick={() => onResolutionChange(criterion.name, 'wo')}
                  className="relative flex flex-col gap-0.5 px-3 py-2.5 rounded-lg text-left transition-all"
                  style={{
                    border: chosen === 'wo'
                      ? '2px solid var(--theme-brand-primary)'
                      : '1px solid var(--theme-border-default)',
                    background: chosen === 'wo'
                      ? 'color-mix(in srgb, var(--theme-brand-primary) 8%, var(--theme-bg-primary))'
                      : 'var(--theme-bg-secondary)',
                  }}
                >
                  {chosen === 'wo' && (
                    <span className="absolute top-1.5 right-1.5">
                      <CheckCircle2 className="w-3 h-3" style={{ color: 'var(--theme-brand-primary)' }} />
                    </span>
                  )}
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: chosen === 'wo' ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)' }}
                  >
                    🚛 Chuyến đi
                  </span>
                  <span className="text-xs font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>
                    {(criterion.name === 'date' && criterion.woValue ? fmtDate(criterion.woValue) : criterion.woValue) || '—'}
                  </span>
                </button>
                {/* TO (order) side */}
                <button
                  onClick={() => onResolutionChange(criterion.name, 'to')}
                  className="relative flex flex-col gap-0.5 px-3 py-2.5 rounded-lg text-left transition-all"
                  style={{
                    border: chosen === 'to'
                      ? '2px solid var(--theme-status-success)'
                      : '1px solid var(--theme-border-default)',
                    background: chosen === 'to'
                      ? 'color-mix(in srgb, var(--theme-status-success) 8%, var(--theme-bg-primary))'
                      : 'var(--theme-bg-secondary)',
                  }}
                >
                  {chosen === 'to' && (
                    <span className="absolute top-1.5 right-1.5">
                      <CheckCircle2 className="w-3 h-3" style={{ color: 'var(--theme-status-success)' }} />
                    </span>
                  )}
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: chosen === 'to' ? 'var(--theme-status-success)' : 'var(--theme-text-muted)' }}
                  >
                    📋 Đơn hàng
                  </span>
                  <span className="text-xs font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>
                    {(criterion.name === 'date' && criterion.toValue ? fmtDate(criterion.toValue) : criterion.toValue) || '—'}
                  </span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 pb-3">
        <button
          onClick={onConfirm}
          disabled={!allResolved || isPending}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-opacity disabled:opacity-40 flex-1"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          {isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Check className="w-3.5 h-3.5" />}
          {allResolved
            ? 'Xác nhận ghép'
            : `Xác nhận ghép (${resolvedCount}/${mismatchedCriteria.length} đã chọn)`}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
        >
          Huỷ
        </button>
      </div>
    </div>
  )
}
