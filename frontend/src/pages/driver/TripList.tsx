import { useDriverStore } from '@/hooks/use-driver-store'
import { Badge } from '@/components/ui/Badge'
import { formatCurrencyShort, getJobStatusBadge, type JobStatus } from '@/data/mockData'

function TripCard({ job, onClick }: { job: any; onClick: () => void }) {
  const s = getJobStatusBadge(job.status as JobStatus)
  return (
    <button onClick={onClick} className="w-full text-left bg-[var(--theme-bg-secondary)] rounded-xl p-4 shadow-sm border border-[var(--theme-border-default)] active:scale-[0.98] transition-transform">
      <div className="flex justify-between items-start mb-2">
        <span className="font-semibold text-[var(--theme-text-primary)] text-sm">{job.route}</span>
        <Badge variant={s.variant as any} className="text-[11px]">{s.label}</Badge>
      </div>
      <div className="text-xs text-[var(--theme-text-muted)] space-y-1">
        <p>📦 {job.containerNumber}</p>
        <div className="flex justify-between">
          <span>{job.distanceKm} km</span>
          <span className="text-[var(--theme-brand-primary)] font-semibold">{formatCurrencyShort(job.driverFee)}</span>
        </div>
      </div>
    </button>
  )
}

export function TripList() {
  const { jobs, navigate } = useDriverStore()
  const active = jobs.filter(j => j.status === 'IN_PROGRESS')
  const planned = jobs.filter(j => j.status === 'PLANNED')
  const completed = jobs.filter(j => j.status === 'COMPLETED')

  const renderList = (items: any[], type: 'active' | 'detail') => (
    items.length === 0 ? (
      <p className="text-center text-[var(--theme-text-muted)] text-sm py-8">Không có chuyến nào</p>
    ) : (
      <div className="space-y-3 px-4 pb-4">
        {items.map(j => (
          <TripCard key={j.id} job={j} onClick={() => navigate(type === 'active' ? `/driver/trips/${j.id}` : `/driver/trips/${j.id}/detail`)} />
        ))}
      </div>
    )
  )

  return (
    <div>
      <div className="flex gap-0 border-b border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)]">
        {(['active', 'planned', 'completed'] as const).map((tab, i) => {
          const counts = [active.length, planned.length, completed.length]
          const labels = ['Đang chạy', 'Chờ nhận', 'Lịch sử']
          return (
            <button key={tab} className="flex-1 py-3 text-center text-sm font-medium border-b-2 border-transparent text-[var(--theme-text-muted)] data-[active=true]:border-[var(--theme-brand-primary)] data-[active=true]:text-[var(--theme-text-primary)]" data-active={i === 0 ? true : undefined}>
              {labels[i]} {counts[i] > 0 && <span className="ml-1 text-xs opacity-60">({counts[i]})</span>}
            </button>
          )
        })}
      </div>
      {renderList(active, 'active')}
    </div>
  )
}
