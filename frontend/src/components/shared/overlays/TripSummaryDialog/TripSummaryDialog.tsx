import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from '@/components/ui'
import type { WorkType } from '@/data/domain'
import { hapticSuccess } from '@/lib/haptic'
import { playTick } from '@/lib/sound'

interface TripSummaryDialogProps {
  open: boolean
  onConfirm: () => void
  onClose: () => void
  contNumber?: string | null
  contType?: WorkType | null
  workType?: WorkType | null
  clientName: string
  vessel?: string
  pickupLocation: string
  dropoffLocation: string
  tripDate?: string
}

export function TripSummaryDialog({
  open,
  onConfirm,
  onClose,
  contNumber,
  contType,
  workType,
  clientName,
  vessel,
  pickupLocation,
  dropoffLocation,
  tripDate,
}: TripSummaryDialogProps) {
  const handleConfirm = () => {
    hapticSuccess()
    playTick()
    onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Xác nhận</DialogTitle>
          <DialogDescription>Xác nhận thông tin trước khi gửi</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Container */}
          {(contNumber || contType) && (
            <div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--theme-text-muted)' }}>
                Container
              </p>
              <p className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {contNumber ?? '—'}{' '}
                {contType && (
                  <span className="font-sans text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
                    {contType}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Operation / work type */}
          {workType && (
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                Tác nghiệp
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                {workType}
              </p>
            </div>
          )}

          {/* Client */}
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>
              Khách hàng
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
              {clientName}
            </p>
          </div>

          {/* Vessel */}
          {vessel && (
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                Số tàu
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                {vessel}
              </p>
            </div>
          )}

          {/* Route */}
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>
              Tuyến
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
              {pickupLocation} → {dropoffLocation}
            </p>
          </div>

          {/* Trip date */}
          {tripDate && (
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                Ngày
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                {tripDate}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Hủy
          </Button>
          <Button size="sm" onClick={handleConfirm} className="flex-1">
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
