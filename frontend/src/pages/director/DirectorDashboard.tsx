import { useEffect, useState, useMemo } from 'react'
import { DollarSign, Truck, TrendingUp, AlertTriangle } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard/StatCard'
import { ChartCard } from '@/components/shared/ChartCard'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { apiClient } from '@/services/api'
import { formatCurrencyShort, formatCurrency } from '@/data/mockData'
import type { Alert } from '@/data/mockData'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface DashboardData {
  totalRevenue: number
  totalExpense: number
  tripCount: number
  activeTrips: number
  outstandingDebt: number
  monthlyRevenue: { month: string; revenue: number; expense: number }[]
  alerts: Alert[]
}

export function DirectorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    let cancelled = false
    apiClient.getDashboardSummary().then(res => {
      if (!cancelled && res.success) setData(res.data as DashboardData)
    })
    return () => { cancelled = true }
  }, [])

  const profit = useMemo(() =>
    data ? data.totalRevenue - data.totalExpense : 0,
    [data],
  )

  if (!data) {
    return (
      <main className="p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-[var(--theme-bg-tertiary)]" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl bg-[var(--theme-bg-tertiary)]" />)}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="p-4 space-y-4">
      <PageHeader title="Tổng quan" />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Doanh thu"
          value={formatCurrencyShort(data.totalRevenue)}
          variant="success"
          subtitle="tháng này"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Lợi nhuận"
          value={formatCurrencyShort(profit)}
          variant="info"
          subtitle="tháng này"
        />
        <StatCard
          icon={<Truck className="h-4 w-4" />}
          label="Chuyến đang chạy"
          value={String(data.activeTrips)}
          variant="default"
          subtitle={`${data.tripCount} tổng cộng`}
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Công nợ"
          value={formatCurrencyShort(data.outstandingDebt)}
          variant="warning"
        />
      </div>

      <ChartCard title="Doanh thu & Chi phí" subtitle="6 tháng gần nhất">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.monthlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border-default)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--theme-text-muted)" />
            <YAxis tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}tr`} tick={{ fontSize: 11 }} stroke="var(--theme-text-muted)" />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="revenue" name="Doanh thu" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Chi phí" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {data.alerts.length > 0 && (
        <div className="rounded-xl border border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)] p-4 space-y-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Cảnh báo gần đây</h3>
          {data.alerts.slice(0, 4).map(alert => (
            <div key={alert.id} className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: alert.severity === 'high' ? 'var(--theme-status-error)' : 'var(--theme-status-warning)' }} />
              <div className="min-w-0">
                <p className="text-xs" style={{ color: 'var(--theme-text-primary)' }}>{alert.message}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{alert.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
