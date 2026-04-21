import { GlassCard } from '@/components/shared/GlassCard'
import { StatCard } from '@/components/shared/StatCard'
import { mockJobs, mockDrivers, formatCurrencyShort } from '@/data/mockData'
import { Wallet, Route, DollarSign } from 'lucide-react'

export default function DriverIncome() {
  const driver = mockDrivers[0]
  const myJobs = mockJobs.filter(j => j.driverId === 'DRV-001')
  const totalEarned = myJobs.reduce((s, j) => s + j.driverFee, 0)
  const completedTrips = myJobs.filter(j => j.status === 'COMPLETED').length

  const weeks = [
    { label: 'Tuần 1 (01–07/04)', trips: 4, amount: 3200000 },
    { label: 'Tuần 2 (08–14/04)', trips: 3, amount: 2400000 },
    { label: 'Tuần 3 (15–21/04)', trips: 5, amount: 4050000 },
  ]

  return (
    <div className="space-y-5">
      {/* Summary */}
      <GlassCard className="p-5 !border-0" style={{ background: 'var(--theme-brand-gradient)', color: 'var(--theme-text-inverse)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={18} style={{color:'var(--theme-brand-secondary)'}} />
          <span className="text-xs font-semibold opacity-60 uppercase tracking-wider">Thu nhập tháng 4</span>
        </div>
        <p className="text-3xl font-bold font-display font-mono-num">{formatCurrencyShort(totalEarned)}</p>
        <p className="text-[11px] opacity-40 mt-1">{completedTrips} chuyến hoàn thành</p>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Route size={20}/>} label="Chuyến tháng" value={`${driver.monthlyTrips}`} />
        <StatCard icon={<DollarSign size={20}/>} label="Cước/chuyến" value={formatCurrencyShort(driver.fixedFeePerTrip)} variant="gold" />
      </div>

      {/* Weekly breakdown */}
      <GlassCard className="p-5">
        <h3 className="text-xs font-bold text-[var(--theme-text-primary)] uppercase tracking-wider mb-3">Theo tuần</h3>
        <div className="space-y-2">
          {weeks.map((w) => (
            <div key={w.label} className="flex items-center justify-between p-4 rounded-xl" style={{background:'var(--theme-bg-tertiary)', border:'1px solid var(--theme-border-light)'}}>
              <div>
                <p className="text-[12px] font-semibold text-[var(--theme-text-primary)]">{w.label}</p>
                <p className="text-[11px] text-[var(--theme-text-muted)]">{w.trips} chuyến</p>
              </div>
              <span className="text-sm font-bold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(w.amount)}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Per trip detail */}
      <GlassCard className="p-5">
        <h3 className="text-xs font-bold text-[var(--theme-text-primary)] uppercase tracking-wider mb-3">Chi tiết theo chuyến</h3>
        <div className="space-y-2">
          {myJobs.filter(j => j.status === 'COMPLETED').map((j) => (
            <div key={j.id} className="flex items-center justify-between p-2 rounded-lg">
              <div>
                <p className="text-[12px] font-medium text-[var(--theme-text-primary)]">{j.route}</p>
                <p className="text-[10px] text-[var(--theme-text-muted)] font-mono-num">{j.jobDate}</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 font-mono-num">+{formatCurrencyShort(j.driverFee)}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
