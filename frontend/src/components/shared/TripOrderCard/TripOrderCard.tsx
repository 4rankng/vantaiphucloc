import type { TripOrder } from '@/data/domain'

interface TripOrderCardProps {
  trip: TripOrder
  onClick?: () => void
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Đối soát khách hàng', bg: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' },
  CONFIRMED: { label: 'Đã xác nhận',         bg: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)' },
  INVOICED:  { label: 'Đã xuất hoá đơn',     bg: 'var(--theme-status-info-light)',    color: 'var(--theme-status-info)' },
  CANCELLED: { label: 'Đã huỷ',              bg: 'var(--theme-status-error-light)',   color: 'var(--theme-status-error)' },
}

export function TripOrderCard({ trip, onClick }: TripOrderCardProps) {
  const statusCfg = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.DRAFT

  const inner = (
    <>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{trip.clientName}</p>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: statusCfg.bg, color: statusCfg.color }}
        >
          {statusCfg.label}
        </span>
      </div>
      <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
        {trip.driverName} · {trip.route}
      </p>
      {trip.containers.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {trip.containers.map((c, i) => (
            <span
              key={i}
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
            >
              {c.workType}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs mt-1.5" style={{ color: 'var(--theme-text-muted)' }}>
        {new Date(trip.createdAt).toLocaleDateString('vi-VN')}
      </p>
    </>
  )

  const cardStyle = {
    background: 'var(--theme-bg-secondary)',
    boxShadow: 'var(--theme-shadow-card)',
    border: '1px solid var(--theme-border-default)',
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left rounded-2xl p-3.5 transition-all active:scale-[0.98] touch-manipulation"
        style={cardStyle}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className="w-full rounded-2xl p-3.5" style={cardStyle}>
      {inner}
    </div>
  )
}
