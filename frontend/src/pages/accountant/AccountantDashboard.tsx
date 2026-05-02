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
  Sparkles, ArrowRight, ChevronLeft, ChevronRight,
  CheckCircle2, Plus, Link2, Wallet, Tag, Users, MapPin,
  FileText,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => formatCurrencyFull(n)

function resolveRoute(wo: WorkOrder | TripOrder): string {
  const parts = wo.route.split(' - ')
  const from = wo.pickupLocation || parts[0] || wo.route
  const to   = wo.dropoffLocation || parts[1] || null
  return to ? `${from} → ${to}` : from
}

function typeLabel(wo: WorkOrder): string {
  const map: Record<string, number> = {}
  wo.containers.forEach(c => { map[c.workType] = (map[c.workType] ?? 0) + 1 })
  return Object.entries(map).map(([t, n]) => n > 1 ? `${t} × ${n}` : t).join(', ')
}

// ─── Month navigator ──────────────────────────────────────────────────────────

function MonthNavigator({
  label, sublabel, onPrev, onNext,
}: {
  label: string; sublabel?: string; onPrev: () => void; onNext: () => void
}) {
  return (
    <div className="flex items-center justify-center gap-4 py-2">
      <button
        onClick={onPrev}
        className="flex h-8 w-8 items-center justify-center rounded-full transition hover:opacity-70 active:scale-90"
        style={{ color: 'var(--theme-text-muted)' }}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="text-center">
        <p className="text-2xl font-bold font-display tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
          {label}
        </p>
        {sublabel && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--theme-status-warning)' }}>
            {sublabel}
          </p>
        )}
      </div>
      <button
        onClick={onNext}
        className="flex h-8 w-8 items-center justify-center rounded-full transition hover:opacity-70 active:scale-90"
        style={{ color: 'var(--theme-text-muted)' }}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, unit, color,
}: {
  label: string; value: string; unit?: string; color?: string
}) {
  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-1"
      style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
    >
      <p className="text-xs font-medium leading-snug" style={{ color: 'var(--theme-text-muted)' }}>
        {label}
      </p>
      <p
        className="text-2xl font-bold font-display tabular-nums leading-tight"
        style={{ color: color ?? 'var(--theme-text-primary)' }}
      >
        {value}
        {unit && (
          <span className="text-xl font-bold ml-1">{unit}</span>
        )}
      </p>
    </div>
  )
}

// ─── Quick action pill ────────────────────────────────────────────────────────

function ActionPill({
  label, icon: Icon, onClick,
}: {
  label: string; icon: React.ElementType; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:opacity-80 active:scale-[0.97] touch-manipulation"
      style={{
        background: 'var(--surface-bg)',
        borderColor: 'var(--surface-border)',
        color: 'var(--theme-text-primary)',
      }}
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color: 'var(--theme-brand-primary)' }} />
      {label}
    </button>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 12%, transparent)' }}
      >
        <Icon className="h-7 w-7" style={{ color: 'var(--theme-brand-primary)' }} />
      </div>
      <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{text}</p>
    </div>
  )
}

// ─── Workbench column card ────────────────────────────────────────────────────

function WorkbenchCard({
  title, titleExtra, footerLabel, onFooter, children,
}: {
  title: React.ReactNode
  titleExtra?: React.ReactNode
  footerLabel?: string
  onFooter?: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col rounded-2xl border overflow-hidden"
      style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3"
        style={{ borderBottom: '1px solid var(--surface-border)' }}
      >
        <div className="text-sm font-semibold font-display" style={{ color: 'var(--theme-text-primary)' }}>
          {title}
        </div>
        {titleExtra}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-[260px]">
        {children}
      </div>

      {/* Footer */}
      {footerLabel && onFooter && (
        <div style={{ borderTop: '1px solid var(--surface-border)' }}>
          <button
            onClick={onFooter}
            className="flex w-full items-center gap-1.5 px-4 py-3 text-sm font-medium transition hover:opacity-70"
            style={{ color: 'var(--theme-brand-primary)' }}
          >
            {footerLabel} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Trip order row ───────────────────────────────────────────────────────────

function TripRow({ trip, onClick }: { trip: TripOrder; onClick: () => void }) {
  const isPending = trip.status === 'PENDING' || trip.status === 'DRAFT'
  const isConfirmed = trip.isConfirmed

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
      className="w-full text-left rounded-xl border p-3 transition hover:shadow-sm active:scale-[0.99] touch-manipulation"
      style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--surface-border)' }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
            T0-{String(trip.id).padStart(4, '0')}
          </span>
          {types && (
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
              style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
            >
              {types}
            </span>
          )}
        </div>
        {isPending ? (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
            style={{ background: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' }}
          >
            Chờ ghép
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
      <p className="text-sm font-semibold leading-snug truncate" style={{ color: 'var(--theme-text-primary)' }}>
        {trip.clientName}
      </p>
      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--theme-text-muted)' }}>
        {resolveRoute(trip)}
      </p>
      <div className="mt-2 pt-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--surface-border)' }}>
        <span className="text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
          {trip.driverName ?? '—'}
        </span>
        <span className="font-mono text-xs font-semibold tabular-nums shrink-0" style={{ color: 'var(--theme-text-primary)' }}>
          {fmt(trip.revenue ?? 0)}
        </span>
      </div>
    </button>
  )
}

// ─── Unmatched WO row ─────────────────────────────────────────────────────────

function UnmatchedRow({ wo, onClick }: { wo: WorkOrder; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl border p-3 text-left transition hover:shadow-sm active:scale-[0.99] touch-manipulation"
      style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--surface-border)' }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold"
        style={{
          background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)',
          color: 'var(--theme-brand-primary)',
        }}
      >
        {wo.containers.length}
      </div>
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
        </div>
        <p className="truncate text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
          {wo.driverName}
        </p>
        <p className="truncate text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          {resolveRoute(wo)}
        </p>
      </div>
    </button>
  )
}

// ─── Match suggestion row ─────────────────────────────────────────────────────

function MatchRow({ wo, trips, onMatch }: {
  wo: WorkOrder
  trips: TripOrder[]
  onMatch: (woId: number) => void
}) {
  const candidate = useMemo(() => {
    const woRoute = wo.route.toLowerCase()
    const woClient = wo.clientName.toLowerCase()
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

  return (
    <div
      className="rounded-xl border p-3"
      style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--surface-border)' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
          WO-{String(wo.id).padStart(4, '0')}
        </span>
        <Link2 className="h-3 w-3 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
          {candidate ? `T0-${String(candidate.trip.id).padStart(4, '0')}` : '—'}
        </span>
      </div>
      {reasons.length > 0 && (
        <p className="text-xs mb-2.5" style={{ color: 'var(--theme-text-muted)' }}>
          {reasons.join(' · ')}
        </p>
      )}
      <button
        onClick={() => onMatch(wo.id)}
        className="w-full rounded-lg py-1.5 text-xs font-bold transition hover:opacity-90 active:scale-[0.98]"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
      >
        Xác nhận ghép
      </button>
    </div>
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
  const pendingTrips = trips.filter(t => t.status === 'PENDING' || t.status === 'DRAFT')

  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [trips],
  )
  const unmatchedWOs = useMemo(
    () => workOrders.filter(w => w.status !== 'MATCHED' && w.status !== 'COMPLETED').slice(0, 10),
    [workOrders],
  )
  const matchCandidates = useMemo(() => pendingWOs.slice(0, 5), [pendingWOs])

  const quickActions = [
    { label: 'Tạo lệnh', path: '/accountant/create-trip', icon: Plus },
    { label: 'Đối soát', path: '/accountant/work-orders', icon: Link2 },
    { label: 'Đối tác', path: '/accountant/partners', icon: Users },
    { label: 'Cung đường', path: '/accountant/routes', icon: MapPin },
    { label: 'Bảng giá', path: '/accountant/pricing', icon: Tag },
    { label: 'Kỳ lương', path: '/accountant/salary-setup', icon: Wallet },
  ]

  return (
    <div className="space-y-5">
      {/* Month navigator */}
      <MonthNavigator
        label={`Tháng ${String(month).padStart(2, '0')}/${year}`}
        sublabel={sublabel}
        onPrev={onPrev}
        onNext={onNext}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          label="Doanh thu tháng"
          value={fmt(revenue)}
          color="var(--theme-text-primary)"
        />
        <KpiCard
          label="Chi phí tài xế"
          value={fmt(totalDriverSalary)}
          color="var(--theme-text-primary)"
        />
        <KpiCard
          label="Lệnh chờ ghép"
          value={String(pendingTrips.length)}
          color="var(--theme-status-warning)"
        />
        <KpiCard
          label="Phiếu chưa ghép"
          value={String(pendingWOs.length)}
          color="var(--theme-status-warning)"
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map(a => (
          <ActionPill
            key={a.label}
            label={a.label}
            icon={a.icon}
            onClick={() => navigate(a.path)}
          />
        ))}
      </div>

      {/* 3-column workbench */}
      <div className="grid grid-cols-3 gap-4">

        {/* ── Left: Lệnh điều hành ── */}
        <WorkbenchCard
          title="Lệnh điều hành"
          footerLabel="Xem tất cả lệnh"
          onFooter={() => navigate('/accountant/trips')}
        >
          {sortedTrips.length === 0 ? (
            <EmptyState icon={FileText} text="Chưa có lệnh nào" />
          ) : (
            sortedTrips.map(trip => (
              <TripRow
                key={trip.id}
                trip={trip}
                onClick={() => navigate(`/accountant/trip/${trip.id}`)}
              />
            ))
          )}
        </WorkbenchCard>

        {/* ── Middle: Gợi ý ghép phiếu ── */}
        <WorkbenchCard
          title={
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" style={{ color: 'var(--theme-status-warning)' }} />
              Gợi ý ghép phiếu
            </span>
          }
          footerLabel="Mở đối soát đầy đủ"
          onFooter={() => navigate('/accountant/work-orders')}
        >
          {matchCandidates.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="Tất cả phiếu đã ghép" />
          ) : (
            matchCandidates.map(wo => (
              <MatchRow
                key={wo.id}
                wo={wo}
                trips={trips}
                onMatch={id => navigate(`/accountant/match/${id}`)}
              />
            ))
          )}
        </WorkbenchCard>

        {/* ── Right: Phiếu chưa ghép ── */}
        <WorkbenchCard
          title="Phiếu chưa ghép"
          titleExtra={
            <button
              onClick={() => navigate('/accountant/work-orders')}
              className="text-xs font-medium transition hover:opacity-70"
              style={{ color: 'var(--theme-brand-primary)' }}
            >
              Lọc
            </button>
          }
        >
          {unmatchedWOs.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="Không có phiếu chờ" />
          ) : (
            unmatchedWOs.map(wo => (
              <UnmatchedRow
                key={wo.id}
                wo={wo}
                onClick={() => navigate(`/accountant/match/${wo.id}`)}
              />
            ))
          )}
        </WorkbenchCard>

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
  const pendingTrips = trips.filter(t => t.status === 'PENDING' || t.status === 'DRAFT')
  const recentTrips = useMemo(
    () => [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [trips],
  )
  const unmatchedWOs = useMemo(
    () => workOrders.filter(w => w.status !== 'MATCHED' && w.status !== 'COMPLETED').slice(0, 5),
    [workOrders],
  )

  const quickActions = [
    { label: 'Tạo lệnh', path: '/accountant/create-trip', icon: Plus },
    { label: 'Đối soát', path: '/accountant/work-orders', icon: Link2 },
    { label: 'Đối tác', path: '/accountant/partners', icon: Users },
    { label: 'Cung đường', path: '/accountant/routes', icon: MapPin },
    { label: 'Bảng giá', path: '/accountant/pricing', icon: Tag },
    { label: 'Kỳ lương', path: '/accountant/salary-setup', icon: Wallet },
  ]

  return (
    <div className="space-y-4 pb-8">
      {/* Month navigator */}
      <MonthNavigator
        label={`Tháng ${String(month).padStart(2, '0')}/${year}`}
        sublabel={sublabel}
        onPrev={onPrev}
        onNext={onNext}
      />

      {/* KPI grid — 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Doanh thu tháng"
          value={fmt(revenue)}
          color="var(--theme-text-primary)"
        />
        <KpiCard
          label="Chi phí tài xế"
          value={fmt(totalDriverSalary)}
          color="var(--theme-text-primary)"
        />
        <KpiCard
          label="Lệnh chờ ghép"
          value={String(pendingTrips.length)}
          color="var(--theme-status-warning)"
        />
        <KpiCard
          label="Phiếu chưa ghép"
          value={String(pendingWOs.length)}
          color="var(--theme-status-warning)"
        />
      </div>

      {/* Quick actions — scrollable row */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {quickActions.map(a => (
          <ActionPill
            key={a.label}
            label={a.label}
            icon={a.icon}
            onClick={() => navigate(a.path)}
          />
        ))}
      </div>

      {/* Lệnh điều hành */}
      <WorkbenchCard
        title="Lệnh điều hành"
        footerLabel="Xem tất cả lệnh"
        onFooter={() => navigate('/accountant/trips')}
      >
        {recentTrips.length === 0 ? (
          <EmptyState icon={FileText} text="Chưa có lệnh nào" />
        ) : (
          recentTrips.map(trip => (
            <TripRow
              key={trip.id}
              trip={trip}
              onClick={() => navigate(`/accountant/trip/${trip.id}`)}
            />
          ))
        )}
      </WorkbenchCard>

      {/* Gợi ý ghép phiếu */}
      <WorkbenchCard
        title={
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--theme-status-warning)' }} />
            Gợi ý ghép phiếu
          </span>
        }
        footerLabel="Mở đối soát đầy đủ"
        onFooter={() => navigate('/accountant/work-orders')}
      >
        {pendingWOs.length === 0 ? (
          <EmptyState icon={CheckCircle2} text="Tất cả phiếu đã ghép" />
        ) : (
          pendingWOs.slice(0, 3).map(wo => (
            <MatchRow
              key={wo.id}
              wo={wo}
              trips={trips}
              onMatch={id => navigate(`/accountant/match/${id}`)}
            />
          ))
        )}
      </WorkbenchCard>

      {/* Phiếu chưa ghép */}
      <WorkbenchCard
        title="Phiếu chưa ghép"
        titleExtra={
          <button
            onClick={() => navigate('/accountant/work-orders')}
            className="text-xs font-medium"
            style={{ color: 'var(--theme-brand-primary)' }}
          >
            Lọc
          </button>
        }
      >
        {unmatchedWOs.length === 0 ? (
          <EmptyState icon={CheckCircle2} text="Không có phiếu chờ" />
        ) : (
          unmatchedWOs.map(wo => (
            <UnmatchedRow
              key={wo.id}
              wo={wo}
              onClick={() => navigate(`/accountant/match/${wo.id}`)}
            />
          ))
        )}
      </WorkbenchCard>
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function AccountantDashboard() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileDashboard /> : <DesktopDashboard />
}
