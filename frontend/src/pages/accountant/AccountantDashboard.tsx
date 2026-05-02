import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkOrders, useTripOrders } from '@/hooks/use-queries'
import { formatCurrencyFull } from '@/data/domain'
import { AlertTriangle, CheckCircle2, Clock, Wallet, ArrowRight, Plus } from 'lucide-react'

export function AccountantDashboard() {
  const navigate = useNavigate()
  const { data: workOrders = [], isLoading: loadingWO } = useWorkOrders()
  const { data: trips = [], isLoading: loadingTrips } = useTripOrders()

  const loading = loadingWO || loadingTrips

  const matchedIds = useMemo(() => new Set(trips.flatMap(t => t.matchedWorkOrderIds)), [trips])
  const unmatchedWOs = useMemo(() => workOrders.filter(w => w.status === 'PENDING'), [workOrders])
  const pendingTrips = useMemo(() => trips.filter(t => t.status === 'PENDING' && !t.isConfirmed), [trips])
  const unconfirmedMatched = useMemo(() => trips.filter(t => t.status === 'COMPLETED' && !t.isConfirmed), [trips])

  const salaryByDriver = useMemo(() => {
    const map = new Map<number, { name: string; plate: string; totalJobs: number; totalSalary: number }>()
    workOrders.filter(w => matchedIds.has(w.id)).forEach(job => {
      const existing = map.get(job.driverId) ?? { name: job.driverName, plate: job.tractorPlate, totalJobs: 0, totalSalary: 0 }
      existing.totalJobs += 1
      existing.totalSalary += job.earning
      map.set(job.driverId, existing)
    })
    return Array.from(map.values())
  }, [workOrders, matchedIds])

  const totalSalary = useMemo(() => salaryByDriver.reduce((s, d) => s + d.totalSalary, 0), [salaryByDriver])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      {/* ── Primary action ── */}
      <button
        onClick={() => navigate('/accountant/create-trip')}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all active:scale-[0.99] touch-manipulation"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold">Tạo lệnh điều hành mới</span>
        </div>
        <ArrowRight className="w-4 h-4 opacity-70" />
      </button>

      {/* ── Action cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Unmatched WOs */}
        <button
          onClick={() => navigate('/accountant/work-orders')}
          className="text-left rounded-2xl p-4 transition-all active:scale-[0.98] touch-manipulation"
          style={{
            background: unmatchedWOs.length > 0 ? 'var(--theme-status-warning-light)' : 'var(--theme-bg-secondary)',
            border: `1px solid ${unmatchedWOs.length > 0 ? 'var(--theme-status-warning)' : 'var(--theme-border-default)'}`,
            boxShadow: 'var(--theme-shadow-card)',
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: unmatchedWOs.length > 0 ? 'var(--theme-status-warning)' : 'var(--theme-text-muted)' }} />
            <ArrowRight className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
          </div>
          <p className="text-2xl font-bold tabular-nums" style={{ color: unmatchedWOs.length > 0 ? 'var(--theme-status-warning)' : 'var(--theme-text-primary)' }}>
            {unmatchedWOs.length}
          </p>
          <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
            {unmatchedWOs.length === 1 ? 'Phiếu chưa khớp' : 'Phiếu chưa khớp'}
          </p>
          {unmatchedWOs.length > 0 && (
            <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--theme-status-warning)' }}>
              Cần đối soát tài xế →
            </p>
          )}
        </button>

        {/* Pending trips (waiting client reconciliation) */}
        <button
          onClick={() => navigate('/accountant/work-orders?tab=client')}
          className="text-left rounded-2xl p-4 transition-all active:scale-[0.98] touch-manipulation"
          style={{
            background: pendingTrips.length > 0 ? '#FEF3C7' : 'var(--theme-bg-secondary)',
            border: `1px solid ${pendingTrips.length > 0 ? '#F59E0B' : 'var(--theme-border-default)'}`,
            boxShadow: 'var(--theme-shadow-card)',
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <Clock className="w-5 h-5 mt-0.5" style={{ color: pendingTrips.length > 0 ? '#D97706' : 'var(--theme-text-muted)' }} />
            <ArrowRight className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
          </div>
          <p className="text-2xl font-bold tabular-nums" style={{ color: pendingTrips.length > 0 ? '#D97706' : 'var(--theme-text-primary)' }}>
            {pendingTrips.length}
          </p>
          <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Lệnh chờ đối soát KH</p>
          {pendingTrips.length > 0 && (
            <p className="text-xs mt-1 font-semibold" style={{ color: '#D97706' }}>Cần chốt với khách →</p>
          )}
        </button>

        {/* Salary summary */}
        <button
          onClick={() => navigate('/accountant/salary-setup')}
          className="text-left rounded-2xl p-4 transition-all active:scale-[0.98] touch-manipulation"
          style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', boxShadow: 'var(--theme-shadow-card)' }}
        >
          <div className="flex items-start justify-between mb-2">
            <Wallet className="w-5 h-5 mt-0.5" style={{ color: 'var(--theme-brand-primary)' }} />
            <ArrowRight className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
          </div>
          <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
            {formatCurrencyFull(totalSalary)}
          </p>
          <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
            Lương kỳ này · {salaryByDriver.length} tài xế
          </p>
        </button>
      </div>

      {/* ── Matched but unconfirmed ── */}
      {unconfirmedMatched.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-status-success)' }}>
              <CheckCircle2 className="w-3 h-3 inline mr-1" />
              Đã khớp, chờ chốt KH ({unconfirmedMatched.length})
            </p>
            <button onClick={() => navigate('/accountant/trips')} className="text-xs font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>
              Xem tất cả →
            </button>
          </div>
          <div className="space-y-2">
            {unconfirmedMatched.slice(0, 3).map(trip => (
              <button
                key={trip.id}
                onClick={() => navigate(`/accountant/trip/${trip.id}`)}
                className="w-full text-left rounded-2xl p-3 transition-all active:scale-[0.98] touch-manipulation"
                style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', boxShadow: 'var(--theme-shadow-card)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{trip.clientName}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{trip.route} · {trip.tractorPlate}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2"
                    style={{ background: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)' }}>
                    Đã khớp
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {unmatchedWOs.length === 0 && pendingTrips.length === 0 && unconfirmedMatched.length === 0 && (
        <div className="flex flex-col items-center text-center gap-2 py-10">
          <CheckCircle2 className="w-10 h-10" style={{ color: 'var(--theme-status-success)', opacity: 0.5 }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mọi thứ đã xong!</p>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Không có tác vụ nào đang chờ xử lý.</p>
        </div>
      )}
    </div>
  )
}
