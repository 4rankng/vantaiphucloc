import { useState, useCallback, useEffect } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { InlineSelect } from '@/components/shared/forms/InlineSelect'
import { useSalaryConfig, useClients } from '@/hooks/use-queries'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  defaultDateFrom: string
  defaultDateTo: string
  isPending: boolean
  onConfirm: (clientId: number, dateFrom: string, dateTo: string) => void
}

/* ── Helpers ──────────────────────────────────────────────── */
function toYearMonth(dateStr: string): { year: number; month: number } {
  const [y, m] = dateStr.split('-').map(Number)
  return { year: y || new Date().getFullYear(), month: m || new Date().getMonth() + 1 }
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  let m = month - 1 + delta
  const y = year + Math.floor(m / 12)
  m = ((m % 12) + 12) % 12
  return { year: y, month: m + 1 }
}

const VI_MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']

const ACCENT = 'var(--theme-status-success)'

/* ── Period navigator pill ─────────────────────────────────── */
function PeriodNav({ year, month, onPrev, onNext }: {
  year: number; month: number; onPrev: () => void; onNext: () => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] font-semibold" style={{ color: ACCENT }}>Kỳ lương</p>
      <div
        className="flex items-center justify-between rounded-xl px-1 py-1"
        style={{ border: `1.5px solid ${ACCENT}66`, background: 'white', gap: 4 }}
      >
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110 active:scale-95"
          style={{ color: ACCENT, background: 'transparent' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${ACCENT}18` }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span
          className="flex-1 text-center text-sm font-semibold select-none"
          style={{ color: '#1f2937', letterSpacing: '-0.01em' }}
        >
          {VI_MONTHS[month - 1]} / <span style={{ color: ACCENT, fontWeight: 700 }}>{year}</span>
        </span>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110 active:scale-95"
          style={{ color: ACCENT, background: 'transparent' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${ACCENT}18` }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────── */
export function ExportDoiSoatDialog({ open, onClose, defaultDateFrom, defaultDateTo, isPending, onConfirm }: Props) {
  const isMobile = useIsMobile()
  const { data: salaryConfig } = useSalaryConfig()
  const { data: clients = [] } = useClients()

  const [clientId, setClientId] = useState<string>('ALL')
  const [dateFrom, setDateFrom] = useState(defaultDateFrom)
  const [dateTo, setDateTo] = useState(defaultDateTo)
  const [period, setPeriod] = useState(() => toYearMonth(defaultDateFrom))

  useEffect(() => {
    if (open) {
      setClientId('ALL')
      setDateFrom(defaultDateFrom)
      setDateTo(defaultDateTo)
      setPeriod(toYearMonth(defaultDateFrom))
    }
  }, [open, defaultDateFrom, defaultDateTo])

  const handleOpen = useCallback((isOpen: boolean) => {
    if (!isOpen) onClose()
  }, [onClose])

  const handleMonthChange = useCallback((year: number, month: number) => {
    setPeriod({ year, month })

    let fromDay = 1
    let toDay = new Date(year, month, 0).getDate()
    let startMonth = month
    let startYear = year
    let endMonth = month
    let endYear = year

    if (salaryConfig) {
      fromDay = salaryConfig.fromDay
      toDay = salaryConfig.toDay
      startMonth = fromDay > toDay ? (month === 1 ? 12 : month - 1) : month
      startYear = fromDay > toDay && month === 1 ? year - 1 : year
      endMonth = month
      endYear = year
    }

    const maxDaysInStartMonth = new Date(startYear, startMonth, 0).getDate()
    const maxDaysInEndMonth = new Date(endYear, endMonth, 0).getDate()

    setDateFrom(`${startYear}-${String(startMonth).padStart(2, '0')}-${String(Math.min(fromDay, maxDaysInStartMonth)).padStart(2, '0')}`)
    setDateTo(`${endYear}-${String(endMonth).padStart(2, '0')}-${String(Math.min(toDay, maxDaysInEndMonth)).padStart(2, '0')}`)
  }, [salaryConfig])

  const handlePrevPeriod = useCallback(() => {
    const prev = addMonths(period.year, period.month, -1)
    handleMonthChange(prev.year, prev.month)
  }, [period, handleMonthChange])

  const handleNextPeriod = useCallback(() => {
    const next = addMonths(period.year, period.month, 1)
    handleMonthChange(next.year, next.month)
  }, [period, handleMonthChange])

  const canConfirm = clientId !== 'ALL' && !isPending

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return
    onConfirm(Number(clientId), dateFrom, dateTo)
  }, [canConfirm, clientId, dateFrom, dateTo, onConfirm])

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : handleOpen}>
      <DialogContent
        className={`max-w-sm overflow-hidden p-0 border-0 gap-0 ${isMobile ? 'flex flex-col' : ''}`}
        style={!isMobile ? { borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.35)' } : undefined}
        {...(isMobile ? { 'data-mobile-fullscreen': '' } : {})}
      >
        <DialogTitle style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
          Xuất file đối soát
        </DialogTitle>

        {/* Header */}
        <div
          className="px-6 pt-5 pb-4"
          style={{ background: 'linear-gradient(135deg, var(--theme-status-success) 0%, var(--theme-brand-primary) 100%)' }}
        >
          <h3 className="text-white text-base font-semibold" style={{ letterSpacing: '-0.01em' }}>
            Xuất file đối soát
          </h3>
          <p className="text-emerald-100 text-[13px] mt-1">
            Chọn chủ hàng và khoảng thời gian để xuất Excel
          </p>
        </div>

        {/* Body */}
        <div className={`space-y-5 py-5 ${isMobile ? 'flex-1 overflow-y-auto px-4' : 'px-6'}`} style={{ background: 'var(--theme-bg-secondary)' }}>
          {/* Client selector */}
          <div className="space-y-1.5">
            <p className="text-[13px] font-medium text-[var(--ink-2)]">Chủ hàng</p>
            <InlineSelect
              placeholder="Chọn chủ hàng"
              value={clientId}
              options={[
                { value: 'ALL', label: 'Chọn chủ hàng...' },
                ...clients.map(c => ({
                  value: String(c.id),
                  label: c.code ? `${c.code} — ${c.name}` : c.name,
                })),
              ]}
              onChange={setClientId}
              style={{ width: '100%', height: 34, fontSize: 13 }}
            />
          </div>

          {/* Month Selector */}
          <PeriodNav
            year={period.year}
            month={period.month}
            onPrev={handlePrevPeriod}
            onNext={handleNextPeriod}
          />

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-[var(--ink-2)]">Từ ngày</p>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ backgroundColor: 'white', color: 'var(--theme-text-primary)' }}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-[var(--ink-2)]">Đến ngày</p>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ backgroundColor: 'white', color: 'var(--theme-text-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'var(--theme-bg-secondary)', borderTop: '1px solid var(--theme-border-default)' }}
        >
          <button
            onClick={onClose}
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--theme-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--theme-text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--theme-text-muted)')}
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-white text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: canConfirm ? 'var(--theme-status-success)' : 'var(--theme-border-default)' }}
            onMouseEnter={e => { if (canConfirm) (e.currentTarget as HTMLButtonElement).style.background = 'var(--theme-brand-primary)' }}
            onMouseLeave={e => { if (canConfirm) (e.currentTarget as HTMLButtonElement).style.background = 'var(--theme-status-success)' }}
          >
            Xuất file
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
