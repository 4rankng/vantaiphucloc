import { useEffect, useState, useMemo } from 'react'
import { Truck, TrendingUp, Package } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard/StatCard'
import { ChartCard } from '@/components/shared/ChartCard'
import { apiClient } from '@/services/api'
import { formatCurrencyShort, formatCurrency } from '@/data/mockData'
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
  alerts: { id: string; message: string; severity: string; timestamp: string }[]
}

export function DirectorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')

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
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl bg-[var(--theme-bg-tertiary)]" />)}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="p-4 space-y-4">
      {/* Period filter */}
      <div className="flex gap-2">
        {(['month', 'quarter', 'year'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all touch-manipulation"
            style={{
              background: period === p ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
              color: period === p ? 'var(--theme-text-on-brand)' : 'var(--theme-text-secondary)',
              border: `1px solid ${period === p ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
            }}
          >
            {p === 'month' ? 'Tháng' : p === 'quarter' ? 'Quý' : 'Năm'}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
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
          label="Xe đang hoạt động"
          value={String(data.activeTrips)}
          variant="default"
          subtitle={`${data.tripCount} tổng chuyến`}
        />
        <StatCard
          icon={<Package className="h-4 w-4" />}
          label="Tổng chuyến tháng"
          value={String(data.tripCount)}
          variant="default"
          subtitle="tháng này"
        />
      </div>

      {/* Revenue chart */}
      <ChartCard title="Doanh thu tăng trưởng" subtitle="6 tháng gần nhất">
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
    </main>
  )
}
