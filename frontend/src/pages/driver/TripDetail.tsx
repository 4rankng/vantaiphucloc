import { useDriverStore } from '@/hooks/use-driver-store'
import { InlineStatStrip } from '@/components/shared/InlineStatStrip'
import { formatCurrencyShort } from '@/data/mockData'
import {
  Package, TruckIcon, MapPin, Fuel, Camera,
} from 'lucide-react'

export function TripDetail({ jobId }: { jobId: string }) {
  const { jobs, expenses } = useDriverStore()
  const job = jobs.find(j => j.id === jobId)
  if (!job) return <p className="p-4">Không tìm thấy chuyến</p>

  const tripExpenses = expenses.filter(e => e.jobId === jobId)
  const totalExp = tripExpenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="p-4 space-y-4 pb-4">
      {/* Route card */}
      <div className="rounded-xl p-4 border" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{job.route}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Package className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{job.containerNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <TruckIcon className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{job.tractorPlate} · {job.trailerPlate}</span>
          </div>
        </div>
      </div>

      {/* Inline stat strip */}
      <InlineStatStrip items={[
        { label: 'Quãng đường', value: job.distanceKm + ' km' },
        { label: 'Ngày', value: job.jobDate.slice(5) },
        { label: 'Thu nhập', value: formatCurrencyShort(job.driverFee), highlight: true },
      ]} />

      {/* Expenses */}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider block mb-2 px-0.5" style={{ color: 'var(--theme-text-muted)' }}>
          Chi phí chuyến
        </span>
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
          {tripExpenses.length === 0 ? (
            <div className="p-4 text-center">
              <Fuel className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} />
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Không có chi phí</p>
            </div>
          ) : (
            <div>
              {tripExpenses.map((e, i) => (
                <div key={e.id}>
                  <div className="flex justify-between items-center px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Fuel className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
                      <span className="text-sm" style={{ color: 'var(--theme-text-primary)' }}>{e.category}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyShort(e.amount)}</span>
                  </div>
                  {i < tripExpenses.length - 1 && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }} />}
                </div>
              ))}
              <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-default)' }} />
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tổng</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyShort(totalExp)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photos */}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider block mb-2 px-0.5" style={{ color: 'var(--theme-text-muted)' }}>
          Ảnh chuyến
        </span>
        <div className="rounded-xl border p-4 text-center" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
          <Camera className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} />
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Chưa có ảnh</p>
        </div>
      </div>
    </div>
  )
}
