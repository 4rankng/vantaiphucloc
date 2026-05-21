import { useState, useMemo, useRef, useCallback } from 'react'
import {
  ClipboardList,
  Zap,
  Unlink,
  Loader2,
  AlertCircle,
  CheckCircle,
  DollarSign,
  FileSpreadsheet,
  Upload,
  X,
  AlertTriangle,
  Download,
  Camera,
  MapPin,
  Clock,
  User,
  Truck,
  Calendar,
} from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { Panel } from '@/components/shared/Panel'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Toolbar, ToolbarSearch, ToolbarSpacer } from '@/components/shared/Toolbar'
import { Pill, type PillVariant } from '@/components/shared/Pill'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui'
// AutoMatchDrawer removed — auto-match now runs inline
import { ExcelImportDrawer } from '@/components/shared/ExcelImportDrawer'
import { DeliveredTripDetailDrawer } from '@/components/shared/DeliveredTripDetailDrawer'
import { FilterTabs } from '@/components/shared/FilterTabs'
import { StatPill } from '@/components/shared/StatPill'
import { useMonthParams } from './use-month-params'
import { formatCurrency, compactCurrency, OPERATION_TYPE_LABELS } from '@/data/domain'
import { fuzzyMatch } from '@/lib/search-utils'
import type { DeliveredTrip, DeliveredTripStatus } from '@/data/domain'
import {
  useDeliveredTrips,
  useUnmatch,
  useExportDeliveredTripsExcel,
  useAutoMatch,
  useAutoMatchConfirm,
} from '@/hooks/use-queries'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const [, m, d] = dateStr.split('-')
  if (!d) return dateStr
  return `${d}/${m}`
}

function scoreColor(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0
  if (pct >= 0.8) return 'var(--success)'
  if (pct >= 0.5) return 'var(--warning)'
  return 'var(--danger)'
}

function getDeliveredTripStatusBadge(status: DeliveredTripStatus): { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string } {
  switch (status) {
    case 'PENDING': return { variant: 'warning', label: 'Chờ ghép' }
    case 'MATCHED': return { variant: 'success', label: 'Đã ghép' }
    case 'COMPLETED': return { variant: 'success', label: 'Hoàn thành' }
    case 'CANCELLED': return { variant: 'danger', label: 'Huỷ' }
  }
}

function statusVariant(badge: ReturnType<typeof getDeliveredTripStatusBadge>): PillVariant {
  switch (badge.variant) {
    case 'success': return 'success'
    case 'warning': return 'warn'
    case 'danger':  return 'danger'
    case 'info':    return 'info'
    default:        return 'neutral'
  }
}

// ─── Status filter type ───────────────────────────────────────────────────────

type StatusFilter = 'ALL' | 'PENDING' | 'MATCHED'

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  ALL: 'Tất cả',
  PENDING: 'Chờ ghép',
  MATCHED: 'Đã ghép',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MatchProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2.5 mt-2.5">
      <div
        className="flex-1 relative"
        style={{ height: 4, background: 'var(--surface-3)', borderRadius: 999, maxWidth: 240 }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${Math.min(pct, 100)}%`,
            background: pct >= 90 ? 'var(--success, #10b981)' : pct >= 60 ? 'var(--warning, #f59e0b)' : 'var(--accent)',
            borderRadius: 999,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <span className="text-[11.5px] font-semibold tabular-nums" style={{ color: 'var(--ink-2)' }}>
        {pct}% đã ghép
      </span>
    </div>
  )
}



// ─── Main page ────────────────────────────────────────────────────────────────

export function DoiSoatPage() {
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [showImport, setShowImport] = useState(false)
  const [confirmUnmatchId, setConfirmUnmatchId] = useState<number | null>(null)
  const [matchTarget, setMatchTarget] = useState<DeliveredTrip | null>(null)

  const exportExcel = useExportDeliveredTripsExcel()

  const { data: trips = [], isLoading } = useDeliveredTrips({ dateFrom, dateTo })
  const unmatchMutation = useUnmatch()
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

  // Status counts
  const matchedCount = useMemo(() => trips.filter(t => t.status === 'MATCHED').length, [trips])
  const pendingCount = useMemo(() => trips.filter(t => t.status === 'PENDING').length, [trips])
  const totalRevenue = useMemo(() => trips.reduce((sum, t) => sum + (t.revenue ?? 0), 0), [trips])
  const matchedPct = trips.length > 0 ? Math.round((matchedCount / trips.length) * 100) : 0

  const statusCounts: Record<StatusFilter, number> = {
    ALL: trips.length,
    PENDING: pendingCount,
    MATCHED: matchedCount,
  }

  // Filtered rows
  const filtered = useMemo(() => {
    let rows = trips

    // Status filter
    if (statusFilter === 'PENDING') rows = rows.filter(t => t.status === 'PENDING')
    else if (statusFilter === 'MATCHED') rows = rows.filter(t => t.status === 'MATCHED')

    // Text search
    const q = search.trim()
    if (q) {
      rows = rows.filter(t =>
        fuzzyMatch(t.client?.name ?? '', q) ||
        fuzzyMatch(t.pickupLocation?.name ?? '', q) ||
        fuzzyMatch(t.dropoffLocation?.name ?? '', q) ||
        fuzzyMatch(t.vessel ?? '', q) ||
        fuzzyMatch(t.vehicle?.plate ?? '', q) ||
        (t.containers ?? []).some(c => fuzzyMatch(c.containerNumber, q)),
      )
    }

    return rows
  }, [trips, search, statusFilter])

  const columns: Column<DeliveredTrip>[] = [
    {
      key: 'date',
      header: 'Ngày đi',
      width: 64,
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
      render: (t) => (
        <span className="text-[13px] truncate block" style={{ color: 'var(--ink-2)' }}>
          {t.vessel || '—'}
        </span>
      ),
    },
    {
      key: 'pickup',
      header: 'Điểm đi',
      render: (t) => (
        <span className="text-[12.5px] truncate block" style={{ color: 'var(--ink-2)' }}>
          {t.pickupLocation?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'dropoff',
      header: 'Điểm đến',
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
              <div className="flex items-center justify-end gap-1.5">
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
                  className="text-[11px] font-semibold px-2 py-1 rounded"
                  style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}
                >
                  {unmatchMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmUnmatchId(null) }}
                  className="text-[11px] font-medium px-2 py-1 rounded"
                  style={{ color: 'var(--ink-3)' }}
                >
                  Huỷ
                </button>
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
            <StatPill count={trips.length} label=" chuyến" accent />
            <StatPill count={matchedCount} label=" đã ghép" />
            {pendingCount > 0 && <StatPill count={pendingCount} label=" chờ ghép" />}
            <span
              className="inline-flex items-center gap-1 text-[12px] px-2.5 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
            >
              <DollarSign className="h-3 w-3" style={{ color: 'var(--ink-3)' }} />
              <span className="font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{compactCurrency(totalRevenue)}</span>
            </span>
          </div>
          {trips.length > 0 && <MatchProgressBar pct={matchedPct} />}
        </div>
        <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
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
            <Button
              variant="ghost"
              onClick={() => exportExcel.mutate(
                { dateFrom, dateTo },
                { onSuccess: (blob) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'doi-soat.xlsx'; a.click(); URL.revokeObjectURL(url) } },
              )}
              disabled={exportExcel.isPending}
            >
              {exportExcel.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Xuất Excel
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


