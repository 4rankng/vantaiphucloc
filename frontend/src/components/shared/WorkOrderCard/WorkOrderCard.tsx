import { Clock, CheckCircle, Lock } from 'lucide-react'
import { formatCurrencyFull, type WorkOrder } from '@/data/domain'
import { formatDate } from '@/lib/format'
import { resolveRoute } from '@/lib/route-utils'

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

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const day = isToday ? 'Hôm nay' : formatDate(iso, 'short')
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

function StatusPill({ status, variant, compact = false }: { status: WorkOrder['status']; variant: 'driver' | 'accountant'; compact?: boolean }) {
  const padding = compact ? 'px-2 py-0.5' : 'px-2.5 py-1'
  const iconSize = compact ? 'w-2.5 h-2.5' : 'w-3 h-3'
  if (status === 'PENDING') {
    return (
      <span
        className={`flex items-center gap-1 text-[11px] font-semibold ${padding} rounded-full shrink-0`}
        style={{
          background: 'color-mix(in srgb, var(--theme-status-warning) 12%, transparent)',
          color: 'var(--theme-status-warning)',
        }}
      >
        <Clock className={iconSize} />
        {variant === 'driver' ? 'Chờ ghép' : 'Chờ ghép'}
      </span>
    )
  }
  if (status === 'MATCHED' || status === 'COMPLETED') {
    return (
      <span
        className={`flex items-center gap-1 text-[11px] font-semibold ${padding} rounded-full shrink-0`}
        style={{
          background: 'color-mix(in srgb, var(--theme-status-success, #16a34a) 12%, transparent)',
          color: 'var(--theme-status-success, #16a34a)',
        }}
      >
        {variant === 'driver'
          ? <CheckCircle className={iconSize} />
          : <><Lock className={iconSize} /> Đã khớp</>
        }
      </span>
    )
  }
  return null
}

/**
 * Driver work-order card — 3-row layout per spec.
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │ Hapag-Lloyd Việt Nam                  +450.000 đ       │  ← line 1
 *   │ Điểm lấy:  Cát Lái                   09-05 · 08:30     │  ← line 2
 *   │ Điểm trả:  Đồng Nai                       [Đã ghép]    │  ← line 3
 *   └────────────────────────────────────────────────────────┘
 *
 * Container info is intentionally omitted — it only appears on the detail
 * page when the user taps the card.
 *
 * Whole card is the tap target → opens detail page.
 */
function DriverCard({ wo, onClick }: { wo: WorkOrder; onClick: () => void }) {
  const hasEarning = wo.driverSalary > 0
  const pickup = wo.pickupLocation?.name || ''
  const dropoff = wo.dropoffLocation?.name || ''

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border px-3 py-2.5 transition-all active:scale-[0.99] touch-manipulation overflow-visible"
      style={{
        background: 'var(--surface-bg)',
        borderColor: 'var(--surface-border)',
      }}
    >
      {/* Row 1 — company name (left) + earning (right) */}
      <div className="flex items-baseline justify-between gap-3">
        <p
          className="text-[14px] font-semibold leading-snug truncate flex-1 min-w-0"
          style={{ color: 'var(--theme-text-primary)' }}
        >
          {wo.partner.code ? `${wo.partner.code} · ${wo.partner.name}` : wo.partner.name}
        </p>
        {hasEarning ? (
          <span
            className="text-[14px] font-bold tabular-nums whitespace-nowrap shrink-0"
            style={{ color: 'var(--theme-brand-primary)' }}
          >
            +{formatCurrencyFull(wo.driverSalary)}
          </span>
        ) : (
          <span className="text-[11px] font-medium whitespace-nowrap shrink-0" style={{ color: 'var(--theme-text-muted)' }}>
            {wo.status === 'PENDING' ? 'Chờ ghép' : '—'}
          </span>
        )}
      </div>

      {/* Row 2 — Điểm lấy (left) + timestamp (right) */}
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <p className="text-[12px] truncate flex-1 min-w-0" style={{ color: 'var(--theme-text-secondary)' }}>
          <span style={{ color: 'var(--theme-text-muted)' }}>Điểm lấy:&nbsp;</span>
          {pickup}
        </p>
        <span className="text-[11px] tabular-nums whitespace-nowrap shrink-0" style={{ color: 'var(--theme-text-muted)' }}>
          {fmtDate(wo.tripDate ?? wo.createdAt)}
        </span>
      </div>

      {/* Row 3 — Điểm trả (left) + status chip (right) */}
      <div className="mt-0.5 flex items-baseline justify-between gap-3">
        <p className="text-[12px] truncate flex-1 min-w-0" style={{ color: 'var(--theme-text-secondary)' }}>
          <span style={{ color: 'var(--theme-text-muted)' }}>Điểm trả:&nbsp;</span>
          {dropoff || '—'}
        </p>
        <div className="shrink-0 relative z-10">
          <StatusPill status={wo.status} variant="driver" compact />
        </div>
      </div>
    </button>
  )
}

function AccountantCard({ wo }: { wo: WorkOrder }) {
  return (
    <div
      className="rounded-lg border p-4"
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
        {wo.partner.code ? `${wo.partner.code} · ${wo.partner.name}` : wo.partner.name}
      </p>

      <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
        {resolveRoute(wo)}
      </p>

      <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
        {wo.driver.name}
      </p>

      <div className="mt-3 pt-2.5 flex items-center justify-between" style={{ borderTop: '1px solid var(--surface-border)' }}>
        <span className="text-xs tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>
          {fmtDate(wo.tripDate ?? wo.createdAt)}
        </span>
        {wo.driverSalary > 0 ? (
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
            +{formatCurrencyFull(wo.driverSalary)}
          </span>
        ) : (
          <span className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
            —
          </span>
        )}
      </div>
    </div>
  )
}
