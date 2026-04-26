import { useEffect, useState, useMemo } from 'react'
import { Camera, FileText, Users, Route, CircleDollarSign, Wallet } from 'lucide-react'
import { Masonry } from 'masonic'
import { ChartCard } from '@/components/shared/ChartCard'
import { LineChartWidget } from '@/components/shared/Charts'
import { apiClient } from '@/services/api'
import { useAppStore } from '@/hooks/use-app-store'
import type { WorkOrder, TripOrder, Client } from '@/data/mockData'
import type { LucideIcon } from 'lucide-react'

// ─── Stat tile for masonic grid ───────────────────────────────────────────────
interface StatTile {
  id: string
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  path: string
  accent: string
  accentLight: string
}

function StatTileCard({ data, navigate }: { data: StatTile; navigate: (p: string) => void }) {
  const Icon = data.icon
  return (
    <button
      onClick={() => navigate(data.path)}
      className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.97] touch-manipulation"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
          {data.label}
        </p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: data.accentLight }}>
          <Icon className="w-3.5 h-3.5" style={{ color: data.accent }} />
        </div>
      </div>
      <p className="text-[22px] font-bold leading-tight tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
        {data.value}
      </p>
      {data.sub && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>{data.sub}</p>
      )}
    </button>
  )
}

// ─── Quick-link icon tile ─────────────────────────────────────────────────────
interface QuickLink { label: string; icon: LucideIcon; path: string }

const QUICK_LINKS: QuickLink[] = [
  { label: 'Khách hàng', icon: Users, path: '/accountant/clients' },
  { label: 'Cung đường', icon: Route, path: '/accountant/routes' },
  { label: 'Đơn giá', icon: CircleDollarSign, path: '/accountant/pricings' },
  { label: 'Chuyến/Lệnh', icon: FileText, path: '/accountant/trip-orders' },
  { label: 'Tính lương', icon: Wallet, path: '/accountant/salary' },
]

export function AccountantDashboard() {
  const { navigate } = useAppStore()
  const [clients, setClients] = useState<Client[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [tripOrders, setTripOrders] = useState<TripOrder[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([apiClient.getClients(), apiClient.getWorkOrders(), apiClient.getTripOrders()])
      .then(([c, w, t]) => {
        if (!cancelled) {
          if (c.success) setClients(c.data)
          if (w.success) setWorkOrders(w.data)
          if (t.success) setTripOrders(t.data)
        }
      })
    return () => { cancelled = true }
  }, [])

  const pendingWO = useMemo(() => workOrders.filter(w => w.status === 'PENDING').length, [workOrders])
  const confirmedTrips = useMemo(() => tripOrders.filter(t => t.status === 'CONFIRMED').length, [tripOrders])

  const statTiles = useMemo<StatTile[]>(() => [
    { id: 'clients', label: 'Khách hàng', value: String(clients.length), icon: Users, path: '/accountant/clients', accent: '#2196F3', accentLight: '#E3F2FD' },
    { id: 'workorders', label: 'Số công', value: String(workOrders.length), sub: `${pendingWO} chờ đối soát`, icon: Camera, path: '/accountant/work-orders', accent: '#FF9500', accentLight: '#FFF4E6' },
    { id: 'trips', label: 'Chuyến/Lệnh', value: String(tripOrders.length), sub: `${confirmedTrips} đã xác nhận`, icon: FileText, path: '/accountant/trip-orders', accent: '#00963E', accentLight: '#E6F9EF' },
    { id: 'salary', label: 'Tính lương', value: 'Tính', sub: 'theo kỳ', icon: Wallet, path: '/accountant/salary', accent: '#9C27B0', accentLight: '#F3E5F5' },
  ], [clients, workOrders, tripOrders, pendingWO, confirmedTrips])

  // Work order status breakdown for line chart (mock trend over last 6 days)
  const lineData = useMemo(() => {
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    return {
      labels: days,
      datasets: [
        {
          label: 'Số công gửi',
          data: [2, 4, 3, 5, 4, 6, workOrders.length],
          borderColor: '#00963E',
          backgroundColor: 'rgba(0,150,62,0.08)',
          fill: true,
          pointBackgroundColor: '#00963E',
        },
        {
          label: 'Đã đối soát',
          data: [1, 3, 2, 4, 3, 5, workOrders.filter(w => w.status === 'MATCHED').length],
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33,150,243,0.06)',
          fill: true,
          pointBackgroundColor: '#2196F3',
        },
      ],
    }
  }, [workOrders])

  return (
    <div className="pb-8">
      {/* Masonic stat tiles */}
      <div className="px-4 pt-4">
        <Masonry
          items={statTiles}
          columnGutter={8}
          columnWidth={160}
          maxColumnCount={2}
          render={({ data: item }) => <StatTileCard data={item} navigate={navigate} />}
          overscanBy={2}
        />
      </div>

      {/* Work order trend chart */}
      <div className="px-4 mt-4">
        <ChartCard title="Xu hướng số công" subtitle="7 ngày gần nhất">
          <LineChartWidget
            data={lineData}
            height={180}
            options={{ plugins: { legend: { display: true } } }}
          />
        </ChartCard>
      </div>

      {/* Quick-link hub */}
      <div className="px-4 mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--theme-text-muted)' }}>
          Danh mục
        </p>
        <div className="grid grid-cols-5 gap-2">
          {QUICK_LINKS.map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-[0.95] touch-manipulation"
              style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
            >
              <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: 'var(--theme-brand-primary-light)' }}>
                <Icon className="h-3.5 w-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
              </div>
              <span className="text-[9px] font-medium text-center leading-tight px-0.5" style={{ color: 'var(--theme-text-primary)' }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
