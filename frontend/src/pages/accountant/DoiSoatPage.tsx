import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  ClipboardList,
  Zap,
  Unlink,
  Loader2,
  AlertCircle,
  CheckCircle,
  Check,
  DollarSign,
  FileSpreadsheet,
  Upload,
  X,
  AlertTriangle,
  Camera,
  MapPin,
  Clock,
  User,
  Truck,
  Calendar,
} from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { MatchProgressBar } from '@/components/shared/MatchProgressBar'
import { Panel } from '@/components/shared/Panel'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Toolbar, ToolbarSearch, ToolbarSpacer } from '@/components/shared/Toolbar'
import { Pill } from '@/components/shared/Pill'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
// AutoMatchDrawer removed — auto-match now runs inline
import { ExcelImportDrawer } from '@/components/shared/ExcelImportDrawer'
import { DeliveredTripDetailDrawer } from '@/components/shared/DeliveredTripDetailDrawer'
import { FilterTabs } from '@/components/shared/FilterTabs'
import { StatPill } from '@/components/shared/StatPill'
import { Pagination } from '@/components/ui/Pagination/Pagination'
import { useMonthParams } from './use-month-params'
import { formatCurrency, compactCurrency, OPERATION_TYPE_LABELS } from '@/data/domain'
import { useDebounce } from '@/hooks/use-debounce'
import { formatMatchDate as formatDate, scoreColor, getDeliveredTripStatusBadge, statusVariant } from '@/lib/match-utils'
import type { DeliveredTrip, DeliveredTripStatus } from '@/data/domain'
import type { DeliveredTripSortBy, SortOrder } from '@/services/api/deliveredTrips.api'
import {
  useDeliveredTrips,
  useUnmatch,
  useExportDoiSoatExcel,
  useAutoMatch,
  useAutoMatchConfirm,
  useClients,
  useTripDailyStats,
} from '@/hooks/use-queries'

// ─── Status filter type ───────────────────────────────────────────────────────

type StatusFilter = 'ALL' | 'PENDING' | 'MATCHED'

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  ALL: 'Tất cả',
  PENDING: 'Chờ ghép',
  MATCHED: 'Đã ghép',
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function DoiSoatPage() {
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [showImport, setShowImport] = useState(false)
  const [confirmUnmatchId, setConfirmUnmatchId] = useState<number | null>(null)
  const [matchTarget, setMatchTarget] = useState<DeliveredTrip | null>(null)
  const [doiSoatClientId, setDoiSoatClientId] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const pageSize = 50
  const [sortBy, setSortBy] = useState<DeliveredTripSortBy>('trip_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const exportDoiSoat = useExportDoiSoatExcel()
  const { data: clients = [] } = useClients()

  useEffect(() => { setPage(1) }, [statusFilter, dateFrom, dateTo, doiSoatClientId, debouncedSearch])

  const handleSort = useCallback((key: string, order: SortOrder) => {
    setSortBy(key as DeliveredTripSortBy)
    setSortOrder(order)
    setPage(1)
  }, [])

  const { data, isLoading } = useDeliveredTrips({
    dateFrom,
    dateTo,
    clientId: doiSoatClientId !== 'ALL' && doiSoatClientId !== '' ? Number(doiSoatClientId) : undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    search: debouncedSearch || undefined,
    page,
    pageSize,
    sortBy,
    sortOrder,
  })
  const trips = data?.items ?? []
  const totalPages = data?.totalPages ?? 0
  const totalItems = data?.total ?? 0
  const unmatchMutation = useUnmatch()

  // Global ESC = cancel unlink, Enter = confirm unlink
  useEffect(() => {
    if (confirmUnmatchId === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmUnmatchId(null)
      } else if (e.key === 'Enter') {
        const trip = trips.find((t) => t.id === confirmUnmatchId)
        if (!trip?.bookedTripId || unmatchMutation.isPending) return
        unmatchMutation.mutate(
          { deliveredTripId: trip.id, bookedTripId: trip.bookedTripId },
          { onSuccess: () => setConfirmUnmatchId(null) },
        )
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [confirmUnmatchId, trips, unmatchMutation])
  const autoMatch = useAutoMatch()
  const autoMatchConfirm = useAutoMatchConfirm()

  const autoMatching = autoMatch.isPending || autoMatchConfirm.isPending

  const handleAutoMatch = useCallback(() => {
    autoMatch.mutate(
      { dateFrom, dateTo },
      {
        onSuccess: (data) => {
          const pairs = (data.candidates ?? [])
            .filter((c) => c.suggestedDefault)
            .map((c) => ({
              deliveredTripId: c.deliveredTripId,
              bookedTripId: c.bookedTripId,
            }))
          if (pairs.length === 0) return
          autoMatchConfirm.mutate(pairs)
        },
      },
    )
  }, [dateFrom, dateTo, autoMatch, autoMatchConfirm])

  // Global stats from trip daily stats endpoint
  const { data: dailyStats } = useTripDailyStats(
    dateFrom,
    dateTo,
    doiSoatClientId !== 'ALL' && doiSoatClientId !== '' ? Number(doiSoatClientId) : undefined
  )
  const globalTotal = dailyStats?.total ?? 0
  const globalMatched = dailyStats?.matched ?? 0
  const globalPending = dailyStats?.pending ?? 0
  const globalRevenue = dailyStats?.totalRevenue ?? 0
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
      key: 'containers',
      header: 'Số Cont',
      width: 150,
      sortKey: 'container_number',
      render: (t) => {
        if (!t.containers?.length) return <span style={{ color: 'var(--ink-4)' }}>—</span>
        const first = t.containers[0]
        const more = t.containers.length - 1
        return (
          <div className="flex items-center gap-1.5">
            <span
              className="tabular-nums whitespace-nowrap"
              style={{ fontFamily: 'var(--theme-font-mono)', fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}
            >
              {first.containerNumber}
            </span>
            {more > 0 && (
              <span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>
                +{more}
              </span>
            )}
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
        const ct = t.containers?.[0]?.contType || t.workType
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
      key: 'vehicle',
      header: 'Số xe chạy',
      width: 90,
      sortKey: 'vehicle_plate',
      render: (t) => (
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>
          {t.vehicle?.plate || '—'}
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
      key: 'operation',
      header: 'Tác nghiệp',
      width: 110,
      sortKey: 'operation_type',
      render: (t) => {
        const label = t.operationType ? OPERATION_TYPE_LABELS[t.operationType] : null
        return label ? (
          <span className="text-[12px] whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>
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
      align: 'right',
      width: 90,
      render: (t) => {
        if (t.status === 'MATCHED') {
          const confirming = confirmUnmatchId === t.id
          if (confirming) {
            return (
              <div className="relative flex flex-col items-center justify-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    unmatchMutation.mutate(
                      { deliveredTripId: t.id, bookedTripId: t.bookedTripId! },
                      { onSuccess: () => setConfirmUnmatchId(null) },
                    )
                  }}
                  disabled={unmatchMutation.isPending}
                  className="nepo-row-action"
                  aria-label="Xác nhận bỏ ghép (Enter)"
                  title="Xác nhận bỏ ghép (Enter)"
                  style={{ color: 'var(--danger)' }}
                >
                  {unmatchMutation.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Check className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmUnmatchId(null) }}
                  className="nepo-row-action"
                  aria-label="Huỷ (Esc)"
                  title="Huỷ (Esc)"
                  style={{ color: 'var(--ink-3)' }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <span
                  className="absolute top-full -translate-y-1 right-0 text-[9px] leading-none select-none whitespace-nowrap pointer-events-none"
                  style={{ color: 'var(--ink-4)' }}
                >
                  Enter xác nhận · Esc huỷ
                </span>
              </div>
            )
          }
          return (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmUnmatchId(t.id) }}
              className="nepo-row-action"
              aria-label="Bỏ ghép"
              title="Bỏ ghép"
              style={{ color: 'var(--danger)' }}
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          )
        }
        if (t.status === 'PENDING') {
          return (
            <span
              className="nepo-row-action cursor-default hover:bg-transparent"
              style={{ color: 'var(--warning)' }}
              title="Chờ ghép"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          )
        }
        return null
      },
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="typo-display">Đối soát</h1>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <StatPill count={globalTotal} label=" chuyến" accent />
            <StatPill count={globalMatched} label=" đã ghép" />
            {globalPending > 0 && <StatPill count={globalPending} label=" chờ ghép" />}
            <span
              className="inline-flex items-center gap-1 text-[12px] px-2.5 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
            >
              <DollarSign className="h-3 w-3" style={{ color: 'var(--ink-3)' }} />
              <span className="font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{compactCurrency(globalRevenue)}</span>
            </span>
          </div>
          {trips.length > 0 && <MatchProgressBar pct={globalMatchedPct} />}
        </div>
        <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />
      </header>

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
            <Select value={doiSoatClientId} onValueChange={setDoiSoatClientId}>
              <SelectTrigger className="w-[185px] h-8 text-[12.5px]">
                <SelectValue placeholder="Chọn chủ hàng…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả chủ hàng</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
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
            <Button variant="ghost" onClick={handleAutoMatch} disabled={autoMatching}>
              {autoMatching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Ghép tự động
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
            rowClassName={(t) => t.status === 'MATCHED' ? 'row-matched' : t.status === 'PENDING' ? 'row-pending' : ''}
            empty={
              <div className="py-10">
                <EmptyState
                  icon={<ClipboardList className="h-5 w-5" />}
                  title={
                    search.trim()
                      ? 'Không tìm thấy chuyến'
                      : statusFilter !== 'ALL'
                        ? `Không có chuyến nào "${STATUS_FILTER_LABELS[statusFilter].toLowerCase()}"`
                        : 'Chưa có chuyến nào trong tháng này'
                  }
                  compact
                />
              </div>
            }
          />
          {totalPages > 1 && (
            <div className="flex justify-center py-3" style={{ borderTop: '1px solid var(--line)' }}>
              <Pagination totalPages={totalPages} currentPage={page} onPageChange={setPage} />
            </div>
          )}
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
    </div>
  )
}


