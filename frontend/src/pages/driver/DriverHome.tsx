import { useDriverStore } from '@/hooks/use-driver-store'
import { InlineStatStrip } from '@/components/shared/InlineStatStrip'
import { formatCurrencyShort } from '@/data/mockData'
import {
  Truck, Receipt, Wallet, MapPin, Clock, ChevronRight,
  Navigation, Package, Fuel, Plus, TrendingUp, Bell,
} from 'lucide-react'

function QuickAction({ icon: Icon, label, onClick, badge }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  onClick: () => void
  badge?: number
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 relative">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center card-lift"
        style={{ background: 'var(--theme-brand-primary-light)' }}>
        <Icon className="w-6 h-6" style={{ color: 'var(--theme-brand-primary)' }} />
      </div>
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: 'var(--theme-status-error)', color: 'var(--theme-text-inverse)' }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      <span className="text-[11px] font-medium leading-tight text-center" style={{ color: 'var(--theme-text-secondary)' }}>
        {label}
      </span>
    </button>
  )
}

function RecentTrip({ job, onClick }: { job: any; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left rounded-2xl p-3.5 card-lift"
      style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: job.status === 'IN_PROGRESS' ? 'var(--theme-brand-primary-light)' : 'var(--theme-bg-tertiary)' }}>
          {job.status === 'IN_PROGRESS'
            ? <Navigation className="w-5 h-5" style={{ color: 'var(--theme-brand-primary)' }} />
            : <Package className="w-5 h-5" style={{ color: 'var(--theme-text-muted)' }} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{job.route}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
            {job.containerNumber} · {job.distanceKm}km
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold" style={{ color: 'var(--theme-brand-primary)' }}>
            {formatCurrencyShort(job.driverFee)}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
            {job.status === 'IN_PROGRESS' ? 'Đang chạy' : job.status === 'PLANNED' ? 'Chờ nhận' : 'Hoàn thành'}
          </p>
        </div>
      </div>
    </button>
  )
}

export function DriverHome() {
  const { jobs, expenses, notifications, navigate } = useDriverStore()
  const activeJobs = jobs.filter(j => j.status === 'IN_PROGRESS')
  const plannedJobs = jobs.filter(j => j.status === 'PLANNED')
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED')
  const totalEarnings = completedJobs.reduce((s, j) => s + j.driverFee, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netIncome = totalEarnings - totalExpenses
  const unreadCount = notifications.filter(n => !n.read).length

  // Active trip (if any) — contextual shortcut
  const activeTrip = activeJobs[0]
  // Recent 3 jobs (active + planned first, then completed)
  const recentJobs = [...activeJobs, ...plannedJobs, ...completedJobs.slice(0, 3)].slice(0, 4)

  return (
    <div className="pb-20">
      {/* Wallet — extends green topbar */}
      <div className="px-4 pt-3 pb-5" style={{ background: 'var(--theme-brand-primary)' }}>
        {/* Wallet card — always visible, trust-first */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>Thu nhập tháng này</span>
            <button onClick={() => navigate('/driver/earnings')} className="flex items-center gap-0.5 text-xs font-semibold"
              style={{ color: 'var(--theme-brand-primary)' }}>
              Chi tiết <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
            {formatCurrencyShort(netIncome)}
          </p>
          <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Thu</p>
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-status-success)' }}>{formatCurrencyShort(totalEarnings)}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Chi</p>
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-status-error)' }}>{formatCurrencyShort(totalExpenses)}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Chuyến</p>
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{completedJobs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual shortcut — active trip */}
      {activeTrip && (
        <div className="px-4 pb-4">
          <button
            onClick={() => navigate(`/driver/trips/${activeTrip.id}`)}
            className="w-full text-left rounded-2xl p-4 card-lift"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)', boxShadow: 'var(--theme-shadow-elevated)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Đang chạy</p>
                  <p className="text-xs mt-0.5" style={{ opacity: 0.8 }}>{activeTrip.route}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" style={{ opacity: 0.7 }} />
            </div>
          </button>
        </div>
      )}

      {/* Quick actions grid — 4 max */}
      <div className="px-4 pb-5">
        <div className="grid grid-cols-4 gap-3">
          <QuickAction icon={Truck} label="Chuyến đi" onClick={() => navigate('/driver/trips')} badge={plannedJobs.length} />
          <QuickAction icon={Plus} label="Khai chi phí" onClick={() => navigate('/driver/expenses/new')} />
          <QuickAction icon={Wallet} label="Thu nhập" onClick={() => navigate('/driver/earnings')} />
          <QuickAction icon={Receipt} label="Chi phí" onClick={() => navigate('/driver/expenses')} />
        </div>
      </div>

      {/* Recent activity */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>Hoạt động gần đây</span>
          <button onClick={() => navigate('/driver/trips')} className="flex items-center gap-0.5 text-xs font-semibold"
            style={{ color: 'var(--theme-brand-primary)' }}>
            Xem tất cả <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2.5">
          {recentJobs.map(j => (
            <RecentTrip
              key={j.id}
              job={j}
              onClick={() => navigate(j.status === 'IN_PROGRESS' ? `/driver/trips/${j.id}` : `/driver/trips/${j.id}/detail`)}
            />
          ))}
          {recentJobs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có hoạt động</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
