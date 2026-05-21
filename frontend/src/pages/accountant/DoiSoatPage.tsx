import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { Panel } from '@/components/shared/Panel'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Toolbar, ToolbarSearch, ToolbarSpacer } from '@/components/shared/Toolbar'
import { Drawer } from '@/components/shared/Drawer'
import { Pill, type PillVariant } from '@/components/shared/Pill'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui'
import { useMonthParams } from './use-month-params'
import { formatCurrency, getBookedTripStatusBadge, compactCurrency } from '@/data/domain'
import { fuzzyMatch } from '@/lib/search-utils'
import type { BookedTrip } from '@/data/domain'
import {
  useBookedTrips,
  useMatchScores,
  useAutoMatch,
  useAutoMatchConfirm,
  useUnmatch,
} from '@/hooks/use-queries'
import type { AutoMatchCandidate, DeliveredTripMatchScore } from '@/data/domain'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tripRevenue(t: BookedTrip): number {
  return t.revenue ?? 0
}

function formatDate(dateStr: string): string {
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

function statusVariant(badge: ReturnType<typeof getBookedTripStatusBadge>): PillVariant {
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
  const navigate = useNavigate()
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [showAutoMatch, setShowAutoMatch] = useState(false)
  const [showUnmatchFor, setShowUnmatchFor] = useState<number | null>(null)
  const [unmatchReason, setUnmatchReason] = useState('')

  const { data: trips = [], isLoading } = useBookedTrips({ dateFrom, dateTo, pageSize: 500 })
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
  const totalRevenue = useMemo(() => trips.reduce((sum, t) => sum + tripRevenue(t), 0), [trips])
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
        fuzzyMatch(t.partner?.name ?? '', q) ||
        fuzzyMatch(t.pickupLocation?.name ?? '', q) ||
        fuzzyMatch(t.dropoffLocation?.name ?? '', q) ||
        fuzzyMatch(t.vessel ?? '', q) ||
        (t.containers ?? []).some(c => fuzzyMatch(c.containerNumber, q)),
      )
    }

    return rows
  }, [trips, search, statusFilter])

  const columns: Column<BookedTrip>[] = [
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
          {t.partner?.name ?? '—'}
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
      key: 'route',
      header: 'Tuyến',
      render: (t) => (
        <span className="text-[12.5px] truncate block" style={{ color: 'var(--ink-2)', maxWidth: 240 }}>
          {t.pickupLocation?.name ?? '—'} → {t.dropoffLocation?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'containers',
      header: 'Container',
      width: 200,
      hideBelow: 'lg',
      render: (t) => {
        if (!t.containers.length) return <span style={{ color: 'var(--ink-4)' }}>—</span>
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
      key: 'revenue',
      header: 'Doanh thu',
      align: 'right',
      width: 120,
      render: (t) => {
        const r = tripRevenue(t)
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
        const badge = getBookedTripStatusBadge(t.status)
        const score = matchScores.get(t.id)
        return (
          <div className="flex items-center justify-center gap-1.5">
            <Pill variant={statusVariant(badge)} dot={false}>
              {badge.label}
            </Pill>
            {score && score.suggestionCount > 0 && (
              <span
                className="tabular-nums font-bold"
                style={{
                  fontSize: 10.5,
                  padding: '2px 6px',
                  borderRadius: 999,
                  background: 'var(--surface-3)',
                  color: scoreColor(score.bestMatchScore, score.maxScore),
                  fontFamily: 'var(--theme-font-mono)',
                }}
              >
                {Math.round((score.bestMatchScore / score.maxScore) * 100)}%
              </span>
            )}
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
            Chuyến đặt trước
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
            <Button variant="outline" onClick={() => navigate('/accountant/import')}>
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
      {showAutoMatch && (
        <AutoMatchDrawer
          dateFrom={dateFrom}
          dateTo={dateTo}
          onClose={() => setShowAutoMatch(false)}
        />
      )}

      {showUnmatchFor && (
        <UnmatchDrawer
          bookedTripId={showUnmatchFor}
          reason={unmatchReason}
          setReason={setUnmatchReason}
          onConfirm={() => {
            const trip = trips.find(t => t.id === showUnmatchFor)
            if (!trip?.matchedDeliveredTripIds?.length) return
            unmatchMutation.mutate(
              { deliveredTripId: trip.matchedDeliveredTripIds[0], bookedTripId: showUnmatchFor, reason: unmatchReason },
              { onSuccess: () => { setShowUnmatchFor(null); setUnmatchReason('') } },
            )
          }}
          onClose={() => { setShowUnmatchFor(null); setUnmatchReason('') }}
          isPending={unmatchMutation.isPending}
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

// ─── Unmatch drawer ───────────────────────────────────────────────────────────

function UnmatchDrawer({
  bookedTripId,
  reason,
  setReason,
  onConfirm,
  onClose,
  isPending,
}: {
  bookedTripId: number
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
      meta={`Chuyến #${bookedTripId}`}
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
