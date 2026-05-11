import { useMemo, useState, useCallback } from 'react'
import { Sparkles, FileText, ClipboardList, Search, Loader2, X, Check, Container, Link2, Unlink, AlertTriangle } from 'lucide-react'
import { useSuggestMatches, useReconcile, useBulkMatch, useTripOrders, useUnmatch, useBatchReconcileForWO } from '@/hooks/use-queries'
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
  const unmatchMut = useUnmatch()

  const isMatched = workOrder?.status === 'MATCHED' || workOrder?.status === 'COMPLETED'

  const { data: suggestionsData, isLoading } = useSuggestMatches(workOrder?.id ?? null)
  const suggestions = suggestionsData?.suggestions ?? []

  const [submittingId, setSubmittingId] = useState<number | null>(null)
  const [manualSearchOpen, setManualSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [unmatchTargetId, setUnmatchTargetId] = useState<number | null>(null)
  const [unmatchReason, setUnmatchReason] = useState('')
  const [selectedToIds, setSelectedToIds] = useState<Set<number>>(new Set())
  const batchForWO = useBatchReconcileForWO()

  const toggleSelection = useCallback((id: number) => {
    setSelectedToIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const handleBatchForWO = useCallback(async () => {
    if (!workOrder || selectedToIds.size === 0) return
    try {
      const res = await batchForWO.mutateAsync({ workOrderId: workOrder.id, tripOrderIds: Array.from(selectedToIds) })
      const matched = res.matched?.filter((r: any) => r.success).length ?? 0
      if (matched > 0) {
        toast.success('Thành công', `Đã ghép ${matched} đơn hàng`)
        setSelectedToIds(new Set())
        onMatchSuccess()
      }
      if (res.errors?.length > 0) {
        toast.error('Lỗi', `${res.errors.length} đơn không thể ghép`)
      }
    } catch {
      toast.error('Lỗi', 'Không thể ghép hàng loạt')
    }
  }, [workOrder, selectedToIds, batchForWO, toast, onMatchSuccess])
  const { data: allTripOrders = [] } = useTripOrders()

  // Find ALL matched trips for matched WOs (multi-match support)
  const matchedTrips = useMemo(() => {
    if (!isMatched || !workOrder) return []
    return allTripOrders.filter(t => t.matchedWorkOrderIds?.includes(workOrder.id))
  }, [isMatched, workOrder, allTripOrders])

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

  const handleUnmatch = useCallback(async () => {
    if (!unmatchTargetId || !workOrder) return
    try {
      await unmatchMut.mutateAsync({ workOrderId: workOrder.id, tripOrderId: unmatchTargetId, reason: unmatchReason.trim() || 'Hủy ghép' })
      toast.success('Thành công', 'Đã hủy ghép chuyến')
      setUnmatchTargetId(null)
      setUnmatchReason('')
      onMatchSuccess()
    } catch {
      toast.error('Lỗi', 'Không thể hủy ghép')
    }
  }, [unmatchTargetId, workOrder, unmatchMut, unmatchReason, toast, onMatchSuccess])

  // ── Matched mode ──
  if (isMatched && workOrder) {
    const unmatchTarget = unmatchTargetId ? matchedTrips.find(t => t.id === unmatchTargetId) : null
    return (
      <div className="h-full overflow-y-auto p-4 space-y-4">
        <TripDetailCard workOrder={workOrder} />

        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4" style={{ color: 'var(--theme-status-success)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            Đã ghép với đơn hàng
          </h2>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
          >
            {matchedTrips.length}
          </span>
        </div>

        {matchedTrips.length > 0 ? (
          <div className="space-y-2">
            {matchedTrips.map(trip => (
              <div
                key={trip.id}
                className="rounded-xl px-4 py-3 space-y-2"
                style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {trip.containers.length > 0 && (
                      <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}>
                        {trip.containers.map(c => c.containerNumber || c.workType).filter(Boolean).join(', ')}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                      {trip.tripDate}
                    </span>
                  </div>
                  <button
                    onClick={() => { setUnmatchTargetId(trip.id); setUnmatchReason('') }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'color-mix(in srgb, var(--theme-status-error) 10%, transparent)', color: 'var(--theme-status-error)' }}
                  >
                    <Unlink className="w-3 h-3" />
                    Bỏ ghép
                  </button>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                  {trip.partner?.name || '—'}
                </p>
                {(trip.pickupLocation?.name || trip.dropoffLocation?.name) && (
                  <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                    {trip.pickupLocation?.name ?? '?'} → {trip.dropoffLocation?.name ?? '?'}
                  </p>
                )}
                {trip.containers.length > 0 && (
                  <p className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>
                    {trip.containers.map(c => c.containerNumber || c.workType).filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl p-6 text-center" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có đơn hàng nào được ghép</p>
          </div>
        )}

        {/* Suggestions for adding more TOs to this matched WO */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--theme-brand-primary)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Thêm đơn hàng khác cho chuyến này
            </h2>
            {suggestions.length > 0 && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
              >
                {suggestions.length}
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ) : suggestions.length === 0 ? (
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: 'var(--theme-bg-secondary)', border: '1px dashed var(--theme-border-default)' }}
            >
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                Không còn đơn hàng phù hợp để thêm
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map(s => (
                <div key={s.tripOrder.id} className="relative">
                  <label
                    className="absolute top-3 left-3 z-10 flex items-center gap-1 cursor-pointer select-none"
                    onClick={e => { e.stopPropagation(); toggleSelection(s.tripOrder.id) }}
                  >
                    <span
                      className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                      style={{
                        borderColor: selectedToIds.has(s.tripOrder.id) ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
                        background: selectedToIds.has(s.tripOrder.id) ? 'var(--theme-brand-primary)' : 'transparent',
                      }}
                    >
                      {selectedToIds.has(s.tripOrder.id) && <Check className="w-3 h-3" style={{ color: 'var(--theme-text-on-brand)' }} />}
                    </span>
                  </label>
                  <div className="pl-9">
                    <MatchCard
                      matchScore={s.matchScore}
                      maxScore={s.maxScore}
                      criteria={s.criteria}
                      tripOrder={s.tripOrder}
                      workOrder={workOrder}
                      onConfirm={() => handleMatch(s.tripOrder.id)}
                      submitting={submittingId === s.tripOrder.id}
                      onEdited={invalidateSuggestions}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Batch action bar in matched mode */}
        {selectedToIds.size > 0 && (
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            <span className="text-sm font-bold">
              Đã chọn {selectedToIds.size} đơn
            </span>
            <button
              onClick={handleBatchForWO}
              disabled={batchForWO.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-opacity disabled:opacity-60"
              style={{ background: 'var(--theme-text-on-brand)', color: 'var(--theme-brand-primary)' }}
                       >
              {batchForWO.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              Ghép tất cả
            </button>
          </div>
        )}

        {unmatchTargetId && unmatchTarget ? (
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'color-mix(in srgb, var(--theme-status-warning) 6%, transparent)', border: '1px solid var(--theme-status-warning)' }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--theme-status-warning)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--theme-status-warning)' }}>Xác nhận hủy ghép</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--theme-text-primary)' }}>
              Chuyến <strong>{workOrder.driver.vehicle?.plate || workOrder.driver.name || '—'}</strong>{' '}
              sẽ được tách khỏi đơn hàng{' '}
              <strong>
                {unmatchTarget.containers
                  .map(c => c.containerNumber || c.workType)
                  .filter(Boolean)
                  .join(', ') || unmatchTarget.partner?.name || '—'}
              </strong>
              . Hành động này có thể ảnh hưởng đến tính lương và đối soát.
            </p>
            <input
              value={unmatchReason}
              onChange={e => setUnmatchReason(e.target.value)}
              placeholder="Lý do hủy ghép (tuỳ chọn)"
              className="w-full px-3 py-2 rounded-lg text-xs border"
              style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleUnmatch}
                disabled={unmatchMut.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-opacity disabled:opacity-40"
                style={{ background: 'var(--theme-status-error)', color: '#fff' }}
              >
                {unmatchMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
                Xác nhận hủy ghép
              </button>
              <button
                onClick={() => { setUnmatchTargetId(null); setUnmatchReason('') }}
                className="px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
              >
                Giữ nguyên
              </button>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

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
          <div key={s.tripOrder.id} className="relative">
            <label
              className="absolute top-3 left-3 z-10 flex items-center gap-1 cursor-pointer select-none"
              onClick={e => { e.stopPropagation(); toggleSelection(s.tripOrder.id) }}
            >
              <span
                className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                style={{
                  borderColor: selectedToIds.has(s.tripOrder.id) ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
                  background: selectedToIds.has(s.tripOrder.id) ? 'var(--theme-brand-primary)' : 'transparent',
                }}
              >
                {selectedToIds.has(s.tripOrder.id) && <Check className="w-3 h-3" style={{ color: 'var(--theme-text-on-brand)' }} />}
              </span>
            </label>
            <div className="pl-9">
              <MatchCard
                matchScore={s.matchScore}
                maxScore={s.maxScore}
                criteria={s.criteria}
                tripOrder={s.tripOrder}
                workOrder={workOrder}
                onConfirm={() => handleMatch(s.tripOrder.id)}
                submitting={submittingId === s.tripOrder.id}
                onEdited={invalidateSuggestions}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Batch action bar */}
      {selectedToIds.size > 0 && (
        <div
          className="sticky bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          <span className="text-sm font-bold">
            Đã chọn {selectedToIds.size} đơn
          </span>
          <button
            onClick={handleBatchForWO}
            disabled={batchForWO.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-opacity disabled:opacity-60"
            style={{ background: 'var(--theme-text-on-brand)', color: 'var(--theme-brand-primary)' }}
          >
            {batchForWO.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
            Ghép tất cả vào {workOrder.driver.vehicle?.plate || workOrder.driver.name || 'chuyến này'}
          </button>
        </div>
      )}
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
    const pending = tripOrders.filter(to => to.status === 'PENDING' || to.status === 'DRAFT')
    if (!query.trim()) return pending.slice(0, 20)
    const q = query.toLowerCase()
    return pending.filter(to =>
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
            <div className="flex items-center gap-2 mt-0.5">
              {(to.pickupLocation?.name || to.dropoffLocation?.name) && (
                <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>
                  {to.pickupLocation?.name ?? '?'} → {to.dropoffLocation?.name ?? '?'}
                </span>
              )}
              {to.containers.length > 0 && (
                <span className="text-[10px] font-mono" style={{ color: 'var(--theme-text-muted)' }}>
                  {to.containers.map(c => c.workType).join(', ')}
                </span>
              )}
            </div>
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
