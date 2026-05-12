import { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { useAutoMatchConfirm } from '@/hooks/use-queries'
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react'
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
  if (ratio >= 5 / 6) return '#84cc16'
  if (ratio >= 4 / 6) return '#f59e0b'
  return '#f97316'
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

  const autoMatched = useMemo(() => {
    if (!result) return []
    return result.candidates.filter(c => c.matchScore >= c.maxScore)
  }, [result])

  if (!result) return null

  const handleConfirm = () => {
    const pairs = autoMatched.map(c => ({
      workOrderId: c.workOrderId,
      tripOrderId: c.tripOrderId,
    }))

    confirmPairs(pairs, {
      onSuccess: (res) => {
        if (res.failed.length > 0) {
          toast.toast({ title: 'Cảnh báo', description: `Đã ghép ${res.matched.length}/${res.matched.length + res.failed.length} cặp — ${res.failed.length} cặp lỗi`, variant: 'warning' })
        } else {
          toast.success('Tự động ghép', `Đã ghép ${res.matched.length} cặp thành công`)
          onClose()
        }
      },
      onError: (err: any) => {
        const msg = err?.message ?? 'Lỗi không xác định'
        toast.error('Lỗi', `Không thể xác nhận ghép: ${msg}`)
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
          {autoMatched.length > 0 ? (
            <>
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--theme-status-success)' }}>
                  {autoMatched.length}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>cặp khớp hoàn toàn</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--theme-status-success)' }}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Khớp hoàn toàn ({autoMatched.length} cặp)
                </p>
                {autoMatched.map((c, i) => (
                  <CandidateRow key={i} candidate={c} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-6 space-y-3">
              <p className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Không tìm thấy cặp ghép phù hợp
              </p>
              <div className="text-xs space-y-1" style={{ color: 'var(--theme-text-muted)' }}>
                <p>• Chuyến và đơn hàng cần cùng ngày, cùng khách hàng và cùng tuyến đường.</p>
                <p>• Thử thêm chuyến hoặc đơn hàng mới rồi ghép lại.</p>
              </div>
              {result.scannedWorkOrderCount > 0 && (
                <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>
                  Đã quét {result.scannedWorkOrderCount} phiếu · {result.skippedAlreadyMatched} đã ghép từ trước
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={onClose}
              disabled={confirming}
              className="flex-1 h-10 text-sm font-semibold rounded-xl"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
            >
              Đóng
            </Button>
            {autoMatched.length > 0 && (
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="flex-1 h-10 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
                style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
              >
                {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirming ? 'Đang ghép...' : `Xác nhận ghép ${autoMatched.length} cặp`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CandidateRow({ candidate }: { candidate: AutoMatchCandidateFE }) {
  const woRef = candidate.workOrderRef
  const toRef = candidate.tripOrderRef

  const woLabel = woRef
    ? `Phiếu #${woRef.id}${woRef.plate ? ` · ${woRef.plate}` : ''}${woRef.clientName ? ` · ${woRef.clientName}` : ''}`
    : `Phiếu #${candidate.workOrderId}`

  const toLabel = toRef
    ? `Đơn #${toRef.id}${toRef.clientName ? ` · ${toRef.clientName}` : ''}`
    : `Đơn #${candidate.tripOrderId}`

  return (
    <div className="p-2 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }}>
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
