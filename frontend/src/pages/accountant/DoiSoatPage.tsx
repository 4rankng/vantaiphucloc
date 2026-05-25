import { useState, useCallback, useMemo } from 'react'
import {
  ClipboardList,
  Loader2,
  FileSpreadsheet,
  Unlink,
} from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatBreakdownCard } from '@/components/shared/StatBreakdownCard'
import { Panel } from '@/components/shared/Panel'
import { DataTable } from '@/components/shared/DataTable'
import { ToolbarSearch } from '@/components/shared/Toolbar'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import { ExcelImportDrawer } from '@/components/shared/ExcelImportDrawer'
import { DeliveredTripDetailDrawer } from '@/components/shared/DeliveredTripDetailDrawer'
import { AutoMatchDialog, AutoMatchDateDialog } from '@/components/shared/AutoMatchDialog'
import { FilterTabs } from '@/components/shared/FilterTabs'
import { useInfiniteScroll, LoadMoreSentinel } from '@/components/shared/ListUtils'
import { getDeliveredTripColumns } from '@/components/shared/DeliveredTripColumns'
import { useMonthParams } from './use-month-params'
import { useDebounce } from '@/hooks/use-debounce'
import type { DeliveredTrip } from '@/data/domain'
import type { DeliveredTripSortBy, SortOrder } from '@/services/api/deliveredTrips.api'
import {
  useDeliveredTripsInfinite,
  useExportDoiSoatExcel,
  useClients,
  useTripDailyStats,
  useAutoMatchPreview,
  useConfirmAutoMatch,
  useUnmatchTrip,
} from '@/hooks/use-queries'

// ─── Status filter type ───────────────────────────────────────────────────────

type StatusFilter = 'ALL' | 'PENDING' | 'MATCHED'

const AI_ANIMATION_TIME = 1800 // ms — minimum loading animation duration before showing results

function AIMatchButtonLabel({ isPending }: { isPending: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      AI Ghép chuyến
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function DoiSoatPage() {
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [showImport, setShowImport] = useState(false)
  const [matchTarget, setMatchTarget] = useState<DeliveredTrip | null>(null)
  const [doiSoatClientId, setDoiSoatClientId] = useState<string>('ALL')
  const [vendorId] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<DeliveredTripSortBy>('trip_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const exportDoiSoat = useExportDoiSoatExcel()
  const { data: clients = [] } = useClients()

  // Auto-match
  const [showAutoMatchDate, setShowAutoMatchDate] = useState(false)
  const [showAutoMatch, setShowAutoMatch] = useState(false)
  const [autoMatchReady, setAutoMatchReady] = useState(false)
  const autoMatchPreview = useAutoMatchPreview()
  const confirmMatch = useConfirmAutoMatch()
  const unmatch = useUnmatchTrip()

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
    (pairs: Array<{ deliveredTripId: number; bookedTripId: number; syncSource?: string | null }>) => {
      confirmMatch.mutate(pairs, {
        onSuccess: () => {
          setShowAutoMatch(false)
        },
      })
    },
    [confirmMatch]
  )

  const handleSort = useCallback((key: string, order: SortOrder) => {
    setSortBy(key as DeliveredTripSortBy)
    setSortOrder(order)
  }, [])

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

  // Global stats from trip daily stats endpoint
  const { data: dailyStats } = useTripDailyStats(
    dateFrom,
    dateTo,
    doiSoatClientId !== 'ALL' && doiSoatClientId !== '' ? Number(doiSoatClientId) : undefined
  )
  const globalTotal = dailyStats?.total ?? 0
  const globalMatched = dailyStats?.matched ?? 0
  const globalPending = dailyStats?.pending ?? 0
  const globalInternal = dailyStats?.internalCount ?? 0
  const globalVendor = dailyStats?.vendorCount ?? 0
  const globalMatchedPct = globalTotal > 0 ? Math.round((globalMatched / globalTotal) * 100) : 0

  const statusCounts: Record<StatusFilter, number> = {
    ALL: globalTotal,
    PENDING: globalPending,
    MATCHED: globalMatched,
  }

  const filtered = trips

  const columns = useMemo(() => getDeliveredTripColumns({
    onUnmatch: (id) => unmatch.mutate(id),
    isUnmatchPending: unmatch.isPending,
    unmatchVariables: unmatch.variables as number | undefined,
  }), [unmatch])

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
              { label: 'Đã ghép', value: `${globalMatched.toLocaleString('vi-VN')} (${globalMatchedPct}%)` },
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
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--ink-2)' }}><ClipboardList className="h-4 w-4" /></span>
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              Chuyến đã đi
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <InlineSelect
              placeholder="Tất cả chủ hàng"
              value={doiSoatClientId}
              options={[
                { value: 'ALL', label: 'Tất cả chủ hàng' },
                ...clients.map((c) => ({ value: String(c.id), label: c.code ? `${c.code} — ${c.name}` : c.name })),
              ]}
              onChange={(val) => {
                setDoiSoatClientId(val)
                setStatusFilter('ALL')
              }}
              style={{ width: 185, height: 32, fontSize: 12.5 }}
            />
            <Button
              variant="outline"
              size="sm"
              title={doiSoatClientId === 'ALL' || !doiSoatClientId ? 'Chọn chủ hàng để xuất file đối soát' : 'Xuất Excel đối soát cho chủ hàng đã chọn'}
              onClick={() => {
                if (!doiSoatClientId || doiSoatClientId === 'ALL') return
                exportDoiSoat.mutate(
                  { clientId: Number(doiSoatClientId), dateFrom, dateTo },
                  {
                    onSuccess: (blob) => {
                      const client = clients.find(c => c.id === Number(doiSoatClientId))
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `doi-soat-${client?.code ?? 'export'}-${dateFrom}-${dateTo}.xlsx`
                      a.click()
                      URL.revokeObjectURL(url)
                    },
                  },
                )
              }}
              disabled={!doiSoatClientId || doiSoatClientId === 'ALL' || exportDoiSoat.isPending}
            >
              {exportDoiSoat.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
              Xuất đối soát
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Nhập Excel
            </Button>
            <button
              title="Tự động ghép tất cả chuyến khớp hoàn toàn (số cont, tuyến, chủ hàng). Bạn sẽ được xem trước trước khi xác nhận."
              onClick={() => setShowAutoMatchDate(true)}
              disabled={autoMatchPreview.isPending}
              className="inline-flex items-center gap-1.5 ml-3 px-3 py-1.5 rounded-full text-violet-600 text-xs font-medium border border-violet-200 bg-violet-50 hover:bg-violet-100 hover:border-violet-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-200 focus:ring-offset-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
                <path d="M20 3v4"/><path d="M22 5h-4"/>
                <path d="M4 17v2"/><path d="M5 18H3"/>
              </svg>
              <AIMatchButtonLabel isPending={autoMatchPreview.isPending} />
            </button>
          </div>
        </div>

        {/* Row 2: search + filter tabs in a card */}
        <Panel flush className="mb-2">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <ToolbarSearch
              value={search}
              onChange={setSearch}
              placeholder="Tìm chủ hàng, tàu, tuyến, cont…"
              width={320}
            />
            <div className="flex-1" />
            <FilterTabs<StatusFilter>
              tabs={[
                { value: 'ALL', label: 'Tất cả' },
                { value: 'PENDING', label: 'Chờ ghép' },
                { value: 'MATCHED', label: 'Đã ghép' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              counts={statusCounts}
            />
          </div>
        </Panel>

        {/* Hint text + legend — above the table, outside the Panel */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11.5px]" style={{ color: 'var(--ink-4)' }}>
              Nhấp vào hàng để xem chi tiết
            </p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-3)' }}>
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#f59e0b', opacity: 0.85 }} />
                Chờ ghép
              </span>
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-3)' }}>
                <Unlink className="h-3 w-3" style={{ color: 'var(--ink-4)' }} />
                Đã ghép (nhấn để bỏ)
              </span>
            </div>
          </div>
        )}

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
            empty={
              <div className="py-10">
                <EmptyState
                  icon={<ClipboardList className="h-5 w-5" />}
                  title={
                    search.trim()
                      ? 'Không tìm thấy chuyến'
                      : statusFilter !== 'ALL'
                        ? `Không có chuyến nào "${(statusFilter === 'PENDING' ? 'cho ghep' : 'da ghep')}"`
                        : 'Chưa có chuyến nào trong tháng này'
                  }
                  compact
                />
              </div>
            }
          />
          <LoadMoreSentinel sentinelRef={sentinelRef} hasMore={hasMore} />
        </Panel>
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
    </div>
  )
}
