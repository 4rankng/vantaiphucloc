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
    <div className="space-y-6">
      {/* Welcome — identity, gradient header */}
      <div className="px-5 py-6 rounded-xl text-white" style={{ background: 'var(--theme-brand-gradient)' }}>
        <p className="text-xs opacity-50 font-medium uppercase tracking-wider">{greeting()}</p>
        <h2 className="text-lg font-bold mt-0.5">{driver.name}</h2>
        <p className="text-xs opacity-40 font-mono-num mt-0.5">{driver.tractorPlate}</p>
      </div>

      {/* Earnings hero — THE thing drivers care about */}
      <div className="px-5 py-6 rounded-xl bg-white">
        <p className="text-xs text-gray-400 font-medium">Thu nhập hôm nay</p>
        <p className="text-[26px] font-bold text-gray-900 tracking-tight mt-1 font-mono-num tabular-nums">
          {formatCurrencyShort(todayEarning)}
        </p>
        <p className="text-xs text-gray-400 mt-1">Tháng này: {formatCurrencyShort(monthlyEarning)} · {driver.monthlyTrips} chuyến</p>
      </div>

      {/* Active trip — prominent */}
      {activeTrip ? (
        <div className="px-5 py-5 rounded-xl bg-white border-l-[3px] border-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Chuyến đang chạy</h3>
            <StatusBadge variant="success" label="Đang chạy" />
          </div>
          <p className="text-sm font-semibold text-gray-900">{activeTrip.route}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin size={11}/> {activeTrip.distanceKm} km
            </span>
            <span className="text-xs text-gray-400">Cont: {activeTrip.containerNumber}</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">Cước</span>
            <span className="text-sm font-bold text-emerald-600 font-mono-num tabular-nums">{formatCurrencyFull(activeTrip.driverFee)}</span>
          </div>
        </div>
      ) : (
        <div className="px-5 py-8 rounded-xl bg-white text-center">
          <Truck size={24} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-900">Không có chuyến đang chạy</p>
        </div>
      )}

      {/* Quick actions — no borders, clean cards */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/driver/trips')} className="px-4 py-4 rounded-xl bg-white text-left hover:bg-gray-50 transition-colors">
          <Route size={18} className="text-gray-400 mb-1.5" />
          <p className="text-sm font-semibold text-gray-900">Lịch sử chuyến</p>
          <p className="text-xs text-gray-400 mt-0.5">{myJobs.length} chuyến</p>
        </button>
        <button onClick={() => navigate('/driver/income')} className="px-4 py-4 rounded-xl bg-white text-left hover:bg-gray-50 transition-colors">
          <Wallet size={18} className="text-emerald-500 mb-1.5" />
          <p className="text-sm font-semibold text-gray-900">Thu nhập</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatCurrencyShort(monthlyEarning)}</p>
        </button>
      </div>

      {/* Recent trips — compact list */}
      <div className="px-5 py-5 rounded-xl bg-white">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Gần đây</h3>
        <div className="space-y-0">
          {myJobs.slice(0, 3).map((j) => {
            const s = getJobStatusBadge(j.status)
            return (
              <div key={j.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors">
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-gray-900">{j.route}</span>
                  <span className="text-xs text-gray-400 ml-1.5">{j.jobDate}</span>
                </div>
                <StatusBadge variant={s.variant} label={s.label} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
