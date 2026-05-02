import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useWorkOrders,
  useTripOrders,
  useDashboardSummary,
} from '@/hooks/use-queries'
import { useIsMobile } from '@/hooks/use-mobile'
import { useMonthParams } from './use-month-params'
import { formatCurrencyFull, type WorkOrder, type TripOrder } from '@/data/domain'
import {
  Sparkles, ArrowRight, Clock, ChevronLeft, ChevronRight,
  CheckCircle2, Plus, Link2, Wallet, Tag, Users, MapPin,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => formatCurrencyFull(n)

function fmtShortDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function resolveRoute(wo: WorkOrder | TripOrder): string {
  const parts = wo.route.split(' - ')
  const from = wo.pickupLocation || parts[0] || wo.route
  const to   = wo.dropoffLocation || parts[1] || null
  return to ? `${from} → ${to}` : from
}

/** Aggregate container types for a WorkOrder: "F20 × 2" */
function typeLabel(wo: WorkOrder): string {
  const map: Record<string, number> = {}
  wo.containers.forEach(c => { map[c.workType] = (map[c.workType] ?? 0) + 1 })
  return Object.entries(map).map(([t, n]) => n > 1 ? `${t} × ${n}` : t).join(', ')
}

// ─── Period switcher ──────────────────────────────────────────────────────────

function PeriodSwitcher({ label, sublabel, onPrev, onNext }: {
  label: string; sublabel?: string; onPrev: () => void; onNext: () => void
}) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-xl border px-2 py-1.5"
      style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
    >
      <button onClick={onPrev} className="flex h-7 w-7 items-center justify-center rounded-lg transition active:scale-90" style={{ color: 'var(--theme-text-primary)' }}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="text-center">
        <p className="text-sm font-semibold font-display tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{label}</p>
        {sublabel && <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{sublabel}</p>}
      </div>
      <button onClick={onNext} className="flex h-7 w-7 items-center justify-center rounded-lg transition active:scale-90" style={{ color: 'var(--theme-text-primary)' }}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
    >
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
      <p className="text-lg font-bold font-display tabular-nums leading-tight" style={{ color: color ?? 'var(--theme-text-primary)' }}>
        {value}
      </p>
    </div>
  )
}

// ─── Trip order card (left column) ───────────────────────────────────────────

function TripCard({ trip, onClick }: { trip: TripOrder; onClick: () => void }) {
  const isPending  = trip.status === 'PENDING' || trip.status === 'DRAFT'
  const isConfirmed = trip.isConfirmed

  // Aggregate container types
  const types = trip.containers.length > 0
    ? (() => {
        const map: Record<string, number> = {}
        trip.containers.forEach(c => { map[c.workType] = (map[c.workType] ?? 0) + 1 })
        return Object.entries(map).map(([t, n]) => n > 1 ? `${t} × ${n}` : t).join(' ')
      })()
    : trip.workType ?? ''

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border p-4 transition hover:shadow-sm active:scale-[0.99] touch-manipulation"
      style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
    >
      {/* Row 1: trip id + type | status */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
            T0-{String(trip.id).padStart(4, '0')}
          </span>
          {types && (
            <span
              className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold"
              style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
            >
              {types}
            </span>
          )}
        </div>
        {isPending ? (
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
            style={{ background: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)', border: '1px solid var(--theme-status-warning)' }}
          >
            <Clock className="h-3 w-3" /> Chờ ghép
          </span>
        ) : isConfirmed ? (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
            style={{ background: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)' }}
          >
            Đã chốt
          </span>
        ) : (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
          >
            Đã ghép
          </span>
        )}
      </div>

      {/* Client name */}
      <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--theme-text-primary)' }}>
        {trip.clientName}
      </p>

      {/* Route */}
      <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
        {resolveRoute(trip)}
      </p>

      {/* Divider */}
      <div className="mt-3 pt-2.5 flex items-center justify-between" style={{ borderTop: '1px solid var(--surface-border)' }}>
        <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          {trip.driverName ?? '—'}
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
          {fmt(trip.revenue ?? 0)}
        </span>
      </div>
    </button>
  )
}

// ─── Match suggestion card (middle column) ────────────────────────────────────

function MatchCard({ wo, trips, onMatch }: {
  wo: WorkOrder
  trips: TripOrder[]
  onMatch: (woId: number) => void
}) {
  // Find best candidate trip by route similarity
  const candidate = useMemo(() => {
    const woRoute = wo.route.toLowerCase()
    const woClient = wo.clientName.toLowerCase()
    // Score: same client + same route = best
    return trips
      .filter(t => t.status === 'DRAFT' || t.status === 'PENDING')
      .map(t => {
        let score = 0
        if (t.clientName.toLowerCase() === woClient) score += 50
        if (t.route.toLowerCase() === woRoute) score += 30
        if (t.driverId === wo.driverId) score += 20
        return { trip: t, score }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)[0] ?? null
  }, [wo, trips])

  const reasons: string[] = []
  if (candidate) {
    if (candidate.trip.clientName.toLowerCase() === wo.clientName.toLowerCase()) reasons.push('cùng khách')
    if (candidate.trip.route.toLowerCase() === wo.route.toLowerCase()) reasons.push('cùng tuyến')
    if (candidate.trip.driverId === wo.driverId) reasons.push('cùng tài xế')
  }

  const scorePercent = candidate ? Math.min(100, candidate.score) : 0
  const scoreColor = scorePercent >= 80
    ? 'var(--theme-status-success)'
    : scorePercent >= 50
      ? 'var(--theme-status-warning)'
      : 'var(--theme-text-muted)'

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
    >
      {/* WO ↔ Trip header */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
          WO-{String(wo.id).padStart(4, '0')}
        </span>
        <Link2 className="h-3 w-3 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
          {candidate ? `T0-${String(candidate.trip.id).padStart(4, '0')}` : '—'}
        </span>
        {candidate && (
          <span
            className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
            style={{ background: `color-mix(in srgb, ${scoreColor} 15%, transparent)`, color: scoreColor }}
          >
            {scorePercent}%
          </span>
        )}
      </div>

      {/* Reason */}
      {reasons.length > 0 && (
        <p className="text-xs mb-3" style={{ color: 'var(--theme-text-muted)' }}>
          {reasons.join(' · ')}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onMatch(wo.id)}
          className="flex-1 rounded-xl py-2 text-xs font-bold transition hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          Xác nhận ghép
        </button>
        <button
          className="rounded-xl border px-4 py-2 text-xs font-medium transition hover:opacity-70"
          style={{ borderColor: 'var(--surface-border)', color: 'var(--theme-text-muted)' }}
        >
          Bỏ qua
        </button>
      </div>
    </div>
  )
}

// ─── Unmatched WO row (right column) ─────────────────────────────────────────

function UnmatchedRow({ wo, onClick }: { wo: WorkOrder; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:shadow-sm active:scale-[0.99] touch-manipulation"
      style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
    >
      {/* Container count badge */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold"
        style={{
          background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)',
          color: 'var(--theme-brand-primary)',
        }}
      >
        {wo.containers.length}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-mono text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            WO-{String(wo.id).padStart(4, '0')}
          </span>
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
            style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
          >
            {typeLabel(wo)}
          </span>
          {wo.status === 'PENDING' && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' }}
            >
              cần soát
            </span>
          )}
        </div>
        <p className="truncate text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
          {wo.driverName}
        </p>
        <p className="truncate text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          {resolveRoute(wo)}
        </p>
      </div>

      {/* Date */}
      <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>
        {fmtShortDate(wo.createdAt)}
      </span>
    </button>
  )
}

// ─── Desktop dashboard ────────────────────────────────────────────────────────

function DesktopDashboard() {
  const navigate = useNavigate()
  const { year, month, dateFrom, dateTo, sublabel, onPrev, onNext } = useMonthParams()

  const { data: workOrders = [] } = useWorkOrders({ dateFrom, dateTo })
  const { data: trips = [] } = useTripOrders({ dateFrom, dateTo })
  const { data: summary } = useDashboardSummary()

  const pendingWOs = useMemo(() => workOrders.filter(w => w.status === 'PENDING'), [workOrders])
  const totalDriverSalary = useMemo(() => workOrders.reduce((s, w) => s + (w.earning ?? 0), 0), [workOrders])
  const revenue = summary?.totalRevenue ?? trips.reduce((s, t) => s + (t.revenue ?? 0), 0)

  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [trips],
  )

  const unmatchedWOs = useMemo(
    () => workOrders.filter(w => w.status !== 'MATCHED' && w.status !== 'COMPLETED').slice(0, 10),
    [workOrders],
  )

  const matchCandidates = useMemo(() => pendingWOs.slice(0, 5), [pendingWOs])

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="flex items-start justify-between gap-4">
        <div className="grid flex-1 grid-cols-4 gap-3">
          <KpiCard label="Doanh thu tháng" value={fmt(revenue)} color="var(--theme-brand-primary)" />
          <KpiCard label="Chi phí tài xế" value={fmt(totalDriverSalary)} color="var(--theme-status-info, #3b82f6)" />
          <KpiCard label="Lệnh chờ ghép" value={`${trips.filter(t => t.status === 'PENDING' || t.status === 'DRAFT').length}`} color="var(--theme-status-warning)" />
          <KpiCard label="Phiếu chưa ghép" value={`${pendingWOs.length}`} color="var(--theme-status-warning)" />
        </div>
        <PeriodSwitcher label={`Tháng ${month}/${year}`} sublabel={sublabel} onPrev={onPrev} onNext={onNext} />
      </div>

      {/* Quick actions bar */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Tạo lệnh', path: '/accountant/create-trip', icon: Plus },
          { label: 'Đối soát', path: '/accountant/work-orders', icon: Link2 },
          { label: 'Đối tác', path: '/accountant/partners', icon: Users },
          { label: 'Cung đường', path: '/accountant/routes', icon: MapPin },
          { label: 'Bảng giá', path: '/accountant/pricing', icon: Tag },
          { label: 'Kỳ lương', path: '/accountant/salary-setup', icon: Wallet },
        ].map(a => (
          <button
            key={a.label}
            onClick={() => navigate(a.path)}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80 active:scale-[0.98]"
            style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)', color: 'var(--theme-text-primary)' }}
          >
            <a.icon className="h-3.5 w-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
            {a.label}
          </button>
        ))}
      </div>

      {/* 3-column workbench */}
      <div className="grid grid-cols-12 gap-4">

        {/* ── Left: Lệnh điều hành ── */}
        <div className="col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold font-display" style={{ color: 'var(--theme-text-primary)' }}>
              Lệnh điều hành
            </h2>
            <button
              onClick={() => navigate('/accountant/create-trip')}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              <Plus className="h-3.5 w-3.5" /> Tạo lệnh
            </button>
          </div>
          <div className="space-y-2">
            {sortedTrips.length === 0 ? (
              <div className="rounded-2xl border p-8 text-center" style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Chưa có lệnh nào</p>
              </div>
            ) : (
              sortedTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} onClick={() => navigate(`/accountant/trip/${trip.id}`)} />
              ))
            )}
            <button
              onClick={() => navigate('/accountant/trips')}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-xs font-medium transition hover:opacity-70"
              style={{ borderColor: 'var(--surface-border)', color: 'var(--theme-text-muted)' }}
            >
              Xem tất cả lệnh <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Middle: Gợi ý ghép phiếu ── */}
        <div className="col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold font-display" style={{ color: 'var(--theme-text-primary)' }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--theme-status-warning)' }} />
              Gợi ý ghép phiếu
            </h2>
            {pendingWOs.length > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: 'color-mix(in srgb, var(--theme-status-warning) 15%, transparent)', color: 'var(--theme-status-warning)' }}
              >
                {pendingWOs.length} mới
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {matchCandidates.length === 0 ? (
              <div className="rounded-2xl border p-8 text-center" style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}>
                <CheckCircle2 className="mx-auto h-6 w-6 mb-2" style={{ color: 'var(--theme-brand-primary)' }} />
                <p className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>Tất cả phiếu đã ghép</p>
              </div>
            ) : (
              matchCandidates.map(wo => (
                <MatchCard
                  key={wo.id}
                  wo={wo}
                  trips={trips}
                  onMatch={id => navigate(`/accountant/match/${id}`)}
                />
              ))
            )}
            <button
              onClick={() => navigate('/accountant/work-orders')}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-xs font-medium transition hover:opacity-70"
              style={{ borderColor: 'var(--surface-border)', color: 'var(--theme-text-muted)' }}
            >
              Mở đối soát đầy đủ <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Right: Phiếu tài xế chưa ghép ── */}
        <div className="col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold font-display" style={{ color: 'var(--theme-text-primary)' }}>
              Phiếu tài xế chưa ghép
            </h2>
            <button
              onClick={() => navigate('/accountant/work-orders')}
              className="text-xs font-medium transition hover:opacity-70"
              style={{ color: 'var(--theme-brand-primary)' }}
            >
              Lọc
            </button>
          </div>
          <div className="space-y-2">
            {unmatchedWOs.length === 0 ? (
              <div className="rounded-2xl border p-8 text-center" style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}>
                <CheckCircle2 className="mx-auto h-6 w-6 mb-2" style={{ color: 'var(--theme-brand-primary)' }} />
                <p className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>Không có phiếu chờ</p>
              </div>
            ) : (
              unmatchedWOs.map(wo => (
                <UnmatchedRow key={wo.id} wo={wo} onClick={() => navigate(`/accountant/match/${wo.id}`)} />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Mobile dashboard ─────────────────────────────────────────────────────────

function MobileDashboard() {
  const navigate = useNavigate()
  const { year, month, dateFrom, dateTo, sublabel, onPrev, onNext } = useMonthParams()
  const { data: workOrders = [] } = useWorkOrders({ dateFrom, dateTo })
  const { data: trips = [] } = useTripOrders({ dateFrom, dateTo })
  const { data: summary } = useDashboardSummary()

  const pendingWOs = useMemo(() => workOrders.filter(w => w.status === 'PENDING'), [workOrders])
  const totalDriverSalary = useMemo(() => workOrders.reduce((s, w) => s + (w.earning ?? 0), 0), [workOrders])
  const revenue = summary?.totalRevenue ?? trips.reduce((s, t) => s + (t.revenue ?? 0), 0)
  const recentTrips = useMemo(() => [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), [trips])

  return (
    <div className="space-y-4 pb-8">
      <div className="flex justify-center">
        <PeriodSwitcher label={`Tháng ${month}/${year}`} sublabel={sublabel} onPrev={onPrev} onNext={onNext} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Doanh thu" value={fmt(revenue)} color="var(--theme-brand-primary)" />
        <KpiCard label="Chi phí TX" value={fmt(totalDriverSalary)} color="var(--theme-status-info, #3b82f6)" />
        <KpiCard label="Chờ ghép" value={`${pendingWOs.length}`} color="var(--theme-status-warning)" />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
            Lệnh điều hành gần đây
          </h3>
          <button onClick={() => navigate('/accountant/trips')} className="text-[10px] font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>
            Xem tất cả
          </button>
        </div>
        <div className="space-y-2">
          {recentTrips.length === 0 ? (
            <div className="rounded-2xl border p-6 text-center" style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}>
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có lệnh nào</p>
            </div>
          ) : (
            recentTrips.map(trip => (
              <TripCard key={trip.id} trip={trip} onClick={() => navigate(`/accountant/trip/${trip.id}`)} />
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Tạo lệnh', path: '/accountant/create-trip', icon: Plus },
          { label: 'Đối soát', path: '/accountant/work-orders', icon: Link2 },
          { label: 'Đối tác', path: '/accountant/partners', icon: Users },
          { label: 'Cung đường', path: '/accountant/routes', icon: MapPin },
          { label: 'Bảng giá', path: '/accountant/pricing', icon: Tag },
          { label: 'Kỳ lương', path: '/accountant/salary-setup', icon: Wallet },
        ].map(a => (
          <button
            key={a.label}
            onClick={() => navigate(a.path)}
            className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition active:scale-[0.98]"
            style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)', color: 'var(--theme-text-primary)' }}
          >
            <a.icon className="h-3.5 w-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function AccountantDashboard() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileDashboard /> : <DesktopDashboard />
}
