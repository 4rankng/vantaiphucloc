import { AlertTriangle } from 'lucide-react'
import { fmtDate } from '@/lib/date-utils'
import { CriterionRow, scoreColor } from './CriterionRow'
import type { CriterionBreakdown, DeliveredTrip, BookedTrip } from '@/data/domain'

interface MatchCardProps {
  matchScore: number
  maxScore: number
  criteria: CriterionBreakdown[]
  bookedTrip: BookedTrip
  deliveredTrip: DeliveredTrip
  onConfirm: () => void
  submitting: boolean
  onEdited: () => void
  matchWarnings?: string[]
}

export function MatchCard({
  matchScore, maxScore, criteria, bookedTrip,
  onEdited,
  matchWarnings,
}: MatchCardProps) {
  const color = scoreColor(matchScore, maxScore)

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
              {bookedTrip.client?.name || '—'}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
              {fmtDate(bookedTrip.tripDate)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {bookedTrip.containers.slice(0, 3).map((c, i) => (
              <span key={i} className="text-[10px] font-mono" style={{ color: 'var(--theme-text-secondary)' }}>
                {c.containerNumber || c.workType}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Fuzzy match warnings banner */}
      {matchWarnings && matchWarnings.length > 0 && (
        <div
          className="flex items-center gap-2 mx-3 mt-1 mb-0 px-2.5 py-1.5 rounded-lg"
          style={{
            background: 'color-mix(in srgb, var(--theme-status-warning) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--theme-status-warning) 25%, transparent)',
          }}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--theme-status-warning)' }} />
          <span className="text-[10px] font-medium" style={{ color: 'var(--theme-status-warning)' }}>
            Khớp với cảnh báo — một số tiêu chí có sai lệch nhỏ
          </span>
        </div>
      )}

      {/* Criteria breakdown */}
      <div className="px-3 pb-1 space-y-1">
        {criteria.map(c => (
          <CriterionRow
            key={c.name}
            criterion={c}
            toId={bookedTrip.id}
            onEdited={onEdited}
          />
        ))}
      </div>

      {/* Counter + conflict hint */}
      {criteria.length > 0 && (
        <div className="px-4 pb-3 space-y-1">
          <div className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
            {matchScore} chỉ tiêu khớp · {Math.max(maxScore - matchScore, 0)} chưa khớp
          </div>
          {matchScore < maxScore && (
            <div
              className="flex items-center gap-1 text-[11px] font-medium"
              style={{ color: 'var(--theme-status-warning)' }}
            >
              <span>☑</span>
              <span>Tích ô để chọn giá trị đúng &amp; ghép</span>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

export { scoreColor }
