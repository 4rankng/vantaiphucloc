import { useEffect, useState, useMemo } from 'react'
import { Camera, CircleDollarSign } from 'lucide-react'
import { apiClient } from '@/services/api'
import { useAppStore } from '@/hooks/use-app-store'
import { WorkOrderCard } from '@/components/shared/WorkOrderCard'
import { formatCurrencyFull, type WorkOrder, type Pricing } from '@/data/mockData'

export function AccountantDashboard() {
  const { navigate } = useAppStore()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [pricings, setPricings] = useState<Pricing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([apiClient.getWorkOrders(), apiClient.getPricings()])
      .then(([w, p]) => {
        if (!cancelled) {
          if (w.success) setWorkOrders(w.data)
          if (p.success) setPricings(p.data)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  const pending = useMemo(() => workOrders.filter(w => w.status === 'PENDING'), [workOrders])
  const priced = useMemo(() => workOrders.filter(w => w.earning > 0), [workOrders])
  const totalRevenue = useMemo(() => priced.reduce((s, w) => s + w.earning, 0), [priced])

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}
      </div>
    )
  }

  return (
    <div className="pb-6">
      {/* Summary strip */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            {pending.length} chờ đối soát
          </span>
          <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            {priced.length} đã tính
          </span>
        </div>
        {totalRevenue > 0 && (
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
            {formatCurrencyFull(totalRevenue)}
          </span>
        )}
      </div>

      {/* Pending section — what needs attention */}
      {pending.length > 0 && (
        <div className="px-4 mt-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-status-warning)' }}>
              Chờ đối soát ({pending.length})
            </p>
            <button onClick={() => navigate('/accountant/work-orders')} className="text-[11px] font-medium" style={{ color: 'var(--theme-brand-primary)' }}>
              Xem tất cả →
            </button>
          </div>
          <div className="space-y-2">
            {pending.slice(0, 5).map(wo => (
              <WorkOrderCard key={wo.id} data={wo} variant="accountant" />
            ))}
          </div>
        </div>
      )}

      {/* Recent priced */}
      {priced.length > 0 && (
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
              Gần đây ({priced.length})
            </p>
          </div>
          <div className="space-y-2">
            {priced.slice(0, 5).map(wo => (
              <WorkOrderCard key={wo.id} data={wo} variant="accountant" />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {workOrders.length === 0 && (
        <div className="px-4 mt-4">
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <Camera className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có số công nào</p>
          </div>
        </div>
      )}
    </div>
  )
}
