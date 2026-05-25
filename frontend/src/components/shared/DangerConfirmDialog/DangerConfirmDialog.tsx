import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import { Button } from '@/components/ui'

export interface DangerConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  entityName: string
  warningText?: string
  confirmLabel?: string
  loading?: boolean
}

export function DangerConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  entityName,
  warningText = 'sẽ bị xoá vĩnh viễn và không thể khôi phục.',
  confirmLabel = 'Xoá',
  loading = false,
}: DangerConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div
          className="flex items-start gap-3 rounded-lg px-3 py-2.5"
          style={{
            background: 'color-mix(in srgb, var(--theme-status-error) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--theme-status-error) 15%, transparent)',
          }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-status-error)' }} />
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            <strong style={{ color: 'var(--ink)' }}>{entityName}</strong> {warningText}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1" disabled={loading}>
            Huỷ
          </Button>
          <Button variant="destructive" size="sm" className="flex-1" onClick={onConfirm} disabled={loading}>
            {loading ? 'Đang xử lý...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
