import { useState } from 'react'
import { Search, Package, MapPin, ChevronRight } from 'lucide-react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { formatCurrencyShort, getJobStatusBadge, type JobStatus } from '@/data/mockData'

type Tab = 'active' | 'planned' | 'completed'

function TripCard({ job, onClick }: { job: any; onClick: () => void }) {
  const s = getJobStatusBadge(job.status as JobStatus)
  return (
    <button onClick={onClick} className="w-full text-left rounded-xl p-4 shadow-sm border active:scale-[0.98] transition-transform" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
          <span className="font-semibold text-sm truncate" style={{ color: 'var(--theme-text-primary)' }}>{job.route}</span>
        </div>
        <Badge variant={s.variant as any} className="text-[11px] flex-shrink-0 ml-2">{s.label}</Badge>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{job.containerNumber}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{job.distanceKm} km</span>
          <span className="text-sm font-bold" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyShort(job.driverFee)}</span>
        </div>
      </div>
    </button>
  )
}

export function TripList() {
  const { jobs, navigate } = useDriverStore()
  const [activeTab, setActiveTab] = useState<Tab>('active')
  const [search, setSearch] = useState('')

  const filterByTab = (items: any[]) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      return items.filter(j =>
        j.route.toLowerCase().includes(q) ||
        j.containerNumber.toLowerCase().includes(q) ||
        j.clientName.toLowerCase().includes(q)
      )
    }
    return items
  }

  const active = filterByTab(jobs.filter(j => j.status === 'IN_PROGRESS'))
  const planned = filterByTab(jobs.filter(j => j.status === 'PLANNED'))
  const completed = filterByTab(jobs.filter(j => j.status === 'COMPLETED'))

  const lists: Record<Tab, { items: any[]; navType: 'active' | 'detail' }> = {
    active: { items: active, navType: 'active' },
    planned: { items: planned, navType: 'active' },
    completed: { items: completed, navType: 'detail' },
  }

  const current = lists[activeTab]

  const tabConfigs: { key: Tab; label: string; count: number }[] = [
    { key: 'active', label: 'Đang chạy', count: active.length },
    { key: 'planned', label: 'Chờ nhận', count: planned.length },
    { key: 'completed', label: 'Lịch sử', count: completed.length },
  ]

  return (
    <div>
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
          <Input
            placeholder="Tìm chuyến, container, khách hàng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 search-pill"
          />
        </div>
      </div>
      <div className="flex gap-0 border-b" style={{ borderColor: 'var(--theme-border-default)', background: 'var(--theme-bg-secondary)' }}>
        {tabConfigs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-3 text-center text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: activeTab === tab.key ? 'var(--theme-brand-primary)' : 'transparent',
              color: activeTab === tab.key ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
            }}
          >
            {tab.label} {tab.count > 0 && <span className="ml-1 text-xs opacity-60">({tab.count})</span>}
          </button>
        ))}
      </div>
      <div className="space-y-3 px-4 py-3 pb-24">
        {current.items.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)', opacity: 0.5 }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có chuyến nào</p>
          </div>
        ) : (
          current.items.map(j => (
            <TripCard
              key={j.id}
              job={j}
              onClick={() => navigate(current.navType === 'active' ? `/driver/trips/${j.id}` : `/driver/trips/${j.id}/detail`)}
            />
          ))
        )}
      </div>
    </div>
  )
}
