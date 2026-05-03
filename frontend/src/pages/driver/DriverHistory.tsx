import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
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
            <WorkOrderCard key={wo.id} variant="accountant" data={wo} />
          ))
        )}
      </div>
    </div>
  )
}
