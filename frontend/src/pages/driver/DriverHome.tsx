import { Home, MapPin, Camera, Wallet, User } from 'lucide-react'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockJobs, formatCurrencyFull } from '@/data/mockData'
import type { ReactNode } from 'react'

const bottomNavItems = [
  { label: 'Trang chủ', icon: <Home size={20} />, path: '/driver' },
  { label: 'Chuyến xe', icon: <MapPin size={20} />, path: '/driver/trips' },
  { label: 'Chụp ảnh', icon: <Camera size={20} />, path: '/driver/photos' },
  { label: 'Thu nhập', icon: <Wallet size={20} />, path: '/driver/income' },
  { label: 'Tài khoản', icon: <User size={20} />, path: '/driver/account' },
]

function QuickButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[hsl(220,10%,94%)] hover:bg-[hsl(220,10%,88%)] transition-colors active:scale-95 flex-1">
      {icon}
      <span className="text-xs font-medium text-[#0a1f33]">{label}</span>
    </button>
  )
}

export default function DriverHome() {
  const myJobs = mockJobs.filter(j => j.driverId === 'DRV-001')
  const activeJob = myJobs.find(j => j.status === 'IN_PROGRESS')
  const completedToday = myJobs.filter(j => j.status === 'COMPLETED').length
  const todayIncome = myJobs.filter(j => j.status === 'COMPLETED').reduce((s, j) => s + j.driverFee, 0)

  return (
    <div className="min-h-screen bg-[hsl(220,20%,98%)]">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#0a2540] to-[#0d3158] text-white px-4 py-4 safe-area-top">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Xin chào,</p>
            <p className="text-lg font-bold">Nguyễn Văn Hùng</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#d4a839] flex items-center justify-center text-white font-bold">H</div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 pb-24">
        {/* Today's income */}
        <GlassCard className="p-4">
          <p className="text-sm text-[hsl(220,10%,55%)]">Thu nhập hôm nay</p>
          <p className="text-2xl font-bold text-[#0a2540] mt-1 font-['Manrope',sans-serif]">{formatCurrencyFull(todayIncome)}</p>
          <p className="text-xs text-[hsl(220,10%,55%)] mt-1">{completedToday} chuyến hoàn thành • Cước: {formatCurrencyFull(800000)}/chuyến</p>
        </GlassCard>

        {/* Active job */}
        {activeJob && (
          <GlassCard className="p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-[#0a2540]">Chuyến hiện tại</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Đang chạy</span>
            </div>
            <p className="text-base font-semibold text-[#0a1f33]">{activeJob.route}</p>
            <p className="text-sm text-[hsl(220,10%,55%)] mt-1">{activeJob.description}</p>
            <div className="mt-2 space-y-1 text-xs text-[hsl(220,10%,55%)]">
              <p>🚛 {activeJob.tractorPlate} + {activeJob.trailerPlate} ({activeJob.trailerType})</p>
              <p>📦 Cont: {activeJob.containerNumber}</p>
              <p>👤 Khách: {activeJob.clientName}</p>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[hsl(220,10%,92%)]">
              <span className="text-sm text-[hsl(220,10%,55%)]">Ngày: {activeJob.jobDate}</span>
              <span className="text-sm font-bold text-[#d4a839]">Cước: {formatCurrencyFull(activeJob.revenue)}</span>
            </div>
          </GlassCard>
        )}

        {/* Quick actions */}
        <div className="flex gap-3">
          <QuickButton icon={<Camera size={24} className="text-[#0a2540]" />} label="Chụp ảnh" />
          <QuickButton icon={<svg className="w-6 h-6 text-[#0a2540]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} label="Khai báo chi phí" />
          <QuickButton icon={<MapPin size={24} className="text-[#0a2540]" />} label="Cập nhật vị trí" />
        </div>

        {/* My jobs */}
        <div>
          <h3 className="text-sm font-bold text-[#0a1f33] mb-3">Chuyến của tôi</h3>
          <div className="space-y-3">
            {myJobs.map((job) => {
              const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                IN_PROGRESS: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Đang chạy' },
                PLANNED: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Lên kế hoạch' },
                COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Hoàn thành' },
              }
              const s = statusConfig[job.status] || statusConfig.COMPLETED
              return (
                <GlassCard key={job.id} className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#0a2540]">{job.id}</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">{job.trailerType}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
                  </div>
                  <p className="text-sm text-[#0a1f33] font-medium">{job.route}</p>
                  <p className="text-xs text-[hsl(220,10%,55%)] mt-0.5">{job.description} • Cont: {job.containerNumber}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-[hsl(220,10%,55%)]">{job.jobDate} • {job.distanceKm}km</span>
                    <span className="text-xs font-semibold text-[#0a2540]">Cước: {formatCurrencyFull(job.revenue)}</span>
                  </div>
                </GlassCard>
              )
            })}
            {myJobs.length === 0 && <p className="text-sm text-[hsl(220,10%,55%)] text-center py-4">Chưa có chuyến nào</p>}
          </div>
        </div>
      </main>
      <MobileBottomNav items={bottomNavItems} />
    </div>
  )
}
