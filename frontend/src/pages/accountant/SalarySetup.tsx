import { useState, useMemo } from 'react'
import { Button, Input } from '@/components/ui'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  useSalaryConfig, useUpdateSalaryConfig,
  useSalaryPeriods, useUpdateSalaryPeriod,
  useCalculateSalary, useExportSalaryExcel,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { formatCurrencyFull, type SalaryPeriodStatus } from '@/data/domain'
import { Calculator, Download, CheckCircle2, Wallet } from 'lucide-react'

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SalaryPeriodStatus, { label: string; chip: string }> = {
  OPEN:       { label: 'Chờ tính',  chip: 'chip chip-warning' },
  CALCULATED: { label: 'Đã tính',   chip: 'chip chip-info'    },
  PAID:       { label: 'Đã trả',    chip: 'chip chip-success' },
}

// ─── Period config card ───────────────────────────────────────────────────────

function PeriodConfigCard() {
  const toast = useToast()
  const { data: config, isLoading: loading } = useSalaryConfig()
  const updateConfig = useUpdateSalaryConfig()
  const [fromDay, setFromDay] = useState('26')
  const [toDay, setToDay] = useState('25')
  const [synced, setSynced] = useState(false)

  if (config && !synced) {
    setFromDay(String(config.from_day ?? 26))
    setToDay(String(config.to_day ?? 25))
    setSynced(true)
  }

  const explanation = useMemo(() => {
    if (!fromDay || !toDay) return ''
    return `Ngày ${fromDay} tháng này → ngày ${toDay} tháng sau`
  }, [fromDay, toDay])

  const handleSave = () => {
    updateConfig.mutate(
      { from_day: parseInt(fromDay) || 26, to_day: parseInt(toDay) || 25 },
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
            onChange={e => setFromDay(e.target.value)}
            placeholder="26"
            className="h-9 text-sm font-mono text-center"
          />
        </div>
        <div className="space-y-1.5">
          <label className="typo-form-label" htmlFor="salary-to-day">Đến ngày</label>
          <Input
            id="salary-to-day"
            type="number"
            min={1}
            max={31}
            value={toDay}
            onChange={e => setToDay(e.target.value)}
            placeholder="25"
            className="h-9 text-sm font-mono text-center"
          />
        </div>
      </div>

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
    const fromDay = config?.from_day ?? 26
    const toDay = config?.to_day ?? 25
    const year = now.getFullYear()
    const month = now.getMonth()

    let start: Date, end: Date
    if (now.getDate() >= fromDay) {
      start = new Date(year, month, fromDay)
      end = new Date(year, month + 1, toDay)
    } else {
      start = new Date(year, month - 1, fromDay)
      end = new Date(year, month, toDay)
    }
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    }
  }, [config])

  const handleCalculate = () => {
    setCalculating(true)
    calculateSalary.mutate(
      { startDate, endDate },
      {
        onSuccess: () => { toast.success('Đã tính lương', `Kỳ ${startDate} → ${endDate}`); setCalculating(false) },
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
          {startDate} → {endDate}
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
          className="btn-secondary h-9 w-9 p-0 inline-flex items-center justify-center"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Salary periods list ──────────────────────────────────────────────────────

function SalaryPeriodsList() {
  const toast = useToast()
  const { data: periods = [], isLoading } = useSalaryPeriods()
  const updatePeriod = useUpdateSalaryPeriod()
  const [confirmPay, setConfirmPay] = useState<number | null>(null)

  const byDriver = useMemo(() => {
    const map = new Map<string, typeof periods>()
    periods.forEach(p => {
      const list = map.get(p.driverName) ?? []
      list.push(p)
      map.set(p.driverName, list)
    })
    return Array.from(map.entries())
  }, [periods])

  const handleMarkPaid = (id: number) => {
    updatePeriod.mutate(
      { id, data: { status: 'PAID' } },
      {
        onSuccess: () => { toast.success('Đã đánh dấu đã trả lương'); setConfirmPay(null) },
        onError: () => toast.error('Lỗi', 'Không thể cập nhật'),
      }
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  if (periods.length === 0) {
    return (
      <div className="card p-10 text-center">
        <Wallet className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)', opacity: 0.5 }} />
        <p className="typo-h3 mb-1" style={{ color: 'var(--theme-text-primary)' }}>Chưa có kỳ lương nào</p>
        <p className="typo-body-sm" style={{ color: 'var(--theme-text-muted)' }}>
          Nhấn "Tính lương tất cả" để tạo kỳ lương đầu tiên.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {byDriver.map(([driverName, driverPeriods]) => (
        <section key={driverName}>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="typo-h3">{driverName}</h3>
            <span className="typo-caption">{driverPeriods.length} kỳ</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {driverPeriods.map(period => {
              const cfg = STATUS_CONFIG[period.status]
              const isPaid = period.status === 'PAID'
              const isConfirming = confirmPay === period.id

              return (
                <div key={period.id} className="card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>
                      {period.startDate} → {period.endDate}
                    </p>
                    <span className={cfg.chip}>{cfg.label}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="typo-caption">Số cont</p>
                      <p className="typo-value-lg" style={{ color: 'var(--theme-text-primary)' }}>{period.workOrderCount}</p>
                    </div>
                    <div>
                      <p className="typo-caption">Lương</p>
                      <p className="typo-mono text-sm" style={{ color: 'var(--theme-text-primary)' }}>
                        {formatCurrencyFull(period.totalSalary)}
                      </p>
                    </div>
                    <div>
                      <p className="typo-caption">Thực nhận</p>
                      <p className="typo-mono text-sm font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>
                        {formatCurrencyFull(period.netPay)}
                      </p>
                    </div>
                  </div>

                  {isPaid ? (
                    <div className="flex items-center gap-1.5 pt-1" style={{ color: 'var(--theme-status-success)' }}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <p className="text-xs font-semibold">Kỳ lương đã chốt</p>
                    </div>
                  ) : isConfirming ? (
                    <div className="space-y-2">
                      <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                        Xác nhận đã trả <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(period.netPay)}</span> cho {driverName}?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setConfirmPay(null)}
                          className="btn-secondary h-8 px-3 text-xs flex-1"
                        >
                          Huỷ
                        </Button>
                        <Button
                          onClick={() => handleMarkPaid(period.id)}
                          disabled={updatePeriod.isPending}
                          className="h-8 px-3 text-xs font-bold flex-1 rounded-md"
                          style={{ background: 'var(--theme-status-success)', color: 'white' }}
                        >
                          Xác nhận đã trả
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setConfirmPay(period.id)}
                      className="h-8 px-3 text-xs font-semibold w-full rounded-md"
                      style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
                    >
                      Đánh dấu đã trả
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SalarySetup() {
  return (
    <div className="page-container space-y-5">
      <PageHeader
        title="Cấu hình lương"
        subtitle="Quản lý kỳ lương và tính toán lương tài xế"
      />

      {/* Top: config + calculate, equal-height side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <PeriodConfigCard />
        <CalculateCard />
      </div>

      {/* History */}
      <section className="space-y-3">
        <h2 className="typo-h2">Lịch sử kỳ lương</h2>
        <SalaryPeriodsList />
      </section>
    </div>
  )
}
