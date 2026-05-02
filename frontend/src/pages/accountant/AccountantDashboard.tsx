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
  Sparkles, ArrowRight, ArrowUpRight, TrendingUp, TrendingDown,
  CheckCircle2, Plus, Wallet, Tag, Users, MapPin,
  FileText, Truck, Car, Briefcase, DollarSign, Clock, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveRoute(wo: WorkOrder | TripOrder): string {
  const parts = wo.route.split(' - ')
  const from = wo.pickupLocation || parts[0] || wo.route
  const to   = wo.dropoffLocation || parts[1] || null
  return to ? `${from} → ${to}` : from
}

// ─── Modern KPI Card ──────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
  icon: React.ElementType
  trend?: { value: string; positive: boolean }
  color: 'primary' | 'success' | 'warning' | 'info'
}

const KPI_COLORS = {
  primary: {
    iconBg: 'var(--theme-brand-primary-light)',
    iconColor: 'var(--theme-brand-primary)',
  },
  success: {
    iconBg: 'var(--theme-status-success-light)',
    iconColor: 'var(--theme-status-success)',
  },
  warning: {
    iconBg: 'var(--theme-status-warning-light)',
    iconColor: 'var(--theme-status-warning)',
  },
  info: {
    iconBg: 'var(--theme-status-info-light)',
    iconColor: 'var(--theme-status-info)',
  },
}

function KpiCard({ label, value, icon: Icon, trend, color }: KpiCardProps) {
  const colors = KPI_COLORS[color]
  
  return (
    <div
      className="rounded-2xl p-5 transition-all hover:shadow-md"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
        boxShadow: 'var(--theme-shadow-sm)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: colors.iconBg }}
        >
          <Icon className="w-6 h-6" style={{ color: colors.iconColor }} />
        </div>
        {trend && (
          <div 
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold"
            style={{ 
              background: trend.positive ? 'var(--theme-status-success-light)' : 'var(--theme-status-error-light)',
              color: trend.positive ? 'var(--theme-status-success)' : 'var(--theme-status-error)',
            }}
          >
            {trend.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}
          </div>
        )}
      </div>
      <p className="text-2xl lg:text-3xl font-bold font-display tabular-nums leading-tight mb-1" style={{ color: 'var(--theme-text-primary)' }}>
        {value}
      </p>
      <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>
        {label}
      </p>
    </div>
  )
}

// ─── Quick action button ──────────────────────────────────────────────────────

function QuickActionCard({
  label, desc, icon: Icon, onClick,
}: {
  label: string; desc: string; icon: React.ElementType; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl p-4 text-left transition-all hover:shadow-md active:scale-[0.98]"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
        style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{desc}</p>
      </div>
      <ArrowUpRight 
        className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" 
        style={{ color: 'var(--theme-brand-primary)' }}
      />
    </button>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'var(--theme-bg-tertiary)' }}
      >
        <Icon className="h-6 w-6" style={{ color: 'var(--theme-text-muted)' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>{text}</p>
    </div>
  )
}

// ─── Data table card ──────────────────────────────────────────────────────────

function DataCard({
  title, titleExtra, footerLabel, onFooter, children, className,
}: {
  title: React.ReactNode
  titleExtra?: React.ReactNode
  footerLabel?: string
  onFooter?: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("flex flex-col rounded-2xl overflow-hidden", className)}
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
        boxShadow: 'var(--theme-shadow-sm)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--theme-border-light)' }}
      >
        <div className="text-sm font-bold font-display" style={{ color: 'var(--theme-text-primary)' }}>
          {title}
        </div>
        {titleExtra}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

      {/* Footer */}
      {footerLabel && onFooter && (
        <div style={{ borderTop: '1px solid var(--theme-border-light)' }}>
          <button
            onClick={onFooter}
            className="flex w-full items-center justify-center gap-1.5 px-4 py-3.5 text-sm font-semibold transition hover:bg-[var(--theme-bg-tertiary)]"
            style={{ color: 'var(--theme-brand-primary)' }}
          >
            {footerLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Trip order row ───────────────────────────────────────────────────────────

function TripRow({ trip, onClick, isLast }: { trip: TripOrder; onClick: () => void; isLast?: boolean }) {
  const isPending   = trip.status === 'PENDING' || trip.status === 'DRAFT'
  const isConfirmed = trip.isConfirmed
  const isDraft     = trip.status === 'DRAFT'

  const types = trip.containers.length > 0
    ? (() => {
        const map: Record<string, number> = {}
        trip.containers.forEach(c => { map[c.workType] = (map[c.workType] ?? 0) + 1 })
        return Object.entries(map).map(([t, n]) => n > 1 ? `${t} x${n}` : t).join(', ')
      })()
    : trip.workType ?? ''

  const tripDate = trip.tripDate
    ? new Date(trip.tripDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : ''

  let badge: { label: string; bg: string; color: string; dot?: string }
  if (isConfirmed) {
    badge = { label: 'Đã xác nhận', bg: 'var(--theme-brand-primary)', color: '#fff', dot: '#fff' }
  } else if (isDraft) {
    badge = { label: 'Nháp', bg: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)', dot: 'var(--theme-text-muted)' }
  } else if (trip.status === 'COMPLETED') {
    badge = { label: 'Hoàn thành', bg: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)', dot: 'var(--theme-status-success)' }
  } else if (isPending) {
    badge = { label: 'Chờ xử lý', bg: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)', dot: 'var(--theme-status-warning)' }
  } else {
    badge = { label: 'Đã ghép', bg: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)', dot: 'var(--theme-text-secondary)' }
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-5 py-4 transition hover:bg-[var(--theme-bg-tertiary)] active:scale-[0.995]"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'var(--theme-brand-primary-light)' }}
        >
          <FileText className="w-4.5 h-4.5" style={{ color: 'var(--theme-brand-primary)' }} />
        </div>
        
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>
              {trip.code} <span className="font-normal" style={{ color: 'var(--theme-text-muted)' }}>•</span> {trip.clientName}
            </span>
            <span
              className="shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.dot }} />}
              {badge.label}
            </span>
          </div>
          <p className="text-xs truncate mb-1.5" style={{ color: 'var(--theme-text-muted)' }}>
            {tripDate && <span className="font-medium">{tripDate}</span>}
            {tripDate && ' • '}
            {resolveRoute(trip)}
          </p>
          {(trip.tractorPlate || types) && (
            <div className="flex items-center gap-3">
              {trip.tractorPlate && (
                <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
                  <Truck className="h-3 w-3" />
                  {trip.tractorPlate}
                </span>
              )}
              {types && (
                <span 
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
                >
                  {types}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Unmatched WO row ─────────────────────────────────────────────────────────

function UnmatchedRow({ wo, onClick, isLast }: { wo: WorkOrder; onClick: () => void; isLast?: boolean }) {
  const containerNums = wo.containers.map(c => c.containerNumber).filter(Boolean).slice(0, 1).join(', ')

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-5 py-4 transition hover:bg-[var(--theme-bg-tertiary)] active:scale-[0.995]"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'var(--theme-status-warning-light)' }}
        >
          <AlertCircle className="w-4.5 h-4.5" style={{ color: 'var(--theme-status-warning)' }} />
        </div>
        
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>
              {wo.code} <span className="font-normal" style={{ color: 'var(--theme-text-muted)' }}>•</span> {wo.driverName}
            </span>
            <span
              className="shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--theme-status-warning)' }} />
              Chờ ghép
            </span>
          </div>
          <p className="text-xs truncate mb-1.5" style={{ color: 'var(--theme-text-muted)' }}>
            {wo.clientName} • {resolveRoute(wo)}
          </p>
          <div className="flex items-center gap-3">
            {wo.tractorPlate && (
              <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
                <Truck className="h-3 w-3" />
                {wo.tractorPlate}
              </span>
            )}
            {wo.containers[0]?.workType && (
              <span 
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
              >
                {wo.containers[0].workType}
              </span>
            )}
            {containerNums && (
              <span className="text-xs font-mono truncate" style={{ color: 'var(--theme-text-muted)' }}>
                {containerNums}
              </span>
            )}
          </div>
        </div>
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

  return (
    <div
      className="px-5 py-4"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-warning)' }} />
        <span className="text-xs font-bold" style={{ color: 'var(--theme-text-primary)' }}>
          Gợi ý khớp: {wo.code}
        </span>
      </div>

      {/* Match pills */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-center"
          style={{
            background: 'var(--theme-brand-primary-light)',
            color: 'var(--theme-brand-primary)',
          }}
        >
          Lệnh: {candidate?.trip.code ?? '—'}
        </div>
        <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
        <div
          className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-center"
          style={{
            background: 'var(--theme-status-warning-light)',
            color: 'var(--theme-status-warning)',
          }}
        >
          Phiếu: {wo.code}
        </div>
      </div>

      {/* Info line */}
      <p className="text-xs mb-3 truncate" style={{ color: 'var(--theme-text-muted)' }}>
        {wo.tractorPlate && <span className="font-medium">{wo.tractorPlate}</span>}
        {wo.tractorPlate && ' • '}
        {wo.clientName}
        {' • '}
        {resolveRoute(wo)}
      </p>

      {/* Match button */}
      <button
        onClick={() => onMatch(wo.id)}
        className="w-full rounded-xl py-2.5 text-sm font-bold transition hover:opacity-90 active:scale-[0.98]"
        style={{ background: 'var(--theme-brand-primary)', color: '#fff' }}
      >
        Ghép ngay
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
  const completedTrips = trips.filter(t => t.status === 'COMPLETED')

  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    [trips],
  )
  const unmatchedWOs = useMemo(
    () => workOrders.filter(w => w.status !== 'MATCHED' && w.status !== 'COMPLETED').slice(0, 6),
    [workOrders],
  )
  const matchCandidates = useMemo(() => pendingWOs.slice(0, 4), [pendingWOs])

  const quickActions = [
    { label: 'Tạo lệnh mới', desc: 'Tạo lệnh điều phối', path: '/accountant/create-trip', icon: Plus },
    { label: 'Đối soát', desc: 'Xử lý phiếu tài xế', path: '/accountant/work-orders', icon: Briefcase },
    { label: 'Đối tác', desc: 'Quản lý khách hàng', path: '/accountant/partners', icon: Users },
    { label: 'Cung đường', desc: 'Quản lý tuyến đường', path: '/accountant/routes', icon: MapPin },
    { label: 'Bảng giá', desc: 'Cấu hình giá cước', path: '/accountant/pricing', icon: Tag },
    { label: 'Kỳ lương', desc: 'Thiết lập kỳ lương', path: '/accountant/salary-setup', icon: Wallet },
  ]

  return (
    <div className="space-y-6">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display" style={{ color: 'var(--theme-text-primary)' }}>
            Tổng quan hoạt động
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
            Theo dõi và quản lý vận tải
          </p>
        </div>
        <MonthNavigator
          year={year}
          month={month}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>

      {/* KPI cards - 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Doanh thu tháng"
          value={fmt(revenue)}
          icon={DollarSign}
          color="primary"
          trend={revenue > 0 ? { value: '+12%', positive: true } : undefined}
        />
        <KpiCard
          label="Chi phí tài xế"
          value={fmt(totalDriverSalary)}
          icon={Wallet}
          color="info"
        />
        <KpiCard
          label="Lệnh chờ xử lý"
          value={String(pendingTrips.length)}
          icon={Clock}
          color="warning"
        />
        <KpiCard
          label="Phiếu chưa ghép"
          value={String(pendingWOs.length)}
          icon={AlertCircle}
          color="warning"
        />
      </div>

      {/* Quick actions grid */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--theme-text-primary)' }}>
          Truy cập nhanh
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {quickActions.map(a => (
            <QuickActionCard
              key={a.label}
              label={a.label}
              desc={a.desc}
              icon={a.icon}
              onClick={() => navigate(a.path)}
            />
          ))}
        </div>
      </div>

      {/* 3-column data cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Recent trips */}
        <DataCard
          title="Lệnh điều hành gần đây"
          footerLabel="Xem tất cả lệnh"
          onFooter={() => navigate('/accountant/trips')}
          className="min-h-[400px]"
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
        </DataCard>

        {/* Middle: Match suggestions */}
        <DataCard
          title={
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: 'var(--theme-status-warning)' }} />
              Gợi ý ghép phiếu
            </span>
          }
          footerLabel="Mở đối soát"
          onFooter={() => navigate('/accountant/work-orders')}
          className="min-h-[400px]"
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
        </DataCard>

        {/* Right: Unmatched work orders */}
        <DataCard
          title="Phiếu tài xế chưa ghép"
          titleExtra={
            <button
              onClick={() => navigate('/accountant/work-orders')}
              className="text-xs font-semibold px-2 py-1 rounded-lg transition hover:bg-[var(--theme-bg-tertiary)]"
              style={{ color: 'var(--theme-brand-primary)' }}
            >
              Xem tất cả
            </button>
          }
          className="min-h-[400px]"
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
        </DataCard>

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

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Doanh thu tháng"
          value={fmt(revenue)}
          icon={DollarSign}
          color="primary"
        />
        <KpiCard
          label="Chi phí tài xế"
          value={fmt(totalDriverSalary)}
          icon={Wallet}
          color="info"
        />
        <KpiCard
          label="Lệnh chờ xử lý"
          value={String(pendingTrips.length)}
          icon={Clock}
          color="warning"
        />
        <KpiCard
          label="Phiếu chưa ghép"
          value={String(pendingWOs.length)}
          icon={AlertCircle}
          color="warning"
        />
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {quickActions.map(a => (
          <button
            key={a.label}
            onClick={() => navigate(a.path)}
            className="flex items-center gap-2 shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-[0.97]"
            style={{
              background: 'var(--theme-bg-secondary)',
              border: '1px solid var(--theme-border-default)',
              color: 'var(--theme-text-primary)',
            }}
          >
            <a.icon className="h-4 w-4 shrink-0" style={{ color: 'var(--theme-brand-primary)' }} />
            {a.label}
          </button>
        ))}
      </div>

      {/* Recent trips */}
      <DataCard
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
      </DataCard>

      {/* Match suggestions */}
      <DataCard
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
      </DataCard>

      {/* Unmatched work orders */}
      <DataCard
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
      </DataCard>
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function AccountantDashboard() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileDashboard /> : <DesktopDashboard />
}
