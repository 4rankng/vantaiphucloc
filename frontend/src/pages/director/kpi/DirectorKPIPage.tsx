import { GlassCard } from '@/components/shared/GlassCard'
import { mockDrivers, formatCurrencyShort, formatCurrencyFull } from '@/data/mockData'
import { Trophy, Star, Route, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'

export default function DirectorKPIPage() {
  const sorted = [...mockDrivers].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
  const totalTrips = sorted.reduce((s, d) => s + d.monthlyTrips, 0)
  const totalRevenue = sorted.reduce((s, d) => s + d.monthlyRevenue, 0)
  const avgRating = (sorted.reduce((s, d) => s + d.rating, 0) / sorted.length).toFixed(1)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Trophy size={18}/>} label="Tài xế" value={`${sorted.length}`} />
        <StatCard icon={<Route size={18}/>} label="Tổng chuyến" value={`${totalTrips}`} variant="info" />
        <StatCard icon={<TrendingUp size={18}/>} label="Tổng doanh thu" value={formatCurrencyShort(totalRevenue)} variant="gold" />
        <StatCard icon={<Star size={18}/>} label="Đánh giá TB" value={`${avgRating} ⭐`} variant="success" />
      </div>

      {/* Ranking */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-display mb-4">Xếp hạng tài xế</h3>
        <div className="space-y-3">
          {sorted.map((d, i) => (
            <div key={d.id} className="flex items-center gap-4 p-3 rounded-xl border border-[var(--theme-border-default)]/50 hover:var(--theme-bg-tertiary) transition-colors">
              <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                i === 0 ? 'badge-gold' : i === 1 ? 'bg-gray-200 text-[var(--theme-text-secondary)]' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-[var(--theme-text-muted)]'
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[var(--theme-text-primary)]">{d.name}</p>
                  <span className="text-[10px] font-semibold text-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] px-1.5 py-0.5 rounded font-mono-num">{d.tractorPlate}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--theme-text-muted)]">
                  <span>{d.monthlyTrips} chuyến</span>
                  <span>⭐ {d.rating}</span>
                  <span>Cước/chuyến: {formatCurrencyShort(d.fixedFeePerTrip)}</span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-navy-800 to-navy-600" style={{ width: `${(d.monthlyRevenue / sorted[0].monthlyRevenue) * 100}%` }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(d.monthlyRevenue)}</p>
                <p className="text-[11px] text-[var(--theme-text-muted)]">doanh thu</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
