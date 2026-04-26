import { useEffect, useState, useMemo } from 'react'
import { Search, Filter, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { Masonry } from 'masonic'
import { Input } from '@/components/ui/Input/Input'
import { apiClient } from '@/services/api'
import type { WorkOrder } from '@/data/mockData'

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
  PENDING:  { label: 'Chờ đối soát', icon: Clock,       color: 'var(--theme-status-warning)', bg: 'var(--theme-status-warning-light)' },
  MATCHED:  { label: 'Đã đối soát',  icon: CheckCircle, color: 'var(--theme-status-success)', bg: 'var(--theme-status-success-light)' },
  DISPUTED: { label: 'Sai số công',  icon: AlertCircle, color: 'var(--theme-status-error)',   bg: 'var(--theme-status-error-light)' },
}

function WorkOrderCard({ data: wo }: { data: WorkOrder }) {
  const s = STATUS_CONFIG[wo.status] ?? STATUS_CONFIG.PENDING
  const StatusIcon = s.icon
  return (
    <div
      className="rounded-2xl p-3.5"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <p className="text-sm font-bold font-mono truncate flex-1" style={{ color: 'var(--theme-text-primary)' }}>
          {wo.workOrderNumber}
        </p>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
        >
          {wo.workType}
        </span>
      </div>

      <p className="text-[11px] font-medium truncate mb-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
        {wo.driverName}
      </p>
      <p className="text-[10px] font-mono mb-2" style={{ color: 'var(--theme-text-muted)' }}>
        {wo.tractorPlate}
      </p>
      <p className="text-[11px] truncate mb-2" style={{ color: 'var(--theme-text-muted)' }}>
        {wo.clientName}
      </p>

      <div
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
        style={{ background: s.bg }}
      >
        <StatusIcon className="w-3 h-3" style={{ color: s.color }} />
        <span className="text-[10px] font-semibold" style={{ color: s.color }}>{s.label}</span>
      </div>

      <p className="text-[10px] mt-2" style={{ color: 'var(--theme-text-muted)' }}>
        {new Date(wo.createdAt).toLocaleDateString('vi-VN')}
      </p>
    </div>
  )
}

export function WorkOrderList() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchPlate, setSearchPlate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiClient.getWorkOrders().then(res => {
      if (!cancelled && res.success) setWorkOrders(res.data)
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() =>
    workOrders.filter(w => {
      const plateOk = !searchPlate.trim() || w.tractorPlate.toLowerCase().includes(searchPlate.toLowerCase())
      const dateOk = (() => {
        if (!startDate && !endDate) return true
        const d = new Date(w.createdAt)
        if (startDate && d < new Date(startDate)) return false
        if (endDate && d > new Date(endDate + 'T23:59:59')) return false
        return true
      })()
      return plateOk && dateOk
    }),
    [workOrders, searchPlate, startDate, endDate],
  )

  const hasFilters = searchPlate.trim() || startDate || endDate
  const activeFilters = showFilters || !!(startDate || endDate)

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>Số công</p>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{filtered.length} kết quả</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
            <Input
              value={searchPlate}
              onChange={e => setSearchPlate(e.target.value)}
              placeholder="Tìm theo biển số..."
              className="text-sm pl-9"
              style={{ background: 'var(--theme-bg-secondary)' }}
            />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className="w-11 h-11 flex items-center justify-center rounded-xl shrink-0 touch-manipulation"
            style={{
              background: activeFilters ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
              border: `1px solid ${activeFilters ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
              color: activeFilters ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)',
            }}
            aria-label="Bộ lọc"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {showFilters && (
          <div
            className="grid grid-cols-2 gap-2 p-3 rounded-xl"
            style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
          >
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Từ ngày</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full h-9 rounded-lg px-2 text-xs border"
                style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Đến ngày</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full h-9 rounded-lg px-2 text-xs border"
                style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
            </div>
            {hasFilters && (
              <button
                onClick={() => { setSearchPlate(''); setStartDate(''); setEndDate('') }}
                className="col-span-2 text-xs font-medium py-1.5 rounded-lg touch-manipulation"
                style={{ color: 'var(--theme-status-error)', background: 'var(--theme-status-error-light)' }}
              >
                Xoá bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* Masonic card grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không tìm thấy số công</p>
        </div>
      ) : (
        <Masonry
          items={filtered}
          columnGutter={8}
          columnWidth={160}
          maxColumnCount={2}
          render={WorkOrderCard}
          overscanBy={3}
        />
      )}
    </div>
  )
}
