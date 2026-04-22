import { useDriverStore } from '@/hooks/use-driver-store'
import { InlineStatStrip } from '@/components/shared/InlineStatStrip'
import { formatCurrencyShort } from '@/data/mockData'
import { Package, TruckIcon, MapPin, Fuel, Camera } from 'lucide-react'

export function TripDetail({ jobId }: { jobId: string }) {
  const { jobs, expenses } = useDriverStore()
  const job = jobs.find(j => j.id === jobId)
  if (!job) return <p className="p-4">Không tìm thấy chuyến</p>

  const tripExpenses = expenses.filter(e => e.jobId === jobId)
  const totalExp = tripExpenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="p-4 space-y-5 pb-4">
      
      {/* Route card */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--theme-brand-primary-light)' }}>
            <MapPin className="w-4 h-4" style={{ color: 'var(--theme-brand-primary)' }} />
          </div>
          <span className="text-[15px] font-bold" style={{ color: 'var(--theme-text-primary)' }}>{job.route}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Package className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{job.containerNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <TruckIcon className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{job.tractorPlate} · {job.trailerPlate}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <InlineStatStrip items={[
        { label: 'Quãng đường', value: job.distanceKm + ' km' },
        { label: 'Ngày', value: job.jobDate.slice(5) },
        { label: 'Thu nhập', value: formatCurrencyShort(job.driverFee), highlight: true },
      ]} />

      {/* Expenses */}
      <div>
        <span className="text-xs font-bold block mb-2.5 px-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
          Chi phí chuyến
        </span>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          {tripExpenses.length === 0 ? (
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
                <Fuel className="w-5 h-5" style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} />
              </div>
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Không có chi phí</p>
            </div>
          ) : (
            <div>
              {tripExpenses.map((e, i) => (
                <div key={e.id}>
                  <div className="flex justify-between items-center px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Fuel className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
                      <span className="text-sm" style={{ color: 'var(--theme-text-primary)' }}>{e.category}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyShort(e.amount)}</span>
                  </div>
                  {i < tripExpenses.length - 1 && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }} />}
                </div>
              ))}
              <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-default)' }} />
              <div className="flex justify-between items-center px-4 py-3.5">
                <span className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Tổng</span>
                <span className="text-[15px] font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyShort(totalExp)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photos */}
      <div>
        <span className="text-xs font-bold block mb-2.5 px-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
          Ảnh chuyến
        </span>
        <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
            <Camera className="w-5 h-5" style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} />
          </div>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Chưa có ảnh</p>
        </div>
      </div>
    </div>
  )
}
