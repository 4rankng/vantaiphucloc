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
import { DataTable, type Column } from '@/components/shared/DataTable'
import { ToolbarSearch } from '@/components/shared/Toolbar'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import { ExcelImportDrawer } from '@/components/shared/ExcelImportDrawer'
import { DeliveredTripDetailDrawer } from '@/components/shared/DeliveredTripDetailDrawer'
import { AutoMatchDialog, AutoMatchDateDialog } from '@/components/shared/AutoMatchDialog'
import { FilterTabs } from '@/components/shared/FilterTabs'
import { useInfiniteScroll, LoadMoreSentinel } from '@/components/shared/ListUtils'
import { useMonthParams } from './use-month-params'
import { getWorkTypeLabel } from '@/data/domain'
import { useDebounce } from '@/hooks/use-debounce'
import { formatMatchDate as formatDate } from '@/lib/match-utils'
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
  const autoMatchPreview = useAutoMatchPreview()
  const confirmMatch = useConfirmAutoMatch()
  const unmatch = useUnmatchTrip()

  const handleAutoMatchConfirm = useCallback(
    (from: string, to: string) => {
      autoMatchPreview.mutate(
        { dateFrom: from, dateTo: to },
        {
          onSuccess: () => {
            setShowAutoMatchDate(false)
            setShowAutoMatch(true)
          },
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

  const columns: Column<DeliveredTrip>[] = [
    {
      key: 'date',
      header: 'Ngày đi',
      width: 64,
      sortKey: 'trip_date',
      render: (t) => (
        <span
          className="tabular-nums"
          style={{ color: 'var(--ink-2)', fontFamily: 'var(--theme-font-mono)', fontSize: 12.5 }}
        >
          {formatDate(t.tripDate)}
        </span>
      ),
    },
    {
      key: 'vessel',
      header: 'Số tàu',
      width: 90,
      sortKey: 'vessel',
      render: (t) => (
        <span className="text-[13px] truncate block" style={{ color: 'var(--ink-2)' }}>
          {t.vessel || '—'}
        </span>
      ),
    },
    {
      key: 'client',
      header: 'Chủ hàng',
      width: 100,
      sortKey: 'client_code',
      render: (t) => (
        <span className="text-[13px] font-semibold truncate block" style={{ color: 'var(--ink)' }}>
          {t.client?.code || '—'}
        </span>
      ),
    },
    {
      key: 'vendor',
      header: 'Nhà thầu',
      width: 90,
      render: (t) => {
        const name = t.vendor?.name || (t.vendorId ? null : 'Phúc Lộc')
        return (
          <span className="text-[13px] truncate block" style={{ color: name === 'Phúc Lộc' ? 'var(--ink-2)' : 'var(--ink)' }}>
            {name || '—'}
          </span>
        )
      },
    },
    {
      key: 'vehicle',
      header: 'Số xe chạy',
      width: 90,
      sortKey: 'vehicle_plate',
      render: (t) => (
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>
          {t.vehiclePlate || '—'}
        </span>
      ),
    },
    {
      key: 'pickup',
      header: 'Điểm đi',
      sortKey: 'pickup_name',
      render: (t) => (
        <span className="text-[12.5px] truncate block" style={{ color: 'var(--ink-2)' }}>
          {t.pickupLocation?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'dropoff',
      header: 'Điểm đến',
      sortKey: 'dropoff_name',
      render: (t) => (
        <span className="text-[12.5px] truncate block" style={{ color: 'var(--ink-2)' }}>
          {t.dropoffLocation?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'containers',
      header: 'Số Cont',
      width: 150,
      sortKey: 'cont_number',
      render: (t) => {
        if (!t.contNumber) return <span style={{ color: 'var(--ink-4)' }}>—</span>
        return (
          <div className="flex items-center gap-1.5">
            <span
              className="tabular-nums whitespace-nowrap"
              style={{ fontFamily: 'var(--theme-font-mono)', fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}
            >
              {t.contNumber}
            </span>
          </div>
        )
      },
    },
    {
      key: 'contType',
      header: 'Loại Cont',
      width: 64,
      sortKey: 'cont_type',
      render: (t) => {
        const ct = t.contType
        return ct ? (
          <span
            className="text-[10.5px] uppercase font-semibold whitespace-nowrap"
            style={{
              color: 'var(--ink-2)',
              background: 'var(--surface-3)',
              padding: '1px 5px',
              borderRadius: 4,
              letterSpacing: '0.04em',
            }}
          >
            {ct}
          </span>
        ) : (
          <span style={{ color: 'var(--ink-4)' }}>—</span>
        )
      },
    },
    {
      key: 'workType',
      header: 'Tác nghiệp',
      width: 100,
      sortKey: 'work_type',
      render: (t) => {
        const wt = t.workType
        const label = getWorkTypeLabel(wt)
        return label ? (
          <span
            className="text-[11px] font-semibold whitespace-nowrap"
            style={{
              color: 'var(--ink-2)',
              background: 'var(--surface-3)',
              padding: '1px 5px',
              borderRadius: 4,
              letterSpacing: '0.04em',
            }}
          >
            {label}
          </span>
        ) : (
          <span style={{ color: 'var(--ink-4)' }}>—</span>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      width: 44,
      render: (t) => {
        if (!t.matched) return null
        return (
          <button
            title="Bỏ ghép chuyến này"
            onClick={(e) => {
              e.stopPropagation()
              if (unmatch.isPending) return
              unmatch.mutate(t.id)
            }}
            className="p-1 rounded hover:bg-red-50 transition-colors"
            style={{ color: 'var(--ink-4)' }}
            disabled={unmatch.isPending}
          >
            {unmatch.isPending && unmatch.variables === t.id
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Unlink className="h-3.5 w-3.5" />}
          </button>
        )
      },
    },
  ]

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
              variant="ghost"
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
            <Button variant="ghost" onClick={() => setShowImport(true)}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Nhập Excel
            </Button>
            <button
              title="Tự động ghép tất cả chuyến khớp hoàn toàn (số cont, tuyến, chủ hàng). Bạn sẽ được xem trước trước khi xác nhận."
              onClick={() => setShowAutoMatchDate(true)}
              disabled={autoMatchPreview.isPending}
              className="ai-btn-glow relative group ml-10 px-5 py-1.5 rounded-full text-white font-semibold text-xs tracking-wide transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1"
              style={{ background: 'linear-gradient(to right, #6366f1, #a855f7, #ec4899)' }}
            >
              {/* sparkle — slides in from left on hover */}
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
                  <path d="M20 3v4"/><path d="M22 5h-4"/>
                  <path d="M4 17v2"/><path d="M5 18H3"/>
                </svg>
              </span>

              {/* text shifts right on hover to make room for sparkle */}
              <span className="inline-flex items-center gap-1.5 group-hover:translate-x-2.5 transition-transform duration-300">
                {autoMatchPreview.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : null}
                AI
              </span>

              {/* inner white ring for depth */}
              <span className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
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

        {/* Hint text — above the table, outside the Panel */}
        {!isLoading && filtered.length > 0 && (
          <p className="text-[11.5px] mb-1.5" style={{ color: 'var(--ink-4)' }}>
            Nhấp vào hàng để xem chi tiết và ghép nối chuyến
          </p>
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
            rowClassName={(t) => t.matched ? 'row-matched' : 'row-pending'}
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

      {showAutoMatch && autoMatchPreview.data && (
        <AutoMatchDialog
          open={showAutoMatch}
          onClose={() => setShowAutoMatch(false)}
          candidates={autoMatchPreview.data.candidates}
          unmatchedCount={autoMatchPreview.data.unmatchedCount}
          scannedCount={autoMatchPreview.data.scannedCount}
          isConfirming={confirmMatch.isPending}
          onConfirm={handleConfirmMatch}
        />
      )}
    </div>
  )
}


