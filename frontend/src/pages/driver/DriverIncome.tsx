import { GlassCard } from '@/components/shared/GlassCard'
import { StatCard } from '@/components/shared/StatCard'
import { mockJobs, mockDrivers, formatCurrencyFull, formatCurrencyShort } from '@/data/mockData'
import { Wallet, TrendingUp, Route, DollarSign } from 'lucide-react'

export default function DriverIncome() {
  const driver = mockDrivers[0]
  const myJobs = mockJobs.filter(j => j.driverId === 'DRV-001')
  const totalEarned = myJobs.reduce((s, j) => s + j.driverFee, 0)
  const completedTrips = myJobs.filter(j => j.status === 'COMPLETED').length

  // Mock weekly breakdown
  const weeks = [
    { label: 'Tuần 1 (01–07/04)', trips: 4, amount: 3200000 },
    { label: 'Tuần 2 (08–14/04)', trips: 3, amount: 2400000 },
    { label: 'Tuần 3 (15–21/04)', trips: 5, amount: 4050000 },
  ]

  return (
    <div className="space-y-4">
      {/* Summary */}
      <GlassCard className="p-5 bg-gradient-to-br from-navy-900 to-navy-800 !border-navy-700" style={{ background: 'linear-gradient(135deg, #0a1f33 0%, #0d2b45 100%)', border: 'none' }}>
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={18} className="text-gold-400" />
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Thu nhập tháng 4</span>
        </div>
        <p className="text-3xl font-bold text-white font-display font-mono-num">{formatCurrencyShort(totalEarned)}</p>
        <p className="text-[11px] text-white/40 mt-1">{completedTrips} chuyến hoàn thành</p>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Route size={16}/>} label="Chuyến tháng" value={driver.monthlyTrips} />
        <StatCard icon={<DollarSign size={16}/>} label="Cước/chuyến" value={formatCurrencyShort(driver.fixedFeePerTrip)} variant="gold" />
      </div>

      {/* Weekly breakdown */}
      <GlassCard className="p-4">
        <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-3">Theo tuần</h3>
        <div className="space-y-2">
          {weeks.map((w) => (
            <div key={w.label} className="flex items-center justify-between p-3 rounded-lg bg-navy-50/30 border border-navy-100/50">
              <div>
                <p className="text-[12px] font-semibold text-navy-900">{w.label}</p>
                <p className="text-[11px] text-gray-400">{w.trips} chuyến</p>
              </div>
              <span className="text-sm font-bold text-navy-900 font-mono-num">{formatCurrencyShort(w.amount)}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Per trip detail */}
      <GlassCard className="p-4">
        <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-3">Chi tiết theo chuyến</h3>
        <div className="space-y-2">
          {myJobs.filter(j => j.status === 'COMPLETED').map((j) => (
            <div key={j.id} className="flex items-center justify-between p-2 rounded-lg">
              <div>
                <p className="text-[12px] font-medium text-navy-900">{j.route}</p>
                <p className="text-[10px] text-gray-400 font-mono-num">{j.jobDate}</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 font-mono-num">+{formatCurrencyShort(j.driverFee)}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
