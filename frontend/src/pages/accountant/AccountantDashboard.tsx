import { useEffect, useState, useMemo } from 'react'
import { Plus, Building2, Route, Settings, Wallet, ChevronDown, Receipt } from 'lucide-react'
import { useAppStore } from '@/hooks/use-app-store'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, type WorkOrder, type Driver, type TripOrder } from '@/data/domain'
import { WorkOrderJobCard } from '@/components/shared/WorkOrderJobCard'
import { TripOrderCard } from '@/components/shared/TripOrderCard'

const QUICK_ACTIONS = [
  { label: 'Tạo chuyến', icon: Plus, path: '/accountant/create-trip' },
  { label: 'Bảng giá', icon: Receipt, path: '/accountant/pricing' },
  { label: 'Khách hàng', icon: Building2, path: '/accountant/clients' },
  { label: 'Cung đường', icon: Route, path: '/accountant/routes' },
  { label: 'Thiết lập', icon: Settings, path: '/accountant/salary-setup' },
] as const

export function AccountantDashboard() {
  const { navigate } = useAppStore()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [trips, setTrips] = useState<TripOrder[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showAllJobs, setShowAllJobs] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([apiClient.getWorkOrders(), apiClient.getTripOrders(), apiClient.getDrivers()])
      .then(([w, t, d]) => {
        if (!cancelled) {
          if (w.success) setWorkOrders(w.data)
          if (t.success) setTrips(t.data)
          if (d.success) setDrivers(d.data)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  const matchedIds = useMemo(() => new Set(trips.flatMap(t => t.matchedWorkOrderIds)), [trips])
  const unmatchedJobs = useMemo(() => workOrders.filter(w => !matchedIds.has(w.id)), [workOrders, matchedIds])
  const pendingTrips = useMemo(() => trips.filter(t => t.status === 'DRAFT'), [trips])
  const matchedJobs = useMemo(() => workOrders.filter(w => matchedIds.has(w.id)), [workOrders, matchedIds])

  const salaryByDriver = useMemo(() => {
    const map = new Map<string, { name: string; plate: string; totalJobs: number; totalSalary: number }>()
    matchedJobs.forEach(job => {
      const existing = map.get(job.driverId) ?? { name: job.driverName, plate: job.tractorPlate, totalJobs: 0, totalSalary: 0 }
      existing.totalJobs += 1
      existing.totalSalary += job.earning
      map.set(job.driverId, existing)
    })
    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }))
  }, [matchedJobs])

  const INITIAL_SHOW = 3
  const visibleJobs = showAllJobs ? unmatchedJobs : unmatchedJobs.slice(0, INITIAL_SHOW)

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}
      </div>
    )
  }

  return (
    <div className="pb-6">
      {/* Quick actions */}
      <div className="px-4 pt-3 grid grid-cols-5 gap-2">
        {QUICK_ACTIONS.map(({ label, icon: Icon, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-[0.95] touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
          >
            <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: 'var(--theme-brand-primary-light)' }}>
              <Icon className="h-3.5 w-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
            </div>
            <span className="text-xs font-medium text-center leading-tight px-0.5" style={{ color: 'var(--theme-text-primary)' }}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Driver salary section */}
      {salaryByDriver.length > 0 && (
        <div className="px-4 mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--theme-text-muted)' }}>
            <Wallet className="w-3 h-3 inline mr-1" />
            Lương tài xế (kỳ hiện tại)
          </p>
          <div className="space-y-2">
            {salaryByDriver.map(d => (
              <div key={d.id}
                className="flex items-center justify-between rounded-2xl p-3"
                style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{d.name}</p>
                  <p className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>{d.plate} · {d.totalJobs} công</p>
                </div>
                <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
                  {formatCurrencyFull(d.totalSalary)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Can doi soat — unmatched jobs */}
      {unmatchedJobs.length > 0 && (
        <div className="px-4 mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--theme-status-warning)' }}>
            Đối soát tài xế ({unmatchedJobs.length})
          </p>
          <div className="space-y-2">
            {visibleJobs.map(job => (
              <WorkOrderJobCard
                key={job.id}
                job={job}
                status="unmatched"
                onClick={() => navigate(`/accountant/match/${job.id}`)}
              />
            ))}
          </div>
          {unmatchedJobs.length > INITIAL_SHOW && !showAllJobs && (
            <button
              onClick={() => setShowAllJobs(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-2 rounded-2xl text-xs font-medium transition-all active:scale-[0.98] touch-manipulation"
              style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-muted)' }}>
              <ChevronDown className="w-3.5 h-3.5" /> Xem thêm
            </button>
          )}
        </div>
      )}

      {/* Chuyến đã khớp */}
      {matchedJobs.length > 0 && (
        <div className="px-4 mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--theme-status-success)' }}>
            Chuyến đã khớp ({matchedJobs.length})
          </p>
          <div className="space-y-2">
            {matchedJobs.map(job => (
              <WorkOrderJobCard key={job.id} job={job} status="matched" />
            ))}
          </div>
        </div>
      )}

      {/* Trips pending doi soat */}
      {pendingTrips.length > 0 && (
        <div className="px-4 mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--theme-status-warning)' }}>
            Đối soát khách hàng ({pendingTrips.length})
          </p>
          <div className="space-y-2">
            {pendingTrips.map(trip => (
              <TripOrderCard
                key={trip.id}
                trip={trip}
                onClick={() => navigate(`/accountant/match-trip/${trip.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
