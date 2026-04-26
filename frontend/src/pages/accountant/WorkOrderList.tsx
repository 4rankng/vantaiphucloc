import { useEffect, useState, useMemo } from 'react'
import { Search, Filter, CheckCircle, Clock } from 'lucide-react'
import { Masonry } from 'masonic'
import { Input } from '@/components/ui/Input/Input'
import { WorkOrderCard } from '@/components/shared/WorkOrderCard'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, type WorkOrder } from '@/data/mockData'

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
  PENDING:  { label: 'Chờ đối soát', icon: Clock,       color: 'var(--theme-status-warning)', bg: 'var(--theme-status-warning-light)' },
  PRICED:   { label: 'Đã tính giá', icon: CheckCircle,  color: 'var(--theme-status-success)', bg: 'var(--theme-status-success-light)' },
  APPROVED: { label: 'Đã duyệt',    icon: CheckCircle,  color: 'var(--theme-brand-primary)',  bg: 'var(--theme-brand-primary-light)' },
}

export function WorkOrderList() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchPlate, setSearchPlate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PRICED'>('ALL')

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
      const statusOk = statusFilter === 'ALL' || w.status === statusFilter
      return plateOk && dateOk && statusOk
    }),
    [workOrders, searchPlate, startDate, endDate, statusFilter],
  )

  const counts = useMemo(() => ({
    ALL: workOrders.length,
    PENDING: workOrders.filter(w => w.status === 'PENDING').length,
    PRICED: workOrders.filter(w => w.status === 'PRICED').length,
  }), [workOrders])

  const totalEarnings = useMemo(() =>
    filtered.reduce((sum, w) => sum + w.earning, 0),
    [filtered],
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
        {totalEarnings > 0 && (
          <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
            {formatCurrencyFull(totalEarnings)}
          </p>
        )}
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2">
        {(['ALL', 'PENDING', 'PRICED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all touch-manipulation"
            style={{
              background: statusFilter === s ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
              color: statusFilter === s ? 'var(--theme-text-on-brand)' : 'var(--theme-text-secondary)',
              border: `1px solid ${statusFilter === s ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
            }}
          >
            {s === 'ALL' ? 'Tất cả' : STATUS_CONFIG[s].label} ({counts[s]})
          </button>
        ))}
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
