import { useState } from 'react'
import { Search, Package, MapPin } from 'lucide-react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { formatCurrencyShort, getJobStatusBadge, type JobStatus } from '@/data/mockData'

type Tab = 'active' | 'planned' | 'completed'

function TripCard({ job, onClick }: { job: any; onClick: () => void }) {
  const s = getJobStatusBadge(job.status as JobStatus)
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 card-lift"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
      }}
    >
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
        <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{job.distanceKm} km</span>
        <span className="text-[15px] font-bold" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyShort(job.driverFee)}</span>
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
      {/* Search — pill style */}
      <div className="px-4 pt-3 pb-2">
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

      {/* Tabs — pill segment */}
      <div className="px-4 pb-1">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }}>
          {tabConfigs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2.5 text-center text-xs font-semibold rounded-xl transition-all"
              style={{
                background: activeTab === tab.key ? 'var(--theme-bg-secondary)' : 'transparent',
                color: activeTab === tab.key ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
                boxShadow: activeTab === tab.key ? 'var(--theme-shadow-sm)' : 'none',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                  style={{
                    background: activeTab === tab.key ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                    color: activeTab === tab.key ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3 px-4 py-3 pb-24">
        {current.items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
              <MapPin className="w-7 h-7" style={{ color: 'var(--theme-text-muted)', opacity: 0.5 }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Không có chuyến nào</p>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Chuyến mới sẽ xuất hiện ở đây</p>
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
