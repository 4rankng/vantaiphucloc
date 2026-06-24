import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import { Button } from '@/components/ui'
import { AlertTriangle } from 'lucide-react'
import type { SubmitError } from '@/pages/driver/useCreateDeliveredTrip'

export interface SubmitErrorDialogProps {
  error: SubmitError | null
  onRetry: () => void
  onClose: () => void
}

/** Shown when the backend did NOT confirm every container during submit.
 *
 * Success is truthful: this dialog — not the green "Đã gửi chuyến" overlay —
 * appears whenever ≥1 container was not confirmed by the server (network drop
 * or `{ success: false }`). All form data is retained so the driver can tap
 * "Gửi lại" to resend only the unconfirmed containers, or "Đóng" to edit
 * before retrying. */
export function SubmitErrorDialog({ error, onRetry, onClose }: SubmitErrorDialogProps) {
  const open = error !== null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Không gửi được chuyến</DialogTitle>
          <DialogDescription>
            Máy chủ chưa nhận một số container. Dữ liệu vẫn được giữ trên máy – kiểm tra mạng rồi gửi lại.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2 mt-1">
          {(error?.failed ?? []).map((f, i) => (
            <li
              key={`${f.number ?? 'none'}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
              style={{
                background: 'var(--theme-bg-secondary)',
                border: '1px solid var(--theme-border-default)',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--theme-danger, #c0392b)' }}
                  strokeWidth={1.75}
                />
                <span
                  className="text-sm font-mono font-semibold truncate"
                  style={{ color: 'var(--theme-text-primary)' }}
                >
                  {f.number ?? '—'}
                </span>
              </div>
              <span
                className="text-xs text-right shrink-0"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {f.reason}
              </span>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Đóng
          </Button>
          <Button variant="default" size="sm" className="flex-1" onClick={onRetry}>
            Gửi lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
