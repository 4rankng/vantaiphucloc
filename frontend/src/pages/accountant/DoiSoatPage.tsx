import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  ClipboardList,
  Loader2,
  FileSpreadsheet,
  Zap,
  Unlink,
  ArrowLeftRight,
} from 'lucide-react'
import { MonthNavigator } from '@/components/shared/navigation/MonthNavigator'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { StatBreakdownCard } from '@/components/shared/data-display/StatBreakdownCard'
import { Panel } from '@/components/shared/overlays/Panel'
import { DataTable } from '@/components/shared/data-display/DataTable'
import { ToolbarSearch } from '@/components/shared/navigation/Toolbar'
import { EmptyState } from '@/components/shared/feedback/EmptyState'
import { TableSkeleton } from '@/components/shared/data-display/TableSkeleton/TableSkeleton'
import { Button } from '@/components/ui'
import { InlineSelect } from '@/components/shared/forms/InlineSelect/InlineSelect'
import { ExcelImportDrawer } from '@/components/shared/overlays/ExcelImportDrawer'
import { DeliveredTripDetailDrawer } from '@/components/shared/overlays/DeliveredTripDetailDrawer'
import { AutoMatchDialog, AutoMatchDateDialog } from '@/components/shared/feedback/AutoMatchDialog'
import { ExportDoiSoatDialog } from '@/components/shared/overlays/ExportDoiSoatDialog'
import { DangerConfirmDialog } from '@/components/shared/overlays/DangerConfirmDialog/DangerConfirmDialog'
import { useInfiniteScroll, LoadMoreSentinel } from '@/components/shared/data-display/ListUtils'
import { getDeliveredTripColumns } from '@/components/shared/data-display/DeliveredTripColumns'
import { useMonthParams } from './use-month-params'
import { useDebounce } from '@/hooks/use-debounce'
import { useIsMobile } from '@/hooks/use-mobile'
import { DeliveredTripMobileCard } from '@/components/shared/cards/DeliveredTripMobileCard'
import type { DeliveredTrip } from '@/data/domain'
import type { DeliveredTripSortBy, SortOrder } from '@/services/api/deliveredTrips.api'
import {
  useDeliveredTripsInfinite,
  useExportDoiSoatExcel,
  useClients,
  useDrivers,
  useTripDailyStats,
  useAutoMatchPreview,
  useConfirmAutoMatch,
  useUnmatchTrip,
  useDeleteDeliveredTrip,
} from '@/hooks/use-queries'

// ─── Status filter type ───────────────────────────────────────────────────────

type StatusFilter = 'ALL' | 'PENDING' | 'MATCHED'

const AI_ANIMATION_TIME = 1800 // ms — minimum loading animation duration before showing results



// ─── Main page ────────────────────────────────────────────────────────────────

export function DoiSoatPage() {
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const isMobile = useIsMobile(768)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [showImport, setShowImport] = useState(false)
  const [matchTarget, setMatchTarget] = useState<DeliveredTrip | null>(null)
  const [doiSoatClientId, setDoiSoatClientId] = useState<string>('ALL')
  const [vendorId] = useState<string>('ALL')
  const [driverIdFilter, setDriverIdFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<DeliveredTripSortBy>('trip_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showExportDialog, setShowExportDialog] = useState(false)

  const exportDoiSoat = useExportDoiSoatExcel()
  const { data: clients = [] } = useClients()
  const { data: drivers = [] } = useDrivers()

  // Auto-match
  const [showAutoMatchDate, setShowAutoMatchDate] = useState(false)
  const [showAutoMatch, setShowAutoMatch] = useState(false)
  const [autoMatchReady, setAutoMatchReady] = useState(false)
  const autoMatchPreview = useAutoMatchPreview()
  const confirmMatch = useConfirmAutoMatch()
  const unmatch = useUnmatchTrip()
  const deleteTrip = useDeleteDeliveredTrip()

  // Delete confirmation — only available for unmatched trips
  const [deleteTarget, setDeleteTarget] = useState<DeliveredTrip | null>(null)

  // Unmatch confirmation — destructive action, must confirm (consistency with
  // "Gỡ lái xe" / "Xoá địa điểm" patterns elsewhere in the app). Previously
  // the icon click fired mutate() instantly, so a single misclick on a 28×28
  // icon would silently break a real match — no undo, no toast.
  const [unmatchTarget, setUnmatchTarget] = useState<DeliveredTrip | null>(null)

  const handleAutoMatchConfirm = useCallback(
    (from: string, to: string) => {
      // Immediately swap dialogs — results dialog opens in loading state
      setShowAutoMatchDate(false)
      setShowAutoMatch(true)
      setAutoMatchReady(false)

      const startedAt = Date.now()
      autoMatchPreview.mutate(
        { dateFrom: from, dateTo: to },
        {
          onSuccess: () => {
            const elapsed = Date.now() - startedAt
            const remaining = Math.max(0, AI_ANIMATION_TIME - elapsed)
            setTimeout(() => setAutoMatchReady(true), remaining)
          },
          onError: () => setAutoMatchReady(true),
        }
      )
    },
    [autoMatchPreview]
  )

  const handleConfirmMatch = useCallback(
    (pairs: Array<{
      deliveredTripId: number
      bookedTripId: number
      syncSource?: string | null
      fieldChoices?: Record<string, 'delivered' | 'booked'> | null
    }>) => {
      confirmMatch.mutate(pairs, {
        onSuccess: () => {
          setShowAutoMatch(false)
        },
      })
    },
    [confirmMatch]
  )

  const tablePanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const panel = tablePanelRef.current
    if (!panel) return
    const handler = (e: KeyboardEvent) => {
      const scroller = panel.querySelector('.nepo-table-scroll')
      if (!scroller) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        scroller.scrollBy({ left: -120, behavior: 'smooth' })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        scroller.scrollBy({ left: 120, behavior: 'smooth' })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSort = useCallback((key: string, order: SortOrder) => {
    setSortBy(key as DeliveredTripSortBy)
    setSortOrder(order)
  }, [])

  const handleExportConfirm = useCallback(
    (clientId: number, from: string, to: string) => {
      exportDoiSoat.mutate(
        { clientId, dateFrom: from, dateTo: to },
        {
          onSuccess: (blob) => {
            const client = clients.find(c => c.id === clientId)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `doi-soat-${client?.code ?? 'export'}-${from}-${to}.xlsx`
            a.click()
            URL.revokeObjectURL(url)
            setShowExportDialog(false)
          },
        },
      )
    },
    [exportDoiSoat, clients]
  )

  const {
    data: infiniteData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDeliveredTripsInfinite({
    dateFrom,
    dateTo,
    clientId: doiSoatClientId !== 'ALL' && doiSoatClientId !== '' ? Number(doiSoatClientId) : undefined,
    driverId: driverIdFilter !== 'ALL' && driverIdFilter !== '' ? Number(driverIdFilter) : undefined,
    vendorId: vendorId !== 'ALL' && vendorId !== '' ? Number(vendorId) : undefined,
    matched: statusFilter !== 'ALL' ? (statusFilter === 'MATCHED') : undefined,
    search: debouncedSearch || undefined,
    sortBy,
    sortOrder,
  })

  const trips = useMemo(() => infiniteData?.pages.flatMap(p => p.items) ?? [], [infiniteData])
  const hasMore = hasNextPage ?? false
  const loadMore = useCallback(() => {
    if (hasMore && !isFetchingNextPage) fetchNextPage()
  }, [hasMore, isFetchingNextPage, fetchNextPage])
  const sentinelRef = useInfiniteScroll(loadMore)

  // Global stats from trip daily stats endpoint — respects all active filters
  const { data: dailyStats } = useTripDailyStats(
    dateFrom,
    dateTo,
    doiSoatClientId !== 'ALL' && doiSoatClientId !== '' ? Number(doiSoatClientId) : undefined,
    driverIdFilter !== 'ALL' && driverIdFilter !== '' ? Number(driverIdFilter) : undefined,
    statusFilter !== 'ALL' ? (statusFilter === 'MATCHED') : undefined,
  )
  const globalTotal = dailyStats?.total ?? 0
  const globalMatched = dailyStats?.matched ?? 0
  const globalPending = dailyStats?.pending ?? 0
  const globalInternal = dailyStats?.internalCount ?? 0
  const globalVendor = dailyStats?.vendorCount ?? 0

  const filtered = trips

  const columns = useMemo(() => getDeliveredTripColumns({
    onUnmatch: (trip) => setUnmatchTarget(trip),
    isUnmatchPending: unmatch.isPending,
    unmatchVariables: unmatch.variables as number | undefined,
    onDelete: (trip) => setDeleteTarget(trip),
    isDeletePending: deleteTrip.isPending,
    deleteVariables: deleteTrip.variables as number | undefined,
  }), [unmatch.isPending, unmatch.variables, deleteTrip.isPending, deleteTrip.variables])

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <PageHeader
        title="Đối soát"
        subtitle="Ghép chuyến thực tế với đơn hàng — theo dõi trạng thái khớp và xuất báo cáo"
        lucideIcon={ClipboardList}
        actions={
          <div className="flex items-center gap-2">
            <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />
          </div>
        }
      />

      {/* ── Stats ── */}
      {!isLoading && globalTotal > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          <StatBreakdownCard
            label="Tổng chuyến"
            total={globalTotal.toLocaleString('vi-VN')}
            items={[
              { label: 'Đã ghép', value: globalMatched.toLocaleString('vi-VN') },
              { label: 'Chờ ghép', value: globalPending.toLocaleString('vi-VN') },
            ]}
          />
          <StatBreakdownCard
            label="Tổng xe"
            total={(globalInternal + globalVendor).toLocaleString('vi-VN')}
            items={[
              { label: 'Xe nội bộ', value: globalInternal.toLocaleString('vi-VN') },
              { label: 'Xe ngoài', value: globalVendor.toLocaleString('vi-VN') },
            ]}
          />
        </div>
      )}

      {/* ── Table section ── */}
      <section>
        {/* Row 1: title + action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--ink-2)' }}><ClipboardList className="h-4 w-4" /></span>
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              Chuyến đã đi
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              title="Xuất Excel đối soát"
              onClick={() => setShowExportDialog(true)}
              className="flex-1 sm:flex-none"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Xuất đối soát
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="flex-1 sm:flex-none">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Nhập Excel
            </Button>
            <Button
              variant="default"
              size="sm"
              title="Tự động ghép tất cả chuyến khớp hoàn toàn (số cont, tuyến, chủ hàng). Bạn sẽ được xem trước trước khi xác nhận."
              onClick={() => setShowAutoMatchDate(true)}
              disabled={autoMatchPreview.isPending}
              className="flex-1 sm:flex-none"
            >
              {autoMatchPreview.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              Ghép tự động
            </Button>
          </div>
        </div>

        {/* Row 2: search + filter dropdowns in a card */}
        <Panel flush className="mb-2">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-4 py-2.5">
            <div className="w-full lg:w-[280px]">
              <ToolbarSearch
                value={search}
                onChange={setSearch}
                placeholder="Tìm chủ hàng, tàu, tuyến, cont…"
                width="100%"
              />
            </div>
            <div className="hidden lg:block flex-1" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
              <div className="w-full sm:w-[185px]">
                <InlineSelect
                  placeholder="Tất cả chủ hàng"
                  value={doiSoatClientId}
                  options={[
                    { value: 'ALL', label: 'Tất cả chủ hàng' },
                    ...clients.map((c) => ({ value: String(c.id), label: c.code ? `${c.code} — ${c.name}` : c.name })),
                  ]}
                  onChange={setDoiSoatClientId}
                  style={{ width: '100%', height: 32, fontSize: 12.5 }}
                />
              </div>
              <div className="w-full sm:w-[160px]">
                <InlineSelect
                  placeholder="Tất cả lái xe"
                  value={driverIdFilter}
                  options={[
                    { value: 'ALL', label: 'Tất cả lái xe' },
                    ...drivers.map((d) => ({ value: String(d.id), label: d.fullName || d.username, sublabel: d.phone })),
                  ]}
                  onChange={setDriverIdFilter}
                  style={{ width: '100%', height: 32, fontSize: 12.5 }}
                />
              </div>
              <div className="w-full sm:w-[130px]">
                <InlineSelect
                  placeholder="Trạng thái"
                  value={statusFilter}
                  options={[
                    { value: 'ALL', label: 'Tất cả' },
                    { value: 'PENDING', label: 'Chờ ghép' },
                    { value: 'MATCHED', label: 'Đã ghép' },
                  ]}
                  onChange={(val) => setStatusFilter(val as StatusFilter)}
                  style={{ width: '100%', height: 32, fontSize: 12.5 }}
                />
              </div>
            </div>
          </div>
        </Panel>

        {/* Hint text + legend — desktop only */}
        {!isLoading && filtered.length > 0 && !isMobile && (
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11.5px]" style={{ color: 'var(--ink-4)' }}>
              Nhấp vào hàng để xem chi tiết · <ArrowLeftRight className="inline h-3 w-3 relative -top-px" /> ← → cuộn ngang
            </p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-3)' }}>
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--theme-status-warning)', opacity: 0.85 }} />
                Chờ ghép
              </span>
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-3)' }}>
                <Unlink className="h-3 w-3" style={{ color: 'var(--ink-4)' }} />
                Đã ghép (nhấn để bỏ)
              </span>
            </div>
          </div>
        )}
        <div ref={tablePanelRef}>
          {isMobile ? (
            <>
              {isLoading ? (
                <TableSkeleton />
              ) : filtered.length === 0 ? (
                <div className="py-10">
                  <EmptyState
                    icon={<ClipboardList className="h-5 w-5" />}
                    title={
                      search.trim()
                        ? 'Không tìm thấy chuyến'
                        : statusFilter !== 'ALL'
                          ? `Không có chuyến nào "${(statusFilter === 'PENDING' ? 'chờ ghép' : 'đã ghép')}"`
                          : 'Chưa có chuyến nào trong tháng này'
                    }
                    compact
                  />
                </div>
              ) : (
                <>
                  <div className="px-4 py-1.5 mb-3 animate-fade-in" style={{ borderBottom: '1px solid var(--line)' }}>
                    <span className="text-[11.5px]" style={{ color: 'var(--ink-4)' }}>
                      Nhấp vào thẻ để xem chi tiết
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {filtered.map((trip) => (
                      <DeliveredTripMobileCard
                        key={trip.id}
                        trip={trip}
                        onTap={setMatchTarget}
                        onUnmatch={(t) => setUnmatchTarget(t)}
                        isUnmatchPending={unmatch.isPending}
                        unmatchVariables={unmatch.variables as number | undefined}
                        onDelete={(t) => setDeleteTarget(t)}
                        isDeletePending={deleteTrip.isPending}
                        deleteVariables={deleteTrip.variables as number | undefined}
                      />
                    ))}
                  </div>
                  <LoadMoreSentinel sentinelRef={sentinelRef} hasMore={hasMore} />
                </>
              )}
            </>
          ) : (
            <Panel flush>
              <DataTable
                columns={columns}
                rows={filtered}
                rowKey={(t) => t.id}
                isLoading={isLoading}
                minWidth={1000}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                onRowClick={(t) => setMatchTarget(t)}
                rowClassName={(t) => t.bookedTripId ? 'row-matched' : 'row-pending'}
                maxHeight="calc(100dvh - 330px)"
                sentinel={<LoadMoreSentinel sentinelRef={sentinelRef} hasMore={hasMore} />}
                empty={
                  <div className="py-10">
                    <EmptyState
                      icon={<ClipboardList className="h-5 w-5" />}
                      title={
                        search.trim()
                          ? 'Không tìm thấy chuyến'
                          : statusFilter !== 'ALL'
                            ? `Không có chuyến nào "${(statusFilter === 'PENDING' ? 'chờ ghép' : 'đã ghép')}"`
                            : 'Chưa có chuyến nào trong tháng này'
                      }
                      compact
                    />
                  </div>
                }
              />
            </Panel>
          )}
        </div>
      </section>

      {/* ── Drawers ── */}
      {showImport && (
        <ExcelImportDrawer onClose={() => setShowImport(false)} />
      )}


      {matchTarget && (
        <DeliveredTripDetailDrawer
          trip={matchTarget}
          onClose={() => setMatchTarget(null)}
        />
      )}

      {showAutoMatchDate && (
        <AutoMatchDateDialog
          open={showAutoMatchDate}
          onClose={() => setShowAutoMatchDate(false)}
          defaultDateFrom={dateFrom}
          defaultDateTo={dateTo}
          isPending={autoMatchPreview.isPending}
          onConfirm={handleAutoMatchConfirm}
        />
      )}

      {showAutoMatch && (
        <AutoMatchDialog
          open={showAutoMatch}
          onClose={() => { setShowAutoMatch(false); setAutoMatchReady(false) }}
          candidates={autoMatchReady && autoMatchPreview.data ? autoMatchPreview.data.candidates : []}
          unmatchedCount={autoMatchReady && autoMatchPreview.data ? autoMatchPreview.data.unmatchedCount : 0}
          scannedCount={autoMatchReady && autoMatchPreview.data ? autoMatchPreview.data.scannedCount : 0}
          isLoading={!autoMatchReady}
          isConfirming={confirmMatch.isPending}
          onConfirm={handleConfirmMatch}
        />
      )}

      {/* ── Export dialog ── */}
      {showExportDialog && (
        <ExportDoiSoatDialog
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          defaultDateFrom={dateFrom}
          defaultDateTo={dateTo}
          isPending={exportDoiSoat.isPending}
          onConfirm={handleExportConfirm}
        />
      )}

      {/* ── Unmatch confirmation (destructive) ── */}
      <DangerConfirmDialog
        open={!!unmatchTarget}
        onClose={() => setUnmatchTarget(null)}
        onConfirm={() => {
          if (!unmatchTarget) return
          const id = unmatchTarget.id
          setUnmatchTarget(null)
          unmatch.mutate(id)
        }}
        title="Bỏ ghép chuyến?"
        entityName={
          unmatchTarget
            ? [
                unmatchTarget.contNumber || `Chuyến #${unmatchTarget.id}`,
                unmatchTarget.tripDate ? `(${unmatchTarget.tripDate})` : '',
              ].filter(Boolean).join(' ')
            : ''
        }
        warningText="sẽ được tách khỏi đơn hàng đã ghép và quay lại danh sách chờ ghép."
        confirmLabel="Bỏ ghép"
        loading={unmatch.isPending}
      />

      {/* ── Delete confirmation (destructive) ── */}
      <DangerConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          const id = deleteTarget.id
          setDeleteTarget(null)
          deleteTrip.mutate(id)
        }}
        title="Xoá chuyến đã đi?"
        entityName={
          deleteTarget
            ? [
                deleteTarget.contNumber || `Chuyến #${deleteTarget.id}`,
                deleteTarget.tripDate ? `(${deleteTarget.tripDate})` : '',
              ].filter(Boolean).join(' ')
            : ''
        }
        warningText="sẽ bị xoá vĩnh viễn và không thể khôi phục."
        confirmLabel="Xoá"
        loading={deleteTrip.isPending}
      />
    </div>
  )
}
