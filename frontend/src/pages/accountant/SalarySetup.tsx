import { useState, useMemo } from 'react'
import { Button, Input } from '@/components/ui'
import {
  useSalaryConfig, useUpdateSalaryConfig,
  useCalculateSalary, useExportSalaryExcel,
  useDriverEarnings, useSalaryDashboard,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { formatCurrencyFull } from '@/data/domain'
import { formatDateRange } from '@/lib/format'
import { Calculator, Download, Pencil, Wallet } from 'lucide-react'
import { SettingsPageLayout } from '@/components/shared/SettingsPageLayout'
import { getSalaryPeriodDates, toISODate } from '@/utils/salaryPeriod'
import { DriverBaseSalaryDialog } from '@/components/payroll/DriverBaseSalaryDialog'

// ─── Period config card ───────────────────────────────────────────────────────

function PeriodConfigCard() {
  const toast = useToast()
  const { data: config, isLoading: loading } = useSalaryConfig()
  const updateConfig = useUpdateSalaryConfig()
  const [fromDay, setFromDay] = useState('26')
  const [toDay, setToDay] = useState('25')
  const [synced, setSynced] = useState(false)
  const [dayError, setDayError] = useState('')

  if (config && !synced) {
    setFromDay(String(config.fromDay ?? 26))
    setToDay(String(config.toDay ?? 25))
    setSynced(true)
  }

  const explanation = useMemo(() => {
    if (!fromDay || !toDay) return ''
    return `Ngày ${fromDay} tháng này → ngày ${toDay} tháng sau`
  }, [fromDay, toDay])

  const handleSave = () => {
    const from = parseInt(fromDay)
    const to = parseInt(toDay)
    if (from < 1 || from > 31 || to < 1 || to > 31) {
      setDayError('Ngày phải từ 1 đến 31')
      return
    }
    setDayError('')
    updateConfig.mutate(
      { from_day: from, to_day: to },
      {
        onSuccess: () => toast.success('Đã lưu cấu hình kỳ lương'),
        onError: () => toast.error('Lỗi', 'Không thể lưu cấu hình'),
      },
    )
  }

  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="typo-h2">Cấu hình kỳ lương</h3>
        <span className="typo-caption">Tháng dương lịch</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="space-y-1.5">
          <label className="typo-form-label" htmlFor="salary-from-day">Từ ngày</label>
          <Input
            id="salary-from-day"
            type="number"
            min={1}
            max={31}
            value={fromDay}
            onChange={e => { setFromDay(e.target.value); setDayError('') }}
            placeholder="26"
            className="h-9 text-sm font-mono text-center"
          />
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Ngày 1–31</p>
        </div>
        <div className="space-y-1.5">
          <label className="typo-form-label" htmlFor="salary-to-day">Đến ngày</label>
          <Input
            id="salary-to-day"
            type="number"
            min={1}
            max={31}
            value={toDay}
            onChange={e => { setToDay(e.target.value); setDayError('') }}
            placeholder="25"
            className="h-9 text-sm font-mono text-center"
          />
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Ngày 1–31</p>
        </div>
      </div>

      {dayError && (
        <p className="text-xs mb-3" style={{ color: 'var(--theme-status-error)' }}>{dayError}</p>
      )}

      {explanation && (
        <p className="text-xs mb-4" style={{ color: 'var(--theme-text-secondary)' }}>
          {explanation}
        </p>
      )}

      <div className="mt-auto">
        <Button
          onClick={handleSave}
          disabled={updateConfig.isPending || loading}
          className="btn-primary h-9 px-4 text-sm w-full"
        >
          {updateConfig.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
        </Button>
      </div>
    </div>
  )
}

// ─── Calculate salary card ────────────────────────────────────────────────────

function CalculateCard() {
  const toast = useToast()
  const { data: config } = useSalaryConfig()
  const calculateSalary = useCalculateSalary()
  const exportSalary = useExportSalaryExcel()

  const [calculating, setCalculating] = useState(false)

  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    const fromDay = config?.fromDay ?? 26
    const toDay = config?.toDay ?? 25
    const period = getSalaryPeriodDates(now, { fromDay, toDay })
    return {
      startDate: toISODate(period.startDate),
      endDate: toISODate(period.endDate),
    }
  }, [config])

  const handleCalculate = () => {
    setCalculating(true)
    calculateSalary.mutate(
      { startDate, endDate },
      {
        onSuccess: () => { toast.success('Đã tính lương', `Kỳ ${formatDateRange(startDate, endDate, 'short')}`); setCalculating(false) },
        onError: () => { toast.error('Lỗi', 'Không thể tính lương'); setCalculating(false) },
      }
    )
  }

  const handleExport = async () => {
    const blob = await exportSalary.mutateAsync({ startDate, endDate })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `luong_${startDate}_${endDate}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="typo-h2">Tính lương kỳ này</h3>
        <span className="typo-caption">Tự động theo cấu hình</span>
      </div>

      <div className="rounded-md px-3 py-2.5 mb-4" style={{ background: 'var(--theme-bg-tertiary)' }}>
        <p className="typo-caption mb-0.5">Kỳ hiện tại</p>
        <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
          {formatDateRange(startDate, endDate, 'short')}
        </p>
      </div>

      <div className="mt-auto flex gap-2">
        <Button
          onClick={handleCalculate}
          disabled={calculating}
          className="btn-primary h-9 px-4 text-sm flex-1"
        >
          <Calculator className="w-3.5 h-3.5 mr-1.5" />
          {calculating ? 'Đang tính...' : 'Tính lương tất cả'}
        </Button>
        <Button
          onClick={handleExport}
          disabled={exportSalary.isPending}
          aria-label="Xuất Excel"
          className="btn-secondary h-9 px-3 text-sm inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Tải Excel</span>
        </Button>
      </div>
    </div>
  )
}

// ─── Driver Earnings Viewer (multi-driver table) ────────────────────────────

function DriverEarningsViewer() {
  const { data: config } = useSalaryConfig()

  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    const fromDay = config?.fromDay ?? 26
    const toDay = config?.toDay ?? 25
    const period = getSalaryPeriodDates(now, { fromDay, toDay })
    return {
      startDate: toISODate(period.startDate),
      endDate: toISODate(period.endDate),
    }
  }, [config])

  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [baseSalaryDriver, setBaseSalaryDriver] = useState<{
    id: number
    name: string | null
  } | null>(null)

  useDriverEarnings(
    Number(selectedDriverId) || 0,
    startDate,
    endDate,
  )

  // Fetch all drivers' earnings via dashboard API
  const { data: dashboardData = [], isLoading: loadingDashboard } = useSalaryDashboard(startDate, endDate)

  const totals = useMemo(() => ({
    orders: dashboardData.reduce((s, d) => s + d.matchedOrderCount, 0),
    base: dashboardData.reduce((s, d) => s + (d.baseSalary ?? 0), 0),
    salary: dashboardData.reduce((s, d) => s + d.totalSalary, 0),
    allowance: dashboardData.reduce((s, d) => s + d.totalAllowance, 0),
    earnings: dashboardData.reduce((s, d) => s + d.totalEarnings, 0),
  }), [dashboardData])

  if (!config) {
    return (
      <div className="card p-10 text-center">
        <Wallet className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)', opacity: 0.5 }} />
        <p className="typo-h3 mb-1" style={{ color: 'var(--theme-text-primary)' }}>Chưa có cấu hình kỳ lương</p>
        <p className="typo-body-sm" style={{ color: 'var(--theme-text-muted)' }}>
          Lưu cấu hình kỳ lương trước khi xem thu nhập.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary totals */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card p-4">
          <p className="typo-caption">Tổng đơn đã khớp</p>
          <p className="typo-value-lg">{totals.orders}</p>
        </div>
        <div className="card p-4">
          <p className="typo-caption">Tổng lương cơ bản</p>
          <p className="typo-mono text-sm">{formatCurrencyFull(totals.base)}</p>
        </div>
        <div className="card p-4">
          <p className="typo-caption">Tổng lương sản lượng</p>
          <p className="typo-mono text-sm">{formatCurrencyFull(totals.salary)}</p>
        </div>
        <div className="card p-4">
          <p className="typo-caption">Tổng phụ cấp</p>
          <p className="typo-mono text-sm">{formatCurrencyFull(totals.allowance)}</p>
        </div>
        <div className="card p-4">
          <p className="typo-caption">Tổng thu nhập</p>
          <p className="typo-mono text-sm font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>
            {formatCurrencyFull(totals.earnings)}
          </p>
        </div>
      </div>

      {/* Per-driver table */}
      {loadingDashboard ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--theme-border-default)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--theme-bg-tertiary)' }}>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Tài xế</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Đơn</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Lương cơ bản</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Sản lượng</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Phụ cấp</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Tổng</th>
                <th className="w-10 px-2 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.map((d, i) => (
                <tr
                  key={d.driverId}
                  className="transition-colors cursor-pointer"
                  style={{
                    background: i % 2 === 0 ? 'var(--theme-bg-primary)' : 'var(--theme-bg-secondary)',
                    borderTop: '1px solid var(--theme-border-light)',
                  }}
                  onClick={() => setSelectedDriverId(String(d.driverId))}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'var(--theme-bg-primary)' : 'var(--theme-bg-secondary)' }}
                >
                  <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--theme-text-primary)' }}>{d.driverName}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{d.matchedOrderCount}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(d.baseSalary ?? 0)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(d.totalSalary)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(d.totalAllowance)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyFull(d.totalEarnings)}</td>
                  <td className="px-2 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setBaseSalaryDriver({ id: d.driverId, name: d.driverName })
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-[var(--theme-bg-tertiary)]"
                      aria-label="Cấu hình lương cơ bản"
                      title="Cấu hình lương cơ bản"
                    >
                      <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--theme-text-muted)' }} />
                    </button>
                  </td>
                </tr>
              ))}
              {dashboardData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    Chưa có dữ liệu kỳ {formatDateRange(startDate, endDate, 'short')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <DriverBaseSalaryDialog
        open={baseSalaryDriver !== null}
        onOpenChange={(open) => { if (!open) setBaseSalaryDriver(null) }}
        driverId={baseSalaryDriver?.id ?? null}
        driverName={baseSalaryDriver?.name ?? null}
      />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SalarySetup() {
  return (
    <SettingsPageLayout title="Kỳ lương" subtitle="Cấu hình kỳ tính lương tài xế" icon={Wallet}>
      {/* Top: config + calculate, equal-height side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <PeriodConfigCard />
        <CalculateCard />
      </div>

      {/* Driver Earnings Viewer */}
      <section className="space-y-3">
        <h2 className="typo-h2">Xem thu nhập tài xế</h2>
        <DriverEarningsViewer />
      </section>
    </SettingsPageLayout>
  )
}
