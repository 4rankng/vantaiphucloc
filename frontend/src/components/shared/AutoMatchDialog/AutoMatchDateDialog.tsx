import { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { RobotDialogHero } from '@/components/shared/RobotHead'
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

/* ── Month navigator pill ─────────────────────────────────── */
function MonthNav({
  label,
  year,
  month,
  onPrev,
  onNext,
  accentColor = '#6d28d9',
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
      <p className="text-xs font-semibold" style={{ color: accentColor }}>{label}</p>
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
          aria-label="Tháng trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span
          className="flex-1 text-center text-sm font-semibold select-none"
          style={{ color: '#1f2937', letterSpacing: '-0.01em' }}
        >
          {VI_MONTHS[month - 1]}&nbsp;<span style={{ color: accentColor, fontWeight: 700 }}>{year}</span>
        </span>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110 active:scale-95"
          style={{ color: accentColor, background: 'transparent' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}18` }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          aria-label="Tháng tiếp theo"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Fine-tune hint */}
      <p className="text-[10.5px] text-center" style={{ color: '#9ca3af' }}>
        {firstDayOf(year, month).split('-').reverse().join('/')}
        &nbsp;→&nbsp;
        {lastDayOf(year, month).split('-').reverse().join('/')}
      </p>
    </div>
  )
}

/* ── Cycling scan messages ──────────────────────────────── */
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
  const [fromYM, setFromYM] = useState(() => toYearMonth(defaultDateFrom))
  const [toYM, setToYM] = useState(() => toYearMonth(defaultDateTo))

  // Re-sync when defaults change (dialog re-opens)
  useEffect(() => {
    if (open) {
      setFromYM(toYearMonth(defaultDateFrom))
      setToYM(toYearMonth(defaultDateTo))
    }
  }, [open, defaultDateFrom, defaultDateTo])

  const handleOpen = useCallback((isOpen: boolean) => {
    if (!isOpen) onClose()
  }, [onClose])

  const handleConfirm = useCallback(() => {
    onConfirm(firstDayOf(fromYM.year, fromYM.month), lastDayOf(toYM.year, toYM.month))
  }, [fromYM, toYM, onConfirm])

  const prevFrom = useCallback(() => setFromYM(ym => addMonths(ym.year, ym.month, -1)), [])
  const nextFrom = useCallback(() => {
    setFromYM(ym => {
      const next = addMonths(ym.year, ym.month, 1)
      // clamp: from can't exceed to
      if (next.year > toYM.year || (next.year === toYM.year && next.month > toYM.month)) return ym
      return next
    })
  }, [toYM])

  const prevTo = useCallback(() => {
    setToYM(ym => {
      const prev = addMonths(ym.year, ym.month, -1)
      // clamp: to can't go before from
      if (prev.year < fromYM.year || (prev.year === fromYM.year && prev.month < fromYM.month)) return ym
      return prev
    })
  }, [fromYM])

  const nextTo = useCallback(() => setToYM(ym => addMonths(ym.year, ym.month, 1)), [])

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : handleOpen}>
      <DialogContent
        className="max-w-sm overflow-hidden p-0 border-0 gap-0"
        style={{ borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}
      >
        <DialogTitle style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
          Quét thông minh với AI
        </DialogTitle>

        {/* ── Hero Header ─────────────────────────────── */}
        <RobotDialogHero
          title={isPending ? 'AI đang quét dữ liệu…' : 'Quét thông minh với AI'}
          thinking={isPending}
        >
          {isPending && <ScanMessages />}
        </RobotDialogHero>

        {/* ── Month pickers ────────────────────────────── */}
        {!isPending && (
          <div className="px-6 py-5" style={{ background: 'var(--theme-bg-secondary)' }}>
            <div className="grid grid-cols-2 gap-4">
              <MonthNav
                label="Từ tháng"
                year={fromYM.year}
                month={fromYM.month}
                onPrev={prevFrom}
                onNext={nextFrom}
              />
              <MonthNav
                label="Đến tháng"
                year={toYM.year}
                month={toYM.month}
                onPrev={prevTo}
                onNext={nextTo}
                accentColor="#7c3aed"
              />
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
                style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#111')}
                onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
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
