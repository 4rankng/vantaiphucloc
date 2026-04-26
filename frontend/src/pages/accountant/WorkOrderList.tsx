import { useEffect, useState, useCallback, useMemo } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { Input } from '@/components/ui/Input/Input'
import { Badge } from '@/components/ui/Badge/Badge'
import { apiClient } from '@/services/api'
import { getWorkOrderStatusBadge, type WorkOrder } from '@/data/mockData'

export function WorkOrderList() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchPlate, setSearchPlate] = useState('')

  const loadWorkOrders = useCallback(async () => {
    const filters: Record<string, string> = {}
    if (searchPlate.trim()) filters.tractorPlate = searchPlate.trim()
    const res = await apiClient.getWorkOrders(Object.keys(filters).length > 0 ? filters : undefined)
    if (res.success) setWorkOrders(res.data)
    setLoading(false)
  }, [searchPlate])

  useEffect(() => { loadWorkOrders() }, [loadWorkOrders])

  const filtered = useMemo(() => {
    if (!searchPlate.trim()) return workOrders
    return workOrders.filter(w => w.tractorPlate.toLowerCase().includes(searchPlate.toLowerCase()))
  }, [workOrders, searchPlate])

  if (loading) {
    return <div className="p-4"><div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-[var(--theme-bg-tertiary)]" />)}</div></div>
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Số công" subtitle={`${filtered.length} số công`} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
        <Input
          value={searchPlate}
          onChange={e => setSearchPlate(e.target.value)}
          placeholder="Tìm theo biển số xe..."
          className="text-sm pl-9"
          style={{ background: 'var(--theme-bg-secondary)' }}
        />
      </div>

      <div className="space-y-2">
        {filtered.map(wo => {
          const badge = getWorkOrderStatusBadge(wo.status)
          return (
            <div key={wo.id}
              className="p-4 rounded-xl border space-y-2"
              style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{wo.workOrderNumber}</p>
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
        })}
      </div>
    </div>
  )
}
