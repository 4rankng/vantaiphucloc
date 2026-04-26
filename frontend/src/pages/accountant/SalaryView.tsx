import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import { ChartCard } from '@/components/shared/ChartCard'
import { BarChartWidget } from '@/components/shared/Charts'
import { SheetPicker } from '@/components/shared/SheetPicker/SheetPicker'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, getSalaryStatusBadge, type Driver, type SalaryPeriod } from '@/data/mockData'
import type { ChartOptions } from 'chart.js'

export function SalaryView() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [periods, setPeriods] = useState<SalaryPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  })
  const [calculating, setCalculating] = useState(false)

  const loadData = useCallback(async () => {
    const [dRes, pRes] = await Promise.all([apiClient.getDrivers(), apiClient.getSalaryPeriods()])
    if (dRes.success) setDrivers(dRes.data)
    if (pRes.success) setPeriods(pRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredPeriods = useMemo(() =>
    selectedDriver ? periods.filter(p => p.driverId === selectedDriver) : periods,
    [periods, selectedDriver],
  )

  const handleCalculate = useCallback(async () => {
    if (!selectedDriver || !startDate || !endDate) return
    setCalculating(true)
    await apiClient.calculateSalary(selectedDriver, startDate, endDate)
    await loadData()
    setCalculating(false)
  }, [selectedDriver, startDate, endDate, loadData])

  const handleMarkPaid = useCallback(async (id: string) => {
    await apiClient.updateSalaryPeriod(id, { status: 'PAID' })
    loadData()
  }, [loadData])

  // Chart: salary breakdown per driver (all periods)
  const chartData = useMemo(() => {
    const shown = filteredPeriods.slice(0, 5)
    return {
      labels: shown.map(sp => sp.driverName.split(' ').slice(-1)[0]),
      datasets: [
        {
          label: 'Lương',
          data: shown.map(sp => sp.totalSalary),
          backgroundColor: '#00963E',
          borderRadius: 6,
          borderSkipped: false as const,
        },
        {
          label: 'Phụ cấp',
          data: shown.map(sp => sp.totalAllowance),
          backgroundColor: '#2196F3',
          borderRadius: 6,
          borderSkipped: false as const,
        },
      ],
    }
  }, [filteredPeriods])

  const chartOptions = useMemo((): ChartOptions<'bar'> => ({
    plugins: {
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${formatCurrencyFull(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: { ticks: { callback: v => typeof v === 'number' ? `${(v / 1_000_000).toFixed(1)}tr` : v } },
    },
  }), [])

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <p className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>Tính lương tài xế</p>

      {/* Calculator form */}
      <div
        className="space-y-3 p-4 rounded-2xl"
        style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
      >
        <div className="space-y-1.5">
          <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Tài xế</label>
          <SheetPicker
            label="Chọn tài xế"
            placeholder="Chọn tài xế"
            value={selectedDriver}
            onChange={setSelectedDriver}
            options={drivers.map(d => ({ value: d.id, label: `${d.name} (${d.tractorPlate})` }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Từ ngày</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full h-10 rounded-xl px-3 text-sm border"
              style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Đến ngày</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full h-10 rounded-xl px-3 text-sm border"
              style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
          </div>
        </div>

        <Button
          onClick={handleCalculate}
          disabled={!selectedDriver || calculating}
          className="w-full h-11 font-bold rounded-xl"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          {calculating ? 'Đang tính...' : 'Tính lương'}
        </Button>
      </div>

      {/* Chart */}
      {filteredPeriods.length > 0 && (
        <ChartCard title="Lương & Phụ cấp" subtitle="theo kỳ">
          <BarChartWidget data={chartData} height={180} options={chartOptions} />
        </ChartCard>
      )}

      {/* Period cards */}
      {filteredPeriods.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Kỳ lương</p>
          {filteredPeriods.map(sp => {
            const badge = getSalaryStatusBadge(sp.status)
            return (
              <div
                key={sp.id}
                className="rounded-2xl p-4 space-y-3"
                style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{sp.driverName}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                      {sp.startDate} → {sp.endDate}
                    </p>
                  </div>
                  <Badge variant={badge.variant as 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>
                    {badge.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Số công', value: String(sp.workOrderCount) },
                    { label: 'Đơn giá', value: formatCurrencyFull(sp.pricePerOrder) },
                    { label: 'Tổng lương', value: formatCurrencyFull(sp.totalSalary) },
                    { label: 'Phụ cấp', value: formatCurrencyFull(sp.totalAllowance) },
                  ].map(item => (
                    <div key={item.label} className="p-2.5 rounded-xl" style={{ background: 'var(--theme-bg-tertiary)' }}>
                      <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{item.label}</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--theme-text-primary)' }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Thực nhận</p>
                    <p className="text-base font-bold" style={{ color: 'var(--theme-brand-primary)' }}>
                      {formatCurrencyFull(sp.netPay)}
                    </p>
                  </div>
                  {sp.status === 'CALCULATED' && (
                    <Button size="sm" onClick={() => handleMarkPaid(sp.id)} className="text-xs font-semibold">
                      Đánh dấu đã trả
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
