import { useState } from 'react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { Search, Package, MapPin, Navigation, Clock, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { formatCurrencyShort, getJobStatusBadge, type JobStatus } from '@/data/mockData'

function TripCard({ job, onClick }: { job: any; onClick: () => void }) {
  const s = getJobStatusBadge(job.status as JobStatus)
  return (
    <button onClick={onClick} className="w-full text-left rounded-2xl p-4 card-lift"
      style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] truncate" style={{ color: 'var(--theme-text-primary)' }}>{job.route}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Package className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{job.containerNumber}</span>
          </div>
        </div>
        <Badge variant={s.variant as any} className="text-[11px] flex-shrink-0 ml-2">{s.label}</Badge>
      </div>
      <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{job.distanceKm} km</span>
          <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{job.jobDate}</span>
        </div>
        <span className="text-[15px] font-bold" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyShort(job.driverFee)}</span>
      </div>
    </button>
  )
}

export function TripList() {
  const { jobs, navigate } = useDriverStore()
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? jobs.filter(j =>
        j.route.toLowerCase().includes(search.toLowerCase()) ||
        j.containerNumber.toLowerCase().includes(search.toLowerCase()) ||
        j.clientName.toLowerCase().includes(search.toLowerCase())
      )
    : jobs

  const active = filtered.filter(j => j.status === 'IN_PROGRESS')
  const planned = filtered.filter(j => j.status === 'PLANNED')
  const completed = filtered.filter(j => j.status === 'COMPLETED')

  return (
    <div>
      {/* Search pill */}
      <div className="px-4 pt-0 pb-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
          <Input
            placeholder="Tìm chuyến, container, khách hàng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-11 search-pill"
          />
        </div>
      </div>

      <div className="px-4 pb-24 space-y-5">
        {/* Active */}
        {active.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Navigation className="w-3.5 h-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--theme-brand-primary)' }}>Đang chạy</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>{active.length}</span>
            </div>
            <div className="space-y-2.5">
              {active.map(j => (
                <TripCard key={j.id} job={j} onClick={() => navigate(`/driver/trips/${j.id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* Planned */}
        {planned.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Clock className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-secondary)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>Chờ nhận</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}>{planned.length}</span>
            </div>
            <div className="space-y-2.5">
              {planned.map(j => (
                <TripCard key={j.id} job={j} onClick={() => navigate(`/driver/trips/${j.id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--theme-text-muted)' }}>Hoàn thành</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}>{completed.length}</span>
            </div>
            <div className="space-y-2.5">
              {completed.map(j => (
                <TripCard key={j.id} job={j} onClick={() => navigate(`/driver/trips/${j.id}/detail`)} />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
              <MapPin className="w-7 h-7" style={{ color: 'var(--theme-text-muted)', opacity: 0.5 }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Không có chuyến nào</p>
          </div>
        )}
      </div>
    </div>
  )
}
