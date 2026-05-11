import { Truck, Calendar, MapPin } from 'lucide-react'
import { ContBadge } from '@/components/shared/ContBadge'
import { fmtDate } from '@/lib/date-utils'
import { resolveRoute } from '@/lib/route-utils'
import type { WorkOrder } from '@/data/domain'

interface TripDetailCardProps {
  workOrder: WorkOrder
}

export function TripDetailCard({ workOrder }: TripDetailCardProps) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-col gap-2"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      {/* Top row: code + date + plate */}
      <div className="flex items-center gap-2 flex-wrap">
        {workOrder.code && (
          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded"
            style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
          >
            {workOrder.code}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          <Calendar className="w-3 h-3" />
          {workOrder.createdAt ? fmtDate(workOrder.createdAt) : '—'}
        </span>
        {workOrder.vehicleId && (
          <span className="flex items-center gap-1 text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>
            <Truck className="w-3 h-3" />
            V{workOrder.vehicleId}
          </span>
        )}
      </div>

      {/* Second row: client + driver */}
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>
          KH {workOrder.partner.name}
        </span>
        <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          TX: {workOrder.driver.name || '—'}
        </span>
      </div>

      {/* Third row: route + containers */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
          <MapPin className="w-3 h-3" />
          {resolveRoute(workOrder) || '—'}
        </span>
        {workOrder.containers.slice(0, 4).map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            <ContBadge type={c.workType} />
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {c.containerNumber}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
