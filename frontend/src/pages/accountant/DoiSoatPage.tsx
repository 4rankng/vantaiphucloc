import { useState, useCallback, useMemo } from 'react'
import {
  ClipboardList,
  Loader2,
  FileSpreadsheet,
  Zap,
} from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatBreakdownCard } from '@/components/shared/StatBreakdownCard'
import { Panel } from '@/components/shared/Panel'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Toolbar, ToolbarSearch, ToolbarSpacer } from '@/components/shared/Toolbar'
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
    (pairs: Array<{ deliveredTripId: number; bookedTripId: number }>) => {
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
        {/* Section header + action buttons */}
        <div className="flex items-center justify-between mb-3">
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
              onChange={setDoiSoatClientId}
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
            <Button
              variant="ghost"
              title="Tự động ghép tất cả chuyến khớp hoàn toàn (số cont, tuyến, chủ hàng). Bạn sẽ được xem trước trước khi xác nhận."
              onClick={() => setShowAutoMatchDate(true)}
              disabled={autoMatchPreview.isPending}
            >
              {autoMatchPreview.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Tự động ghép
            </Button>
          </div>
        </div>

        <Panel flush>
          <Toolbar bordered>
            <ToolbarSearch
              value={search}
              onChange={setSearch}
              placeholder="Tìm chủ hàng, tàu, tuyến, cont…"
              width={320}
            />
            <ToolbarSpacer />
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
          </Toolbar>

          {!isLoading && filtered.length > 0 && (
            <div className="px-4 py-1.5" style={{ borderBottom: '1px solid var(--line)' }}>
              <span className="text-[11.5px]" style={{ color: 'var(--ink-4)' }}>
                Nhấp vào hàng để xem chi tiết và ghép nối chuyến
              </span>
            </div>
          )}

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


