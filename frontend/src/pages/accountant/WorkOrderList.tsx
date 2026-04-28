import { useEffect, useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input/Input'
import { ContBadge } from '@/components/shared/ContBadge'
import { apiClient } from '@/services/api'
import { useAppStore } from '@/hooks/use-app-store'
import { type WorkOrder, type TripOrder } from '@/data/domain'

export function WorkOrderList() {
  const { navigate } = useAppStore()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [trips, setTrips] = useState<TripOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchPlate, setSearchPlate] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([apiClient.getWorkOrders(), apiClient.getTripOrders()])
      .then(([w, t]) => {
        if (!cancelled) {
          if (w.success) setWorkOrders(w.data)
          if (t.success) setTrips(t.data)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  const matchedIds = useMemo(() => new Set(trips.flatMap(t => t.matchedWorkOrderIds)), [trips])
  const unmatched = useMemo(() => workOrders.filter(w => !matchedIds.has(w.id)), [workOrders, matchedIds])

  const filtered = useMemo(() => {
    if (!searchPlate.trim()) return unmatched
    return unmatched.filter(w => w.tractorPlate.toLowerCase().includes(searchPlate.toLowerCase()))
  }, [unmatched, searchPlate])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
        <Input
          value={searchPlate}
          onChange={e => setSearchPlate(e.target.value)}
          placeholder="Tìm theo biển số..."
          className="text-sm pl-9"
          style={{ background: 'var(--theme-bg-secondary)' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có số công cần đối soát</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(job => (
            <button key={job.id}
              onClick={() => navigate(`/accountant/match/${job.id}`)}
              className="w-full text-left rounded-2xl p-3 transition-all active:scale-[0.98] touch-manipulation"
              style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {job.containers[0] && <ContBadge type={job.containers[0].workType} />}
                  <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                    {job.containers[0]?.containerNumber || job.id}
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' }}>
                  Đối soát tài xế
                </span>
              </div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                {job.driverName} · {job.tractorPlate}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
                {job.clientName} · {job.route}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
