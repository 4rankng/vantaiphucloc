import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkOrders, useTripOrders } from '@/hooks/use-queries'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { TripOrderCard } from '@/components/shared/TripOrderCard'
import { WorkOrderJobCard } from '@/components/shared/WorkOrderJobCard'
import { useMonthParams } from './use-month-params'
import { AlertTriangle, Wallet, ArrowRight, Receipt, Handshake, Route, Settings } from 'lucide-react'

const PREVIEW_COUNT = 5

const QUICK_ACTIONS = [
  { label: 'Bảng giá', icon: Receipt, path: '/accountant/pricing' },
  { label: 'Đối tác', icon: Handshake, path: '/accountant/partners' },
  { label: 'Cung đường', icon: Route, path: '/accountant/routes' },
  { label: 'Kỳ lương', icon: Settings, path: '/accountant/salary-setup' },
] as const

export function AccountantDashboard() {
  const navigate = useNavigate()
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()

  const { data: workOrders = [], isLoading: loadingWO } = useWorkOrders({ dateFrom, dateTo })
  const { data: trips = [], isLoading: loadingTrips } = useTripOrders({ dateFrom, dateTo })

  const loading = loadingWO || loadingTrips

  const pendingWOs = useMemo(() =>
    workOrders.filter(w => w.status === 'PENDING'),
    [workOrders],
  )

  const driverCount = useMemo(() => {
    const ids = new Set<number>()
    workOrders.forEach(w => { if (w.status !== 'CANCELLED') ids.add(w.driverId) })
    return ids.size
  }, [workOrders])

  const tripsForMonth = useMemo(() =>
    [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, PREVIEW_COUNT),
    [trips],
  )

  const driverTripsForMonth = useMemo(() =>
    [...workOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, PREVIEW_COUNT),
    [workOrders],
  )

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      {/* ── Month navigator ── */}
      <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />

      {/* ── Pending action cards ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Chờ đối soát */}
        <button
          onClick={() => navigate('/accountant/work-orders')}
          className="text-left rounded-2xl p-4 transition-all active:scale-[0.98] touch-manipulation"
          style={{
            background: pendingWOs.length > 0 ? 'var(--theme-status-warning-light)' : 'var(--theme-bg-secondary)',
            border: `1px solid ${pendingWOs.length > 0 ? 'var(--theme-status-warning)' : 'var(--theme-border-default)'}`,
            boxShadow: 'var(--theme-shadow-card)',
          }}
        >
          <AlertTriangle className="w-5 h-5 mb-2" style={{ color: pendingWOs.length > 0 ? 'var(--theme-status-warning)' : 'var(--theme-text-muted)' }} />
          <p className="text-2xl font-bold tabular-nums" style={{ color: pendingWOs.length > 0 ? 'var(--theme-status-warning)' : 'var(--theme-text-primary)' }}>
            {pendingWOs.length}
          </p>
          <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Chờ đối soát</p>
        </button>

        {/* Lương kỳ này */}
        <button
          onClick={() => navigate('/accountant/salary-setup')}
          className="text-left rounded-2xl p-4 transition-all active:scale-[0.98] touch-manipulation"
          style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', boxShadow: 'var(--theme-shadow-card)' }}
        >
          <Wallet className="w-5 h-5 mb-2" style={{ color: 'var(--theme-brand-primary)' }} />
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
            {driverCount}
          </p>
          <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Lương kỳ này</p>
        </button>
      </div>

      {/* ── Quick action chips ── */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map(({ label, icon: Icon, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95 touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', boxShadow: 'var(--theme-shadow-card)' }}
          >
            <Icon className="w-5 h-5" style={{ color: 'var(--theme-brand-primary)' }} />
            <span className="text-[11px] font-semibold leading-tight text-center" style={{ color: 'var(--theme-text-secondary)' }}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Preview: Lệnh điều phối ── */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', boxShadow: 'var(--theme-shadow-card)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
            Lệnh điều phối
          </p>
          <button
            onClick={() => navigate(`/accountant/trips?month=${month}&year=${year}`)}
            className="flex items-center gap-1 text-xs font-semibold touch-manipulation"
            style={{ color: 'var(--theme-brand-primary)' }}
          >
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {tripsForMonth.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: 'var(--theme-text-muted)' }}>
            Chưa có lệnh điều phối trong kỳ
          </p>
        ) : (
          <div className="space-y-2">
            {tripsForMonth.map(trip => (
              <TripOrderCard
                key={trip.id}
                trip={trip}
                onClick={() => navigate(`/accountant/trip/${trip.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Preview: Chuyến đã đi ── */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', boxShadow: 'var(--theme-shadow-card)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
            Chuyến đã đi
          </p>
          <button
            onClick={() => navigate(`/accountant/driver-trips?month=${month}&year=${year}`)}
            className="flex items-center gap-1 text-xs font-semibold touch-manipulation"
            style={{ color: 'var(--theme-brand-primary)' }}
          >
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {driverTripsForMonth.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: 'var(--theme-text-muted)' }}>
            Chưa có chuyến nào trong kỳ
          </p>
        ) : (
          <div className="space-y-2">
            {driverTripsForMonth.map(job => (
              <WorkOrderJobCard
                key={job.id}
                job={job}
                status={job.status === 'PENDING' ? 'unmatched' : job.status === 'MATCHED' ? 'matched' : 'matched'}
                onClick={() => navigate(`/accountant/match/${job.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
