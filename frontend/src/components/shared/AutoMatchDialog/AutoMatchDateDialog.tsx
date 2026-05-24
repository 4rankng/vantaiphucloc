import { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label'
import { RobotDialogHero } from '@/components/shared/RobotHead'

interface Props {
  open: boolean
  onClose: () => void
  defaultDateFrom: string
  defaultDateTo: string
  isPending: boolean
  onConfirm: (dateFrom: string, dateTo: string) => void
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
  const [dateFrom, setDateFrom] = useState(defaultDateFrom)
  const [dateTo, setDateTo] = useState(defaultDateTo)

  const handleOpen = useCallback((isOpen: boolean) => {
    if (!isOpen) onClose()
    else { setDateFrom(defaultDateFrom); setDateTo(defaultDateTo) }
  }, [onClose, defaultDateFrom, defaultDateTo])

  const handleConfirm = useCallback(() => {
    if (!dateFrom || !dateTo) return
    onConfirm(dateFrom, dateTo)
  }, [dateFrom, dateTo, onConfirm])

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : handleOpen}>
      <DialogContent className="max-w-sm overflow-hidden p-0 border-0 gap-0"
        style={{ borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}
      >
        <DialogTitle style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>Quét thông minh với AI</DialogTitle>
        {/* ── Hero Header ─────────────────────────────── */}
        <RobotDialogHero
          title={isPending ? 'AI đang quét dữ liệu…' : 'Quét thông minh với AI'}
          thinking={isPending}
        >
          {isPending && <ScanMessages />}
        </RobotDialogHero>

        {/* ── Date inputs (hidden while scanning) ─────── */}
        {!isPending && (
          <div className="px-6 py-5" style={{ background: 'var(--theme-bg-secondary)' }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="auto-match-from" className="text-xs font-semibold" style={{ color: '#6d28d9' }}>Từ ngày</Label>
                <Input id="auto-match-from" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  style={{ borderColor: dateFrom ? 'rgba(109,40,217,0.4)' : undefined }} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="auto-match-to" className="text-xs font-semibold" style={{ color: '#6d28d9' }}>Đến ngày</Label>
                <Input id="auto-match-to" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  style={{ borderColor: dateTo ? 'rgba(109,40,217,0.4)' : undefined }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ background: 'var(--theme-bg-secondary)', borderTop: isPending ? 'none' : '1px solid var(--theme-border-default)' }}
        >
          {isPending ? (
            <div style={{ height: 8 }} />
          ) : (
            <>
              <button onClick={onClose}
                className="text-sm font-medium transition-colors"
                style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#111')}
                onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
              >
                Hủy
              </button>
              <button
                onClick={handleConfirm}
                disabled={!dateFrom || !dateTo}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-white text-sm font-medium bg-violet-600 hover:bg-violet-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-1"
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
