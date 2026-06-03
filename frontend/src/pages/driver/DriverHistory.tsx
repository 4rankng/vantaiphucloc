import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrencyFull } from '@/data/domain'
import { FilterPills } from '@/components/shared/navigation/FilterPills'
import { DeliveredTripCard } from '@/components/shared/cards/DeliveredTripCard'
import { useDeliveredTrips } from '@/hooks/use-queries'
import { DRIVER_HISTORY_FILTER_OPTIONS as FILTER_OPTIONS, type FilterValue } from '@/lib/filter-options'

export function DriverHistory() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: _deliveredTrips, isLoading: loading } = useDeliveredTrips({ driverId: user!.id })
  const deliveredTrips = useMemo(() => _deliveredTrips?.items ?? [], [_deliveredTrips])
  const [filter, setFilter] = useState<FilterValue>('ALL')

  const filtered = useMemo(() =>
    filter === 'ALL' ? deliveredTrips : deliveredTrips.filter(w => !w.bookedTripId),
    [deliveredTrips, filter],
  )

  const counts: Record<FilterValue, number> = useMemo(() => ({
    ALL: deliveredTrips.length,
    PENDING: deliveredTrips.filter(w => !w.bookedTripId).length,
  }), [deliveredTrips])

  const totalEarnings = useMemo(() =>
    filtered.reduce((sum, w) => sum + w.driverSalary, 0),
    [filtered],
  )

  const filterOptions = FILTER_OPTIONS.map(opt => ({ ...opt, count: counts[opt.value] }))

  return (
    <div className="pb-20 space-y-3">
      {/* Back button + page title — keep them on a single line so the user
          always knows where they are even after the back chevron. */}
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm font-medium shrink-0"
          style={{ color: 'var(--theme-text-secondary)' }}
          aria-label="Quay lại"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1
          className="text-base font-bold truncate"
          style={{ color: 'var(--theme-text-primary)', letterSpacing: '-0.01em' }}
        >
          Lịch sử chuyến đi
        </h1>
      </div>

      <FilterPills<FilterValue> options={filterOptions} value={filter} onChange={setFilter} />

      {totalEarnings > 0 && (
        <div className="rounded-lg px-4 py-2.5 flex items-center justify-between"
          style={{ background: 'var(--theme-brand-primary-light)' }}>
          <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>
            Tổng ({filtered.length} cont)
          </span>
          <span className="text-base font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
            {formatCurrencyFull(totalEarnings)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
        {loading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }} />
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div
            className="col-span-full rounded-xl p-8 text-center flex flex-col items-center justify-center"
            style={{ background: 'var(--theme-bg-secondary)', minHeight: '40vh' }}
          >
            <Truck className="w-8 h-8 mb-2" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Chưa có chuyến nào</p>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
              Quay lại trang chủ và nhấn + để tạo chuyến mới.
            </p>
          </div>
        ) : (
          filtered.map(wo => (
            <DeliveredTripCard key={wo.id} variant="driver" data={wo} onClick={() => navigate(`/driver/job/${wo.id}`)} />
          ))
        )}
      </div>
    </div>
  )
}
