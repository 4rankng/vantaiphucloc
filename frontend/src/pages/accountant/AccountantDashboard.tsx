import { useEffect, useState, useMemo } from 'react'
import { Camera, FileText, Users, Route, CircleDollarSign, Truck, Wallet } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard/StatCard'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { apiClient } from '@/services/api'
import { useAppStore } from '@/hooks/use-app-store'
import { accountantNav } from '@/lib/navigation'
import type { WorkOrder, TripOrder, Client } from '@/data/mockData'

export function AccountantDashboard() {
  const { navigate } = useAppStore()
  const [clients, setClients] = useState<Client[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [tripOrders, setTripOrders] = useState<TripOrder[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiClient.getClients(),
      apiClient.getWorkOrders(),
      apiClient.getTripOrders(),
    ]).then(([c, w, t]) => {
      if (!cancelled) {
        if (c.success) setClients(c.data)
        if (w.success) setWorkOrders(w.data)
        if (t.success) setTripOrders(t.data)
      }
    })
    return () => { cancelled = true }
  }, [])

  const pendingWorkOrders = useMemo(() => workOrders.filter(w => w.status === 'PENDING').length, [workOrders])
  const confirmedTrips = useMemo(() => tripOrders.filter(t => t.status === 'CONFIRMED').length, [tripOrders])

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Tổng quan" subtitle="Kế toán" />

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/accountant/clients')} className="text-left">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Khách hàng"
            value={String(clients.length)}
            variant="default"
          />
        </button>
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
        <button onClick={() => navigate('/accountant/salary')} className="text-left">
          <StatCard
            icon={<Wallet className="h-4 w-4" />}
            label="Tính lương"
            value="Tính"
            variant="gold"
            subtitle="theo kỳ"
          />
        </button>
      </div>

      {/* ── QUICK ACCESS ── */}
      <div>
        <SectionHeader title="Truy cập nhanh" />
        <div className="grid grid-cols-4 gap-3">
          {accountantNav.map(({ label, icon: Icon, path }) => (
            <button key={path} onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-[0.96] touch-manipulation"
              style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
              <div className="h-9 w-9 rounded-full flex items-center justify-center"
                style={{ background: 'var(--theme-brand-primary-light)' }}>
                <Icon className="h-4.5 w-4.5" style={{ color: 'var(--theme-brand-primary)' }} />
              </div>
              <span className="text-[11px] font-medium text-center leading-tight" style={{ color: 'var(--theme-text-primary)' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
