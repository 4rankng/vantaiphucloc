import { useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Loader2, RefreshCw } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  isPending: boolean
  onConfirm: () => void
}

export function SyncPricingDialog({ open, onClose, isPending, onConfirm }: Props) {
  const handleOpen = useCallback((isOpen: boolean) => {
    if (!isOpen) onClose()
  }, [onClose])

  const handleConfirm = useCallback(() => {
    if (isPending) return
    onConfirm()
  }, [isPending, onConfirm])

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : handleOpen}>
      <DialogContent
        className="max-w-sm overflow-hidden p-0 border-0 gap-0"
        style={{ borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}
      >
        <DialogTitle style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
          Đồng bộ cước/lương tất cả chuyến
        </DialogTitle>

        {/* Header */}
        <div
          className="px-6 pt-5 pb-4"
          style={{ background: 'linear-gradient(135deg, var(--theme-brand-primary, #059669) 0%, var(--theme-brand-primary-dark, #047857) 100%)' }}
        >
          <h3 className="type-h2 text-white">
            Đồng bộ cước/lương tất cả chuyến
          </h3>
          <p className="text-white/80 type-body-sm mt-1">
            Cập nhật lại giá cước và lương lái xe cho tất cả các chuyến (đã ghép và chưa ghép) theo bảng giá mới nhất
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4" style={{ background: 'var(--theme-bg-secondary)' }}>
          <div className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            Hệ thống sẽ quét <strong>tất cả các chuyến</strong> (bao gồm cả chuyến đã ghép và chưa ghép với booking) và ghi đè cước/lương của chúng bằng cấu hình hiện tại trong bảng giá. Thao tác này không thể hoàn tác.
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'var(--theme-bg-secondary)', borderTop: '1px solid var(--theme-border-default)' }}
        >
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            size="sm"
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            size="sm"
            className="rounded-full gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang đồng bộ...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Đồng bộ ngay
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
