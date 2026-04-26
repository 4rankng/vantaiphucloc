import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, Truck, Package, DollarSign } from 'lucide-react'
import { Masonry } from 'masonic'
import { ChartCard } from '@/components/shared/ChartCard'
import { BarChartWidget, DoughnutChartWidget } from '@/components/shared/Charts'
import { apiClient } from '@/services/api'
import { formatCurrencyShort, formatCurrency } from '@/data/mockData'
import type { ChartOptions } from 'chart.js'

interface DashboardData {
  totalRevenue: number
  totalExpense: number
  tripCount: number
  activeTrips: number
  outstandingDebt: number
  monthlyRevenue: { month: string; revenue: number; expense: number }[]
  alerts: { id: string; message: string; severity: string; timestamp: string }[]
}

interface KpiItem {
  id: string
  label: string
  value: string
  sub: string
  icon: typeof TrendingUp
  accent: string
  accentLight: string
}

function KpiCard({ data }: { data: KpiItem }) {
  const Icon = data.icon
  return (
    <div
      className="rounded-2xl p-4"
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
      <p className="text-[11px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>{data.sub}</p>
    </div>
  )
}

const PERIODS = [
  { key: 'month' as const, label: 'Tháng' },
  { key: 'quarter' as const, label: 'Quý' },
  { key: 'year' as const, label: 'Năm' },
]

export function DirectorDashboard({ onManageUsers }: { onManageUsers?: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')

  useEffect(() => {
    let cancelled = false
    apiClient.getDashboardSummary().then(res => {
      if (!cancelled && res.success) setData(res.data as DashboardData)
    })
    return () => { cancelled = true }
  }, [])

  const profit = useMemo(() => (data ? data.totalRevenue - data.totalExpense : 0), [data])

  const kpiItems = useMemo<KpiItem[]>(() => {
    if (!data) return []
    return [
      { id: 'revenue', label: 'Doanh thu', value: formatCurrencyShort(data.totalRevenue), sub: 'tháng này', icon: TrendingUp, accent: '#00963E', accentLight: '#E6F9EF' },
      { id: 'profit', label: 'Lợi nhuận', value: formatCurrencyShort(profit), sub: 'tháng này', icon: DollarSign, accent: '#2196F3', accentLight: '#E3F2FD' },
      { id: 'active', label: 'Xe hoạt động', value: String(data.activeTrips), sub: `${data.tripCount} tổng chuyến`, icon: Truck, accent: '#FF9500', accentLight: '#FFF4E6' },
      { id: 'trips', label: 'Chuyến tháng', value: String(data.tripCount), sub: 'tháng này', icon: Package, accent: '#9C27B0', accentLight: '#F3E5F5' },
    ]
  }, [data, profit])

  const barData = useMemo(() => ({
    labels: data?.monthlyRevenue.map(m => m.month) ?? [],
    datasets: [
      { label: 'Doanh thu', data: data?.monthlyRevenue.map(m => m.revenue) ?? [], backgroundColor: '#00963E', borderRadius: 6, borderSkipped: false as const },
      { label: 'Chi phí', data: data?.monthlyRevenue.map(m => m.expense) ?? [], backgroundColor: '#FF5252', borderRadius: 6, borderSkipped: false as const },
    ],
  }), [data])

  const barOptions = useMemo((): ChartOptions<'bar'> => ({
    plugins: {
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: { ticks: { callback: v => typeof v === 'number' ? `${(v / 1_000_000).toFixed(0)}tr` : v } },
    },
  }), [])

  const doughnutData = useMemo(() => ({
    labels: ['Doanh thu', 'Chi phí'],
    datasets: [{
      data: data ? [data.totalRevenue, data.totalExpense] : [0, 0],
      backgroundColor: ['#00963E', '#FF5252'],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  }), [data])

  if (!data) {
    return (
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
        <div className="h-52 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
      </div>
    )
  }

  return (
    <div className="pb-8">
      {/* Period filter */}
      <div className="px-4 pt-4 pb-3 flex gap-2">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all touch-manipulation"
            style={{
              background: period === p.key ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
              color: period === p.key ? 'var(--theme-text-on-brand)' : 'var(--theme-text-secondary)',
              border: `1px solid ${period === p.key ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Masonic KPI grid — 2 columns, variable height cards */}
      <div className="px-4">
        <Masonry
          items={kpiItems}
          columnGutter={8}
          columnWidth={160}
          maxColumnCount={2}
          render={({ data: item }) => <KpiCard data={item} />}
          overscanBy={2}
        />
      </div>

      {/* Charts */}
      <div className="px-4 mt-4 space-y-4">
        <ChartCard title="Doanh thu & Chi phí" subtitle="6 tháng gần nhất">
          <BarChartWidget data={barData} height={210} options={barOptions} />
        </ChartCard>

        <ChartCard title="Tỷ lệ doanh thu / chi phí" subtitle="tháng này">
          <DoughnutChartWidget data={doughnutData} height={220} />
        </ChartCard>
      </div>
    </div>
  )
}
