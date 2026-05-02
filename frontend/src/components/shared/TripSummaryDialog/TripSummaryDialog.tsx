import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import type { WorkType } from '@/data/domain'
import { hapticSuccess } from '@/lib/haptic'
import { playTick } from '@/lib/sound'

interface TripSummaryDialogProps {
  open: boolean
  onConfirm: () => void
  containers: Array<{ number: string; type: WorkType }>
  clientName: string
  pickupLocation: string
  dropoffLocation: string
}

export function TripSummaryDialog({
  open,
  onConfirm,
  containers,
  clientName,
  pickupLocation,
  dropoffLocation,
}: TripSummaryDialogProps) {
  const handleConfirm = () => {
    hapticSuccess()
    playTick()
    onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={() => { /* unskippable */ }}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-sm"
      >
        {/* Hide the close X button */}
        <style>{`[data-radix-dialog-close] { display: none !important; }`}</style>
        <DialogHeader>
          <DialogTitle>Gửi chuyến</DialogTitle>
          <DialogDescription>Xác nhận thông tin trước khi gửi</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Containers */}
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--theme-text-muted)' }}>
              Container
            </p>
            {containers.map((c, i) => (
              <p key={i} className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {c.number} <span className="font-sans text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>{c.type}</span>
              </p>
            ))}
          </div>

          {/* Client */}
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>
              Khách hàng
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
              {clientName}
            </p>
          </div>

          {/* Route */}
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>
              Tuyến đường
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
              {pickupLocation} → {dropoffLocation}
            </p>
          </div>
        </div>

        <button
          onClick={handleConfirm}
          className="w-full h-12 rounded-2xl text-base font-bold touch-manipulation transition-colors active:scale-[0.98]"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          Xác nhận gửi
        </button>
      </DialogContent>
    </Dialog>
  )
}
