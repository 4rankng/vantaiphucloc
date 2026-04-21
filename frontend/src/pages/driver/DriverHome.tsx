import { GlassCard } from '@/components/shared/GlassCard'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockJobs, mockDrivers, formatCurrencyFull, formatCurrencyShort, getJobStatusBadge } from '@/data/mockData'
import { Route, Wallet, Truck, Phone, MapPin, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DriverHome() {
  const navigate = useNavigate()
  const driver = mockDrivers[0]
  const myJobs = mockJobs.filter(j => j.driverId === 'DRV-001')
  const activeTrip = myJobs.find(j => j.status === 'IN_PROGRESS')
  const todayEarning = myJobs.filter(j => j.jobDate === '2025-04-20').reduce((s, j) => s + j.driverFee, 0)
  const monthlyEarning = driver.monthlyTrips * driver.fixedFeePerTrip

  const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
  }

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <GlassCard className="p-5 !border-0" style={{ background: 'var(--theme-brand-gradient)', color: 'var(--theme-text-inverse)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] opacity-50 font-medium uppercase tracking-wider">{greeting()}</p>
            <h2 className="text-lg font-bold font-display mt-0.5">{driver.name}</h2>
            <p className="text-[11px] opacity-40 mt-1 font-mono-num">{driver.tractorPlate}</p>
          </div>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{background:'rgba(255,255,255,0.15)', color:'var(--theme-brand-secondary)'}}>
            {driver.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
        </div>
      </GlassCard>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Wallet size={20}/>} label="Hôm nay" value={formatCurrencyShort(todayEarning)} variant="gold" />
        <StatCard icon={<Route size={20}/>} label="Tháng này" value={`${driver.monthlyTrips} chuyến`} />
        <StatCard icon={<Clock size={20}/>} label="Đánh giá" value={`${driver.rating} ⭐`} variant="success" />
      </div>

      {/* Active Trip */}
      {activeTrip ? (
        <GlassCard className="p-5">
          <div className="w-1 h-full absolute left-0 top-0 rounded-l-xl" style={{background:'var(--theme-status-success)'}} />
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[var(--theme-text-primary)] uppercase tracking-wider">Chuyến đang chạy</h3>
            <StatusBadge variant="success" label="Đang chạy" />
          </div>
          <p className="text-sm font-semibold text-[var(--theme-text-primary)]">{activeTrip.route}</p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-[var(--theme-text-muted)]">
            <MapPin size={12} /> <span>{activeTrip.distanceKm} km</span>
            <span>·</span>
            <span>Cont: {activeTrip.containerNumber}</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3" style={{borderTop:'1px solid var(--theme-border-light)'}}>
            <span className="text-[11px] text-[var(--theme-text-muted)]">Cước tài xế</span>
            <span className="text-sm font-bold font-mono-num" style={{color:'var(--theme-brand-secondary)'}}>{formatCurrencyFull(activeTrip.driverFee)}</span>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="p-6 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{background:'var(--theme-bg-tertiary)'}}>
            <Truck size={24} className="text-[var(--theme-text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--theme-text-primary)]">Không có chuyến đang chạy</p>
          <p className="text-xs text-[var(--theme-text-muted)] mt-1">Kiểm tra lại sau</p>
        </GlassCard>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard hover className="p-4" onClick={() => navigate('/driver/trips')}>
          <Route size={20} className="mb-2 text-[var(--theme-text-secondary)]" />
          <p className="text-sm font-semibold text-[var(--theme-text-primary)]">Lịch sử chuyến</p>
          <p className="text-[11px] text-[var(--theme-text-muted)]">{myJobs.length} chuyến</p>
        </GlassCard>
        <GlassCard hover className="p-4" onClick={() => navigate('/driver/income')}>
          <Wallet size={20} className="mb-2" style={{color:'var(--theme-brand-secondary)'}} />
          <p className="text-sm font-semibold text-[var(--theme-text-primary)]">Thu nhập</p>
          <p className="text-[11px] text-[var(--theme-text-muted)]">{formatCurrencyShort(monthlyEarning)}</p>
        </GlassCard>
      </div>

      {/* Recent trips */}
      <GlassCard className="p-5">
        <h3 className="text-xs font-bold text-[var(--theme-text-primary)] uppercase tracking-wider mb-3">Chuyến gần đây</h3>
        <div className="space-y-2">
          {myJobs.slice(0, 3).map((j) => {
            const s = getJobStatusBadge(j.status)
            return (
              <div key={j.id} className="flex items-center justify-between p-3 rounded-xl" style={{background:'var(--theme-bg-tertiary)'}}>
                <div>
                  <p className="text-[12px] font-semibold text-[var(--theme-text-primary)]">{j.route}</p>
                  <p className="text-[10px] text-[var(--theme-text-muted)]">{j.jobDate}</p>
                </div>
                <div className="text-right">
                  <StatusBadge variant={j.status === 'IN_PROGRESS' ? 'success' : 'info'} label={s.label} />
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>
    </div>
  )
}
