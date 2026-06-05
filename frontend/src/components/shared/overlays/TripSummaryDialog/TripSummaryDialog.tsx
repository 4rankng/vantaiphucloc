import React from 'react'
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
  containerCount?: number
  hasPhoto?: boolean
  photoUrls?: string[]
  note?: string | null
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
  containerCount,
  hasPhoto,
  photoUrls = [],
  note,
}: TripSummaryDialogProps) {
  const handleConfirm = () => {
    hapticSuccess()
    playTick()
    onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <DialogTitle className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Xác nhận</DialogTitle>
          <DialogDescription className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Xác nhận thông tin trước khi gửi</DialogDescription>
        </DialogHeader>

        <div className="px-4 py-2 space-y-0">
          {/* Container */}
          {(contNumber || contType) && (
            <div className="flex flex-wrap items-start gap-2 py-2 border-b" style={{ borderColor: 'var(--line)' }}>
              <span className="text-xs font-semibold w-20 shrink-0 pt-0.5" style={{ color: 'var(--muted-2)' }}>Container</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {contNumber ?? '—'}
                </span>
                {contType && (
                  <span
                    className="ml-2 text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: 'var(--mint-bg-2)', color: 'var(--theme-brand-primary)' }}
                  >
                    {contType}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Operation / work type */}
          {workType && (
            <div className="flex items-center gap-2 py-2 border-b" style={{ borderColor: 'var(--line)' }}>
              <span className="text-xs font-semibold w-20 shrink-0" style={{ color: 'var(--muted-2)' }}>Tác nghiệp</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{workType}</span>
            </div>
          )}

          {/* Client */}
          <div className="flex items-center gap-2 py-2 border-b" style={{ borderColor: 'var(--line)' }}>
            <span className="text-xs font-semibold w-20 shrink-0" style={{ color: 'var(--muted-2)' }}>Khách hàng</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{clientName}</span>
          </div>

          {/* Vessel */}
          {vessel && (
            <div className="flex items-center gap-2 py-2 border-b" style={{ borderColor: 'var(--line)' }}>
              <span className="text-xs font-semibold w-20 shrink-0" style={{ color: 'var(--muted-2)' }}>Số tàu</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{vessel}</span>
            </div>
          )}

          {/* Note */}
          {note && (
            <div className="flex items-start gap-2 py-2 border-b" style={{ borderColor: 'var(--line)' }}>
              <span className="text-xs font-semibold w-20 shrink-0 pt-0.5" style={{ color: 'var(--muted-2)' }}>Ghi chú</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{note}</span>
            </div>
          )}

          {/* Route */}
          <div className="flex items-center gap-2 py-2 border-b" style={{ borderColor: 'var(--line)' }}>
            <span className="text-xs font-semibold w-20 shrink-0" style={{ color: 'var(--muted-2)' }}>Tuyến</span>
            <span className="text-sm font-medium flex-1 min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>
              {pickupLocation} <span className="font-bold" style={{ color: 'var(--theme-brand-primary)' }}>→</span> {dropoffLocation}
            </span>
          </div>

          {/* Trip date */}
          {tripDate && (
            <div className="flex items-center gap-2 py-2 border-b" style={{ borderColor: 'var(--line)' }}>
              <span className="text-xs font-semibold w-20 shrink-0" style={{ color: 'var(--muted-2)' }}>Ngày</span>
              <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{tripDate}</span>
            </div>
          )}

          {/* Photo zone */}
          <div className="py-3">
            {/* NO PHOTO */}
            {!hasPhoto && (
              <div
                className="relative rounded-xl overflow-hidden px-4 py-3 flex items-center gap-3 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, var(--mint-bg) 0%, var(--mint-bg-2) 100%)',
                  border: '1.5px dashed var(--mint-border-strong)',
                }}
              >
                {/* Watermark — right side, faded */}
                <svg
                  viewBox="0 0 200 200"
                  fill="none"
                  className="absolute right-[-4px] pointer-events-none"
                  style={{
                    width: 80,
                    height: 'auto',
                    color: 'var(--theme-brand-primary)',
                    opacity: 0.09,
                    top: '50%',
                    transform: 'translateY(-50%) rotate(-10deg)',
                  }}
                >
                  {/* Camera body */}
                  <rect x="18" y="48" width="164" height="100" rx="18" stroke="currentColor" strokeWidth="10" />
                  {/* Viewfinder bump */}
                  <rect x="72" y="26" width="56" height="26" rx="8" stroke="currentColor" strokeWidth="9" />
                  {/* Lens outer */}
                  <circle cx="100" cy="98" r="34" stroke="currentColor" strokeWidth="9" />
                  {/* Lens inner */}
                  <circle cx="100" cy="98" r="16" stroke="currentColor" strokeWidth="7" />
                  {/* Flash dot */}
                  <circle cx="43" cy="71" r="8" stroke="currentColor" strokeWidth="7" />
                  {/* No-photo slash */}
                  <line x1="22" y1="158" x2="178" y2="2" stroke="currentColor" strokeWidth="13" strokeLinecap="round" />
                </svg>

                {/* Camera icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative z-10"
                  style={{ background: 'var(--theme-brand-primary)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M4 8.5A2.5 2.5 0 016.5 6h1.2l.6-1.2A1.5 1.5 0 019.6 4h4.8a1.5 1.5 0 011.3.8L16.3 6h1.2A2.5 2.5 0 0120 8.5v8A2.5 2.5 0 0117.5 19h-11A2.5 2.5 0 014 16.5v-8z"/>
                    <circle cx="12" cy="12.5" r="3"/>
                  </svg>
                </div>

                {/* Text content */}
                <div className="flex-1 relative z-10 min-w-0">
                  <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Thêm ảnh container</p>
                  <p className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--muted)' }}>
                    Đối soát nhanh và chấm lương sớm
                  </p>
                </div>
              </div>
            )}

            {/* HAS PHOTO */}
            {hasPhoto && photoUrls.length > 0 && (
              <div className="flex gap-2">
                {photoUrls.slice(0, 2).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Container ${i + 1}`}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-4 pb-4 pt-3 gap-2" style={{ borderTop: '1px solid var(--line)' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex-1"
            style={{ borderColor: 'var(--line-2)' }}
          >
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            className="flex-1"
            style={{
              background: 'var(--theme-brand-primary)',
              boxShadow: '0 8px 20px -8px rgba(0, 177, 79, 0.7)',
            }}
          >
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}