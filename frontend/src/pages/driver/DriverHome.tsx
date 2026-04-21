import { GlassCard } from '@/components/shared/GlassCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatCard } from '@/components/shared/StatCard'
import { mockJobs, mockDrivers, formatCurrencyFull, formatCurrencyShort, getJobStatusBadge } from '@/data/mockData'
import { Route, Wallet, Truck, MapPin } from 'lucide-react'
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
      {/* Welcome header — identity, not duplicate data */}
      <GlassCard className="p-4 !border-0" style={{ background: 'var(--theme-brand-gradient)', color: 'var(--theme-text-inverse)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] opacity-50 font-medium uppercase tracking-wider">{greeting()}</p>
            <h2 className="text-base font-bold mt-0.5">{driver.name}</h2>
            <p className="text-[11px] opacity-40 font-mono-num mt-0.5">{driver.tractorPlate}</p>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold" style={{background:'rgba(255,255,255,0.15)', color:'var(--theme-brand-secondary)'}}>
            {driver.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
        </div>
      </GlassCard>

      {/* Earnings — the ONE thing drivers care about */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Wallet size={16}/>} label="Hôm nay" value={formatCurrencyShort(todayEarning)} unit="VNĐ" variant="gold" />
        <StatCard icon={<Route size={16}/>} label="Tháng này" value={`${driver.monthlyTrips}`} unit="chuyến" />
      </div>

      {/* Active trip — prominent if exists */}
      {activeTrip ? (
        <GlassCard className="p-4 relative overflow-hidden" style={{borderLeft:'3px solid var(--theme-status-success)'}}>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{color:'var(--theme-text-muted)'}}>Chuyến đang chạy</h3>
            <StatusBadge variant="success" label="Đang chạy" />
          </div>
          <p className="text-[13px] font-semibold" style={{color:'var(--theme-text-primary)'}}>{activeTrip.route}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[11px]" style={{color:'var(--theme-text-muted)'}}>
              <MapPin size={11}/> {activeTrip.distanceKm} km
            </span>
            <span className="text-[11px]" style={{color:'var(--theme-text-muted)'}}>Cont: {activeTrip.containerNumber}</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2" style={{borderTop:'1px solid var(--theme-border-light)'}}>
            <span className="text-[10px]" style={{color:'var(--theme-text-muted)'}}>Cước</span>
            <span className="text-[13px] font-bold font-mono-num" style={{color:'var(--theme-brand-secondary)'}}>{formatCurrencyFull(activeTrip.driverFee)}</span>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="p-5 text-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{background:'var(--theme-bg-tertiary)'}}>
            <Truck size={20} style={{color:'var(--theme-text-muted)'}} />
          </div>
          <p className="text-[13px] font-semibold" style={{color:'var(--theme-text-primary)'}}>Không có chuyến đang chạy</p>
        </GlassCard>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard hover className="p-3" onClick={() => navigate('/driver/trips')}>
          <Route size={16} style={{color:'var(--theme-text-secondary)'}} />
          <p className="text-[12px] font-semibold mt-1" style={{color:'var(--theme-text-primary)'}}>Lịch sử chuyến</p>
          <p className="text-[10px]" style={{color:'var(--theme-text-muted)'}}>{myJobs.length} chuyến</p>
        </GlassCard>
        <GlassCard hover className="p-3" onClick={() => navigate('/driver/income')}>
          <Wallet size={16} style={{color:'var(--theme-brand-secondary)'}} />
          <p className="text-[12px] font-semibold mt-1" style={{color:'var(--theme-text-primary)'}}>Thu nhập</p>
          <p className="text-[10px]" style={{color:'var(--theme-text-muted)'}}>{formatCurrencyShort(monthlyEarning)}</p>
        </GlassCard>
      </div>

      {/* Recent trips — compact */}
      <GlassCard className="p-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{color:'var(--theme-text-muted)'}}>Gần đây</h3>
        <div className="space-y-1">
          {myJobs.slice(0, 3).map((j) => {
            const s = getJobStatusBadge(j.status)
            return (
              <div key={j.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors">
                <div className="min-w-0">
                  <span className="text-[12px] font-semibold" style={{color:'var(--theme-text-primary)'}}>{j.route}</span>
                  <span className="text-[10px] ml-1" style={{color:'var(--theme-text-muted)'}}>{j.jobDate}</span>
                </div>
                <StatusBadge variant={s.variant} label={s.label} />
              </div>
            )
          })}
        </div>
      </GlassCard>
    </div>
  )
}
