import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react'

interface ImportResult {
  created: number
  errors: string[]
}

interface ImportResultDialogProps {
  open: boolean
  onClose: () => void
  result: ImportResult
  onCreateManual: () => void
}

export function ImportResultDialog({ open, onClose, result, onCreateManual }: ImportResultDialogProps) {
  const hasErrors = result.errors.length > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"
            style={{ color: 'var(--theme-text-primary)' }}>
            Kết quả nhập Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Success count */}
          <div className="flex items-center gap-2 p-3 rounded-xl"
            style={{ background: 'var(--theme-bg-secondary)' }}>
            <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--theme-status-success)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
              Đã tạo {result.created} chuyến
            </span>
          </div>

          {/* Errors */}
          {hasErrors && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3">
                <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-error)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                  {result.errors.length} lỗi
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 px-1">
                {result.errors.map((err, i) => (
                  <div key={i} className="text-xs px-3 py-2 rounded-lg"
                    style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-secondary)' }}>
                    {err}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {hasErrors && (
              <Button variant="outline" size="sm" onClick={() => { onClose(); onCreateManual() }}
                className="flex-1 gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Tạo thủ công
              </Button>
            )}
            <Button size="sm" onClick={onClose} className="flex-1">
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
