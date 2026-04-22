import { useDriverStore } from '@/hooks/use-driver-store'
import { formatCurrencyShort } from '@/data/mockData'
import { LiveCard } from '@/components/organisms/LiveCard'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { TripCard } from '@/components/shared/TripCard'
import { ExpenseRow } from '@/components/shared/ExpenseRow'
import { LinkButton, DetailLink, ActionPill } from '@/components/shared/LinkButton'
import { Receipt, Clock, MapPin, Plus, Navigation } from 'lucide-react'

export function DriverHome() {
  const { jobs, expenses, navigate } = useDriverStore()

  const activeJobs = jobs.filter(j => j.status === 'IN_PROGRESS')
  const plannedJobs = jobs.filter(j => j.status === 'PLANNED')
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED')
  const pendingExpenses = expenses.filter(e => e.status === 'DRAFT')

  const totalEarnings = completedJobs.reduce((s, j) => s + j.driverFee, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netIncome = totalEarnings - totalExpenses

  const activeTrip = activeJobs[0]
  const displayTrips = [...plannedJobs.slice(0, 2), ...completedJobs.slice(0, 1)].slice(0, 3)

  const expenseByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {})
  const topExpenses = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).slice(0, 4)

  const elapsed = '1h 23m'

  return (
    <div className="pb-6">
      {/* ── WALLET HERO ── */}
      <div className="px-4 pt-3 pb-14" style={{ background: 'var(--theme-brand-primary)' }}>
        <div className="rounded-2xl p-4" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-elevated)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>Thu nhập tháng này</span>
            <DetailLink onClick={() => navigate('/driver/earnings')} />
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

      {/* ── LIVE CARD ── */}
      {activeTrip && (
        <div className="-mt-6 px-4 mb-8">
          <LiveCard
            title={activeTrip.route}
            subtitle={`${activeTrip.containerNumber} · ${activeTrip.distanceKm} km`}
            elapsed={elapsed}
            onClick={() => navigate(`/driver/trips/${activeTrip.id}`)}
          />
        </div>
      )}

      {/* ── CHUYẾN ĐI ── */}
      <div className="px-4 mb-5">
        <SectionHeader title="Chuyến đi">
          <DetailLink onClick={() => navigate('/driver/trips')} />
        </SectionHeader>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-2xl p-3" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-warning)' }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>Chờ nhận</span>
            </div>
            <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{plannedJobs.length}</p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Navigation className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-success)' }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>Đang chạy</span>
            </div>
            <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{activeJobs.length}</p>
          </div>
        </div>
        {displayTrips.length > 0 ? (
          <div className="space-y-2.5">
            {displayTrips.map(j => (
              <TripCard key={j.id} job={j}
                onClick={() => navigate(j.status === 'IN_PROGRESS' ? `/driver/trips/${j.id}` : `/driver/trips/${j.id}/detail`)} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <MapPin className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có chuyến nào</p>
          </div>
        )}
      </div>

      {/* ── CHI PHÍ ── */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>Chi phí</span>
          <div className="flex items-center gap-3">
            <ActionPill onClick={() => navigate('/driver/expenses/new')} icon={Plus}>Khai chi phí</ActionPill>
            <DetailLink onClick={() => navigate('/driver/expenses')} />
          </div>
        </div>
        {topExpenses.length > 0 ? (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
            {topExpenses.map(([cat, amount], i) => (
              <ExpenseRow key={cat} category={cat} amount={amount} isLast={i === topExpenses.length - 1} />
            ))}
            {pendingExpenses.length > 0 && (
              <div className="px-4 py-2.5 border-t" style={{ borderColor: 'var(--theme-border-light)' }}>
                <span className="text-xs" style={{ color: 'var(--theme-status-warning)' }}>
                  {pendingExpenses.length} chi phí chờ duyệt
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <Receipt className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có chi phí</p>
          </div>
        )}
      </div>
    </div>
  )
}
