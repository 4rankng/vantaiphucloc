import { useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { Loader2 } from 'lucide-react'
import { useAISuggestMatch, useConfirmAutoMatch } from '@/hooks/use-queries'
import type { DeliveredTrip } from '@/data/domain'
import { RobotDialogHero, useTypewriter } from '@/components/shared/RobotHead'

const confidenceMap: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: 'Cao',        color: '#059669', bg: 'rgba(5,150,105,0.1)'  },
  medium: { label: 'Trung bình', color: '#d97706', bg: 'rgba(217,119,6,0.1)'  },
  low:    { label: 'Thấp',       color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
}

export function AISuggestionDialog({ trip, onClose }: { trip: DeliveredTrip; onClose: () => void }) {
  const { mutate: suggestMatch, data, isPending, error } = useAISuggestMatch()
  const { mutate: confirmMatch, isPending: isConfirming } = useConfirmAutoMatch()

  useEffect(() => { suggestMatch(trip.id) }, [trip.id, suggestMatch])

  const reasoningText = data?.reasoning ?? ''
  const { displayed, done } = useTypewriter(data && !isPending ? reasoningText : '', 14)
  const isTyping = !!displayed && !done

  const handleConfirm = () => {
    if (!data?.suggestedBookedTripId) return
    confirmMatch(
      [{ deliveredTripId: trip.id, bookedTripId: data.suggestedBookedTripId }],
      { onSuccess: onClose }
    )
  }

  const confidence = data?.confidence ? confidenceMap[data.confidence] : null
  const hasMatch = data && !isPending && data.suggestedBookedTripId

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px] overflow-hidden p-0 border-0 gap-0"
        style={{ borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
      >
        <DialogTitle className="sr-only">AI Đề xuất ghép chuyến</DialogTitle>
        {/* ── Hero Header ─────────────────────────────── */}
        <RobotDialogHero
          title={isPending ? 'AI đang phân tích…' : error ? 'Đã xảy ra lỗi' : hasMatch ? 'Tìm thấy đề xuất' : 'Không tìm thấy kết quả'}
          thinking={isPending}
          success={!!hasMatch}
          error={!!error}
          _externalTyping={isTyping}
        />

        {/* ── Body ───────────────────────────────────── */}
        <div className="px-5 py-4" style={{ background: 'white', minHeight: 120 }}>

          {/* Loading */}
          {isPending && (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="flex gap-1.5">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg,#818cf8,#a78bfa)',
                      animation: `aiCorePulse 1.2s ease-in-out ${delay}s infinite`,
                    }}
                  />
                ))}
              </div>
              <p className="text-sm" style={{ color: '#6b7280', margin: 0 }}>
                Gemini đang phân tích chuyến xe để tìm đề xuất…
              </p>
            </div>
          )}

          {/* Error */}
          {error && !isPending && (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <p className="text-sm text-center" style={{ color: '#dc2626', margin: 0 }}>
                Đã xảy ra lỗi khi gọi AI. Vui lòng thử lại sau.
              </p>
            </div>
          )}

          {/* Result */}
          {data && !isPending && (
            <div className="space-y-3">
              {hasMatch ? (
                <>
                  {/* Match card */}
                  <div className="rounded-xl p-4 space-y-2"
                    style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(168,85,247,0.07))', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold tracking-wide uppercase" style={{ color: '#6366f1' }}>
                        Lệnh (TO) #{data.suggestedBookedTripId}
                      </span>
                      {confidence && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: confidence.bg, color: confidence.color }}
                        >
                          Độ tin cậy: {confidence.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed m-0" style={{ color: '#374151' }}>
                      {displayed}
                      {!done && <span className="ai-cursor" style={{ color: '#a78bfa', fontWeight: 700 }}>▋</span>}
                    </p>
                  </div>
                </>
              ) : (
                /* No match card */
                <div className="rounded-xl p-4"
                  style={{ background: 'rgba(107,114,128,0.06)', border: '1px solid rgba(107,114,128,0.15)' }}
                >
                  <p className="text-sm leading-relaxed m-0" style={{ color: '#4b5563' }}>
                    {displayed || ' '}
                    {!done && displayed && <span className="ai-cursor" style={{ color: '#a78bfa', fontWeight: 700 }}>▋</span>}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4"
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
              className="ai-btn-glow relative group inline-flex items-center gap-2 px-5 py-2 rounded-full text-white text-sm font-semibold tracking-wide transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1"
              style={{ background: 'linear-gradient(to right, #6366f1, #a855f7, #ec4899)' }}
            >
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
                  <path d="M20 3v4"/><path d="M22 5h-4"/>
                  <path d="M4 17v2"/><path d="M5 18H3"/>
                </svg>
              </span>
              <span className="inline-flex items-center gap-2 group-hover:translate-x-2.5 transition-transform duration-300">
                {isConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Xác nhận ghép
              </span>
              <span className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
