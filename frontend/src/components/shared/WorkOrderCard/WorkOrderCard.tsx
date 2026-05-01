import { CheckCircle, Clock, CircleDollarSign } from 'lucide-react'
import { ContBadge } from '@/components/shared/ContBadge'
import { RouteDisplay } from '@/components/shared/RouteDisplay'
import { formatCurrencyFull, type WorkOrder } from '@/data/domain'

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
  PENDING:  { label: 'Chờ đối soát', icon: Clock,       color: 'var(--theme-status-warning)', bg: 'var(--theme-status-warning-light)' },
}

type CardVariant = 'driver' | 'accountant'

interface WorkOrderCardBaseProps {
  data: WorkOrder
  variant?: CardVariant
}

interface DriverVariantProps extends WorkOrderCardBaseProps {
  variant: 'driver'
  onClick: () => void
}

interface AccountantVariantProps extends WorkOrderCardBaseProps {
  variant?: 'accountant'
  onClick?: never
}

type WorkOrderCardProps = DriverVariantProps | AccountantVariantProps

export function WorkOrderCard(props: WorkOrderCardProps) {
  const { data: wo, variant = 'accountant' } = props

  if (variant === 'driver') {
    return <DriverCard wo={wo} onClick={(props as DriverVariantProps).onClick} />
  }
  return <AccountantCard wo={wo} />
}

/* ─── Driver variant: containers grid, client/route, earning badge ─── */
function DriverCard({ wo, onClick }: { wo: WorkOrder; onClick: () => void }) {
  const dateStr = new Date(wo.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-3.5 transition-all active:scale-[0.98] touch-manipulation"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      {/* Container numbers + types */}
      <div className={`grid ${wo.containers.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1 mb-2`}>
        {wo.containers.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <p className="text-sm font-bold font-mono truncate" style={{ color: 'var(--theme-text-primary)' }}>
              {c.containerNumber}
            </p>
            <ContBadge type={c.workType} />
          </div>
        ))}
      </div>

      <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>
        {wo.clientCode || wo.clientName}
      </p>
      <RouteDisplay route={wo.route} className="mt-1" />

      <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
        {wo.earning > 0 ? (
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
            +{formatCurrencyFull(wo.earning)}
          </span>
        ) : (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' }}>
            Chờ đối soát
          </span>
        )}
        <span className="text-xs tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>{dateStr}</span>
      </div>
    </button>
  )
}

/* ─── Accountant variant: WO number, driver/plate, status badge ─── */
function AccountantCard({ wo }: { wo: WorkOrder }) {
  const s = STATUS_CONFIG[wo.status] ?? STATUS_CONFIG.PENDING
  const StatusIcon = s.icon

  return (
    <div
      className="rounded-2xl p-3.5"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <p className="text-sm font-bold font-mono truncate flex-1" style={{ color: 'var(--theme-text-primary)' }}>
          {wo.workOrderNumber}
        </p>
        <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
          {wo.workType}
        </span>
      </div>

      <p className="text-xs font-medium truncate mb-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
        {wo.driverName}
      </p>
      <p className="text-xs font-mono mb-1" style={{ color: 'var(--theme-text-muted)' }}>
        {wo.tractorPlate}
      </p>
      <div className="mb-2">
        <p className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
          {wo.clientCode || wo.clientName}
        </p>
      </div>

      {wo.earning > 0 ? (
        <div className="flex items-center gap-1.5 mb-1">
          <CircleDollarSign className="w-3.5 h-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
            {formatCurrencyFull(wo.earning)}
          </span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: s.bg }}>
          <StatusIcon className="w-3 h-3" style={{ color: s.color }} />
          <span className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</span>
        </div>
      )}

      <p className="text-xs mt-2" style={{ color: 'var(--theme-text-muted)' }}>
        {new Date(wo.createdAt).toLocaleDateString('vi-VN')}
      </p>
    </div>
  )
}
