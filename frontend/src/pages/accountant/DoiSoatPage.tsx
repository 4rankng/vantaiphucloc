import { useState, useMemo } from 'react'
import {
  ClipboardList,
  Zap,
  Unlink,
  Loader2,
  AlertCircle,
  CheckCircle,
  DollarSign,
  CircleCheck,
  Clock,
  Ship,
  Container as ContainerIcon,
} from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { Panel } from '@/components/shared/Panel'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Toolbar, ToolbarSearch, ToolbarSpacer } from '@/components/shared/Toolbar'
import { Drawer } from '@/components/shared/Drawer'
import { Pill, type PillVariant } from '@/components/shared/Pill'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui'
import { MatchSuggestionsPanel } from '@/components/accountant/MatchSuggestionsPanel'
import { useMonthParams } from './use-month-params'
import { formatCurrency, getBookedTripStatusBadge, compactCurrency } from '@/data/domain'
import { fuzzyMatch } from '@/lib/search-utils'
import type { BookedTrip } from '@/data/domain'
import {
  useBookedTrips,
  useMatchScores,
  useAutoMatch,
  useAutoMatchConfirm,
  useReconcile,
  useUnmatch,
} from '@/hooks/use-queries'
import type { AutoMatchCandidate, DeliveredTripMatchScore } from '@/data/domain'

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

export function DoiSoatPage() {
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const [search, setSearch] = useState('')
  const [showAutoMatch, setShowAutoMatch] = useState(false)
  const [showUnmatchFor, setShowUnmatchFor] = useState<number | null>(null)
  const [unmatchReason, setUnmatchReason] = useState('')

  const { data: trips = [], isLoading } = useBookedTrips({ dateFrom, dateTo, pageSize: 500 })
  const { data: matchScoresData } = useMatchScores(dateFrom, dateTo)
  const reconcileMutation = useReconcile()
  const unmatchMutation = useUnmatch()

  const matchScores = useMemo(() => {
    const map = new Map<number, DeliveredTripMatchScore>()
    for (const s of matchScoresData?.scores ?? []) {
      map.set(s.deliveredTripId, s)
    }
    return map
  }, [matchScoresData])

  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return trips
    return trips.filter(t =>
      fuzzyMatch(t.partner?.name ?? '', q) ||
      fuzzyMatch(t.pickupLocation?.name ?? '', q) ||
      fuzzyMatch(t.dropoffLocation?.name ?? '', q) ||
      fuzzyMatch(t.vessel ?? '', q) ||
      (t.containers ?? []).some(c => fuzzyMatch(c.containerNumber, q)),
    )
  }, [trips, search])

  const matchedCount = trips.filter(t => t.status === 'MATCHED').length
  const pendingCount = trips.filter(t => t.status === 'PENDING').length
  const totalRevenue = trips.reduce((sum, t) => sum + tripRevenue(t), 0)
  const matchedPct = trips.length > 0 ? Math.round((matchedCount / trips.length) * 100) : 0

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
      key: 'cont',
      header: 'SL',
      align: 'center',
      width: 48,
      hideBelow: 'md',
      render: (t) => (
        <span className="tabular-nums font-bold" style={{ color: 'var(--ink)' }}>
          {t.containers.length}
        </span>
      ),
    },
    {
      key: 'revenue',
      header: 'Doanh thu',
      align: 'right',
      width: 130,
      render: (t) => {
        const r = tripRevenue(t)
        return (
          <span className="tabular-nums font-bold" style={{ color: 'var(--ink)' }}>
            {r > 0 ? formatCurrency(r) : '—'}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'center',
      width: 160,
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
      width: 88,
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
      <header className="flex items-start justify-between gap-5 flex-wrap">
        <div className="min-w-0">
          <h1 className="typo-display">Đối soát</h1>
          <p className="typo-body-sm mt-1.5">
            Ghép chuyến đã đi với chuyến đặt trước — chạy tự động hoặc xem đề xuất từng chuyến
          </p>
        </div>
        <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
      </header>

      <div className="grid grid-cols-3 gap-3">
        <KpiHeroCard
          label="Tổng chuyến"
          value={trips.length}
          icon={ClipboardList}
          color="blue"
          sublabel={`Đã ghép: ${matchedPct}%`}
        />
        <KpiHeroCard
          label="Đã ghép"
          value={matchedCount}
          icon={CircleCheck}
          color="emerald"
          sublabel={`${pendingCount} chờ ghép`}
        />
        <KpiHeroCard
          label="Doanh thu"
          formattedValue={compactCurrency(totalRevenue)}
          value={totalRevenue}
          icon={DollarSign}
          color="amber"
          sublabel="Kỳ hiện tại"
        />
      </div>

      <Panel
        title="Chuyến đặt trước"
        subtitle={`${filtered.length}/${trips.length} chuyến · ${dateFrom} → ${dateTo}`}
        actions={
          <Button variant="default" onClick={() => setShowAutoMatch(true)}>
            <Zap className="h-4 w-4" />
            Tự động ghép
          </Button>
        }
        flush
      >
        <Toolbar bordered>
          <ToolbarSpacer />
          <ToolbarSearch
            value={search}
            onChange={setSearch}
            placeholder="Tìm chủ hàng, tàu, tuyến, số cont..."
            width={320}
          />
        </Toolbar>

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(t) => t.id}
          isLoading={isLoading}
          minWidth={1100}
          empty={
            <div className="py-10">
              <EmptyState
                icon={<ClipboardList className="h-5 w-5" />}
                title={search.trim() ? 'Không tìm thấy chuyến' : 'Chưa có chuyến nào trong tháng này'}
                compact
              />
            </div>
          }
        />
      </Panel>

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

function AutoMatchDrawer({
  dateFrom,
  dateTo,
  onClose,
}: {
  dateFrom: string
  dateTo: string
  onClose: () => void
}) {
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
          <p className="m-0" style={{ fontFamily: 'var(--theme-font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
            Ghép thành công {defaultCount} cặp
          </p>
        </div>
      )}
    </Drawer>
  )
}

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
