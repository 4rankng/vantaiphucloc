import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandIcon } from '@/components/atoms/BrandIcon'
import {
  useWorkOrders,
  useTripOrders,
  useDashboardSummary,
} from '@/hooks/use-queries'
import { useIsMobile } from '@/hooks/use-mobile'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { StatsGrid } from '@/components/shared/StatsGrid'
import { StatusBadgePro } from '@/components/shared/StatusBadgePro'
import { useMonthParams } from './use-month-params'
import { formatCurrencyFull as fmt, type WorkOrder, type TripOrder } from '@/data/domain'
import { resolveRoute } from '@/lib/route-utils'
import { formatDate } from '@/lib/format'
import {
  ArrowRight,
  CheckCircle2, Plus, Wallet, Tag, Users,
  FileText, Truck, Car, Briefcase, DollarSign, Clock, AlertTriangle,
} from 'lucide-react'

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  text,
  illustrated = false,
}: {
  icon: React.ElementType
  text: string
  illustrated?: boolean
}) {
  if (illustrated) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <BrandIcon name="calkey" className="w-24 h-24 opacity-90" />
        <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{text}</p>
      </div>
    )
  }
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
  title, titleExtra, footerLabel, onFooter, children, minHeight = '320px',
}: {
  title: React.ReactNode
  titleExtra?: React.ReactNode
  footerLabel?: string
  onFooter?: () => void
  children: React.ReactNode
  minHeight?: string
}) {
  return (
    <div
      className="flex flex-col rounded-lg border overflow-hidden"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
      }}
    >
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3"
        style={{ borderBottom: '1px solid var(--theme-border-default)' }}
      >
        <div className="typo-h2" style={{ color: 'var(--theme-text-primary)' }}>
          {title}
        </div>
        {titleExtra}
      </div>
      <div className="flex flex-col flex-1 overflow-hidden" style={{ minHeight }}>
        {children}
      </div>
      {footerLabel && onFooter && (
        <div style={{ borderTop: '1px solid var(--theme-border-default)' }}>
          <button
            onClick={onFooter}
            className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold transition hover:opacity-70"
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

function TripRow({ trip, onClick, isLast }: { trip: TripOrder; onClick: () => void; isLast?: boolean }) {
  const isPending = trip.status === 'PENDING' || trip.status === 'DRAFT'
  const isConfirmed = trip.isConfirmed
  const isDraft = trip.status === 'DRAFT'

  const types = trip.containers.length > 0
    ? (() => {
        const map: Record<string, number> = {}
        trip.containers.forEach(c => { map[c.workType] = (map[c.workType] ?? 0) + 1 })
        return Object.entries(map).map(([t, n]) => n > 1 ? `${t} × ${n}` : t).join(' ')
      })()
    : ''

  const tripDate = trip.tripDate
    ? formatDate(trip.tripDate, 'full')
    : ''

  let statusVariant: 'success' | 'warning' | 'neutral' | 'completed' | 'draft' | 'pending' | 'matched' = 'neutral'
  let statusLabel = ''

  if (isConfirmed) {
    statusVariant = 'success'
    statusLabel = 'Đã khớp'
  } else if (isDraft) {
    statusVariant = 'draft'
    statusLabel = 'Nháp'
  } else if (trip.status === 'COMPLETED') {
    statusVariant = 'completed'
    statusLabel = 'Hoàn thành'
  } else if (isPending) {
    statusVariant = 'pending'
    statusLabel = 'Chờ đối soát'
  } else if (trip.status === 'CANCELLED') {
    statusVariant = 'neutral'
    statusLabel = 'Đã huỷ'
  } else {
    statusVariant = 'matched'
    statusLabel = 'Đã khớp'
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 transition hover:bg-[color-mix(in_srgb,var(--theme-brand-primary)_4%,transparent)] active:scale-[0.99] touch-manipulation"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
          {trip.code ? `${trip.code} · ` : ''}{trip.client.name}
        </span>
        <StatusBadgePro variant={statusVariant} label={statusLabel} size="sm" />
      </div>
      <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>
        {tripDate}{tripDate && ' | '}{resolveRoute(trip)}
      </p>
      {types && (
        <div className="mt-1.5 flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Car className="h-3 w-3" />
            {types}
          </span>
        </div>
      )}
    </button>
  )
}

// ─── Unmatched WO row ─────────────────────────────────────────────────────────

function UnmatchedRow({ wo, onClick, isLast }: { wo: WorkOrder; onClick: () => void; isLast?: boolean }) {
  const containerNums = wo.containers.map(c => c.containerNumber).filter(Boolean).slice(0, 1).join(', ')

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 transition hover:bg-[color-mix(in_srgb,var(--theme-brand-primary)_4%,transparent)] active:scale-[0.99] touch-manipulation"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
          {wo.code} · {wo.driver.name}
        </span>
        <StatusBadgePro variant="warning" label="Chờ ghép" size="sm" />
      </div>
      <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>
        {wo.client.name} | {resolveRoute(wo)}
      </p>
      <div className="mt-1.5 flex items-center gap-3">
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

// ─── Desktop dashboard ────────────────────────────────────────────────────────

function DesktopDashboard() {
  const navigate = useNavigate()
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()

  const { data: workOrders = [] } = useWorkOrders({ dateFrom, dateTo })
  const { data: trips = [] } = useTripOrders({ dateFrom, dateTo })
  const { data: summary } = useDashboardSummary(dateFrom, dateTo)

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

  const stats = [
    {
      label: 'Chuyến chưa ghép',
      value: String(pendingWOs.length),
      valueColor: pendingWOs.length > 0 ? 'var(--theme-status-warning)' : undefined,
      icon: <AlertTriangle className="h-5 w-5" />,
      onClick: () => navigate('/accountant/work-orders'),
    },
    {
      label: 'Đơn chờ đối soát',
      value: String(pendingTrips.length),
      valueColor: pendingTrips.length > 0 ? 'var(--theme-status-warning)' : undefined,
      icon: <Clock className="h-5 w-5" />,
      onClick: () => navigate('/accountant/trips'),
    },
    {
      label: 'Lương sản lượng TX',
      value: fmt(totalDriverSalary),
      icon: <Wallet className="h-5 w-5" />,
      onClick: () => navigate('/accountant/salary-setup'),
    },
    {
      label: 'Doanh thu (đơn hàng tháng)',
      value: fmt(revenue),
      icon: <DollarSign className="h-5 w-5" />,
      onClick: () => navigate('/accountant/trips'),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="typo-display">Tổng quan</h1>
          <p className="typo-body-sm mt-1">Tháng {month}/{year}</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
        </div>
      </div>

      <StatsGrid stats={stats} columns={4} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Chuyến chưa ghép */}
        <div className="card p-4 flex flex-col" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: 'var(--theme-status-warning)' }} />
            <h2 className="typo-h2" style={{ color: 'var(--theme-text-primary)' }}>Chuyến chưa ghép</h2>
            {pendingWOs.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold" style={{ background: 'var(--theme-status-warning)', color: '#fff' }}>
                {pendingWOs.length}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: '320px' }}>
            {unmatchedWOs.length === 0 ? (
              <EmptyState icon={CheckCircle2} text="Tất cả phiếu đã ghép xong" />
            ) : (
              unmatchedWOs.map((wo, i) => (
                <UnmatchedRow key={wo.id} wo={wo} isLast={i === unmatchedWOs.length - 1} onClick={() => navigate(`/accountant/match/${wo.id}`)} />
              ))
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--theme-border-default)', paddingTop: 12, marginTop: 12 }}>
            <button onClick={() => navigate('/accountant/work-orders')} className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold transition hover:opacity-70" style={{ color: 'var(--theme-brand-primary)' }}>
              Mở trang Ghép chuyến <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Đơn hàng gần đây */}
        <div className="card p-4 flex flex-col" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
          <div className="mb-4">
            <h2 className="typo-h2" style={{ color: 'var(--theme-text-primary)' }}>Đơn hàng gần đây</h2>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: '320px' }}>
            {sortedTrips.length === 0 ? (
              <EmptyState icon={FileText} text="Chưa có đơn hàng nào" illustrated />
            ) : (
              sortedTrips.map((trip, i) => (
                <TripRow key={trip.id} trip={trip} isLast={i === sortedTrips.length - 1} onClick={() => navigate(`/accountant/trip/${trip.id}`)} />
              ))
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--theme-border-default)', paddingTop: 12, marginTop: 12 }}>
            <button onClick={() => navigate('/accountant/trips')} className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold transition hover:opacity-70" style={{ color: 'var(--theme-brand-primary)' }}>
              Xem tất cả đơn hàng <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
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
  const { data: summary } = useDashboardSummary(dateFrom, dateTo)

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

  const stats = [
    { label: 'Chuyến chưa ghép', value: String(pendingWOs.length), valueColor: pendingWOs.length > 0 ? 'var(--theme-status-warning)' : undefined, icon: <AlertTriangle className="h-5 w-5" />, onClick: () => navigate('/accountant/work-orders') },
    { label: 'Đơn chờ đối soát', value: String(pendingTrips.length), valueColor: pendingTrips.length > 0 ? 'var(--theme-status-warning)' : undefined, icon: <Clock className="h-5 w-5" />, onClick: () => navigate('/accountant/trips') },
    { label: 'Lương sản lượng TX', value: fmt(totalDriverSalary), icon: <Wallet className="h-5 w-5" />, onClick: () => navigate('/accountant/salary-setup') },
    { label: 'Doanh thu tháng', value: fmt(revenue), icon: <DollarSign className="h-5 w-5" />, onClick: () => navigate('/accountant/trips') },
  ]

  const quickActions = [
    { id: 'import', label: 'Nhập đơn', icon: <Plus className="h-4 w-4" />, onClick: () => navigate('/accountant/import-orders'), primary: true },
    { id: 'reconcile', label: 'Ghép chuyến', icon: <Briefcase className="h-4 w-4" />, onClick: () => navigate('/accountant/work-orders') },
    { id: 'partners', label: 'Nhà thầu', icon: <Users className="h-4 w-4" />, onClick: () => navigate('/accountant/partners') },
    { id: 'pricing', label: 'Bảng giá', icon: <Tag className="h-4 w-4" />, onClick: () => navigate('/accountant/pricing') },
    { id: 'salary', label: 'Kỳ lương', icon: <Wallet className="h-4 w-4" />, onClick: () => navigate('/accountant/salary-setup') },
  ]

  return (
    <div className="space-y-4 pb-8">
      <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />

      <StatsGrid stats={stats} columns={2} />

      <div className="flex flex-wrap gap-2">
        {quickActions.map(a => (
          <button
            key={a.id}
            onClick={a.onClick}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:opacity-80 active:scale-[0.97] touch-manipulation"
            style={{
              background: a.primary ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
              borderColor: a.primary ? 'transparent' : 'var(--theme-border-default)',
              color: a.primary ? 'white' : 'var(--theme-text-primary)',
            }}
          >
            <span style={{ color: a.primary ? 'white' : 'var(--theme-brand-primary)' }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      <WorkbenchCard
        title="Đơn hàng"
        footerLabel="Xem tất cả đơn hàng"
        onFooter={() => navigate('/accountant/trips')}
        minHeight="200px"
      >
        {recentTrips.length === 0 ? (
          <EmptyState icon={FileText} text="Chưa có đơn hàng nào" illustrated />
        ) : (
          recentTrips.map((trip, i) => (
            <TripRow key={trip.id} trip={trip} isLast={i === recentTrips.length - 1} onClick={() => navigate(`/accountant/trip/${trip.id}`)} />
          ))
        )}
      </WorkbenchCard>

      <WorkbenchCard
        title="Chuyến chưa ghép"
        footerLabel="Mở trang Ghép chuyến"
        onFooter={() => navigate('/accountant/work-orders')}
        minHeight="200px"
      >
        {unmatchedWOs.length === 0 ? (
          <EmptyState icon={CheckCircle2} text="Không có phiếu chờ" />
        ) : (
          unmatchedWOs.map((wo, i) => (
            <UnmatchedRow key={wo.id} wo={wo} isLast={i === unmatchedWOs.length - 1} onClick={() => navigate(`/accountant/match/${wo.id}`)} />
          ))
        )}
      </WorkbenchCard>
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function AccountantDashboard() {
  const isMobile = useIsMobile(1024)
  return isMobile ? <MobileDashboard /> : <DesktopDashboard />
}
