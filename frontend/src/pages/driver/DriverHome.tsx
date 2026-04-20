import { GlassCard } from '@/components/shared/GlassCard'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockJobs, mockDrivers, formatCurrencyFull, formatCurrencyShort, getJobStatusBadge } from '@/data/mockData'
import { Route, Wallet, Truck, Phone, MapPin, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DriverHome() {
  const navigate = useNavigate()
  // Driver DRV-001 — Nguyễn Văn Hùng
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
    <div className="space-y-4">
      {/* Welcome */}
      <GlassCard className="p-5 bg-gradient-to-br from-navy-900 to-navy-800 !border-navy-700" style={{ background: 'linear-gradient(135deg, #0a1f33 0%, #0d2b45 100%)', border: 'none' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-white/50 font-medium uppercase tracking-wider">{greeting()}</p>
            <h2 className="text-lg font-bold text-white font-display mt-0.5">{driver.name}</h2>
            <p className="text-[11px] text-white/40 mt-1 font-mono-num">{driver.tractorPlate}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-gold-400/20 flex items-center justify-center text-gold-400 text-xl font-bold">
            {driver.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
        </div>
      </GlassCard>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={<Wallet size={16}/>} label="Hôm nay" value={formatCurrencyShort(todayEarning)} variant="gold" />
        <StatCard icon={<Route size={16}/>} label="Tháng này" value={`${driver.monthlyTrips} chuyến`} />
        <StatCard icon={<Clock size={16}/>} label="Đánh giá" value={`${driver.rating} ⭐`} variant="success" />
      </div>

      {/* Active Trip */}
      {activeTrip ? (
        <GlassCard className="p-4 border-l-4 border-l-emerald-400">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider">Chuyến đang chạy</h3>
            <StatusBadge variant="success" label="Đang chạy" />
          </div>
          <p className="text-sm font-semibold text-navy-900">{activeTrip.route}</p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
            <MapPin size={12} /> <span>{activeTrip.distanceKm} km</span>
            <span>·</span>
            <span>Cont: {activeTrip.containerNumber}</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-navy-100">
            <span className="text-[11px] text-gray-400">Cước tài xế</span>
            <span className="text-sm font-bold text-gold-500 font-mono-num">{formatCurrencyFull(activeTrip.driverFee)}</span>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-navy-50 flex items-center justify-center mx-auto mb-3 text-navy-300">
            <Truck size={24} />
          </div>
          <p className="text-sm font-semibold text-navy-900">Không có chuyến đang chạy</p>
          <p className="text-xs text-gray-400 mt-1">Kiểm tra lại sau</p>
        </GlassCard>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/driver/trips')} className="glass-card rounded-xl p-4 text-left hover:shadow-md transition-shadow active:scale-[0.99]">
          <Route size={20} className="text-navy-600 mb-2" />
          <p className="text-sm font-semibold text-navy-900">Lịch sử chuyến</p>
          <p className="text-[11px] text-gray-400">{myJobs.length} chuyến</p>
        </button>
        <button onClick={() => navigate('/driver/income')} className="glass-card rounded-xl p-4 text-left hover:shadow-md transition-shadow active:scale-[0.99]">
          <Wallet size={20} className="text-gold-500 mb-2" />
          <p className="text-sm font-semibold text-navy-900">Thu nhập</p>
          <p className="text-[11px] text-gray-400">{formatCurrencyShort(monthlyEarning)}</p>
        </button>
      </div>

      {/* Recent trips */}
      <GlassCard className="p-4">
        <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-3">Chuyến gần đây</h3>
        <div className="space-y-2">
          {myJobs.slice(0, 3).map((j) => {
            const s = getJobStatusBadge(j.status)
            return (
              <div key={j.id} className="flex items-center justify-between p-2 rounded-lg bg-navy-50/30">
                <div>
                  <p className="text-[12px] font-semibold text-navy-900">{j.route}</p>
                  <p className="text-[10px] text-gray-400">{j.jobDate}</p>
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
