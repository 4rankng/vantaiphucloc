import { memo } from 'react'
import { Unlink, Trash2, Loader2, ArrowRight } from 'lucide-react'
import { Plate } from '@/components/shared/data-display/Plate'
import { getWorkTypeLabel, formatCurrency, type DeliveredTrip } from '@/data/domain'
import { formatMatchDate } from '@/lib/match-utils'

export interface DeliveredTripMobileCardProps {
  trip: DeliveredTrip
  onTap: (trip: DeliveredTrip) => void
  onUnmatch: (trip: DeliveredTrip) => void
  isUnmatchPending: boolean
  unmatchVariables?: number
  onDelete: (trip: DeliveredTrip) => void
  isDeletePending: boolean
  deleteVariables?: number
}

export const DeliveredTripMobileCard = memo(function DeliveredTripMobileCard({
  trip,
  onTap,
  onUnmatch,
  isUnmatchPending,
  unmatchVariables,
  onDelete,
  isDeletePending,
  deleteVariables,
}: DeliveredTripMobileCardProps) {
  const isMatched = !!trip.bookedTripId
  const isUnmatching = isUnmatchPending && unmatchVariables === trip.id
  const isDeleting = isDeletePending && deleteVariables === trip.id

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onTap(trip)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTap(trip)
        }
      }}
      aria-label={`Mở chi tiết chuyến ${trip.contNumber ?? trip.id}`}
      className="p-3.5 rounded-xl border flex flex-col gap-2.5 transition-colors active:scale-[0.99] touch-manipulation cursor-pointer"
      style={{
        background: 'var(--theme-bg-secondary, #ffffff)',
        borderColor: isMatched
          ? 'color-mix(in srgb, var(--accent-2, #10b981) 20%, transparent)'
          : 'color-mix(in srgb, var(--theme-status-warning, #f59e0b) 15%, transparent)',
      }}
    >
      {/* ── Row 1: Status badge + Cont number + Actions ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="inline-flex items-center gap-1 shrink-0 type-overline tracking-wide px-2 py-0.5 rounded-full"
            style={{
              background: isMatched
                ? 'color-mix(in srgb, var(--accent-2, #10b981) 12%, transparent)'
                : 'color-mix(in srgb, var(--theme-status-warning, #f59e0b) 12%, transparent)',
              color: isMatched
                ? 'var(--accent-2, #10b981)'
                : 'var(--theme-status-warning, #f59e0b)',
            }}
          >
            {isMatched ? 'Đã ghép' : 'Chờ ghép'}
          </span>
          {trip.contNumber ? (
            <span
              className="text-sm font-bold tabular-nums truncate"
              style={{
                color: 'var(--ink)',
                fontFamily: 'var(--theme-font-mono)',
              }}
            >
              {trip.contNumber}
            </span>
          ) : (
            <span className="text-sm" style={{ color: 'var(--ink-3)' }}>
              Chuyến #{trip.id}
            </span>
          )}
          {trip.contType && (
            <span
              className="type-overline tracking-wide px-1.5 py-0.5 rounded shrink-0"
              style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
            >
              {trip.contType}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {!isMatched ? (
            <button
              onClick={() => onDelete(trip)}
              disabled={isDeletePending}
              aria-label={`Xoá chuyến ${trip.contNumber ?? trip.id}`}
              className="min-h-[44px] min-w-[44px] w-8 h-8 flex items-center justify-center rounded-lg border transition-colors touch-target"
              style={{ borderColor: 'var(--theme-border-default)', color: 'var(--ink-3)' }}
              title="Xoá"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--theme-status-error)' }} />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <button
              onClick={() => onUnmatch(trip)}
              disabled={isUnmatchPending}
              aria-label={`Bỏ ghép chuyến ${trip.contNumber ?? trip.id}`}
              className="min-h-[44px] min-w-[44px] w-8 h-8 flex items-center justify-center rounded-lg border transition-colors touch-target"
              style={{ borderColor: 'var(--theme-border-default)', color: 'var(--ink-4)' }}
              title="Bỏ ghép"
            >
              {isUnmatching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--theme-status-warning)' }} />
              ) : (
                <Unlink className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Row 2: Route ── */}
      <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--ink-2)' }}>
        <span className="truncate">{trip.pickupLocation?.name ?? '—'}</span>
        <ArrowRight className="h-3 w-3 shrink-0" style={{ color: 'var(--ink-4)' }} />
        <span className="truncate">{trip.dropoffLocation?.name ?? '—'}</span>
      </div>

      {/* ── Row 3: Client · Date · Driver ── */}
      <div className="flex items-center gap-1.5 flex-wrap text-[12px]" style={{ color: 'var(--ink-3)' }}>
        {(trip.client?.code || trip.client?.name) && (
          <span className="font-semibold" style={{ color: 'var(--ink-2)' }}>
            {trip.client.code || trip.client.name}
          </span>
        )}
        {trip.tripDate && (
          <>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span className="tabular-nums">{formatMatchDate(trip.tripDate)}</span>
          </>
        )}
        {trip.driver?.name && (
          <>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span>{trip.driver.name}</span>
          </>
        )}
        {trip.vehiclePlate && (
          <>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <Plate>{trip.vehiclePlate}</Plate>
          </>
        )}
      </div>

      {/* ── Row 4: Financials ── */}
      <div
        className="grid grid-cols-2 gap-x-3 gap-y-1 pt-2 mt-0.5"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        {trip.revenue > 0 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Cước</span>
            <span
              className="text-[12.5px] font-semibold tabular-nums"
              style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--ink)' }}
            >
              {formatCurrency(trip.revenue)}
            </span>
          </div>
        )}
        {trip.driverSalary > 0 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Lương SL</span>
            <span
              className="text-[12.5px] font-semibold tabular-nums"
              style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--ink)' }}
            >
              {formatCurrency(trip.driverSalary)}
            </span>
          </div>
        )}
      </div>

      {/* ── Row 5: Badges + Vendor + Note ── */}
      {(trip.workType || trip.vendor?.name || trip.vessel || trip.note) && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {trip.workType && (
            <span
              className="type-overline px-1.5 py-0.5 rounded"
              style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
            >
              {getWorkTypeLabel(trip.workType)}
            </span>
          )}
          {trip.vessel && (
            <>
              <span style={{ color: 'var(--ink-4)' }}>·</span>
              <span>Tàu {trip.vessel}</span>
            </>
          )}
          {trip.vendor?.name ? (
            <>
              <span style={{ color: 'var(--ink-4)' }}>·</span>
              <span>{trip.vendor.name}</span>
            </>
          ) : !trip.vendorId ? (
            <>
              <span style={{ color: 'var(--ink-4)' }}>·</span>
              <span>Phúc Lộc</span>
            </>
          ) : null}
        </div>
      )}

      {trip.note && (
        <p className="text-[11px] truncate" style={{ color: 'var(--ink-3)' }}>
          {trip.note}
        </p>
      )}
    </div>
  )
})
