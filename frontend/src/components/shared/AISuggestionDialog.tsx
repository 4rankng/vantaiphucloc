import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { Loader2 } from 'lucide-react'
import { useAISuggestMatch, useConfirmAutoMatch } from '@/hooks/use-queries'
import type { DeliveredTrip } from '@/data/domain'
import { RobotDialogHero, useTypewriter } from '@/components/shared/RobotHead'
import type { BookedTripSummary } from '@/services/api/autoMatch.api'

// Minimum "thinking" duration before results are revealed, even if the
// backend responds instantly. Keeps the AI illusion intact.
const AI_ANIMATION_TIME = 1800 // ms

const WORK_TYPE_LABELS: Record<string, string> = {
  CHUYEN_BAI: 'Chuyển bãi',
  XUAT_TAU: 'Xuất tàu',
  NHAP_TAU: 'Nhập tàu',
  'CHUYỂN BÃI': 'Chuyển bãi',
  'XUẤT TÀU': 'Xuất tàu',
  'NHẬP TÀU': 'Nhập tàu',
}

function fmtDate(d: string | null): string {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return d
}

/** Strip **...** markers — used during typewriter so asterisks never flash on screen. */
function stripBold(text: string): string {
  return text.replace(/\*\*/g, '')
}

/** Render **...** as <strong> — used once typing finishes. */
function renderMarkdownBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} style={{ fontWeight: 700, color: '#111827' }}>
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function TripSummaryChips({ summary }: { summary: BookedTripSummary }) {
  const chips: Array<{ label: string; value: string }> = []

  if (summary.contNumber) chips.push({ label: 'Cont', value: summary.contNumber })
  if (summary.tripDate) chips.push({ label: 'Ngày', value: fmtDate(summary.tripDate) })
  if (summary.clientName) chips.push({ label: 'Chủ hàng', value: summary.clientName })
  if (summary.pickupName) chips.push({ label: 'Đi', value: summary.pickupName })
  if (summary.dropoffName) chips.push({ label: 'Đến', value: summary.dropoffName })
  if (summary.vessel) chips.push({ label: 'Tàu', value: summary.vessel })
  if (summary.workType)
    chips.push({ label: 'Tác nghiệp', value: WORK_TYPE_LABELS[summary.workType] ?? summary.workType })

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {chips.map(({ label, value }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(99,102,241,0.1)', color: '#4338ca' }}
        >
          <span style={{ color: '#818cf8', fontWeight: 500 }}>{label}:</span>
          <span className="font-semibold">{value}</span>
        </span>
      ))}
    </div>
  )
}

const confidenceMap: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: 'Cao',        color: '#059669', bg: 'rgba(5,150,105,0.1)'  },
  medium: { label: 'Trung bình', color: '#d97706', bg: 'rgba(217,119,6,0.1)'  },
  low:    { label: 'Thấp',       color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
}

const SCAN_MSGS = [
  'Đang quét dữ liệu chuyến xe…',
  'Phân tích tuyến đường & chủ hàng…',
  'Đối chiếu số container…',
  'Tìm kiếm các cặp phù hợp…',
  'Đang hoàn tất kết quả…',
]

function ScanningMessage() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % SCAN_MSGS.length)
        setVisible(true)
      }, 300)
    }, Math.floor(AI_ANIMATION_TIME / SCAN_MSGS.length))
    return () => clearInterval(id)
  }, [])

  return (
    <p
      className="text-sm"
      style={{
        color: '#6b7280',
        margin: 0,
        transition: 'opacity 0.3s, transform 0.3s',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
      }}
    >
      {SCAN_MSGS[idx]}
    </p>
  )
}

export function AISuggestionDialog({ trip, onClose }: { trip: DeliveredTrip; onClose: () => void }) {
  const { mutate: suggestMatch, data, isPending, error } = useAISuggestMatch()
  const { mutate: confirmMatch, isPending: isConfirming } = useConfirmAutoMatch()

  // Track when the request started so we can enforce minimum animation time
  const startedAtRef = useRef(Date.now())
  const [dataReady, setDataReady] = useState(false)

  useEffect(() => {
    startedAtRef.current = Date.now()
    setDataReady(false)
    suggestMatch(trip.id)
  }, [trip.id, suggestMatch])

  // Enforce AI_ANIMATION_TIME minimum before revealing results
  useEffect(() => {
    if ((data || error) && !isPending) {
      const elapsed = Date.now() - startedAtRef.current
      const remaining = Math.max(0, AI_ANIMATION_TIME - elapsed)
      const timer = setTimeout(() => setDataReady(true), remaining)
      return () => clearTimeout(timer)
    }
  }, [data, error, isPending])

  const isLoading = isPending || !dataReady

  // Use the plain (no-asterisk) text as source for typewriter so markers never flash
  const reasoningRaw = data?.reasoning ?? ''
  const reasoningPlain = stripBold(reasoningRaw)
  const { displayed, done } = useTypewriter(dataReady && !isPending ? reasoningPlain : '', 14)
  const isTyping = !!displayed && !done

  const handleConfirm = () => {
    if (!data?.suggestedBookedTripId) return
    confirmMatch(
      [{ deliveredTripId: trip.id, bookedTripId: data.suggestedBookedTripId }],
      { onSuccess: onClose }
    )
  }

  const confidence = data?.confidence ? confidenceMap[data.confidence] : null
  const hasMatch = dataReady && !isPending && data?.suggestedBookedTripId

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-[460px] overflow-hidden p-0 border-0 gap-0"
        style={{ borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
      >
        <DialogTitle className="sr-only">AI Đề xuất ghép chuyến</DialogTitle>

        {/* ── Hero Header ──────────────────────────────────── */}
        <RobotDialogHero
          title={
            isLoading
              ? 'AI đang phân tích…'
              : error
              ? 'Đã xảy ra lỗi'
              : hasMatch
              ? 'Tìm thấy đề xuất'
              : 'Không tìm thấy kết quả'
          }
          thinking={isLoading}
          success={!!hasMatch}
          error={!!error && dataReady}
          _externalTyping={isTyping}
        />

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="px-5 py-4" style={{ background: 'white', minHeight: 120 }}>

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="flex gap-1.5">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg,#818cf8,#a78bfa)',
                      animation: `aiCorePulse 1.2s ease-in-out ${delay}s infinite`,
                    }}
                  />
                ))}
              </div>
              <ScanningMessage />
            </div>
          )}

          {/* Error */}
          {error && dataReady && !isPending && (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <p className="text-sm text-center" style={{ color: '#dc2626', margin: 0 }}>
                Đã xảy ra lỗi khi phân tích. Vui lòng thử lại sau.
              </p>
            </div>
          )}

          {/* Result */}
          {dataReady && !isPending && data && (
            <div className="space-y-3">
              {hasMatch ? (
                <div
                  className="rounded-xl p-4 space-y-2"
                  style={{
                    background: 'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(168,85,247,0.07))',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold tracking-wide uppercase" style={{ color: '#6366f1' }}>
                      Chuyến đề xuất
                    </span>
                    {confidence && (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: confidence.bg, color: confidence.color }}
                      >
                        Độ tin cậy: {confidence.label}
                      </span>
                    )}
                  </div>

                  {data.bookedTripSummary && <TripSummaryChips summary={data.bookedTripSummary} />}

                  <p className="text-sm leading-relaxed m-0 mt-2" style={{ color: '#374151' }}>
                    {/* While typing: plain text (no asterisks). Once done: render bold. */}
                    {done
                      ? renderMarkdownBold(reasoningRaw)
                      : displayed}
                    {!done && (
                      <span className="ai-cursor" style={{ color: '#a78bfa', fontWeight: 700 }}>▋</span>
                    )}
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(107,114,128,0.06)', border: '1px solid rgba(107,114,128,0.15)' }}
                >
                  <p className="text-sm leading-relaxed m-0" style={{ color: '#4b5563' }}>
                    {done ? renderMarkdownBold(reasoningRaw) : (displayed || ' ')}
                    {!done && displayed && (
                      <span className="ai-cursor" style={{ color: '#a78bfa', fontWeight: 700 }}>▋</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: 'white', borderTop: '1px solid rgba(0,0,0,0.06)' }}
        >
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="text-sm font-medium transition-colors disabled:opacity-50"
            style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#111')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
          >
            Đóng
          </button>

          {hasMatch && (
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-white text-sm font-medium bg-violet-600 hover:bg-violet-700 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-1"
            >
              {isConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Xác nhận ghép
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
