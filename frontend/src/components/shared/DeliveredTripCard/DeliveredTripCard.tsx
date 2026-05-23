import { Clock, CheckCircle, Lock } from 'lucide-react'
import { formatCurrencyFull, getWorkTypeLabel, type DeliveredTrip } from '@/data/domain'
import { formatDate } from '@/lib/format'
import { resolveRoute } from '@/lib/route-utils'

type CardVariant = 'driver' | 'accountant'

interface DeliveredTripCardBaseProps {
  data: DeliveredTrip
  variant?: CardVariant
}

interface DriverVariantProps extends DeliveredTripCardBaseProps {
  variant: 'driver'
  onClick: () => void
}

interface AccountantVariantProps extends DeliveredTripCardBaseProps {
  variant?: 'accountant'
  onClick?: never
}

type DeliveredTripCardProps = DriverVariantProps | AccountantVariantProps

export function DeliveredTripCard(props: DeliveredTripCardProps) {
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

/** Single cont chip — shows contNumber + contType badge */
function ContainerChip({ wo }: { wo: DeliveredTrip }) {
  if (!wo.contNumber && !wo.contType) return null
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-bold font-mono" style={{ color: 'var(--theme-text-primary)' }}>
        {wo.contNumber || '—'}
      </span>
      {wo.contType && (
        <span
          className="text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0"
          style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)', color: 'var(--theme-brand-primary)' }}
        >
          {getWorkTypeLabel(wo.contType) ?? wo.contType}
        </span>
      )}
    </div>
  )
}

function StatusPill({ matched, variant, compact = false }: { matched: boolean; variant: 'driver' | 'accountant'; compact?: boolean }) {
  const padding = compact ? 'px-2 py-0.5' : 'px-2.5 py-1'
  const iconSize = compact ? 'w-2.5 h-2.5' : 'w-3 h-3'
  if (!matched) {
    return (
      <span
        className={`flex items-center gap-1 text-[11px] font-semibold ${padding} rounded-full shrink-0`}
        style={{
          background: 'color-mix(in srgb, var(--theme-status-warning) 12%, transparent)',
          color: 'var(--theme-status-warning)',
        }}
      >
        <Clock className={iconSize} />
        Chờ ghép
      </span>
    )
  }
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

/**
 * Driver delivered-trip card — 3-row layout per spec.
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │ Hapag-Lloyd Việt Nam                  +450.000 đ       │  ← line 1
 *   │ Điểm đi:  Cát Lái                   09-05 · 08:30     │  ← line 2
 *   │ Điểm đến:  Đồng Nai                       [Đã ghép]    │  ← line 3
 *   └────────────────────────────────────────────────────────┘
 *
 * Container info is intentionally omitted — it only appears on the detail
 * page when the user taps the card.
 *
 * Whole card is the tap target → opens detail page.
 */
function DriverCard({ wo, onClick }: { wo: DeliveredTrip; onClick: () => void }) {
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
          {wo.client.code ? `${wo.client.code} · ${wo.client.name}` : wo.client.name}
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
            {!wo.bookedTripId ? 'Chờ ghép' : '—'}
          </span>
        )}
      </div>

      {/* Row 2 — Điểm đi (left) + timestamp (right) */}
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <p className="text-[12px] truncate flex-1 min-w-0" style={{ color: 'var(--theme-text-secondary)' }}>
          <span style={{ color: 'var(--theme-text-muted)' }}>Điểm đi:&nbsp;</span>
          {pickup}
        </p>
        <span className="text-[11px] tabular-nums whitespace-nowrap shrink-0" style={{ color: 'var(--theme-text-muted)' }}>
          {fmtDate(wo.tripDate ?? wo.createdAt)}
        </span>
      </div>

      {/* Row 3 — Điểm đến (left) + status chip (right) */}
      <div className="mt-0.5 flex items-baseline justify-between gap-3">
        <p className="text-[12px] truncate flex-1 min-w-0" style={{ color: 'var(--theme-text-secondary)' }}>
          <span style={{ color: 'var(--theme-text-muted)' }}>Điểm đến:&nbsp;</span>
          {dropoff || '—'}
        </p>
        <div className="shrink-0 relative z-10">
          <StatusPill matched={!!wo.bookedTripId} variant="driver" compact />
        </div>
      </div>
    </button>
  )
}

function AccountantCard({ wo }: { wo: DeliveredTrip }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        background: 'var(--surface-bg)',
        borderColor: 'var(--surface-border)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <ContainerChip wo={wo} />
        <StatusPill matched={!!wo.bookedTripId} variant="accountant" />
      </div>

      <p className="text-sm font-bold leading-snug" style={{ color: 'var(--theme-text-primary)' }}>
        {wo.driver ? `${wo.driver.name}${wo.driver.vehicle?.plate ? ` · ${wo.driver.vehicle.plate}` : ''}` : (wo.vehiclePlate ? `Xe ngoài · ${wo.vehiclePlate}` : 'Xe ngoài')}
      </p>

      <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
        {wo.client.code ? `${wo.client.code} · ` : ''}{wo.client.name}
      </p>

      <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
        {resolveRoute(wo)}
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
