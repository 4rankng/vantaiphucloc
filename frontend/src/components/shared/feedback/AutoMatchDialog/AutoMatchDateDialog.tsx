import { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { RobotDialogHero } from '@/components/shared/feedback/RobotHead'
import { Input } from '@/components/ui/Input'
import { useSalaryConfig } from '@/hooks/use-queries'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  defaultDateFrom: string
  defaultDateTo: string
  isPending: boolean
  onConfirm: (dateFrom: string, dateTo: string) => void
}

/* ── Helpers ──────────────────────────────────────────────── */
function toYearMonth(dateStr: string): { year: number; month: number } {
  const [y, m] = dateStr.split('-').map(Number)
  return { year: y || new Date().getFullYear(), month: m || new Date().getMonth() + 1 }
}

function firstDayOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function lastDayOf(year: number, month: number): string {
  const last = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  let m = month - 1 + delta
  let y = year + Math.floor(m / 12)
  m = ((m % 12) + 12) % 12
  return { year: y, month: m + 1 }
}

const VI_MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']

/* ── Period navigator pill ─────────────────────────────────── */
function PeriodNav({
  label,
  year,
  month,
  onPrev,
  onNext,
  accentColor = 'var(--theme-ai-accent)',
}: {
  label: string
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
  accentColor?: string
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] font-semibold" style={{ color: accentColor }}>{label}</p>
      <div
        className="flex items-center justify-between rounded-xl px-1 py-1"
        style={{ border: `1.5px solid ${accentColor}66`, background: 'white', gap: 4 }}
      >
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110 active:scale-95"
          style={{ color: accentColor, background: 'transparent' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}18` }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span
          className="flex-1 text-center text-sm font-semibold select-none"
           style={{ color: 'var(--theme-text-primary)', letterSpacing: '-0.01em' }}
        >
          {VI_MONTHS[month - 1]} / <span style={{ color: accentColor, fontWeight: 700 }}>{year}</span>
        </span>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110 active:scale-95"
          style={{ color: accentColor, background: 'transparent' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}18` }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}/* ── Cycling scan messages ──────────────────────────────── */
const SCAN_MESSAGES = [
  'Đang quét dữ liệu chuyến xe…',
  'Phân tích tuyến đường & chủ hàng…',
  'Đối chiếu số container…',
  'Tìm kiếm các cặp phù hợp…',
  'Đang hoàn tất kết quả…',
]

function ScanMessages() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % SCAN_MESSAGES.length); setVisible(true) }, 350)
    }, 1800)
    return () => clearInterval(id)
  }, [])

  return (
    <p style={{
      color: 'rgba(196,181,253,0.9)', fontSize: 13, margin: '10px 0 0', fontWeight: 500,
      transition: 'opacity 0.3s, transform 0.3s',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(5px)',
      minHeight: 20,
    }}>
      {SCAN_MESSAGES[idx]}
    </p>
  )
}

/* ── Main component ─────────────────────────────────────── */
export function AutoMatchDateDialog({ open, onClose, defaultDateFrom, defaultDateTo, isPending, onConfirm }: Props) {
  const { data: salaryConfig } = useSalaryConfig()

  const [dateFrom, setDateFrom] = useState(defaultDateFrom)
  const [dateTo, setDateTo] = useState(defaultDateTo)
  const [period, setPeriod] = useState(() => toYearMonth(defaultDateFrom))

  // Re-sync when defaults change (dialog re-opens)
  useEffect(() => {
    if (open) {
      setDateFrom(defaultDateFrom)
      setDateTo(defaultDateTo)
      setPeriod(toYearMonth(defaultDateFrom))
    }
  }, [open, defaultDateFrom, defaultDateTo])

  const handleOpen = useCallback((isOpen: boolean) => {
    if (!isOpen) onClose()
  }, [onClose])

  const handleConfirm = useCallback(() => {
    onConfirm(dateFrom, dateTo)
  }, [dateFrom, dateTo, onConfirm])

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

    const actualFromDay = Math.min(fromDay, maxDaysInStartMonth)
    const actualToDay = Math.min(toDay, maxDaysInEndMonth)

    setDateFrom(`${startYear}-${String(startMonth).padStart(2, '0')}-${String(actualFromDay).padStart(2, '0')}`)
    setDateTo(`${endYear}-${String(endMonth).padStart(2, '0')}-${String(actualToDay).padStart(2, '0')}`)
  }, [salaryConfig])

  const handlePrevPeriod = useCallback(() => {
    const prev = addMonths(period.year, period.month, -1)
    handleMonthChange(prev.year, prev.month)
  }, [period, handleMonthChange])

  const handleNextPeriod = useCallback(() => {
    const next = addMonths(period.year, period.month, 1)
    handleMonthChange(next.year, next.month)
  }, [period, handleMonthChange])

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : handleOpen}>
      <DialogContent
        className="max-w-sm overflow-hidden p-0 border-0 gap-0"
        style={{ borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}
      >
        <DialogTitle style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
          Đối chiếu tự động
        </DialogTitle>

        {/* ── Hero Header ─────────────────────────────── */}
        <RobotDialogHero
          title={isPending ? 'Đang quét dữ liệu…' : 'Đối chiếu tự động'}
          thinking={isPending}
        >
          {isPending && <ScanMessages />}
        </RobotDialogHero>

        {/* ── Pickers ───────────────────────────────────── */}
        {!isPending && (
          <div className="px-6 py-5 space-y-5" style={{ background: 'var(--theme-bg-secondary)' }}>
            
            {/* Month Selector */}
            <PeriodNav
              label="Kỳ lương"
              year={period.year}
              month={period.month}
              onPrev={handlePrevPeriod}
              onNext={handleNextPeriod}
              accentColor="var(--theme-ai-accent)"
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
        )}

        {/* ── Footer ───────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'var(--theme-bg-secondary)', borderTop: isPending ? 'none' : '1px solid var(--theme-border-default)' }}
        >
          {isPending ? (
            <div style={{ height: 8 }} />
          ) : (
            <>
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
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-white text-sm font-medium bg-violet-600 hover:bg-violet-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
                  <path d="M20 3v4"/><path d="M22 5h-4"/>
                  <path d="M4 17v2"/><path d="M5 18H3"/>
                </svg>
                Bắt đầu quét
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
