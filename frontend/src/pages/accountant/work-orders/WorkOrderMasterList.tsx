import { useMemo } from 'react'
import { Calendar, Check } from 'lucide-react'
import { ContBadge } from '@/components/shared/ContBadge'
import { fmtDate } from '@/lib/date-utils'
import { resolveRoute } from '@/lib/route-utils'
import type { WorkOrder, WorkOrderMatchScore } from '@/data/domain'

function scoreChipColor(matchScore: number, maxScore: number): string {
  const ratio = maxScore > 0 ? matchScore / maxScore : 0
  if (ratio >= 1) return 'var(--theme-status-success)'
  if (ratio >= 0.66) return 'var(--theme-status-warning)'
  if (ratio >= 0.33) return '#EA580C'
  return 'var(--theme-text-muted)'
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'Chờ ghép'
    case 'MATCHED': return 'Đã khớp'
    default: return status
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING': return 'var(--theme-status-warning)'
    case 'MATCHED': return 'var(--theme-status-success)'
    default: return 'var(--theme-text-muted)'
  }
}

interface WorkOrderMasterListProps {
  workOrders: WorkOrder[]
  matchScores: Map<number, WorkOrderMatchScore>
  selectedId: number | null
  onSelect: (id: number) => void
  loading?: boolean
}

export function WorkOrderMasterList({
  workOrders, matchScores, selectedId, onSelect, loading,
}: WorkOrderMasterListProps) {
  const sorted = useMemo(() => {
    return [...workOrders].sort((a, b) => {
      // PENDING first
      const aPend = a.status === 'PENDING' ? 0 : 1
      const bPend = b.status === 'PENDING' ? 0 : 1
      if (aPend !== bPend) return aPend - bPend
      // Then by score DESC
      const aScore = matchScores.get(a.id)?.bestMatchScore ?? -1
      const bScore = matchScores.get(b.id)?.bestMatchScore ?? -1
      if (aScore !== bScore) return bScore - aScore
      // Then by date DESC
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [workOrders, matchScores])

  if (loading) {
    return (
      <div className="p-3 space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
          Không có phiếu nào
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
      {sorted.map(wo => {
        const score = matchScores.get(wo.id)
        const isSelected = selectedId === wo.id
        const bestScore = score?.bestMatchScore ?? 0
        const maxScore = score?.maxScore ?? 6
        const color = scoreChipColor(bestScore, maxScore)

        const matchCount = wo.matchedTripCount ?? 0

        return (
          <button
            key={wo.id}
            onClick={() => onSelect(wo.id)}
            className="w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors"
            style={{
              background: isSelected ? 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)' : 'transparent',
              borderLeft: isSelected ? '2px solid var(--theme-brand-primary)' : '2px solid transparent',
            }}
            onMouseEnter={e => {
              if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)'
            }}
            onMouseLeave={e => {
              if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            {/* Score / status chip — 36×36 */}
            {wo.status === 'PENDING' && score ? (
              <div
                className="shrink-0 flex items-center justify-center rounded-lg mt-0.5"
                style={{ width: 36, height: 36, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                title={`${bestScore} tiêu chí khớp trên ${maxScore}`}
              >
                <span className="text-[11px] font-bold tabular-nums leading-none" style={{ color }}>
                  {bestScore}/{maxScore}
                </span>
              </div>
            ) : wo.status === 'MATCHED' ? (
              /* MATCHED chip: ✓ icon + trip count — avoids "Đã khớp" text wrapping in 36px */
              <div
                className="shrink-0 flex flex-col items-center justify-center rounded-lg mt-0.5 gap-0.5"
                style={{ width: 36, height: 36, background: 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)' }}
              >
                <Check className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-success)' }} />
                {matchCount >= 1 && (
                  <span className="text-[10px] font-bold tabular-nums leading-none" style={{ color: 'var(--theme-status-success)' }}>
                    {matchCount} ĐH
                  </span>
                )}
              </div>
            ) : (
              /* Fallback for other statuses */
              <div
                className="shrink-0 flex items-center justify-center rounded-lg mt-0.5"
                style={{ width: 36, height: 36, background: 'var(--theme-bg-tertiary)' }}
              >
                <span className="text-[10px] font-semibold leading-none" style={{ color: getStatusColor(wo.status) }}>
                  {getStatusLabel(wo.status)}
                </span>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Line 1: driver name + plate + date */}
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-bold" style={{ color: 'var(--theme-brand-primary)' }}>
                  {wo.driver.name}{wo.driver.vehicle?.plate ? ` · ${wo.driver.vehicle.plate}` : ''}
                </span>
                <span className="flex items-center gap-0.5 text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
                  <Calendar className="w-3 h-3" />
                  {wo.createdAt ? fmtDate(wo.createdAt) : '—'}
                </span>
              </div>

              {/* Line 2: partner (primary) + route (muted) — stacked vertically */}
              <div className="min-w-0 text-xs">
                <p className="font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
                  {wo.partner.name}
                </p>
                <p className="truncate text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
                  {resolveRoute(wo) || '—'}
                </p>
              </div>

              {/* Line 3: containers — single row */}
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden whitespace-nowrap">
                {wo.containers.slice(0, 2).map((c, i) => (
                  <span key={i} className="flex items-center gap-0.5 shrink-0 min-w-0">
                    <ContBadge type={c.workType} />
                    <span className="text-[10px] font-mono truncate max-w-[80px]" style={{ color: 'var(--theme-text-secondary)' }}>
                      {c.containerNumber}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
