import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import { Button } from '@/components/ui'

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Use 'danger' for destructive actions (delete), 'warning' for caution actions. */
  variant?: 'danger' | 'warning'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && (
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            {description}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'default'}
            className="flex-1"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
