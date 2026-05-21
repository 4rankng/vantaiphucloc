import { useState } from 'react'
import { Zap, CheckCircle, Loader2 } from 'lucide-react'
import { Drawer } from '@/components/shared/Drawer'
import { Button } from '@/components/ui'
import { Pill } from '@/components/shared/Pill'
import { useAutoMatch, useAutoMatchConfirm } from '@/hooks/use-queries'
import type { AutoMatchCandidate } from '@/data/domain'

function scoreColor(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0
  if (pct >= 0.8) return 'var(--success)'
  if (pct >= 0.5) return 'var(--warning)'
  return 'var(--danger)'
}

export function AutoMatchDrawer({
  dateFrom,
  dateTo,
  onClose,
}: {
  dateFrom: string
  dateTo: string
  onClose: () => void
}) {
  const autoMatch = useAutoMatch()
  const confirmMutation = useAutoMatchConfirm()
  const [candidates, setCandidates] = useState<AutoMatchCandidate[]>([])
  const [confirmed, setConfirmed] = useState(false)

  function handlePreview() {
    autoMatch.mutate(
      { dateFrom, dateTo },
      { onSuccess: (data) => setCandidates(data.candidates ?? []) },
    )
  }

  function handleConfirm() {
    const pairs = candidates
      .filter((c) => c.suggestedDefault)
      .map((c) => ({
        deliveredTripId: c.deliveredTripId,
        bookedTripId: c.bookedTripId,
      }))
    if (pairs.length === 0) return
    confirmMutation.mutate(pairs, { onSuccess: () => setConfirmed(true) })
  }

  const defaultCount = candidates.filter((c) => c.suggestedDefault).length
  const showInitial = candidates.length === 0 && !autoMatch.isPending && !confirmed

  return (
    <Drawer
      open
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      breadcrumb="Đối soát"
      title="Ghép tự động nối"
      meta={`Kỳ ${dateFrom} → ${dateTo}`}
      footer={
        confirmed ? (
          <Button variant="default" onClick={onClose}>
            Xong
          </Button>
        ) : candidates.length > 0 ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Huỷ
            </Button>
            <Button
              variant="default"
              onClick={handleConfirm}
              disabled={confirmMutation.isPending || defaultCount === 0}
            >
              {confirmMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Ghép {defaultCount} cặp
            </Button>
          </>
        ) : showInitial ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Huỷ
            </Button>
            <Button variant="default" onClick={handlePreview}>
              <Zap className="h-4 w-4" /> Quét và đề xuất
            </Button>
          </>
        ) : null
      }
    >
      {showInitial && (
        <div className="space-y-4">
          <p className="text-[13.5px] m-0" style={{ color: 'var(--ink-2)' }}>
            Hệ thống sẽ tự động tìm và đề xuất các cặp chuyến phù hợp nhất trong kỳ.
            Bạn có thể xem trước trước khi xác nhận ghép.
          </p>
          <ul className="m-0 pl-4 space-y-1.5 text-[13px]" style={{ color: 'var(--ink-2)' }}>
            <li>Chuyến đặt trước được so khớp với chuyến đã đi.</li>
            <li>Điểm khớp được tính dựa trên tuyến, ngày, biển số và container.</li>
            <li>Chỉ ghép các cặp đạt ngưỡng "đề xuất tự động" trở lên.</li>
          </ul>
        </div>
      )}

      {autoMatch.isPending && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
          <p className="text-[13px] m-0" style={{ color: 'var(--ink-2)' }}>
            Đang quét và đề xuất...
          </p>
        </div>
      )}

      {candidates.length > 0 && !confirmed && (
        <div className="space-y-3">
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5"
            style={{
              background: 'var(--success-soft)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--success)',
            }}
          >
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span className="text-[13px]">
              Tìm thấy <strong>{candidates.length}</strong> cặp, <strong>{defaultCount}</strong>{' '}
              cặp được đề xuất ghép tự động
            </span>
          </div>

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
            {candidates.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                style={{
                  background: c.suggestedDefault ? 'var(--surface-2)' : 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-sm)',
                }}
              >
                <div className="flex items-center gap-2.5 text-[13px] min-w-0">
                  <span className="font-semibold truncate" style={{ color: 'var(--ink)' }}>
                    WO {c.deliveredTripRef?.plate ?? c.deliveredTripId}
                  </span>
                  <span style={{ color: 'var(--ink-3)' }}>→</span>
                  <span className="font-semibold truncate" style={{ color: 'var(--ink)' }}>
                    TO {c.bookedTripRef?.clientName ?? c.bookedTripId}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="tabular-nums font-bold"
                    style={{
                      fontSize: 12.5,
                      color: scoreColor(c.matchScore, c.maxScore),
                      fontFamily: 'var(--theme-font-mono)',
                    }}
                  >
                    {c.maxScore > 0 ? Math.round((c.matchScore / c.maxScore) * 100) : 0}%
                  </span>
                  {c.suggestedDefault && (
                    <Pill variant="success" dot={false}>
                      Đề xuất
                    </Pill>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmed && (
        <div className="flex flex-col items-center text-center py-8">
          <div
            className="grid place-items-center mb-4"
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--success-soft)',
              color: 'var(--success)',
            }}
          >
            <CheckCircle className="h-7 w-7" strokeWidth={2.25} />
          </div>
          <p
            className="m-0 text-[18px] font-bold"
            style={{ letterSpacing: '-0.02em', color: 'var(--ink)' }}
          >
            Ghép thành công {defaultCount} cặp
          </p>
        </div>
      )}
    </Drawer>
  )
}
