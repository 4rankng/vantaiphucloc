export { AutoMatchDateDialog } from './AutoMatchDateDialog'
import { useState, useMemo, useCallback } from 'react'
import { Loader2, Zap, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui'
import type { MatchCandidate } from '@/services/api/autoMatch.api'

const CONFIDENCE_CONFIG = {
  full: { label: 'Khớp đầy đủ', color: '#16a34a', icon: CheckCircle2 },
  partial: { label: 'Khớp một phần', color: '#d97706', icon: AlertCircle },
  none: { label: 'Yếu', color: '#dc2626', icon: XCircle },
}

const FIELD_LABELS: Record<string, string> = {
  container_number: 'Số Cont',
  container_number_fuzzy: 'Số Cont (mờ)',
  container_number_partial: 'Số Cont (một phần)',
  pickup_location: 'Điểm đi',
  dropoff_location: 'Điểm đến',
  work_type: 'Loại Cont',
  vessel: 'Số tàu',
  vehicle_plate: 'Số xe',
  client: 'Chủ hàng',
}

interface Props {
  open: boolean
  onClose: () => void
  candidates: MatchCandidate[]
  unmatchedCount: number
  scannedCount: number
  isConfirming: boolean
  onConfirm: (pairs: Array<{ deliveredTripId: number; bookedTripId: number }>) => void
}

export function AutoMatchDialog({
  open,
  onClose,
  candidates,
  unmatchedCount,
  scannedCount,
  isConfirming,
  onConfirm,
}: Props) {
  const [deselected, setDeselected] = useState<Set<string>>(new Set())

  const fullMatches = useMemo(
    () => candidates.filter((c) => c.confidence === 'full'),
    [candidates]
  )
  const partialMatches = useMemo(
    () => candidates.filter((c) => c.confidence === 'partial'),
    [candidates]
  )

  const selectedPairs = useMemo(() => {
    return candidates
      .filter((c) => {
        const key = `${c.deliveredTripId}-${c.bookedTripId}`
        return !deselected.has(key)
      })
      .map((c) => ({
        deliveredTripId: c.deliveredTripId,
        bookedTripId: c.bookedTripId,
      }))
  }, [candidates, deselected])

  const togglePair = useCallback((deliveredTripId: number, bookedTripId: number) => {
    const key = `${deliveredTripId}-${bookedTripId}`
    setDeselected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleConfirm = () => {
    onConfirm(selectedPairs)
  }

  const renderCandidate = (c: MatchCandidate) => {
    const key = `${c.deliveredTripId}-${c.bookedTripId}`
    const isSelected = !deselected.has(key)
    const conf = CONFIDENCE_CONFIG[c.confidence as keyof typeof CONFIDENCE_CONFIG] || CONFIDENCE_CONFIG.none
    const ConfIcon = conf.icon

    return (
      <div
        key={key}
        onClick={() => togglePair(c.deliveredTripId, c.bookedTripId)}
        className="flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
        style={{
          background: isSelected ? 'var(--surface-3)' : 'transparent',
          opacity: isSelected ? 1 : 0.5,
        }}
      >
        <div className="flex-shrink-0 mt-0.5">
          {isSelected ? (
            <CheckCircle2 className="h-4 w-4" style={{ color: conf.color }} />
          ) : (
            <div
              className="h-4 w-4 rounded-full border-2"
              style={{ borderColor: 'var(--ink-4)' }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-mono tabular-nums" style={{ color: 'var(--ink)' }}>
              WO#{c.deliveredTripId}
            </span>
            <span style={{ color: 'var(--ink-4)' }}>↔</span>
            <span className="text-[12px] font-mono tabular-nums" style={{ color: 'var(--ink)' }}>
              TO#{c.bookedTripId}
            </span>
            <span className="ml-auto flex items-center gap-1">
              <ConfIcon className="h-3 w-3" style={{ color: conf.color }} />
              <span className="text-[11px] font-medium" style={{ color: conf.color }}>
                {Math.round(c.score * 100)}%
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {c.matchedFields.map((f) => (
              <span
                key={f}
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: 'var(--surface-4)', color: 'var(--ink-2)' }}
              >
                {FIELD_LABELS[f] || f}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: 'color-mix(in srgb, var(--theme-brand-primary, #059669) 12%, transparent)' }}
            >
              <Zap className="h-4 w-4" style={{ color: 'var(--theme-brand-primary, #059669)' }} />
            </span>
            Tự động ghép
          </DialogTitle>
          <DialogDescription>
            Quét{' '}
            <span className="font-medium tabular-nums" style={{ color: 'var(--theme-text-primary, #09090B)' }}>
              {scannedCount.toLocaleString()}
            </span>{' '}
            chuyến chưa ghép — tìm thấy{' '}
            <span className="font-medium tabular-nums" style={{ color: 'var(--theme-text-primary, #09090B)' }}>
              {candidates.length}
            </span>{' '}
            ứng viên
            {candidates.length > 0 && (
              <span>
                {' '}({fullMatches.length} khớp đầy đủ, {partialMatches.length} khớp một phần)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {candidates.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-4 text-center">
              {/* SVG Illustration */}
              <svg
                width="120"
                height="100"
                viewBox="0 0 120 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Background circles */}
                <circle cx="60" cy="50" r="42" fill="var(--theme-brand-primary, #059669)" fillOpacity="0.06" />
                <circle cx="60" cy="50" r="30" fill="var(--theme-brand-primary, #059669)" fillOpacity="0.08" />

                {/* Left card (delivered trip) */}
                <rect x="12" y="30" width="36" height="40" rx="6" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
                <rect x="18" y="38" width="20" height="2.5" rx="1.25" fill="#CBD5E1" />
                <rect x="18" y="44" width="14" height="2" rx="1" fill="#E2E8F0" />
                <rect x="18" y="49" width="16" height="2" rx="1" fill="#E2E8F0" />
                <rect x="18" y="54" width="12" height="2" rx="1" fill="#E2E8F0" />
                {/* WO label */}
                <rect x="18" y="60" width="18" height="5" rx="2.5" fill="var(--theme-brand-primary, #059669)" fillOpacity="0.15" />
                <text x="27" y="64.5" textAnchor="middle" fontSize="4" fontFamily="monospace" fill="var(--theme-brand-primary, #059669)" fontWeight="600">WO#</text>

                {/* Right card (booked trip) */}
                <rect x="72" y="30" width="36" height="40" rx="6" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
                <rect x="78" y="38" width="20" height="2.5" rx="1.25" fill="#CBD5E1" />
                <rect x="78" y="44" width="14" height="2" rx="1" fill="#E2E8F0" />
                <rect x="78" y="49" width="16" height="2" rx="1" fill="#E2E8F0" />
                <rect x="78" y="54" width="12" height="2" rx="1" fill="#E2E8F0" />
                {/* TO label */}
                <rect x="78" y="60" width="18" height="5" rx="2.5" fill="#F59E0B" fillOpacity="0.2" />
                <text x="87" y="64.5" textAnchor="middle" fontSize="4" fontFamily="monospace" fill="#D97706" fontWeight="600">TO#</text>

                {/* Center broken link icon */}
                <circle cx="60" cy="50" r="10" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
                {/* Broken chain links */}
                <path d="M55 48.5 C55 46.5 56.5 45 58.5 45 L60 45" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M65 51.5 C65 53.5 63.5 55 61.5 55 L60 55" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round" />
                {/* Gap lines */}
                <line x1="59" y1="47" x2="61" y2="53" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" />

                {/* Dashed line left */}
                <line x1="48" y1="50" x2="50" y2="50" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
                {/* Dashed line right */}
                <line x1="70" y1="50" x2="72" y2="50" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />

                {/* Small warning dot */}
                <circle cx="60" cy="50" r="2.5" fill="#F59E0B" fillOpacity="0.9" />
              </svg>

              <div className="space-y-1.5">
                <p className="text-[14px] font-medium" style={{ color: 'var(--theme-text-primary, #09090B)' }}>
                  Không tìm thấy ứng viên ghép nào
                </p>
                <p className="text-[12px] leading-relaxed max-w-[260px]" style={{ color: 'var(--theme-text-muted, #8B919B)' }}>
                  Đã quét {scannedCount.toLocaleString()} chuyến trong tháng này —{' '}
                  không có cặp nào khớp tự động.
                </p>
              </div>

              {/* Stat pill */}
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
                style={{
                  background: 'color-mix(in srgb, #F59E0B 10%, transparent)',
                  color: '#D97706',
                  border: '1px solid color-mix(in srgb, #F59E0B 25%, transparent)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1L1 10.5h10L6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
                  <line x1="6" y1="5" x2="6" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="6" cy="9" r="0.6" fill="currentColor" />
                </svg>
                {unmatchedCount.toLocaleString()} chuyến cần đối chiếu thủ công
              </div>
            </div>
          ) : (
            <>
              {fullMatches.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                    Khớp đầy đủ ({fullMatches.length})
                  </h3>
                  <div className="space-y-1">
                    {fullMatches.map(renderCandidate)}
                  </div>
                </div>
              )}
              {partialMatches.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                    Khớp một phần ({partialMatches.length})
                  </h3>
                  <div className="space-y-1">
                    {partialMatches.map(renderCandidate)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isConfirming}>
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedPairs.length === 0 || isConfirming}
          >
            {isConfirming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Ghép {selectedPairs.length} cặp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
