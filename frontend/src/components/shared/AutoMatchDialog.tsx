import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react'
import type { AutoMatchResponse } from '@/services/api/tripOrders.api'

interface AutoMatchDialogProps {
  open: boolean
  onClose: () => void
  result: AutoMatchResponse | null
}

export function AutoMatchDialog({ open, onClose, result }: AutoMatchDialogProps) {
  if (!result) return null

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: 'var(--theme-brand-primary)' }} />
            Kết quả tự động ghép
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--theme-status-success)' }}>
                {result.autoMatched.length}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Đã ghép tự động</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--theme-status-warning)' }}>
                {result.partialMatches.length}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Cần xem lại</p>
            </div>
          </div>

          {/* Auto-matched list */}
          {result.autoMatched.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--theme-status-success)' }}>
                <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                Khớp hoàn toàn (6/6 tiêu chí)
              </p>
              {result.autoMatched.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }}>
                  <span className="text-xs" style={{ color: 'var(--theme-text-primary)' }}>
                    WO#{r.workOrderId} → TO#{r.tripOrderId}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)', color: 'var(--theme-status-success)' }}>
                    {Math.round(r.score * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Partial matches */}
          {result.partialMatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--theme-status-warning)' }}>
                <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                Khớp một phần (cần xác nhận thủ công)
              </p>
              {result.partialMatches.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }}>
                  <div>
                    <span className="text-xs" style={{ color: 'var(--theme-text-primary)' }}>
                      WO#{r.workOrderId} → TO#{r.tripOrderId}
                    </span>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                      {r.matchedFields.join(', ')}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--theme-status-warning) 12%, transparent)', color: 'var(--theme-status-warning)' }}>
                    {Math.round(r.score * 100)}%
                  </span>
                </div>
              ))}
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

          {/* Empty */}
          {result.autoMatched.length === 0 && result.partialMatches.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--theme-text-muted)' }}>
              Không tìm thấy cặp nào để ghép
            </p>
          )}

          <Button
            onClick={onClose}
            className="w-full h-10 text-sm font-semibold rounded-xl"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
