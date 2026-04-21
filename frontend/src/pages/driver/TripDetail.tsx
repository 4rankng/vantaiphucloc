import { useDriverStore } from '@/hooks/use-driver-store'
import { Badge } from '@/components/ui/Badge'
import { formatCurrencyShort } from '@/data/mockData'

export function TripDetail({ jobId }: { jobId: string }) {
  const { jobs, expenses } = useDriverStore()
  const job = jobs.find(j => j.id === jobId)
  if (!job) return <p className="p-4">Không tìm thấy chuyến</p>

  const tripExpenses = expenses.filter(e => e.jobId === jobId)
  const totalExp = tripExpenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="p-4 space-y-4 pb-4">
      <div className="bg-[var(--theme-bg-secondary)] rounded-xl p-4 border border-[var(--theme-border-default)]">
        <h2 className="font-bold text-[var(--theme-text-primary)] mb-2">{job.route}</h2>
        <div className="text-sm text-[var(--theme-text-muted)] space-y-1">
          <p>📦 {job.containerNumber}</p>
          <p>🚛 {job.tractorPlate} · {job.trailerPlate}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Quãng đường', value: job.distanceKm + ' km' },
          { label: 'Thời gian', value: job.jobDate },
          { label: 'Thu nhập', value: formatCurrencyShort(job.driverFee) },
        ].map(s => (
          <div key={s.label} className="bg-[var(--theme-bg-secondary)] rounded-xl p-3 border border-[var(--theme-border-default)] text-center">
            <p className="text-xs text-[var(--theme-text-muted)]">{s.label}</p>
            <p className="font-bold text-[var(--theme-text-primary)] text-sm mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--theme-bg-secondary)] rounded-xl p-4 border border-[var(--theme-border-default)]">
        <h3 className="text-sm font-semibold mb-2">Chi phí</h3>
        {tripExpenses.length === 0 ? <p className="text-xs text-[var(--theme-text-muted)]">Không có</p> : (
          <div className="space-y-1">
            {tripExpenses.map(e => (
              <div key={e.id} className="flex justify-between text-sm"><span className="text-[var(--theme-text-muted)]">{e.category}</span><span>{formatCurrencyShort(e.amount)}</span></div>
            ))}
            <div className="border-t border-[var(--theme-border-default)] mt-2 pt-2 flex justify-between text-sm font-semibold"><span>Tổng</span><span>{formatCurrencyShort(totalExp)}</span></div>
          </div>
        )}
      </div>

      <div className="bg-[var(--theme-bg-secondary)] rounded-xl p-4 border border-[var(--theme-border-default)]">
        <h3 className="text-sm font-semibold mb-2">Ảnh</h3>
        <p className="text-xs text-[var(--theme-text-muted)]">Chưa có ảnh (tính năng chụp ảnh)</p>
      </div>
    </div>
  )
}
