import { useState, useMemo } from 'react'
import { Button, Input } from '@/components/ui'
import {
  useSalaryConfig, useUpdateSalaryConfig,
  useCalculateSalary, useExportSalaryExcel,
  useDriverEarnings, useDrivers,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { formatCurrencyFull } from '@/data/domain'
import { formatDateRange } from '@/lib/format'
import { Calculator, Download, Wallet } from 'lucide-react'
import { SettingsPageLayout } from '@/components/shared/SettingsPageLayout'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui'
import { getSalaryPeriodDates, toISODate } from '@/utils/salaryPeriod'

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

// ─── Driver Earnings Viewer ──────────────────────────────────────────────────

function DriverEarningsViewer() {
  const { data: config } = useSalaryConfig()
  const { data: drivers = [], isLoading: loadingDrivers } = useDrivers()

  // Compute current period dates from config
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

  const { data: earnings, isLoading: loadingEarnings } = useDriverEarnings(
    Number(selectedDriverId),
    startDate,
    endDate,
  )

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
      {/* Driver selector */}
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-xs">
          <label className="typo-form-label mb-1.5 block">Chọn tài xế</label>
          <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn tài xế" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map(d => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.fullName ?? d.username} — {d.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Earnings display */}
      {!selectedDriverId ? (
        <div className="card p-10 text-center">
          <Wallet className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)', opacity: 0.5 }} />
          <p className="typo-h3 mb-1" style={{ color: 'var(--theme-text-primary)' }}>Chọn tài xế để xem thu nhập</p>
          <p className="typo-body-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Kỳ hiện tại: {formatDateRange(startDate, endDate, 'short')}
          </p>
        </div>
      ) : loadingEarnings || loadingDrivers ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      ) : !earnings ? (
        <div className="card p-10 text-center">
          <Wallet className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)', opacity: 0.5 }} />
          <p className="typo-h3 mb-1" style={{ color: 'var(--theme-text-primary)' }}>Không có dữ liệu</p>
          <p className="typo-body-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Chưa có đơn hàng khớp trong kỳ {formatDateRange(startDate, endDate, 'short')}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card p-4">
            <p className="typo-caption">Đơn đã khớp</p>
            <p className="typo-value-lg" style={{ color: 'var(--theme-text-primary)' }}>
              {earnings.matchedOrderCount}
            </p>
          </div>
          <div className="card p-4">
            <p className="typo-caption">Lương tài xế</p>
            <p className="typo-mono text-sm" style={{ color: 'var(--theme-text-primary)' }}>
              {formatCurrencyFull(earnings.totalSalary)}
            </p>
          </div>
          <div className="card p-4">
            <p className="typo-caption">Phụ cấp</p>
            <p className="typo-mono text-sm" style={{ color: 'var(--theme-text-primary)' }}>
              {formatCurrencyFull(earnings.totalAllowance)}
            </p>
          </div>
          <div className="card p-4">
            <p className="typo-caption">Tổng thu nhập</p>
            <p className="typo-mono text-sm font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>
              {formatCurrencyFull(earnings.totalEarnings)}
            </p>
          </div>
        </div>
      )}
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
