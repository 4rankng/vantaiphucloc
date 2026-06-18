import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import { Button } from '@/components/ui'
import type { DuplicateCheckCandidate } from '@/services/api/deliveredTrips.api'

export interface DuplicateTripWarningDialogProps {
  open: boolean
  candidates: DuplicateCheckCandidate[]
  onConfirm: () => void
  onClose: () => void
}

const REASON_LABEL: Record<DuplicateCheckCandidate['reason'], string> = {
  photo: 'Cùng ảnh chụp',
  fields: 'Cùng cont + tuyến',
}

/** Warns a driver that the trip they are about to submit likely already
 * exists. Lists the matching existing trips (strongest = identical photo),
 * and lets the driver submit anyway or cancel. */
export function DuplicateTripWarningDialog({
  open,
  candidates,
  onConfirm,
  onClose,
}: DuplicateTripWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chuyến có thể đã tồn tại</DialogTitle>
        </DialogHeader>

        <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          Tìm thấy chuyến trùng trong 7 ngày qua. Bạn có chắc muốn gửi chuyến này?
        </p>

        <ul className="flex flex-col gap-2 mt-1">
          {candidates.map((c) => (
            <li
              key={c.tripId}
              className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
              style={{
                background: 'var(--theme-bg-secondary)',
                border: '1px solid var(--theme-border-default)',
              }}
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                  {c.contNumber ?? '—'}
                </span>
                <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {[c.tripDate, c.workType].filter(Boolean).join(' · ')}
                </span>
              </div>
              <span
                className="text-xs font-semibold rounded-full px-2 py-0.5 whitespace-nowrap"
                style={
                  c.reason === 'photo'
                    ? { background: 'var(--theme-danger-soft, #fdecec)', color: 'var(--theme-danger, #c0392b)' }
                    : { background: 'var(--theme-warning-soft, #fdf3e3)', color: 'var(--theme-warning, #b7791f)' }
                }
              >
                {REASON_LABEL[c.reason]}
              </span>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Huỷ
          </Button>
          <Button variant="default" size="sm" className="flex-1" onClick={onConfirm}>
            Gửi luôn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
