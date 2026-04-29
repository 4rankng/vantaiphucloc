import { useEffect, useState, useMemo } from 'react'
import { Camera } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, type WorkOrder } from '@/data/domain'
import { FilterPills } from '@/components/shared/FilterPills'
import { WorkOrderCard } from '@/components/shared/WorkOrderCard'

type FilterValue = 'ALL' | 'PENDING'

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ đối soát' },
]

export function DriverHistory() {
  const { user } = useAuth()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterValue>('ALL')

  useEffect(() => {
    let cancelled = false
    apiClient.getWorkOrders({ driverId: user!.id }).then(res => {
      if (!cancelled && res.success) setWorkOrders(res.data)
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [user!.id])

  const filtered = useMemo(() =>
    filter === 'ALL' ? workOrders : workOrders.filter(w => w.status === filter),
    [workOrders, filter],
  )

  const counts: Record<FilterValue, number> = useMemo(() => ({
    ALL: workOrders.length,
    PENDING: workOrders.filter(w => w.status === 'PENDING').length,
  }), [workOrders])

  const totalEarnings = useMemo(() =>
    filtered.reduce((sum, w) => sum + w.earning, 0),
    [filtered],
  )

  const filterOptions = FILTER_OPTIONS.map(opt => ({ ...opt, count: counts[opt.value] }))

  return (
    <div className="pb-6" style={{ background: 'var(--theme-bg-primary)' }}>
      {/* Filter tabs */}
      <div className="px-4 pt-3 pb-2">
        <FilterPills<FilterValue> options={filterOptions} value={filter} onChange={setFilter} />
      </div>

      {/* Total earnings bar */}
      {totalEarnings > 0 && (
        <div className="px-4 mb-3">
          <div className="rounded-xl px-4 py-2.5 flex items-center justify-between"
            style={{ background: 'var(--theme-brand-primary-light)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>
              Tổng ({filtered.length} công)
            </span>
            <span className="text-base font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
              {formatCurrencyFull(totalEarnings)}
            </span>
          </div>
        </div>
      )}

      <div className="px-4 space-y-2">
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <Camera className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có số công nào</p>
          </div>
        ) : (
          filtered.map(wo => (
            <WorkOrderCard key={wo.id} variant="accountant" data={wo} />
          ))
        )}
      </div>
    </div>
  )
}
