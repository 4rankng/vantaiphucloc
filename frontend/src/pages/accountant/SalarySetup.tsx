import { useState, useMemo } from 'react'
import { Button, Input } from '@/components/ui'
import {
  useSalaryConfig, useUpdateSalaryConfig,
  useSalaryPeriods, useUpdateSalaryPeriod,
  useCalculateSalary, useExportSalaryExcel,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { formatCurrencyFull, type SalaryPeriodStatus } from '@/data/domain'
import { Settings, Calculator, Download, CheckCircle2, Clock, Wallet, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SalaryPeriodStatus, { label: string; bg: string; color: string }> = {
  OPEN:       { label: 'Chờ tính',  bg: 'var(--theme-status-warning-light)',  color: 'var(--theme-status-warning)'  },
  CALCULATED: { label: 'Đã tính',   bg: '#DBEAFE',                            color: '#1D4ED8'                      },
  PAID:       { label: 'Đã trả',    bg: 'var(--theme-status-success-light)',  color: 'var(--theme-status-success)'  },
}

// ─── Period config section ────────────────────────────────────────────────────

function PeriodConfigSection() {
  const toast = useToast()
  const { data: config, isLoading: loading } = useSalaryConfig()
  const updateConfig = useUpdateSalaryConfig()
  const [fromDay, setFromDay] = useState('26')
  const [toDay, setToDay] = useState('25')
  const [synced, setSynced] = useState(false)
  const [open, setOpen] = useState(false)

  if (config && !synced) {
    setFromDay(String(config.from_day ?? 26))
    setToDay(String(config.to_day ?? 25))
    setSynced(true)
  }

  const explanation = (() => {
    if (!fromDay || !toDay) return ''
    const from = `ngày ${fromDay}`
    const to = `ngày ${toDay}`
    return `${from} tháng này → ${to} tháng sau`
  })()

  const handleSave = () => {
    updateConfig.mutate(
      { from_day: parseInt(fromDay) || 26, to_day: parseInt(toDay) || 25 },
      {
        onSuccess: () => { toast.success('Đã lưu cấu hình kỳ lương'); setOpen(false) },
        onError: () => toast.error('Lỗi', 'Không thể lưu cấu hình'),
      },
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', boxShadow: 'var(--theme-shadow-card)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 touch-manipulation"
      >
        <div className="flex items-center gap-2.5">
          <Settings className="w-4 h-4" style={{ color: 'var(--theme-brand-primary)' }} />
          <div className="text-left">
            <p className="typo-h2">Cấu hình kỳ lương</p>
            {config && !open && (
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                Ngày {config.from_day} → ngày {config.to_day} tháng sau
              </p>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
          {/* Row 1 — inputs with inline labels */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="relative">
              <span className="absolute left-3 top-1.5 text-[10px] font-semibold leading-none pointer-events-none"
                style={{ color: 'var(--theme-text-muted)' }}>Từ ngày</span>
              <Input type="number" min={1} max={31} value={fromDay} onChange={e => setFromDay(e.target.value)}
                placeholder="26" className="text-base font-mono text-center h-12 pt-4" />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1.5 text-[10px] font-semibold leading-none pointer-events-none"
                style={{ color: 'var(--theme-text-muted)' }}>Đến ngày</span>
              <Input type="number" min={1} max={31} value={toDay} onChange={e => setToDay(e.target.value)}
                placeholder="25" className="text-base font-mono text-center h-12 pt-4" />
            </div>
          </div>
          {/* Row 2 — description */}
          {fromDay && toDay && (
            <div className="rounded-xl p-2.5" style={{ background: 'var(--theme-brand-primary-light)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>{explanation}</p>
            </div>
          )}
          {/* Row 3 — save button */}
          <Button onClick={handleSave} disabled={updateConfig.isPending || loading}
            className="w-full h-10 font-bold rounded-xl"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            {updateConfig.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Calculate salary section ─────────────────────────────────────────────────

function CalculateSection() {
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

  const handleCalculate = async () => {
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
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', boxShadow: 'var(--theme-shadow-card)' }}>
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4" style={{ color: 'var(--theme-brand-primary)' }} />
        <p className="typo-h2">Tính lương kỳ này</p>
      </div>
      <div className="rounded-xl px-3 py-2" style={{ background: 'var(--theme-bg-tertiary)' }}>
        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Kỳ hiện tại</p>
        <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
          {startDate} → {endDate}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleCalculate} disabled={calculating}
          className="flex-1 h-10 font-bold rounded-xl text-sm"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
          <Calculator className="w-4 h-4 mr-1.5" />
          {calculating ? 'Đang tính...' : 'Tính lương tất cả'}
        </Button>
        <Button onClick={handleExport} disabled={exportSalary.isPending}
          className="h-10 px-3 rounded-xl"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}>
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
    return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  if (periods.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
        <Wallet className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)', opacity: 0.5 }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Chưa có kỳ lương nào</p>
        <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Nhấn "Tính lương" để tạo kỳ lương đầu tiên</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {byDriver.map(([driverName, driverPeriods]) => (
        <div key={driverName}>
          <p className="typo-label mb-2">
            {driverName}
          </p>
          <div className="space-y-2">
            {driverPeriods.map(period => {
              const cfg = STATUS_CONFIG[period.status]
              const isPaid = period.status === 'PAID'
              const isConfirming = confirmPay === period.id

              return (
                <div key={period.id} className="rounded-2xl p-3 space-y-2"
                  style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', boxShadow: 'var(--theme-shadow-card)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>
                      {period.startDate} → {period.endDate}
                    </p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Số cont</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{period.workOrderCount}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Lương</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(period.totalSalary)}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Thực nhận</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyFull(period.netPay)}</p>
                    </div>
                  </div>

                  {isPaid ? (
                    <div className="flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-success)' }} />
                      <p className="text-xs font-semibold" style={{ color: 'var(--theme-status-success)' }}>
                        Kỳ lương đã chốt — không thể thay đổi
                      </p>
                    </div>
                  ) : isConfirming ? (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                        Xác nhận đã trả {formatCurrencyFull(period.netPay)} cho {driverName}?
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={() => setConfirmPay(null)}
                          className="flex-1 h-8 text-xs font-semibold"
                          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}>
                          Huỷ
                        </Button>
                        <Button onClick={() => handleMarkPaid(period.id)} disabled={updatePeriod.isPending}
                          className="flex-1 h-8 text-xs font-bold"
                          style={{ background: 'var(--theme-status-success)', color: '#fff' }}>
                          Xác nhận đã trả
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => setConfirmPay(period.id)}
                      className="w-full h-8 text-xs font-bold rounded-xl"
                      style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
                      Đánh dấu đã trả
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SalarySetup() {
  return (
    <div className="space-y-4 pb-6">
      <PeriodConfigSection />
      <CalculateSection />
      <div>
        <p className="typo-label mb-2">
          <Clock className="w-3 h-3 inline mr-1" />
          Lịch sử kỳ lương
        </p>
        <SalaryPeriodsList />
      </div>
    </div>
  )
}
