import { useEffect, useState, useMemo } from 'react'
import { DollarSign, FileText, Camera, AlertTriangle, Users, Route } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard/StatCard'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { apiClient } from '@/services/api'
import { formatCurrencyShort } from '@/data/mockData'
import { useAppStore } from '@/hooks/use-app-store'
import type { WorkOrder, TripOrder, Client } from '@/data/mockData'

export function AccountantDashboard() {
  const { navigate } = useAppStore()
  const [clients, setClients] = useState<Client[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [tripOrders, setTripOrders] = useState<TripOrder[]>([])
  const [dashData, setDashData] = useState<{ totalRevenue: number; outstandingDebt: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiClient.getClients(),
      apiClient.getWorkOrders(),
      apiClient.getTripOrders(),
      apiClient.getDashboardSummary(),
    ]).then(([c, w, t, d]) => {
      if (!cancelled) {
        if (c.success) setClients(c.data)
        if (w.success) setWorkOrders(w.data)
        if (t.success) setTripOrders(t.data)
        if (d.success) setDashData(d.data)
      }
    })
    return () => { cancelled = true }
  }, [])

  const pendingWorkOrders = useMemo(() => workOrders.filter(w => w.status === 'PENDING').length, [workOrders])
  const confirmedTrips = useMemo(() => tripOrders.filter(t => t.status === 'CONFIRMED').length, [tripOrders])

  if (!dashData) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-[var(--theme-bg-tertiary)]" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl bg-[var(--theme-bg-tertiary)]" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Tổng quan" subtitle="Kế toán" />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Doanh thu"
          value={formatCurrencyShort(dashData.totalRevenue)}
          variant="success"
          subtitle="tháng này"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Công nợ"
          value={formatCurrencyShort(dashData.outstandingDebt)}
          variant="warning"
          subtitle={`${clients.length} khách hàng`}
        />
        <button onClick={() => navigate('/accountant/work-orders')} className="text-left">
          <StatCard
            icon={<Camera className="h-4 w-4" />}
            label="Số công"
            value={String(workOrders.length)}
            variant="info"
            subtitle={`${pendingWorkOrders} chờ đối soát`}
          />
        </button>
        <button onClick={() => navigate('/accountant/trip-orders')} className="text-left">
          <StatCard
            icon={<FileText className="h-4 w-4" />}
            label="Chuyến/Lệnh"
            value={String(tripOrders.length)}
            variant="default"
            subtitle={`${confirmedTrips} đã xác nhận`}
          />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/accountant/clients')} className="text-left">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Khách hàng"
            value={String(clients.length)}
            variant="default"
          />
        </button>
        <button onClick={() => navigate('/accountant/salary')} className="text-left">
          <StatCard
            icon={<Route className="h-4 w-4" />}
            label="Tính lương"
            value="Tính"
            variant="gold"
            subtitle="theo kỳ"
          />
        </button>
      </div>
    </div>
  )
}
