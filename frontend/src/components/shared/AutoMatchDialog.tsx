import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { useAutoMatchConfirm } from '@/hooks/use-queries'
import { CheckCircle2, XCircle, Sparkles, ChevronDown, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react'
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
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--theme-status-success)' }}>
                {autoMatched.length}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Đã ghép tự động</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: partialMatches.length > 0 ? '#f59e0b' : 'var(--theme-text-muted)' }}>
                {partialMatches.length}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Đề xuất ghép</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: unmatchedCount > 0 ? 'var(--theme-status-error)' : 'var(--theme-text-muted)' }}>
                {unmatchedCount}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Không thể ghép</p>
            </div>
          </div>

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

          {/* Unmatched — collapsible */}
          {unmatchedCount > 0 && (
            <div>
              <button
                className="text-xs font-semibold flex items-center gap-1 w-full text-left py-1"
                style={{ color: 'var(--theme-status-error)' }}
                onClick={() => setShowUnmatched(!showUnmatched)}
              >
                {showUnmatched ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <XCircle className="h-3.5 w-3.5" />
                Không thể ghép ({unmatchedCount})
              </button>
              {showUnmatched && (
                <div className="max-h-40 overflow-y-auto space-y-1 mt-1">
                  {result.unmatchedWorkOrderRefs.map((wo, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }}>
                      <span className="text-xs" style={{ color: 'var(--theme-text-primary)' }}>
                        Phiếu #{wo.id}{wo.code ? ` (${wo.code})` : ''}{wo.plate ? ` · ${wo.plate}` : ''}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--theme-status-error) 12%, transparent)', color: 'var(--theme-status-error)' }}>
                        0/6
                      </span>
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

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold" style={{ color: 'var(--theme-status-error)' }}>Lỗi</p>
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{err}</p>
              ))}
            </div>
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
