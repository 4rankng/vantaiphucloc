import { Home, MapPin, Camera, Wallet, User } from 'lucide-react'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockJobs, formatCurrencyFull } from '@/data/mockData'

const bottomNavItems = [
  { label: 'Trang chủ', icon: <Home size={20} />, path: '/driver' },
  { label: 'Chuyến xe', icon: <MapPin size={20} />, path: '/driver/trips' },
  { label: 'Chụp ảnh', icon: <Camera size={20} />, path: '/driver/photos' },
  { label: 'Thu nhập', icon: <Wallet size={20} />, path: '/driver/income' },
  { label: 'Tài khoản', icon: <User size={20} />, path: '/driver/account' },
]

export default function DriverTrips() {
  const myJobs = mockJobs.filter(j => j.driverId === 'DRV-001')

  return (
    <div className="min-h-screen bg-[hsl(220,20%,98%)]">
      <header className="sticky top-0 z-40 bg-white border-b border-[hsl(220,10%,92%)] px-4 py-3">
        <h2 className="text-lg font-bold text-[#0a1f33]">Chuyến xe</h2>
      </header>
      <main className="px-4 py-4 space-y-3 pb-24">
        {myJobs.map((job) => {
          const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
            IN_PROGRESS: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Đang chạy' },
            PLANNED: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Lên kế hoạch' },
            COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Hoàn thành' },
          }
          const s = statusConfig[job.status] || statusConfig.COMPLETED
          return (
            <GlassCard key={job.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#0a2540]">{job.id}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">{job.trailerType}</span>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
              </div>
              <p className="text-base font-semibold text-[#0a1f33]">{job.route}</p>
              <p className="text-sm text-[hsl(220,10%,55%)] mt-0.5">{job.description}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-[hsl(220,10%,55%)]">
                <span>🚛 {job.tractorPlate}</span>
                <span>📦 {job.containerNumber}</span>
                <span>{job.distanceKm}km</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-[hsl(220,10%,92%)]">
                <span className="text-xs text-[hsl(220,10%,55%)]">{job.jobDate}</span>
                <span className="text-sm font-bold text-[#0a2540]">{formatCurrencyFull(job.revenue)}</span>
              </div>
            </GlassCard>
          )
        })}
      </main>
      <MobileBottomNav items={bottomNavItems} />
    </div>
  )
}
