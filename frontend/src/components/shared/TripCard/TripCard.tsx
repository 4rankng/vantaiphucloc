import { Badge } from '@/components/ui/Badge'
import { Package } from 'lucide-react'
import { formatCurrencyShort, getJobStatusBadge, type JobStatus } from '@/data/domain'

export function TripCard({ job, onClick }: { job: { status: string; route: string; containerNumber: string; distanceKm: number; jobDate: string; driverFee: number }; onClick: () => void }) {
  const s = getJobStatusBadge(job.status as JobStatus)
  return (
    <button onClick={onClick} className="w-full text-left rounded-2xl p-4 card-lift"
      style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base truncate" style={{ color: 'var(--theme-text-primary)' }}>{job.route}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Package className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{job.containerNumber}</span>
          </div>
        </div>
        <Badge variant={s.variant as 'default' | 'success' | 'warning' | 'danger' | 'info'} className="text-xs flex-shrink-0 ml-2">{s.label}</Badge>
      </div>
      <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{job.distanceKm} km</span>
          <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{job.jobDate}</span>
        </div>
        <span className="text-base font-bold" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyShort(job.driverFee)}</span>
      </div>
    </button>
  )
}
