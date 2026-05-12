import { RouteDisplay } from '@/components/shared/RouteDisplay'
import { ContBadge } from '@/components/shared/ContBadge'
import { formatDate } from '@/lib/format'
import { CheckCircle2, Lock } from 'lucide-react'
import type { TripOrder } from '@/data/domain'

interface TripOrderCardProps {
  trip: TripOrder
  onClick?: () => void
}

// Per spec: gray=DRAFT, yellow=PENDING, green=COMPLETED, red=CANCELLED
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Nháp',         bg: 'var(--theme-bg-tertiary)',           color: 'var(--theme-text-muted)'    },
  PENDING:   { label: 'Chờ ghép', bg: 'var(--theme-status-warning-light)',  color: 'var(--theme-status-warning)' },
  COMPLETED: { label: 'Đã khớp',      bg: 'var(--theme-status-success-light)',  color: 'var(--theme-status-success)' },
  CANCELLED: { label: 'Đã huỷ',       bg: 'var(--theme-status-error-light)',    color: 'var(--theme-status-error)'   },
}

export function TripOrderCard({ trip, onClick }: TripOrderCardProps) {
  const statusCfg = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.DRAFT
  const isLocked = trip.status === 'MATCHED'

  const inner = (
    <>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>
            {trip.partner.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
            {trip.pickupLocation.name} → {trip.dropoffLocation.name}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {trip.status === 'MATCHED' && (
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-success)' }} />
          )}
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: statusCfg.bg, color: statusCfg.color }}
          >
            {trip.status === 'MATCHED' ? 'Đã khớp' : statusCfg.label}
          </span>
        </div>
      </div>

      {/* Route */}
      <RouteDisplay pickupLocation={trip.pickupLocation.name} dropoffLocation={trip.dropoffLocation.name} />

      {/* Containers */}
      {trip.containers.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {trip.containers.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <ContBadge type={c.workType} />
              {c.containerNumber && (
                <span className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>
                  {c.containerNumber}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          {formatDate(trip.tripDate || trip.createdAt, 'short')}
        </p>
        {isLocked && (
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Đã khoá</span>
          </div>
        )}
      </div>
    </>
  )

  const cardStyle = {
    background: 'var(--theme-bg-secondary)',
    boxShadow: 'var(--theme-shadow-card)',
    border: `1px solid ${trip.status === 'MATCHED' ? 'var(--theme-status-success)' : 'var(--theme-border-default)'}`,
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left rounded-lg p-3.5 transition-all active:scale-[0.98] touch-manipulation"
        style={cardStyle}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className="w-full rounded-lg p-3.5" style={cardStyle}>
      {inner}
    </div>
  )
}
