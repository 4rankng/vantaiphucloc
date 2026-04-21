import { useDriverStore } from '@/hooks/use-driver-store'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrencyShort, getJobStatusBadge, type JobStatus } from '@/data/mockData'

export function ActiveTrip({ jobId }: { jobId: string }) {
  const { jobs, checkpoints, toggleCheckpoint, expenses, navigate } = useDriverStore()
  const job = jobs.find(j => j.id === jobId)
  if (!job) return <p className="p-4">Không tìm thấy chuyến</p>

  const cps = checkpoints[jobId] ?? []
  const doneCount = cps.filter(c => c.done).length
  const tripExpenses = expenses.filter(e => e.jobId === jobId)
  const totalExp = tripExpenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="bg-[var(--theme-bg-secondary)] rounded-xl p-4 border border-[var(--theme-border-default)]">
        <div className="flex justify-between items-start mb-2">
          <h2 className="font-bold text-[var(--theme-text-primary)]">{job.route}</h2>
          <Badge variant={getJobStatusBadge(job.status as JobStatus).variant as any}>{getJobStatusBadge(job.status as JobStatus).label}</Badge>
        </div>
        <div className="text-sm text-[var(--theme-text-muted)] space-y-1">
          <p>📦 {job.containerNumber}</p>
          <p>🚛 {job.tractorPlate} · {job.trailerPlate}</p>
          <p>📏 {job.distanceKm} km</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--theme-text-secondary)] mb-3">Checkpoint ({doneCount}/{cps.length})</h3>
        <div className="space-y-2">
          {cps.map(cp => (
            <div key={cp.id} className="flex items-center gap-3 bg-[var(--theme-bg-secondary)] rounded-xl p-3 border border-[var(--theme-border-default)]">
              <button
                onClick={() => toggleCheckpoint(jobId, cp.id)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-white text-sm ${cp.done ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--theme-border-default)]'}`}
              >
                {cp.done && '✓'}
              </button>
              <div className="flex-1">
                <p className={`text-sm font-medium ${cp.done ? 'text-emerald-600' : 'text-[var(--theme-text-primary)]'}`}>{cp.label}</p>
                {cp.timestamp && <p className="text-xs text-[var(--theme-text-muted)]">{new Date(cp.timestamp).toLocaleTimeString('vi-VN')}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[var(--theme-bg-secondary)] rounded-xl p-4 border border-[var(--theme-border-default)]">
        <h3 className="text-sm font-semibold mb-2">Chi phí chuyến</h3>
        {tripExpenses.length === 0 ? (
          <p className="text-xs text-[var(--theme-text-muted)]">Chưa khai chi phí</p>
        ) : (
          <div className="space-y-1">
            {tripExpenses.map(e => (
              <div key={e.id} className="flex justify-between text-sm">
                <span className="text-[var(--theme-text-muted)]">{e.category}</span>
                <span>{formatCurrencyShort(e.amount)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-[var(--theme-border-default)] mt-2 pt-2 flex justify-between text-sm font-semibold">
          <span>Tổng</span><span>{formatCurrencyShort(totalExp)}</span>
        </div>
      </div>

      <Button onClick={() => navigate('/driver/expenses/new')} className="w-full h-12 rounded-xl font-semibold">Khai chi phí</Button>
    </div>
  )
}
