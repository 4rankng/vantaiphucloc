import { Loader2 } from 'lucide-react'
import { Plate } from '@/components/shared/Plate'
import { Pill, type PillVariant } from '@/components/shared/Pill'
import { Button } from '@/components/ui'
import { useSuggestWosForTrip } from '@/hooks/use-queries'
import type { WOSuggestion } from '@/data/domain'

interface MatchSuggestionsPanelProps {
  bookedTripId: number
  onMatch: (deliveredTripId: number) => void
  isMatching: boolean
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  if (!d) return dateStr
  return `${d}/${m}`
}

function confidenceMeta(confidence: string): { variant: PillVariant; label: string } {
  switch (confidence) {
    case 'full': return { variant: 'success', label: 'Khớp đầy đủ' }
    case 'partial': return { variant: 'warn', label: 'Khớp một phần' }
    default: return { variant: 'neutral', label: 'Không khớp' }
  }
}

function scoreColor(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0
  if (pct >= 0.8) return 'var(--success)'
  if (pct >= 0.5) return 'var(--warning)'
  return 'var(--danger)'
}

export function MatchSuggestionsPanel({ bookedTripId, onMatch, isMatching }: MatchSuggestionsPanelProps) {
  const { data: suggestions, isLoading } = useSuggestWosForTrip(bookedTripId)
  const woSuggestions: WOSuggestion[] = suggestions?.suggestions ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-5">
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--ink-3)' }} />
        <span className="text-[13px]" style={{ color: 'var(--ink-3)' }}>Đang tìm chuyến khớp...</span>
      </div>
    )
  }

  if (woSuggestions.length === 0) {
    return (
      <p className="text-[13px] text-center py-4 m-0" style={{ color: 'var(--ink-3)' }}>
        Không tìm thấy chuyến đã đi nào khớp với chuyến này.
      </p>
    )
  }

  return (
    <div className="px-5 py-4 space-y-2">
      <p
        className="m-0 uppercase font-semibold"
        style={{ fontSize: 11, letterSpacing: '0.06em', color: 'var(--ink-3)' }}
      >
        Chuyến đã đi phù hợp ({woSuggestions.length})
      </p>
      <div className="space-y-1.5">
        {woSuggestions.map((s) => {
          const dt = s.deliveredTrip
          const cb = confidenceMeta(s.confidence)
          const pct = s.maxScore > 0 ? Math.round((s.matchScore / s.maxScore) * 100) : 0

          return (
            <div
              key={dt.id}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-sm)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Plate>{dt.vehicle?.plate ?? '—'}</Plate>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[12.5px] tabular-nums"
                      style={{ color: 'var(--ink-2)', fontFamily: 'var(--theme-font-mono)' }}
                    >
                      {dt.tripDate ? formatDate(dt.tripDate) : '—'}
                    </span>
                  </div>
                  <span
                    className="text-[12.5px] truncate block"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    {dt.pickupLocation?.name ?? '—'} → {dt.dropoffLocation?.name ?? '—'}
                    {dt.client?.name ? ` · ${dt.client.name}` : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="tabular-nums font-bold"
                  style={{ fontSize: 12.5, color: scoreColor(s.matchScore, s.maxScore), fontFamily: 'var(--theme-font-mono)' }}
                >
                  {pct}%
                </span>
                <Pill variant={cb.variant} dot={false}>{cb.label}</Pill>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onMatch(dt.id)}
                  disabled={isMatching}
                >
                  Ghép
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
