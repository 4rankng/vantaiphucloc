import { useMemo, useState, useCallback } from 'react'
import { Sparkles, FileText, ClipboardList } from 'lucide-react'
import { useSuggestMatches, useReconcile, useBulkMatch } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { TripDetailCard } from './TripDetailCard'
import { MatchCard, scoreColor } from './MatchCard'
import type { WorkOrder } from '@/data/domain'

interface MatchDetailPanelProps {
  workOrder: WorkOrder | null
  onMatchSuccess: () => void
}

export function MatchDetailPanel({ workOrder, onMatchSuccess }: MatchDetailPanelProps) {
  const toast = useToast()
  const reconcile = useReconcile()
  const bulkMatch = useBulkMatch()

  const { data: suggestionsData, isLoading } = useSuggestMatches(workOrder?.id ?? null)
  const suggestions = suggestionsData?.suggestions ?? []

  const [submittingId, setSubmittingId] = useState<number | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set())

  const visibleSuggestions = useMemo(
    () => suggestions.filter(s => !dismissedIds.has(s.tripOrder.id)),
    [suggestions, dismissedIds]
  )

  const perfectMatches = useMemo(
    () => suggestions.filter(s => s.matchScore === s.maxScore),
    [suggestions]
  )

  const handleMatch = useCallback(async (tripOrderId: number) => {
    if (!workOrder || submittingId) return
    setSubmittingId(tripOrderId)
    try {
      const res = await reconcile.mutateAsync({ workOrderId: workOrder.id, tripOrderId })
      if (res.success) {
        toast.success('Thành công', 'Đã ghép chuyến')
        onMatchSuccess()
      } else {
        toast.error('Lỗi', 'Không thể ghép chuyến')
      }
    } catch {
      toast.error('Lỗi', 'Không thể ghép chuyến')
    } finally {
      setSubmittingId(null)
    }
  }, [workOrder, submittingId, reconcile, toast, onMatchSuccess])

  const handleBulkMatch = useCallback(async () => {
    if (!workOrder) return
    const pairs = perfectMatches.map(s => ({
      workOrderId: workOrder.id,
      tripOrderId: s.tripOrder.id,
    }))
    try {
      const res = await bulkMatch.mutateAsync(pairs)
      if (res.success && res.data) {
        const matched = res.data.matched.filter(r => r.success).length
        if (matched > 0) {
          toast.success('Thành công', `Đã ghép ${matched} cặp`)
          onMatchSuccess()
        }
        if (res.data.errors.length > 0) {
          toast.error('Lỗi', `${res.data.errors.length} cặp không thể ghép`)
        }
      }
    } catch {
      toast.error('Lỗi', 'Không thể ghép hàng loạt')
    }
  }, [workOrder, perfectMatches, bulkMatch, toast, onMatchSuccess])

  const handleDismiss = useCallback((tripOrderId: number) => {
    setDismissedIds(prev => new Set(prev).add(tripOrderId))
  }, [])

  const invalidateSuggestions = useCallback(() => {
    // Force refetch by relying on react-query invalidation from the reconcile mutation
    onMatchSuccess()
  }, [onMatchSuccess])

  // ── Empty state: no WO selected ──
  if (!workOrder) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
        <ClipboardList className="w-12 h-12" style={{ color: 'var(--theme-text-muted)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
          Chọn một phiếu để xem các đơn hàng có thể ghép
        </p>
        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          Nhấp vào phiếu bên trái để bắt đầu
        </p>
      </div>
    )
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        {[1, 2].map(i => (
          <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Trip detail card */}
      <TripDetailCard workOrder={workOrder} />

      {/* Bulk match banner */}
      {perfectMatches.length >= 2 && (
        <button
          onClick={handleBulkMatch}
          disabled={bulkMatch.isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-60"
          style={{ background: 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)', color: 'var(--theme-status-success)', border: '1px solid var(--theme-status-success)' }}
        >
          <Sparkles className="w-4 h-4" />
          Có {perfectMatches.length} cặp 100% match — Ghép tất cả ngay
        </button>
      )}

      {/* Suggestions header */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
          Đơn hàng có thể ghép
        </h2>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
        >
          {suggestions.length}
        </span>
      </div>

      {/* No suggestions */}
      {suggestions.length === 0 && (
        <div
          className="rounded-xl p-8 text-center flex flex-col items-center gap-3"
          style={{ background: 'var(--theme-bg-secondary)', border: '1px dashed var(--theme-border-default)' }}
        >
          <FileText className="w-10 h-10" style={{ color: 'var(--theme-text-muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            Không tìm thấy đơn hàng phù hợp
          </p>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            Kiểm tra ngày, tuyến đường, hoặc container
          </p>
        </div>
      )}

      {/* Suggestion cards */}
      <div className="space-y-3">
        {visibleSuggestions.map(s => (
          <MatchCard
            key={s.tripOrder.id}
            matchScore={s.matchScore}
            maxScore={s.maxScore}
            criteria={s.criteria}
            tripOrder={s.tripOrder}
            workOrder={workOrder}
            onConfirm={() => handleMatch(s.tripOrder.id)}
            onDismiss={() => handleDismiss(s.tripOrder.id)}
            submitting={submittingId === s.tripOrder.id}
            onEdited={invalidateSuggestions}
          />
        ))}
      </div>
    </div>
  )
}
