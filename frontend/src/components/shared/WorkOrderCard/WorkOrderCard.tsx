import { Clock, CheckCircle, Lock } from 'lucide-react'
import { formatCurrencyFull, type WorkOrder } from '@/data/domain'

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

function resolveRoute(wo: WorkOrder): string {
  const parts = wo.route.split(' - ')
  const from = wo.pickupLocation || parts[0] || wo.route
  const to   = wo.dropoffLocation || parts[1] || null
  return to ? `${from} → ${to}` : from
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const day = isToday
    ? 'Hôm nay'
    : `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return `${day} · ${time}`
}

function ContainerList({ wo }: { wo: WorkOrder }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {wo.containers.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-sm font-bold font-mono" style={{ color: 'var(--theme-text-primary)' }}>
            {c.containerNumber || '—'}
          </span>
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0"
            style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)', color: 'var(--theme-brand-primary)' }}
          >
            {c.workType}
          </span>
        </div>
      ))}
    </div>
  )
}

function StatusPill({ status, variant }: { status: WorkOrder['status']; variant: 'driver' | 'accountant' }) {
  if (status === 'PENDING') {
    return (
      <span
        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--theme-status-warning) 12%, transparent)',
          color: 'var(--theme-status-warning)',
        }}
      >
        <Clock className="w-3 h-3" />
        {variant === 'driver' ? 'Chờ ghép' : 'Chờ đối soát'}
      </span>
    )
  }
  if (status === 'MATCHED' || status === 'COMPLETED') {
    return (
      <span
        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--theme-status-success, #16a34a) 12%, transparent)',
          color: 'var(--theme-status-success, #16a34a)',
        }}
      >
        {variant === 'driver'
          ? <><CheckCircle className="w-3 h-3" /> Đã ghép</>
          : <><Lock className="w-3 h-3" /> Đã chốt</>
        }
      </span>
    )
  }
  return null
}

function DriverCard({ wo, onClick }: { wo: WorkOrder; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border p-4 transition-all active:scale-[0.98] touch-manipulation"
      style={{
        background: 'var(--surface-bg)',
        borderColor: 'var(--surface-border)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <ContainerList wo={wo} />
        <StatusPill status={wo.status} variant="driver" />
      </div>

      <p className="text-sm font-bold leading-snug" style={{ color: 'var(--theme-text-primary)' }}>
        {wo.clientCode ? `${wo.clientCode} · ${wo.clientName}` : wo.clientName}
      </p>

      <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
        {resolveRoute(wo)}
      </p>

      <div className="mt-3 pt-2.5 flex items-center justify-between" style={{ borderTop: '1px solid var(--surface-border)' }}>
        <span className="text-xs tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>
          {fmtDate(wo.createdAt)}
        </span>
        {wo.earning > 0 ? (
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
            +{formatCurrencyFull(wo.earning)}
          </span>
        ) : (
          <span className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
            Chưa ghép giá
          </span>
        )}
      </div>
    </button>
  )
}

function AccountantCard({ wo }: { wo: WorkOrder }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: 'var(--surface-bg)',
        borderColor: 'var(--surface-border)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <ContainerList wo={wo} />
        <StatusPill status={wo.status} variant="accountant" />
      </div>

      <p className="text-sm font-bold leading-snug" style={{ color: 'var(--theme-text-primary)' }}>
        {wo.clientCode ? `${wo.clientCode} · ${wo.clientName}` : wo.clientName}
      </p>

      <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
        {resolveRoute(wo)}
      </p>

      <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
        {wo.driverName} · {wo.tractorPlate}
      </p>

      <div className="mt-3 pt-2.5 flex items-center justify-between" style={{ borderTop: '1px solid var(--surface-border)' }}>
        <span className="text-xs tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>
          {fmtDate(wo.createdAt)}
        </span>
        {wo.earning > 0 ? (
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
            +{formatCurrencyFull(wo.earning)}
          </span>
        ) : (
          <span className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
            Chờ đối soát
          </span>
        )}
      </div>
    </div>
  )
}
