import { useMemo, useState, useCallback } from 'react'
import { Sparkles, FileText, ClipboardList, Search, Loader2, X, Check, Container } from 'lucide-react'
import { useSuggestMatches, useReconcile, useBulkMatch, useTripOrders } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { TripDetailCard } from './TripDetailCard'
import { MatchCard, scoreColor } from './MatchCard'
import type { WorkOrder, TripOrder } from '@/data/domain'

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
  const [manualSearchOpen, setManualSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { data: allTripOrders = [] } = useTripOrders(manualSearchOpen ? { status: 'PENDING' } : undefined)

  const visibleSuggestions = useMemo(
    () => suggestions,
    [suggestions]
  )

  const perfectMatches = useMemo(
    () => suggestions.filter(s => s.matchScore === s.maxScore),
    [suggestions]
  )

  const handleMatch = useCallback(async (tripOrderId: number) => {
    if (!workOrder || submittingId) return
    setSubmittingId(tripOrderId)
    try {
      await reconcile.mutateAsync({ workOrderId: workOrder.id, tripOrderId })
      toast.success('Thành công', 'Đã ghép chuyến')
      onMatchSuccess()
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
      const matched = res.matched.filter(r => r.success).length
      if (matched > 0) {
        toast.success('Thành công', `Đã ghép ${matched} cặp`)
        onMatchSuccess()
      }
      if (res.errors.length > 0) {
        toast.error('Lỗi', `${res.errors.length} cặp không thể ghép`)
      }
    } catch {
      toast.error('Lỗi', 'Không thể ghép hàng loạt')
    }
  }, [workOrder, perfectMatches, bulkMatch, toast, onMatchSuccess])

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
      {suggestions.length === 0 && !manualSearchOpen && (
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
          <button
            onClick={() => setManualSearchOpen(true)}
            className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            <Search className="w-3.5 h-3.5" /> Tìm đơn hàng thủ công
          </button>
        </div>
      )}

      {/* Manual search panel */}
      {suggestions.length === 0 && manualSearchOpen && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--theme-text-muted)' }} />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm container, khách hàng, mã đơn..."
                className="w-full pl-8 pr-3 py-2 rounded-lg text-xs border"
                style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
              />
            </div>
            <button
              onClick={() => { setManualSearchOpen(false); setSearchQuery('') }}
              className="px-2.5 py-2 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <ManualSearchResults
            tripOrders={allTripOrders}
            query={searchQuery}
            workOrderId={workOrder!.id}
            onMatch={() => { setManualSearchOpen(false); setSearchQuery(''); onMatchSuccess() }}
          />
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
            submitting={submittingId === s.tripOrder.id}
            onEdited={invalidateSuggestions}
          />
        ))}
      </div>
    </div>
  )
}

function ManualSearchResults({
  tripOrders, query, workOrderId, onMatch,
}: {
  tripOrders: TripOrder[]
  query: string
  workOrderId: number
  onMatch: () => void
}) {
  const toast = useToast()
  const reconcile = useReconcile()
  const [submittingId, setSubmittingId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return tripOrders.slice(0, 20)
    const q = query.toLowerCase()
    return tripOrders.filter(to =>
      (to.containers?.some(c => c.containerNumber?.toLowerCase().includes(q))) ||
      (to.partner?.name?.toLowerCase().includes(q)) ||
      (to.code?.toLowerCase().includes(q))
    ).slice(0, 20)
  }, [tripOrders, query])

  const handleManualMatch = useCallback(async (tripOrderId: number) => {
    setSubmittingId(tripOrderId)
    try {
      await reconcile.mutateAsync({ workOrderId, tripOrderId })
      toast.success('Thành công', 'Đã ghép chuyến')
      onMatch()
    } catch {
      toast.error('Lỗi', 'Không thể ghép chuyến')
    } finally {
      setSubmittingId(null)
    }
  }, [workOrderId, reconcile, toast, onMatch])

  if (filtered.length === 0) {
    return (
      <p className="text-xs text-center py-4" style={{ color: 'var(--theme-text-muted)' }}>
        Không tìm thấy đơn hàng phù hợp
      </p>
    )
  }

  return (
    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
      <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
        Tìm thấy {filtered.length} đơn hàng
      </p>
      {filtered.map(to => (
        <div
          key={to.id}
          className="flex items-center gap-2 p-2.5 rounded-lg"
          style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {to.code && (
                <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}>
                  {to.code}
                </span>
              )}
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{to.tripDate}</span>
            </div>
            <p className="text-xs font-medium truncate mt-0.5" style={{ color: 'var(--theme-text-primary)' }}>
              {to.partner?.name || '—'}
            </p>
          </div>
          <button
            onClick={() => handleManualMatch(to.id)}
            disabled={submittingId === to.id}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-opacity disabled:opacity-40"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            {submittingId === to.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Ghép
          </button>
        </div>
      ))}
    </div>
  )
}
