import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { useAutoMatchConfirm } from '@/hooks/use-queries'
import { CheckCircle2, XCircle, Sparkles, ChevronDown, ChevronRight, AlertTriangle, Loader2, AlertOctagon, Copy } from 'lucide-react'
import { useToast } from '@/components/atoms/Toast'
import type { AutoMatchPreviewResponseFE, AutoMatchCandidateFE } from '@/services/api/tripOrders.api'

interface AutoMatchDialogProps {
  open: boolean
  onClose: () => void
  result: AutoMatchPreviewResponseFE | null
}

function scoreColor(matchScore: number, maxScore: number): string {
  const ratio = matchScore / maxScore
  if (ratio >= 1) return 'var(--theme-status-success)'
  if (ratio >= 5 / 6) return '#84cc16' // lime
  if (ratio >= 4 / 6) return '#f59e0b' // amber
  return '#f97316' // orange
}

function scoreBg(matchScore: number, maxScore: number): string {
  const ratio = matchScore / maxScore
  if (ratio >= 1) return 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)'
  if (ratio >= 5 / 6) return 'color-mix(in srgb, #84cc16 12%, transparent)'
  if (ratio >= 4 / 6) return 'color-mix(in srgb, #f59e0b 12%, transparent)'
  return 'color-mix(in srgb, #f97316 12%, transparent)'
}

export function AutoMatchDialog({ open, onClose, result }: AutoMatchDialogProps) {
  const { mutate: confirmPairs, isPending: confirming } = useAutoMatchConfirm()
  const toast = useToast()
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [showUnmatched, setShowUnmatched] = useState(false)

  // Initialize selected from suggestedDefault on first render
  const initialDefaultKeys = useMemo(() => {
    if (!result) return new Set<string>()
    return new Set(
      result.candidates
        .filter(c => c.suggestedDefault)
        .map(c => `${c.workOrderId}-${c.tripOrderId}`)
    )
  }, [result])

  // Use initial defaults if user hasn't changed anything yet
  const effectiveSelected = selectedKeys.size > 0 ? selectedKeys : initialDefaultKeys

  if (!result) return null

  const autoMatched = result.candidates.filter(c => c.matchScore >= c.maxScore)
  const partialMatches = result.candidates.filter(c => c.matchScore < c.maxScore)
  const unmatchedCount = result.unmatchedWorkOrderRefs.length

  const togglePair = (woId: number, toId: number) => {
    const key = `${woId}-${toId}`
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleConfirm = () => {
    const pairs = [...effectiveSelected].map(key => {
      const [woId, toId] = key.split('-').map(Number)
      return { workOrderId: woId, tripOrderId: toId }
    })

    confirmPairs(pairs, {
      onSuccess: (res) => {
        if (res.failed.length > 0) {
          toast.toast({ title: 'Cảnh báo', description: `Đã ghép ${res.matched.length}/${res.matched.length + res.failed.length} cặp — ${res.failed.length} cặp lỗi`, variant: 'warning' })
          setConfirmError(`${res.failed.length} cặp lỗi: ${res.failed.map(f => `Phiếu#${f.workOrderId} → Đơn#${f.tripOrderId}: ${f.error}`).join('; ')}`)
        } else {
          toast.success('Tự động ghép', `Đã ghép ${res.matched.length} cặp thành công`)
          onClose()
        }
      },
      onError: (err: any) => {
        const msg = err?.message ?? 'Lỗi không xác định'
        toast.error('Lỗi', `Không thể xác nhận ghép: ${msg}`)
        setConfirmError(msg)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={() => !confirming && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: 'var(--theme-brand-primary)' }} />
            Kết quả tự động ghép
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary cards — when errors exist, they get their own card so the
              user immediately sees "system error" vs "no candidate". */}
          {(() => {
            const errCount = result.errors.length
            const showErrCard = errCount > 0
            return (
              <div className={`grid gap-3 ${showErrCard ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <SummaryCard
                  value={autoMatched.length}
                  label="Khớp hoàn toàn"
                  tone={autoMatched.length > 0 ? 'success' : 'muted'}
                />
                <SummaryCard
                  value={partialMatches.length}
                  label="Đề xuất ghép"
                  tone={partialMatches.length > 0 ? 'warning' : 'muted'}
                />
                <SummaryCard
                  value={unmatchedCount}
                  label="Không có đề xuất"
                  tone="muted"
                />
                {showErrCard && (
                  <SummaryCard
                    value={errCount}
                    label="Lỗi hệ thống"
                    tone="error"
                  />
                )}
              </div>
            )
          })()}

          {/* Auto-matched (read-only receipt) */}
          {autoMatched.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--theme-status-success)' }}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Khớp hoàn toàn ({autoMatched.length} cặp)
              </p>
              {autoMatched.map((c, i) => (
                <CandidateRow key={i} candidate={c} />
              ))}
            </div>
          )}

          {/* Partial matches — selectable with checkboxes */}
          {partialMatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1" style={{ color: '#f59e0b' }}>
                <AlertTriangle className="h-3.5 w-3.5" />
                Đề xuất ghép ({partialMatches.length} cặp) — chọn để xác nhận
              </p>
              {partialMatches.map((c, i) => {
                const key = `${c.workOrderId}-${c.tripOrderId}`
                const checked = effectiveSelected.has(key)
                return (
                  <div key={i} className="relative">
                    <label className="flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:opacity-90" style={{ background: 'var(--theme-bg-tertiary)' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePair(c.workOrderId, c.tripOrderId)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <CandidateRow candidate={c} compact />
                      </div>
                    </label>
                  </div>
                )
              })}
            </div>
          )}

          {/* Unmatched — collapsible. These are WOs scanned but with no candidate
              suggestions (different from system errors). */}
          {unmatchedCount > 0 && (
            <div>
              <button
                className="text-xs font-semibold flex items-center gap-1 w-full text-left py-1"
                style={{ color: 'var(--theme-text-muted)' }}
                onClick={() => setShowUnmatched(!showUnmatched)}
              >
                {showUnmatched ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <XCircle className="h-3.5 w-3.5" />
                Không có đề xuất ({unmatchedCount})
              </button>
              {showUnmatched && (
                <div className="max-h-40 overflow-y-auto space-y-1 mt-1">
                  {result.unmatchedWorkOrderRefs.map((wo, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }}>
                      <span className="text-xs" style={{ color: 'var(--theme-text-primary)' }}>
                        Phiếu #{wo.id}{wo.code ? ` (${wo.code})` : ''}{wo.plate ? ` · ${wo.plate}` : ''}
                      </span>
                      {wo.date && (
                        <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>
                          {wo.date}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {result.candidates.length === 0 && result.unmatchedWorkOrderRefs.length === 0 && (
            <div className="text-center py-6 space-y-3">
              <p className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Không tìm thấy cặp ghép phù hợp
              </p>
              <div className="text-xs space-y-1" style={{ color: 'var(--theme-text-muted)' }}>
                <p>• Kiểm tra alias địa điểm — pickup/dropoff có thể chưa được map.</p>
                <p>• Đảm bảo chuyến và đơn hàng cùng ngày và cùng khách hàng.</p>
                <p>• Nhập thêm phiếu chuyến hoặc đơn hàng mới.</p>
              </div>
              {result.scannedWorkOrderCount > 0 && (
                <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>
                  Đã quét {result.scannedWorkOrderCount} phiếu PENDING · {result.skippedAlreadyMatched} đã ghép từ trước được bỏ qua
                </p>
              )}
            </div>
          )}

          {/* System errors — grouped by message, collapsible, with bulk copy.
              Raw stack-trace-style text is hidden behind a toggle so the user
              isn't drowned in 100s of identical messages. */}
          {result.errors.length > 0 && (
            <ErrorBlock errors={result.errors} />
          )}

          {/* Confirm error */}
          {confirmError && (
            <div className="p-2 rounded-lg text-xs" style={{ background: 'color-mix(in srgb, var(--theme-status-error) 10%, transparent)', color: 'var(--theme-status-error)' }}>
              {confirmError}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={onClose}
              disabled={confirming}
              className="flex-1 h-10 text-sm font-semibold rounded-xl"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
            >
              Đóng
            </Button>
            {(autoMatched.length > 0 || partialMatches.length > 0) && (
              <Button
                onClick={handleConfirm}
                disabled={confirming || effectiveSelected.size === 0}
                className="flex-1 h-10 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
                style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
              >
                {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirming ? 'Đang ghép...' : `Xác nhận ghép ${effectiveSelected.size} cặp`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Compact summary card used in the dialog header grid. */
function SummaryCard({
  value,
  label,
  tone,
}: {
  value: number
  label: string
  tone: 'success' | 'warning' | 'error' | 'muted'
}) {
  const colorMap: Record<typeof tone, string> = {
    success: 'var(--theme-status-success)',
    warning: '#f59e0b',
    error: 'var(--theme-status-error)',
    muted: 'var(--theme-text-muted)',
  }
  const color = value > 0 ? colorMap[tone] : 'var(--theme-text-muted)'
  return (
    <div className="card p-3 text-center">
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
    </div>
  )
}

/** Render system errors in a collapsed, grouped, copy-able form.
 *
 * Backend returns one string per failed WO (e.g. "WO#670: 'TripOrderOut' object
 * has no attribute 'pickupLocation'"). When 179 WOs all hit the same bug, we
 * dedupe by the stripped message so the user sees ONE entry "× 179" instead of
 * 179 identical lines. The expanded view caps at 20 raw lines but offers a
 * "Sao chép tất cả" button so the user can paste the full log into a bug
 * report. */
function ErrorBlock({ errors }: { errors: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const toast = useToast()

  // Group by the part after "WO#nnn: " so duplicate root causes collapse.
  const grouped = useMemo(() => {
    const map = new Map<string, { message: string; count: number; sample: string }>()
    for (const e of errors) {
      const m = e.match(/^WO#\d+:\s*(.*)$/)
      const message = (m ? m[1] : e).trim()
      const existing = map.get(message)
      if (existing) {
        existing.count += 1
      } else {
        map.set(message, { message, count: 1, sample: e })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [errors])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(errors.join('\n'))
      toast.success('Đã sao chép', `${errors.length} dòng lỗi`)
    } catch {
      toast.error('Lỗi', 'Không thể sao chép vào clipboard')
    }
  }

  const MAX_RAW = 20

  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: 'color-mix(in srgb, var(--theme-status-error) 6%, transparent)',
        border: '1px solid color-mix(in srgb, var(--theme-status-error) 18%, transparent)',
      }}
    >
      <button
        className="flex items-center gap-2 w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <AlertOctagon className="h-4 w-4 shrink-0" style={{ color: 'var(--theme-status-error)' }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: 'var(--theme-status-error)' }}>
            Lỗi hệ thống ({errors.length})
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
            {grouped.length === 1
              ? 'Tất cả phiếu gặp cùng một lỗi — có thể do dữ liệu hoặc cấu hình. Liên hệ kỹ thuật nếu cần.'
              : `${grouped.length} loại lỗi khác nhau · Bấm để xem chi tiết`}
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
        )}
      </button>

      {/* Always show grouped summary (most useful), with counts */}
      <div className="space-y-1 mt-2">
        {grouped.slice(0, expanded ? grouped.length : 3).map((g, i) => (
          <div
            key={i}
            className="flex items-start gap-2 p-2 rounded-md text-[11px]"
            style={{ background: 'var(--theme-bg-primary)' }}
          >
            <span
              className="shrink-0 font-mono font-semibold px-1.5 py-0.5 rounded-full text-[10px] tabular-nums"
              style={{
                background: 'color-mix(in srgb, var(--theme-status-error) 14%, transparent)',
                color: 'var(--theme-status-error)',
              }}
            >
              × {g.count}
            </span>
            <span className="break-all" style={{ color: 'var(--theme-text-primary)' }}>
              {g.message}
            </span>
          </div>
        ))}
        {!expanded && grouped.length > 3 && (
          <p className="text-[11px] pl-1" style={{ color: 'var(--theme-text-muted)' }}>
            + {grouped.length - 3} loại lỗi khác
          </p>
        )}
      </div>

      {/* Raw lines + copy, only when expanded */}
      {expanded && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid color-mix(in srgb, var(--theme-status-error) 14%, transparent)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
              Chi tiết từng phiếu {errors.length > MAX_RAW ? `(hiển thị ${MAX_RAW}/${errors.length})` : `(${errors.length})`}
            </p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
            >
              <Copy className="h-3 w-3" />
              Sao chép tất cả
            </button>
          </div>
          <div
            className="max-h-48 overflow-y-auto rounded-md p-2 space-y-0.5 font-mono"
            style={{ background: 'var(--theme-bg-primary)' }}
          >
            {errors.slice(0, MAX_RAW).map((err, i) => (
              <p key={i} className="text-[10px] break-all" style={{ color: 'var(--theme-text-muted)' }}>
                {err}
              </p>
            ))}
            {errors.length > MAX_RAW && (
              <p className="text-[10px] italic pt-1" style={{ color: 'var(--theme-text-muted)' }}>
                … {errors.length - MAX_RAW} dòng nữa — bấm "Sao chép tất cả" để xem toàn bộ.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Render a single candidate row with human-readable labels and criteria chips. */
function CandidateRow({ candidate, compact = false }: { candidate: AutoMatchCandidateFE; compact?: boolean }) {
  const woRef = candidate.workOrderRef
  const toRef = candidate.tripOrderRef

  const woLabel = woRef
    ? `Phiếu #${woRef.id}${woRef.plate ? ` · ${woRef.plate}` : ''}${woRef.clientName ? ` · ${woRef.clientName}` : ''}`
    : `Phiếu #${candidate.workOrderId}`

  const toLabel = toRef
    ? `Đơn #${toRef.id}${toRef.clientName ? ` · ${toRef.clientName}` : ''}`
    : `Đơn #${candidate.tripOrderId}`

  return (
    <div className={compact ? '' : 'p-2 rounded-lg'} style={compact ? undefined : { background: 'var(--theme-bg-tertiary)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--theme-text-primary)' }}>
          {woLabel} → {toLabel}
        </span>
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded-full whitespace-nowrap"
          style={{ background: scoreBg(candidate.matchScore, candidate.maxScore), color: scoreColor(candidate.matchScore, candidate.maxScore) }}
        >
          {candidate.matchScore}/{candidate.maxScore}
        </span>
      </div>
      {candidate.criteria.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {candidate.criteria.map((c, i) => (
            <span
              key={i}
              className="text-[10px] px-1 py-0.5 rounded-full"
              style={{
                background: c.match
                  ? 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)'
                  : 'color-mix(in srgb, var(--theme-status-error) 8%, transparent)',
                color: c.match ? 'var(--theme-status-success)' : 'var(--theme-text-muted)',
              }}
            >
              {c.match ? '✅' : '❌'} {c.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
