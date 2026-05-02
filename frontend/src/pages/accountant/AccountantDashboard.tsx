import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useWorkOrders,
  useTripOrders,
  useDashboardSummary,
} from '@/hooks/use-queries'
import { useIsMobile } from '@/hooks/use-mobile'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { useMonthParams } from './use-month-params'
import { formatCurrencyFull as fmt, type WorkOrder, type TripOrder } from '@/data/domain'
import {
  Sparkles, ArrowRight,
  CheckCircle2, Plus, Wallet, Tag, Users, MapPin,
  FileText, Truck, Car, Briefcase,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveRoute(wo: WorkOrder | TripOrder): string {
  const parts = wo.route.split(' - ')
  const from = wo.pickupLocation || parts[0] || wo.route
  const to   = wo.dropoffLocation || parts[1] || null
  return to ? `${from} → ${to}` : from
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, color,
}: {
  label: string; value: string; color?: string
}) {
  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-1 min-w-0"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
      }}
    >
      <p className="text-xs font-medium leading-snug" style={{ color: 'var(--theme-text-muted)' }}>
        {label}
      </p>
      <p
        className="text-lg lg:text-2xl font-bold font-display tabular-nums leading-tight break-all"
        style={{ color: color ?? 'var(--theme-text-primary)' }}
      >
        {value}
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
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
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
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3"
        style={{ borderBottom: '1px solid var(--theme-border-default)' }}
      >
        <div className="text-sm font-semibold font-display" style={{ color: 'var(--theme-text-primary)' }}>
          {title}
        </div>
        {titleExtra}
      </div>

      {/* Body — flat list, rows handle their own dividers */}
      <div className="flex-1 overflow-y-auto min-h-[280px]">
        {children}
      </div>

      {/* Footer */}
      {footerLabel && onFooter && (
        <div style={{ borderTop: '1px solid var(--theme-border-default)' }}>
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

// ─── Trip order row (flat list item) ─────────────────────────────────────────

function TripRow({ trip, onClick, isLast }: { trip: TripOrder; onClick: () => void; isLast?: boolean }) {
  const isPending   = trip.status === 'PENDING' || trip.status === 'DRAFT'
  const isConfirmed = trip.isConfirmed
  const isDraft     = trip.status === 'DRAFT'

  const types = trip.containers.length > 0
    ? (() => {
        const map: Record<string, number> = {}
        trip.containers.forEach(c => { map[c.workType] = (map[c.workType] ?? 0) + 1 })
        return Object.entries(map).map(([t, n]) => n > 1 ? `${t} × ${n}` : t).join(' ')
      })()
    : trip.workType ?? ''

  const tripDate = trip.tripDate
    ? new Date(trip.tripDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  let badge: { label: string; bg: string; color: string; border?: string }
  if (isConfirmed) {
    badge = { label: 'Đã xác nhận', bg: 'var(--theme-brand-primary)', color: '#fff' }
  } else if (isDraft) {
    badge = { label: 'Nháp', bg: 'transparent', color: 'var(--theme-text-muted)', border: '1px solid var(--theme-border-default)' }
  } else if (trip.status === 'COMPLETED') {
    badge = { label: 'Hoàn thành', bg: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)' }
  } else if (isPending) {
    badge = { label: 'Chờ xử lý', bg: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' }
  } else {
    badge = { label: 'Đã ghép', bg: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 transition hover:bg-[color-mix(in_srgb,var(--theme-brand-primary)_4%,transparent)] active:scale-[0.99] touch-manipulation"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      {/* Line 1: trip id • client name + badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
          {trip.code} • {trip.clientName}
        </span>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{
            background: badge.bg,
            color: badge.color,
            border: badge.border,
          }}
        >
          {badge.label}
        </span>
      </div>
      {/* Line 2: date | route */}
      <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
        {tripDate}{tripDate && ' | '}{resolveRoute(trip)}
      </p>
      {/* Line 3: tractor plate + work type */}
      {(trip.tractorPlate || types) && (
        <div className="mt-1 flex items-center gap-3">
          {trip.tractorPlate && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              <Truck className="h-3 w-3" />
              {trip.tractorPlate}
            </span>
          )}
          {types && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              <Car className="h-3 w-3" />
              {types}
            </span>
          )}
        </div>
      )}
    </button>
  )
}

// ─── Unmatched WO row (flat list item) ───────────────────────────────────────

function UnmatchedRow({ wo, onClick, isLast }: { wo: WorkOrder; onClick: () => void; isLast?: boolean }) {
  const containerNums = wo.containers.map(c => c.containerNumber).filter(Boolean).slice(0, 1).join(', ')

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 transition hover:bg-[color-mix(in_srgb,var(--theme-brand-primary)_4%,transparent)] active:scale-[0.99] touch-manipulation"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      {/* Line 1: WO id • driver name + badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
          {wo.code} • {wo.driverName}
        </span>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{
            background: 'var(--theme-status-warning-light)',
            color: 'var(--theme-status-warning)',
          }}
        >
          Chờ ghép
        </span>
      </div>
      {/* Line 2: client | route */}
      <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
        {wo.clientName} | {resolveRoute(wo)}
      </p>
      {/* Line 3: tractor + work type + container */}
      <div className="mt-1 flex items-center gap-3">
        {wo.tractorPlate && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Truck className="h-3 w-3" />
            {wo.tractorPlate}
          </span>
        )}
        {wo.containers[0]?.workType && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Car className="h-3 w-3" />
            {wo.containers[0].workType}
          </span>
        )}
        {containerNums && (
          <span className="text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
            {containerNums}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Match suggestion row ─────────────────────────────────────────────────────

function MatchRow({ wo, trips, onMatch, isLast }: {
  wo: WorkOrder
  trips: TripOrder[]
  onMatch: (woId: number) => void
  isLast?: boolean
}) {
  const candidate = useMemo(() => {
    const woRoute  = wo.route.toLowerCase()
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

  const details: string[] = []
  if (candidate) {
    if (wo.tractorPlate) details.push(wo.tractorPlate)
    if (wo.containers[0]?.workType) details.push(wo.containers[0].workType)
    if (wo.clientName) details.push(wo.clientName)
    const route = resolveRoute(wo)
    if (route) details.push(route)
  }

  return (
    <div
      className="px-4 py-3"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      {/* Two pill boxes connected by arrow */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-center"
          style={{
            borderColor: 'var(--theme-border-default)',
            color: 'var(--theme-text-primary)',
            background: 'var(--theme-bg-primary)',
          }}
        >
          Lệnh: TO-{String(candidate?.trip.id ?? '???').padStart(3, '0')}
        </div>
        <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
        <div
          className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-center"
          style={{
            borderColor: 'var(--theme-border-default)',
            color: 'var(--theme-text-primary)',
            background: 'var(--theme-bg-primary)',
          }}
        >
          Phiếu: {wo.code}
        </div>
      </div>

      {/* Detail line */}
      {details.length > 0 && (
        <p className="text-xs mb-2.5 truncate" style={{ color: 'var(--theme-text-muted)' }}>
          {details.join('  ')}
        </p>
      )}

      {/* Full-width Ghép button */}
      <button
        onClick={() => onMatch(wo.id)}
        className="w-full rounded-lg py-2 text-sm font-semibold transition hover:opacity-90 active:scale-[0.98]"
        style={{ background: 'var(--theme-brand-primary)', color: '#fff' }}
      >
        Ghép
      </button>
    </div>
  )
}

// ─── Desktop dashboard ────────────────────────────────────────────────────────

function DesktopDashboard() {
  const navigate = useNavigate()
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()

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
    { label: 'Đối soát', path: '/accountant/work-orders', icon: Briefcase },
    { label: 'Đối tác', path: '/accountant/partners', icon: Users },
    { label: 'Cung đường', path: '/accountant/routes', icon: MapPin },
    { label: 'Bảng giá', path: '/accountant/pricing', icon: Tag },
    { label: 'Kỳ lương', path: '/accountant/salary-setup', icon: Wallet },
  ]

  return (
    <div className="space-y-5">
      {/* Month navigator */}
      <MonthNavigator
        year={year}
        month={month}
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
            sortedTrips.map((trip, i) => (
              <TripRow
                key={trip.id}
                trip={trip}
                isLast={i === sortedTrips.length - 1}
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
            matchCandidates.map((wo, i) => (
              <MatchRow
                key={wo.id}
                wo={wo}
                trips={trips}
                isLast={i === matchCandidates.length - 1}
                onMatch={id => navigate(`/accountant/match/${id}`)}
              />
            ))
          )}
        </WorkbenchCard>

        {/* ── Right: Phiếu tài xế chưa ghép ── */}
        <WorkbenchCard
          title="Phiếu tài xế chưa ghép"
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
            unmatchedWOs.map((wo, i) => (
              <UnmatchedRow
                key={wo.id}
                wo={wo}
                isLast={i === unmatchedWOs.length - 1}
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
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
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
    { label: 'Đối soát', path: '/accountant/work-orders', icon: Briefcase },
    { label: 'Đối tác', path: '/accountant/partners', icon: Users },
    { label: 'Cung đường', path: '/accountant/routes', icon: MapPin },
    { label: 'Bảng giá', path: '/accountant/pricing', icon: Tag },
    { label: 'Kỳ lương', path: '/accountant/salary-setup', icon: Wallet },
  ]

  return (
    <div className="space-y-4 pb-8">
      {/* Month navigator */}
      <MonthNavigator
        year={year}
        month={month}
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
          recentTrips.map((trip, i) => (
            <TripRow
              key={trip.id}
              trip={trip}
              isLast={i === recentTrips.length - 1}
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
          pendingWOs.slice(0, 3).map((wo, i) => (
            <MatchRow
              key={wo.id}
              wo={wo}
              trips={trips}
              isLast={i === Math.min(pendingWOs.length, 3) - 1}
              onMatch={id => navigate(`/accountant/match/${id}`)}
            />
          ))
        )}
      </WorkbenchCard>

      {/* Phiếu tài xế chưa ghép */}
      <WorkbenchCard
        title="Phiếu tài xế chưa ghép"
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
          unmatchedWOs.map((wo, i) => (
            <UnmatchedRow
              key={wo.id}
              wo={wo}
              isLast={i === unmatchedWOs.length - 1}
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
