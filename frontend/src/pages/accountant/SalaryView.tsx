import { useEffect, useState, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, getSalaryStatusBadge, type Driver, type SalaryPeriod } from '@/data/mockData'

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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
  })
  const [calculating, setCalculating] = useState(false)

  const loadData = useCallback(async () => {
    const [dRes, pRes] = await Promise.all([
      apiClient.getDrivers(), apiClient.getSalaryPeriods(),
    ])
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

  if (loading) {
    return <div className="p-4"><div className="animate-pulse space-y-3">{[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-[var(--theme-bg-tertiary)]" />)}</div></div>
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Tính lương tài xế" />

      <div className="space-y-3 p-4 rounded-xl border" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
        <div className="space-y-2">
          <label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tài xế</label>
          <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}
            className="w-full h-10 rounded-lg px-3 text-sm border" style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}>
            <option value="">Chọn tài xế</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.tractorPlate})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Từ ngày</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full h-10 rounded-lg px-3 text-sm border" style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Đến ngày</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full h-10 rounded-lg px-3 text-sm border" style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
          </div>
        </div>
        <Button onClick={handleCalculate} disabled={!selectedDriver || calculating}
          className="w-full h-11 font-bold rounded-xl"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
          {calculating ? 'Đang tính...' : 'Tính lương'}
        </Button>
      </div>

      {filteredPeriods.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Kỳ lương</h3>
          {filteredPeriods.map(sp => {
            const badge = getSalaryStatusBadge(sp.status)
            return (
              <div key={sp.id}
                className="p-4 rounded-xl border space-y-3"
                style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{sp.driverName}</p>
                    <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{sp.startDate} → {sp.endDate}</p>
                  </div>
                  <Badge variant={badge.variant as 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>{badge.label}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }}>
                    <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Số công</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{sp.workOrderCount}</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }}>
                    <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Đơn giá</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(sp.pricePerOrder)}</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }}>
                    <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Tổng lương</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(sp.totalSalary)}</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }}>
                    <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Phụ cấp</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(sp.totalAllowance)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Thực nhận: {formatCurrencyFull(sp.netPay)}</p>
                  {sp.status === 'CALCULATED' && (
                    <Button size="sm" onClick={() => handleMarkPaid(sp.id)}
                      className="text-xs font-semibold">
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
