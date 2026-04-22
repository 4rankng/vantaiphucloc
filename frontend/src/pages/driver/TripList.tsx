import { useState } from 'react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { Search, MapPin, Navigation, Clock } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { TripCard } from '@/components/shared/TripCard'

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
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
        <Input
          placeholder="Tìm chuyến, container, khách hàng..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-11 search-pill"
        />
      </div>

      <div className="space-y-5 mt-3">
        {active.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Navigation className="w-3.5 h-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--theme-brand-primary)' }}>Đang chạy</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>{active.length}</span>
            </div>
            <div className="space-y-2.5">
              {active.map(j => <TripCard key={j.id} job={j} onClick={() => navigate(`/driver/trips/${j.id}`)} />)}
            </div>
          </div>
        )}

        {planned.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Clock className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-secondary)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>Chờ nhận</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}>{planned.length}</span>
            </div>
            <div className="space-y-2.5">
              {planned.map(j => <TripCard key={j.id} job={j} onClick={() => navigate(`/driver/trips/${j.id}`)} />)}
            </div>
          </div>
        )}

        {completed.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--theme-text-muted)' }}>Hoàn thành</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}>{completed.length}</span>
            </div>
            <div className="space-y-2.5">
              {completed.map(j => <TripCard key={j.id} job={j} onClick={() => navigate(`/driver/trips/${j.id}/detail`)} />)}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)', opacity: 0.5 }} />
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Không có chuyến nào</p>
          </div>
        )}
      </div>
    </div>
  )
}
