import { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, Filter } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { Input } from '@/components/ui/Input/Input'
import { Badge } from '@/components/ui/Badge/Badge'
import { apiClient } from '@/services/api'
import { getWorkOrderStatusBadge, type WorkOrder } from '@/data/mockData'

export function WorkOrderList() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchPlate, setSearchPlate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const loadWorkOrders = useCallback(async () => {
    const res = await apiClient.getWorkOrders()
    if (res.success) setWorkOrders(res.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadWorkOrders() }, [loadWorkOrders])

  const filtered = useMemo(() => {
    return workOrders.filter(w => {
      const plateMatch = !searchPlate.trim() || w.tractorPlate.toLowerCase().includes(searchPlate.toLowerCase())
      const dateMatch = (() => {
        if (!startDate && !endDate) return true
        const created = new Date(w.createdAt)
        if (startDate && created < new Date(startDate)) return false
        if (endDate && created > new Date(endDate + 'T23:59:59')) return false
        return true
      })()
      return plateMatch && dateMatch
    })
  }, [workOrders, searchPlate, startDate, endDate])

  const hasFilters = searchPlate.trim() || startDate || endDate

  if (loading) {
    return <div className="p-4"><div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-[var(--theme-bg-tertiary)]" />)}</div></div>
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Số công" subtitle={`${filtered.length} số công`} />

      {/* Search + filter toggle */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
            <Input
              value={searchPlate}
              onChange={e => setSearchPlate(e.target.value)}
              placeholder="Tìm theo biển số xe..."
              className="text-sm pl-9"
              style={{ background: 'var(--theme-bg-secondary)' }}
            />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className="w-11 h-11 flex items-center justify-center rounded-xl shrink-0 touch-manipulation"
            style={{
              background: showFilters || startDate || endDate ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
              border: `1px solid ${showFilters || startDate || endDate ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
              color: showFilters || startDate || endDate ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)',
            }}
            aria-label="Bộ lọc"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Từ ngày</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full h-9 rounded-lg px-2 text-xs border"
                style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Đến ngày</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full h-9 rounded-lg px-2 text-xs border"
                style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
              />
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

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không tìm thấy số công</p>
          </div>
        ) : (
          filtered.map(wo => {
            const badge = getWorkOrderStatusBadge(wo.status)
            return (
              <div key={wo.id}
                className="p-4 rounded-xl border space-y-2"
                style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold font-mono" style={{ color: 'var(--theme-text-primary)' }}>{wo.workOrderNumber}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>{wo.workType}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{wo.driverName} · {wo.tractorPlate}</p>
                  </div>
                  <Badge variant={badge.variant as 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>{badge.label}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{wo.clientName}</p>
                  <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{new Date(wo.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{wo.route}</p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
