import { useDriverStore } from '@/hooks/use-driver-store'
import { formatCurrencyShort } from '@/data/mockData'
import { LiveCard } from '@/components/organisms/LiveCard'
import {
  Truck, Receipt, Wallet, ChevronRight,
  Plus, Package,
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
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
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

/** Level 3: flat list item — low contrast */
function TripListItem({ job, onClick }: { job: any; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left rounded-2xl p-3.5 card-lift"
      style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--theme-bg-tertiary)' }}>
          <Package className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{job.route}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
            {job.containerNumber} · {job.distanceKm}km
          </p>
        </div>
        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
      </div>
    </button>
  )
}

export function DriverHome() {
  const { jobs, expenses, navigate } = useDriverStore()
  const activeJobs = jobs.filter(j => j.status === 'IN_PROGRESS')
  const plannedJobs = jobs.filter(j => j.status === 'PLANNED')
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED')
  const totalEarnings = completedJobs.reduce((s, j) => s + j.driverFee, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netIncome = totalEarnings - totalExpenses

  const activeTrip = activeJobs[0]
  const recentJobs = [...plannedJobs, ...completedJobs.slice(0, 2)].slice(0, 3)

  // Simulated elapsed time
  const elapsed = '1h 23m'

  return (
    <div className="pb-20">
      {/* ── Green header with wallet (Level 2: Summary) ── */}
      <div className="px-4 pt-3 pb-12" style={{ background: 'var(--theme-brand-primary)' }}>
        <div className="rounded-2xl p-4" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-elevated)' }}>
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
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyShort(totalEarnings)}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Chi</p>
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyShort(totalExpenses)}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Chuyến HT</p>
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{completedJobs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── LIVE CARD (Level 1: Active) ── */}
      {activeTrip && (
        <LiveCard
          title={activeTrip.route}
          subtitle={`${activeTrip.containerNumber} · ${activeTrip.distanceKm} km`}
          elapsed={elapsed}
          onClick={() => navigate(`/driver/trips/${activeTrip.id}`)}
        />
      )}

      {/* ── Quick actions ── */}
      <div className="px-4 pb-5">
        <div className="grid grid-cols-4 gap-3">
          <QuickAction icon={Truck} label="Chuyến đi" onClick={() => navigate('/driver/trips')} badge={plannedJobs.length} />
          <QuickAction icon={Plus} label="Khai chi phí" onClick={() => navigate('/driver/expenses/new')} />
          <QuickAction icon={Wallet} label="Thu nhập" onClick={() => navigate('/driver/earnings')} />
          <QuickAction icon={Receipt} label="Chi phí" onClick={() => navigate('/driver/expenses')} />
        </div>
      </div>

      {/* ── Recent trips (Level 3: flat list) ── */}
      {recentJobs.length > 0 && (
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>Gần đây</span>
            <button onClick={() => navigate('/driver/trips')} className="flex items-center gap-0.5 text-xs font-semibold"
              style={{ color: 'var(--theme-brand-primary)' }}>
              Xem tất cả <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2.5">
            {recentJobs.map(j => (
              <TripListItem
                key={j.id}
                job={j}
                onClick={() => navigate(j.status === 'IN_PROGRESS' ? `/driver/trips/${j.id}` : `/driver/trips/${j.id}/detail`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
