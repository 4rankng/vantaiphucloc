import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrencyFull } from '@/data/domain'
import { FilterPills } from '@/components/shared/FilterPills'
import { DeliveredTripCard } from '@/components/shared/DeliveredTripCard'
import { useDeliveredTrips } from '@/hooks/use-queries'

type FilterValue = 'ALL' | 'PENDING'

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ ghép' },
]

export function DriverHistory() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: _deliveredTrips, isLoading: loading } = useDeliveredTrips({ driverId: user!.id })
  const deliveredTrips = _deliveredTrips?.items ?? []
  const [filter, setFilter] = useState<FilterValue>('ALL')

  const filtered = useMemo(() =>
    filter === 'ALL' ? deliveredTrips : deliveredTrips.filter(w => w.status === filter),
    [deliveredTrips, filter],
  )

  const counts: Record<FilterValue, number> = useMemo(() => ({
    ALL: deliveredTrips.length,
    PENDING: deliveredTrips.filter(w => w.status === 'PENDING').length,
  }), [deliveredTrips])

  const totalEarnings = useMemo(() =>
    filtered.reduce((sum, w) => sum + w.driverSalary, 0),
    [filtered],
  )

  const filterOptions = FILTER_OPTIONS.map(opt => ({ ...opt, count: counts[opt.value] }))

  return (
    <div className="pb-20 space-y-3">
      {/* Back button — inline in page body */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-1"
        style={{ color: 'var(--theme-text-secondary)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Quay lại
      </button>

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
          <div className="col-span-full rounded-lg p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <Camera className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có số cont nào</p>
          </div>
        ) : (
          filtered.map(wo => (
            <DeliveredTripCard key={wo.id} variant="driver" data={wo} onClick={() => navigate(`/driver/delivered-trips/${wo.id}`)} />
          ))
        )}
      </div>
    </div>
  )
}
