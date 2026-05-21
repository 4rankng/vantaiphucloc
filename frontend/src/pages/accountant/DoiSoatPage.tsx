import { useState, useMemo, useRef, useCallback } from 'react'
import {
  ClipboardList,
  Zap,
  Unlink,
  Loader2,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Ship,
  FileSpreadsheet,
  Upload,
  X,
  AlertTriangle,
  Download,
} from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { Panel } from '@/components/shared/Panel'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Toolbar, ToolbarSearch, ToolbarSpacer } from '@/components/shared/Toolbar'
import { Drawer } from '@/components/shared/Drawer'
import { Pill, type PillVariant } from '@/components/shared/Pill'
import { EmptyState } from '@/components/shared/EmptyState'
import { StepIndicator } from '@/components/shared/StepIndicator'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { Button } from '@/components/ui'
import { useMonthParams } from './use-month-params'
import { formatCurrency, compactCurrency } from '@/data/domain'
import { fuzzyMatch } from '@/lib/search-utils'
import type { DeliveredTrip, DeliveredTripStatus } from '@/data/domain'
import {
  useDeliveredTrips,
  useMatchScores,
  useAutoMatch,
  useAutoMatchConfirm,
  useUnmatch,
  useBulkImportAndMatch,
  useAIParsePreview,
  useClients,
  useSuggestMatches,
  useReconcile,
  useExportDeliveredTripsExcel,
} from '@/hooks/use-queries'
import type { AutoMatchCandidate, DeliveredTripMatchScore } from '@/data/domain'
import type { DuplicateGroup } from '@/services/api/deliveredTrips.api'

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

function StatPill({ count, label, accent }: { count: number | string; label: string; accent?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium"
      style={{
        background: accent ? 'var(--accent-soft)' : 'var(--surface-3)',
        color: accent ? 'var(--accent)' : 'var(--ink-2)',
      }}
    >
      <span className="tabular-nums font-bold" style={{ color: accent ? 'var(--accent)' : 'var(--ink)' }}>
        {count}
      </span>
      {label}
    </span>
  )
}

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

function StatusFilterTabs({
  value,
  onChange,
  counts,
}: {
  value: StatusFilter
  onChange: (v: StatusFilter) => void
  counts: Record<StatusFilter, number>
}) {
  const filters: StatusFilter[] = ['ALL', 'PENDING', 'MATCHED']
  return (
    <div
      className="flex items-center"
      style={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-sm, 8px)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {filters.map((f, i) => {
        const active = value === f
        return (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f)}
            className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 transition-colors"
            style={{
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? '#fff' : 'var(--ink-2)',
              borderRight: i < filters.length - 1 ? '1px solid var(--line)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {STATUS_FILTER_LABELS[f]}
            <span
              className="tabular-nums text-[10.5px] font-bold px-1.5 py-0 rounded-full"
              style={{
                background: active ? 'rgba(255,255,255,0.25)' : 'var(--surface-3)',
                color: active ? '#fff' : 'var(--ink-3)',
                minWidth: 18,
                textAlign: 'center',
              }}
            >
              {counts[f]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function DoiSoatPage() {
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [showAutoMatch, setShowAutoMatch] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showUnmatchFor, setShowUnmatchFor] = useState<number | null>(null)
  const [unmatchReason, setUnmatchReason] = useState('')
  const [matchTarget, setMatchTarget] = useState<DeliveredTrip | null>(null)

  const exportExcel = useExportDeliveredTripsExcel()

  const { data: trips = [], isLoading } = useDeliveredTrips({ dateFrom, dateTo })
  const { data: matchScoresData } = useMatchScores(dateFrom, dateTo)
  const unmatchMutation = useUnmatch()

  const matchScores = useMemo(() => {
    const map = new Map<number, DeliveredTripMatchScore>()
    for (const s of matchScoresData?.scores ?? []) {
      map.set(s.deliveredTripId, s)
    }
    return map
  }, [matchScoresData])

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
      header: 'Ngày',
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
      render: (t) => (
        <span className="text-[13px] font-semibold truncate block" style={{ color: 'var(--ink)' }}>
          {t.client?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'containers',
      header: 'Container',
      width: 200,
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
              {first.contType}
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
      key: 'route',
      header: 'Tuyến',
      render: (t) => (
        <span className="text-[12.5px] truncate block" style={{ color: 'var(--ink-2)', maxWidth: 240 }}>
          {t.pickupLocation?.name ?? '—'} → {t.dropoffLocation?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'vessel',
      header: 'Số tàu',
      width: 140,
      hideBelow: 'md',
      render: (t) =>
        t.vessel ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--ink-2)' }}>
            <Ship className="h-3 w-3 shrink-0" style={{ color: 'var(--ink-3)' }} />
            <span className="truncate" style={{ maxWidth: 110 }}>{t.vessel}</span>
          </span>
        ) : (
          <span style={{ color: 'var(--ink-4)' }}>—</span>
        ),
    },
    {
      key: 'revenue',
      header: 'Doanh thu',
      align: 'right',
      width: 120,
      render: (t) => {
        const r = t.revenue ?? 0
        return (
          <span className="tabular-nums font-bold text-[13px]" style={{ color: 'var(--ink)' }}>
            {r > 0 ? compactCurrency(r) : '—'}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'center',
      width: 150,
      render: (t) => {
        const badge = getDeliveredTripStatusBadge(t.status)
        return (
          <div className="flex items-center justify-center gap-1.5">
            <Pill variant={statusVariant(badge)} dot={false}>
              {badge.label}
            </Pill>
          </div>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 48,
      render: (t) => (
        <div className="flex items-center justify-end gap-1">
          {t.status === 'MATCHED' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowUnmatchFor(t.id); setUnmatchReason('') }}
              className="nepo-row-action"
              aria-label="Bỏ ghép"
              title="Bỏ ghép"
              style={{ color: 'var(--danger)' }}
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
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
        {/* Section header */}
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: 'var(--ink-2)' }}><ClipboardList className="h-4 w-4" /></span>
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            Chuyến đã đi
          </h2>
          <span
            className="tabular-nums text-[11.5px] font-semibold rounded-full px-2 py-0.5"
            style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
          >
            {filtered.length}
          </span>
          {filtered.length !== trips.length && (
            <span className="text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
              / {trips.length}
            </span>
          )}
        </div>

        <Panel flush>
          <Toolbar bordered>
            <StatusFilterTabs value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
            <ToolbarSpacer />
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
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Nhập Excel
            </Button>
            <Button variant="default" onClick={() => setShowAutoMatch(true)}>
              <Zap className="h-3.5 w-3.5" />
              Tự động ghép
            </Button>
            <ToolbarSearch
              value={search}
              onChange={setSearch}
              placeholder="Tìm chủ hàng, tàu, tuyến, cont…"
              width={260}
            />
          </Toolbar>

          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(t) => t.id}
            isLoading={isLoading}
            minWidth={1000}
            onRowClick={(t) => { if (t.status === 'PENDING') setMatchTarget(t) }}
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

      {showAutoMatch && (
        <AutoMatchDrawer
          dateFrom={dateFrom}
          dateTo={dateTo}
          onClose={() => setShowAutoMatch(false)}
        />
      )}

      {showUnmatchFor && (
        <UnmatchDrawer
          deliveredTripId={showUnmatchFor}
          reason={unmatchReason}
          setReason={setUnmatchReason}
          onConfirm={() => {
            const trip = trips.find(t => t.id === showUnmatchFor)
            if (!trip) return
            unmatchMutation.mutate(
              { deliveredTripId: trip.id, bookedTripId: showUnmatchFor, reason: unmatchReason },
              { onSuccess: () => { setShowUnmatchFor(null); setUnmatchReason('') } },
            )
          }}
          onClose={() => { setShowUnmatchFor(null); setUnmatchReason('') }}
          isPending={unmatchMutation.isPending}
        />
      )}

      {matchTarget && (
        <MatchDrawer
          trip={matchTarget}
          onClose={() => setMatchTarget(null)}
        />
      )}
    </div>
  )
}

// ─── Auto-match drawer ────────────────────────────────────────────────────────

function AutoMatchDrawer({ dateFrom, dateTo, onClose }: { dateFrom: string; dateTo: string; onClose: () => void }) {
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
      .filter(c => c.suggestedDefault)
      .map(c => ({ deliveredTripId: c.deliveredTripId, bookedTripId: c.bookedTripId }))
    if (pairs.length === 0) return
    confirmMutation.mutate(pairs, { onSuccess: () => setConfirmed(true) })
  }

  const defaultCount = candidates.filter(c => c.suggestedDefault).length
  const showInitial = candidates.length === 0 && !autoMatch.isPending && !confirmed

  return (
    <Drawer
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb="Đối soát"
      title="Tự động ghép nối"
      meta={`Kỳ ${dateFrom} → ${dateTo}`}
      footer={
        confirmed ? (
          <Button variant="default" onClick={onClose}>Xong</Button>
        ) : candidates.length > 0 ? (
          <>
            <Button variant="ghost" onClick={onClose}>Huỷ</Button>
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
            <Button variant="ghost" onClick={onClose}>Huỷ</Button>
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
          <p className="text-[13px] m-0" style={{ color: 'var(--ink-2)' }}>Đang quét và đề xuất...</p>
        </div>
      )}

      {candidates.length > 0 && !confirmed && (
        <div className="space-y-3">
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5"
            style={{ background: 'var(--success-soft)', borderRadius: 'var(--r-sm)', color: 'var(--success)' }}
          >
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span className="text-[13px]">
              Tìm thấy <strong>{candidates.length}</strong> cặp, <strong>{defaultCount}</strong> cặp được đề xuất ghép tự động
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
                    <Pill variant="success" dot={false}>Đề xuất</Pill>
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
            style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-soft)', color: 'var(--success)' }}
          >
            <CheckCircle className="h-7 w-7" strokeWidth={2.25} />
          </div>
          <p className="m-0 text-[18px] font-bold" style={{ letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Ghép thành công {defaultCount} cặp
          </p>
        </div>
      )}
    </Drawer>
  )
}

// ─── Excel import drawer ──────────────────────────────────────────────────────

type ImportStep = 'upload' | 'preview' | 'done'

const IMPORT_STEPS = [
  { label: 'Nhập file' },
  { label: 'Soát duyệt' },
  { label: 'Lưu dữ liệu' },
]

function stepIndex(step: ImportStep): number {
  return step === 'upload' ? 0 : step === 'preview' ? 1 : 2
}

interface PreviewRow { [key: string]: unknown }

function ExcelImportDrawer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [clientId, setClientId] = useState('')
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [previewColumns, setPreviewColumns] = useState<string[]>([])
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const { data: clients = [] } = useClients()
  const bulkImport = useBulkImportAndMatch()
  const aiPreview = useAIParsePreview()

  const handleFileSelect = useCallback((f: File | null) => {
    if (!f) return
    setFile(f)
    setError(null)
  }, [])

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    dropRef.current?.classList.add('is-dragging')
  }
  function handleDragLeave() {
    dropRef.current?.classList.remove('is-dragging')
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    dropRef.current?.classList.remove('is-dragging')
    handleFileSelect(e.dataTransfer.files?.[0] ?? null)
  }

  function handlePreview() {
    if (!file) return
    setError(null)
    aiPreview.mutate({ file }, {
      onSuccess: (data) => {
        const cols = (data as { columns?: string[] }).columns ?? []
        const rows = (data as { rows?: PreviewRow[] }).rows ?? []
        const dups = (data as { duplicateGroups?: DuplicateGroup[] }).duplicateGroups ?? []
        const warns = (data as { warnings?: string[] }).warnings ?? []
        setPreviewColumns(cols)
        setPreviewData(rows)
        setDuplicateGroups(dups)
        setPreviewWarnings(warns)
        // Auto-detect client from "Chủ hàng" column
        if (!clientId) {
          const uniqueClients = [...new Set(rows.map(r => String(r['Chủ hàng'] ?? '').trim()).filter(Boolean))]
          if (uniqueClients.length === 1) {
            const code = uniqueClients[0].toUpperCase()
            const match = clients.find(c =>
              c.code?.toUpperCase() === code ||
              c.name.toUpperCase().split(/\s+/)[0] === code
            )
            if (match) setClientId(String(match.id))
          }
        }
        setStep('preview')
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi phân tích file'),
    })
  }

  function handleImport() {
    if (!file) return
    setError(null)
    bulkImport.mutate(
      { file, clientId: clientId ? Number(clientId) : undefined },
      {
        onSuccess: () => setStep('done'),
        onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi import'),
      },
    )
  }

  function handleReset() {
    setStep('upload')
    setFile(null)
    setClientId('')
    setPreviewData([])
    setPreviewColumns([])
    setDuplicateGroups([])
    setPreviewWarnings([])
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const previewCols = previewColumns.length > 0 ? previewColumns : []

  // Build a map of row index → duplicate type for highlighting
  const duplicateRowMap = useMemo(() => {
    const map = new Map<number, 'exact' | 'fuzzy' | 'digits'>()
    for (const g of duplicateGroups) {
      for (const idx of g.rowIndices) {
        if (!map.has(idx)) map.set(idx, g.type)
      }
    }
    return map
  }, [duplicateGroups])

  const footer = step === 'upload' ? (
    <>
      <Button variant="ghost" onClick={onClose}>Huỷ</Button>
      <Button variant="default" onClick={handlePreview} disabled={!file || aiPreview.isPending}>
        {aiPreview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {aiPreview.isPending ? 'Đang phân tích...' : 'Xem trước'}
      </Button>
    </>
  ) : step === 'preview' ? (
    <>
      {clientId ? (
        <span
          className="text-[12px] font-medium px-2.5 py-1 rounded-full mr-auto"
          style={{ background: 'var(--success-soft)', color: 'var(--success)' }}
        >
          {clients.find(c => String(c.id) === clientId)?.name ?? 'Chủ hàng'} ✓
        </span>
      ) : (
        <InlineSelect
          placeholder="Chọn chủ hàng"
          value={clientId}
          options={clients.map(c => ({ value: String(c.id), label: c.name }))}
          onChange={setClientId}
          className="mr-auto"
          style={{ minWidth: 180, borderColor: 'var(--warning)' }}
        />
      )}
      <Button variant="ghost" onClick={() => { setStep('upload'); setPreviewData([]); setPreviewColumns([]) }}>Quay lại</Button>
      <Button variant="default" onClick={handleImport} disabled={bulkImport.isPending || !clientId}>
        {bulkImport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
        {bulkImport.isPending ? 'Đang lưu...' : 'Lưu dữ liệu'}
      </Button>
    </>
  ) : (
    <>
      <Button variant="ghost" onClick={handleReset}>Nhập file khác</Button>
      <Button variant="default" onClick={onClose}>Xong</Button>
    </>
  )

  return (
    <Drawer
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb="Đối soát"
      title="Nhập Excel"
      width="80vw"
      footer={footer}
    >
      {/* Step indicator */}
      <div className="mb-6">
        <StepIndicator steps={IMPORT_STEPS} current={stepIndex(step)} />
      </div>

      {/* ── Upload step ── */}
      {step === 'upload' && (
        <div className="space-y-5">
          {/* File area */}
          <div>
            <label className="nepo-field-label">File Excel</label>

            {/* File chip — shown when file selected */}
            {file && (
              <div
                className="flex items-center gap-2.5 px-3 py-2 mb-3"
                style={{ background: 'var(--accent-soft)', borderRadius: 'var(--r-sm)', border: '1px solid var(--accent)' }}
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold truncate m-0" style={{ color: 'var(--ink)' }}>{file.name}</p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>
                    {(file.size / 1024).toFixed(1)} KB · xlsx / xls / csv
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="grid place-items-center rounded-md"
                  style={{ width: 24, height: 24, color: 'var(--ink-3)' }}
                  aria-label="Xoá file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Drop zone — only shown when no file is selected */}
            {!file && (
              <div
                ref={dropRef}
                onClick={() => fileRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="nepo-dropzone"
                style={{ minHeight: 130 }}
              >
                <Upload className="h-7 w-7 mb-2" style={{ color: 'var(--ink-3)' }} strokeWidth={1.5} />
                <p className="text-[13.5px] font-semibold m-0" style={{ color: 'var(--ink)' }}>
                  Kéo & thả file vào đây
                </p>
                <p className="text-[12px] m-0 mt-1" style={{ color: 'var(--ink-3)' }}>
                  hoặc nhấn để chọn từ máy · .xlsx .xls .csv
                </p>
              </div>
            )}
            {file && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[12px] font-medium"
                style={{ color: 'var(--accent)' }}
              >
                Thay bằng file khác
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </div>

          {error && (
            <div
              className="flex items-start gap-2.5 px-3.5 py-3"
              style={{ background: 'var(--danger-soft)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13 }}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Preview step ── */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Duplicate warning banner */}
          {previewWarnings.length > 0 && (
            <div
              className="flex items-start gap-2.5 px-3.5 py-3"
              style={{ background: 'var(--warning-soft)', borderRadius: 'var(--r-sm)', color: 'var(--warning)', fontSize: 13 }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                {previewWarnings.map((w, i) => <p key={i} className="m-0 font-semibold">{w}</p>)}
                {duplicateGroups.length > 0 && (
                  <ul className="m-0 mt-1.5 pl-4 space-y-0.5" style={{ listStyle: 'disc' }}>
                    {duplicateGroups.map((g, i) => (
                      <li key={i} className="text-[12px]" style={{ opacity: 0.9 }}>{g.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          {/* Summary row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
              {file?.name}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
            >
              {previewData.length} dòng · {previewCols.length} cột
            </span>
            {previewData.length > 20 && (
              <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                (hiển thị 20 dòng đầu)
              </span>
            )}
          </div>

          {/* Preview table */}
          {previewData.length === 0 ? (
            <p className="text-[13px] text-center py-8" style={{ color: 'var(--ink-3)' }}>Không có dữ liệu</p>
          ) : (
            <div
              className="nepo-table-scroll"
              style={{
                
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-sm)',
                overflow: 'auto',
              }}
            >
              <table className="nepo-table w-full" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    {previewCols.map(key => (
                      <th key={key} className="text-left">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 20).map((row, i) => {
                    const dupType = duplicateRowMap.get(i)
                    const rowBg = dupType === 'exact'
                      ? 'var(--danger-soft)'
                      : dupType === 'fuzzy'
                        ? 'var(--warning-soft)'
                        : dupType === 'digits'
                          ? 'color-mix(in srgb, var(--accent-soft) 60%, white)'
                          : undefined
                    return (
                    <tr key={i} style={rowBg ? { background: rowBg } : undefined}>
                      <td>
                        <span className="tabular-nums text-[12px]" style={{ color: 'var(--ink-3)' }}>
                          {dupType ? <AlertTriangle className="inline h-3 w-3 mr-0.5" style={{ color: dupType === 'exact' ? 'var(--danger)' : 'var(--warning)' }} /> : null}
                          {i + 1}
                        </span>
                      </td>
                      {previewCols.map((key) => {
                        const val = row[key]
                        return (
                          <td key={key}>
                            <span style={{ color: val == null ? 'var(--ink-3)' : 'var(--ink-2)', fontSize: 12.5 }}>
                              {val != null ? String(val) : '—'}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[12px] m-0" style={{ color: 'var(--ink-3)' }}>
            Dữ liệu sẽ được nhập và tự động ghép với chuyến đã đi sau khi xác nhận.
          </p>

          {error && (
            <div
              className="flex items-start gap-2.5 px-3.5 py-3"
              style={{ background: 'var(--danger-soft)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13 }}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Done step ── */}
      {step === 'done' && (
        <div className="flex flex-col items-center text-center py-10">
          <div
            className="grid place-items-center mb-5"
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--success-soft)',
              color: 'var(--success)',
              boxShadow: '0 0 0 8px color-mix(in srgb, var(--success-soft) 50%, transparent)',
            }}
          >
            <CheckCircle className="h-9 w-9" strokeWidth={1.75} />
          </div>
          <h3 className="m-0 text-[18px] font-bold" style={{ letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Nhập thành công
          </h3>
          <p className="m-0 mt-2 max-w-sm text-[13px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            Dữ liệu từ{' '}
            <span className="font-semibold font-mono" style={{ color: 'var(--ink)' }}>{file?.name ?? 'file'}</span>{' '}
            đã được nhập và tự động ghép với chuyến đã đi.
          </p>
        </div>
      )}
    </Drawer>
  )
}

// ─── Unmatch drawer ───────────────────────────────────────────────────────────

function UnmatchDrawer({
  deliveredTripId,
  reason,
  setReason,
  onConfirm,
  onClose,
  isPending,
}: {
  deliveredTripId: number
  reason: string
  setReason: (r: string) => void
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
}) {
  return (
    <Drawer
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb="Đối soát"
      title="Bỏ ghép chuyến"
      meta={`Chuyến #${deliveredTripId}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            <Unlink className="h-4 w-4" />
            {isPending ? 'Đang xử lý...' : 'Bỏ ghép'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          className="flex items-start gap-2.5 px-3.5 py-3"
          style={{ background: 'var(--warning-soft)', borderRadius: 'var(--r-sm)', color: 'var(--warning)' }}
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-[13px] m-0">
            Bỏ ghép sẽ tách chuyến đã đi khỏi chuyến đặt trước này. Bạn có thể ghép lại sau.
          </p>
        </div>

        <div>
          <label className="nepo-field-label" htmlFor="unmatch-reason">Lý do bỏ ghép</label>
          <input
            id="unmatch-reason"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Nhập lý do..."
            className="nepo-input"
            autoFocus
          />
        </div>
      </div>
    </Drawer>
  )
}

// ─── Match drawer (click-to-match for PENDING trips) ──────────────────────────

function MatchDrawer({ trip, onClose }: { trip: DeliveredTrip; onClose: () => void }) {
  const { data: suggestionsData, isLoading: suggestionsLoading } = useSuggestMatches(trip.id)
  const reconcile = useReconcile()
  const [matchingId, setMatchingId] = useState<number | null>(null)

  const suggestions = suggestionsData?.suggestions ?? []

  function handleMatch(bookedTripId: number) {
    setMatchingId(bookedTripId)
    reconcile.mutate(
      { deliveredTripId: trip.id, bookedTripId },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <Drawer
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb="Đối soát"
      title="Ghép chuyến"
      meta={`${trip.client?.name ?? ''} · ${trip.containers?.[0]?.containerNumber ?? `#${trip.id}`}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Trip summary */}
        <div
          className="px-3.5 py-2.5"
          style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-3 flex-wrap text-[13px]">
            <span className="tabular-nums" style={{ color: 'var(--ink-2)', fontFamily: 'var(--theme-font-mono)' }}>
              {formatDate(trip.tripDate)}
            </span>
            <span style={{ color: 'var(--ink-3)' }}>·</span>
            <span style={{ color: 'var(--ink)' }}>
              {trip.pickupLocation?.name ?? '—'} → {trip.dropoffLocation?.name ?? '—'}
            </span>
            {trip.vessel && (
              <>
                <span style={{ color: 'var(--ink-3)' }}>·</span>
                <span style={{ color: 'var(--ink-2)' }}>{trip.vessel}</span>
              </>
            )}
          </div>
        </div>

        {/* Loading */}
        {suggestionsLoading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--accent)' }} />
            <p className="text-[13px] m-0" style={{ color: 'var(--ink-2)' }}>Đang tìm chuyến phù hợp...</p>
          </div>
        )}

        {/* No suggestions */}
        {!suggestionsLoading && suggestions.length === 0 && (
          <div className="flex flex-col items-center py-8">
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" />}
              title="Không tìm thấy chuyến phù hợp"
              compact
            />
          </div>
        )}

        {/* Suggestions list */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[12px] m-0" style={{ color: 'var(--ink-3)' }}>
              {suggestions.length} chuyến đặt trước phù hợp
            </p>
            {suggestions.map((s) => {
              const bt = s.bookedTrip
              const pct = s.maxScore > 0 ? Math.round((s.matchScore / s.maxScore) * 100) : 0
              const isMatching = matchingId === bt.id && reconcile.isPending
              return (
                <div
                  key={`${bt.id}-${s.containerId}`}
                  className="flex items-center justify-between gap-3 px-3.5 py-3"
                  style={{
                    background: pct >= 80 ? 'var(--success-soft)' : pct >= 60 ? 'var(--warning-soft)' : 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-sm)',
                  }}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-[13px]">
                      <span
                        className="tabular-nums font-bold"
                        style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--ink)' }}
                      >
                        {bt.containers?.[0]?.containerNumber ?? '—'}
                      </span>
                      {bt.containers?.[0]?.contType && (
                        <span
                          className="text-[10.5px] uppercase font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
                        >
                          {bt.containers[0].contType}
                        </span>
                      )}
                      <span
                        className="tabular-nums font-bold"
                        style={{ color: scoreColor(s.matchScore, s.maxScore), fontSize: 12 }}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--ink-2)' }}>
                      <span>{bt.partner?.name ?? '—'}</span>
                      <span style={{ color: 'var(--ink-3)' }}>·</span>
                      <span>{bt.pickupLocation?.name ?? '—'} → {bt.dropoffLocation?.name ?? '—'}</span>
                      {bt.vessel && (
                        <>
                          <span style={{ color: 'var(--ink-3)' }}>·</span>
                          <span>{bt.vessel}</span>
                        </>
                      )}
                    </div>
                    {/* Criteria dots */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {s.criteria.map((c) => (
                        <span
                          key={c.name}
                          title={`${c.label}: ${c.match ? 'Khớp' : 'Không khớp'}`}
                          className="inline-block rounded-full"
                          style={{
                            width: 8,
                            height: 8,
                            background: c.match ? 'var(--success)' : c.fuzzy ? 'var(--warning)' : 'var(--surface-3)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    variant={pct >= 80 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleMatch(bt.id)}
                    disabled={isMatching}
                    style={{ flexShrink: 0 }}
                  >
                    {isMatching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Ghép
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Drawer>
  )
}
