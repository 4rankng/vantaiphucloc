import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useWorkOrders,
  useTripOrders,
  useDashboardSummary,
} from '@/hooks/use-queries'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAuth } from '@/contexts/AuthContext'
import { useMonthParams } from './use-month-params'
import { formatCurrencyFull } from '@/data/domain'
import {
  TrendingUp,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Link2,
  ArrowRight,
  Clock,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Container,
} from 'lucide-react'
import { StatusBadge } from '@/components/dashboard/StatusBadge'

const fmt = (n: number) => n.toLocaleString('vi-VN') + '₫'
const compact = (n: number) =>
  n >= 1e9 ? (n / 1e9).toFixed(2) + ' tỷ' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' tr' : n.toLocaleString('vi-VN')

/* ── KPI card (phuc-loc-pages style) ── */
function KPI({ label, value, tone = 'primary' }: { label: string; value: string; tone?: 'primary' | 'success' | 'warning' | 'info' }) {
  const tones: Record<string, string> = {
    primary: `color: var(--theme-brand-primary); background: color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)`,
    success: `color: var(--theme-status-success, #16a34a); background: color-mix(in srgb, var(--theme-status-success, #16a34a) 10%, transparent)`,
    warning: `color: var(--theme-status-warning); background: color-mix(in srgb, var(--theme-status-warning) 12%, transparent)`,
    info: `color: var(--theme-status-info, #3b82f6); background: color-mix(in srgb, var(--theme-status-info, #3b82f6) 10%, transparent)`,
  }
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
    >
      <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{label}</div>
      <div
        className="mt-1 inline-flex items-baseline rounded-md px-1.5 font-display text-lg font-bold"
        style={{ ...(tones[tone] ? {} : {}), color: tones[tone]?.split(';')[0]?.split(':')[1]?.trim() }}
      >
        <span
          className="rounded-md px-1.5 py-0.5"
          dangerouslySetInnerHTML={{
            __html: `<span style="${tones[tone]}">${value}</span>`,
          }}
        />
      </div>
    </div>
  )
}

/* ── PeriodSwitcher (inline, compact) ── */
function PeriodSwitcher({ label, sublabel, onPrev, onNext }: { label: string; sublabel?: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-xl border px-2 py-1.5"
      style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
    >
      <button
        onClick={onPrev}
        className="flex h-7 w-7 items-center justify-center rounded-lg transition active:scale-90"
        style={{ color: 'var(--theme-text-primary)' }}
        aria-label="Tháng trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="text-center">
        <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{label}</p>
        {sublabel && (
          <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{sublabel}</p>
        )}
      </div>
      <button
        onClick={onNext}
        className="flex h-7 w-7 items-center justify-center rounded-lg transition active:scale-90"
        style={{ color: 'var(--theme-text-primary)' }}
        aria-label="Tháng sau"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

export function AccountantDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const { year, month, dateFrom, dateTo, sublabel, onPrev, onNext } = useMonthParams()

  const { data: workOrders = [], isLoading: loadingWO } = useWorkOrders({ dateFrom, dateTo })
  const { data: trips = [], isLoading: loadingTrips } = useTripOrders({ dateFrom, dateTo })
  const { data: summary, isLoading: loadingSummary } = useDashboardSummary()

  const loading = loadingWO || loadingTrips

  const pendingWOs = useMemo(
    () => workOrders.filter(w => w.status === 'PENDING'),
    [workOrders],
  )

  const confirmedTrips = useMemo(
    () => trips.filter(t => t.isConfirmed || t.status === 'COMPLETED'),
    [trips],
  )

  const totalDriverSalary = useMemo(
    () => workOrders.reduce((s, w) => s + (w.earning ?? 0), 0),
    [workOrders],
  )

  const revenue = summary?.totalRevenue ?? trips.reduce((s, t) => s + (t.revenue ?? 0), 0)

  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [trips],
  )

  const topPendingWOs = useMemo(
    () => pendingWOs.slice(0, 10),
    [pendingWOs],
  )

  if (loading && loadingSummary) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  if (isMobile) {
    return <MobileDashboard />
  }

  /* ── Desktop 3-column workbench ── */
  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <section className="flex items-start justify-between gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 flex-1">
          <KPI label="Doanh thu tháng" value={fmt(revenue)} tone="primary" />
          <KPI label="Chi phí tài xế" value={fmt(totalDriverSalary)} tone="info" />
          <KPI label="Lệnh chờ ghép" value={`${trips.filter(t => t.status === 'PENDING' || t.status === 'DRAFT').length}`} tone="warning" />
          <KPI label="Phiếu chưa ghép" value={`${pendingWOs.length}`} tone="warning" />
          <KPI label="Đã chốt khách" value={`${confirmedTrips.length}`} tone="success" />
        </div>
        <PeriodSwitcher label={`Tháng ${month}/${year}`} sublabel={sublabel} onPrev={onPrev} onNext={onNext} />
      </section>

      {/* 3-column workbench */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Trip Orders */}
        <div className="lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Lệnh điều hành
            </h2>
            <button
              onClick={() => navigate('/accountant/create-trip')}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              + Tạo lệnh
            </button>
          </div>
          <div className="space-y-2">
            {sortedTrips.slice(0, 8).map(trip => (
              <button
                key={trip.id}
                onClick={() => navigate(`/accountant/trip/${trip.id}`)}
                className="w-full rounded-2xl border p-4 text-left transition hover:shadow-sm"
                style={{
                  background: 'var(--surface-bg)',
                  borderColor: 'var(--surface-border)',
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs" style={{ color: 'var(--theme-text-muted)' }}>LDP-{trip.id}</span>
                      <span
                        className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium"
                        style={{ background: 'var(--theme-bg-tertiary)' }}
                      >
                        {trip.containers.length}× {trip.workType ?? ''}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                      {trip.clientName}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{trip.route}</div>
                  </div>
                  <StatusBadge status={trip.status} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-2.5" style={{ borderColor: 'var(--surface-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    {trip.driverName ?? '—'}
                  </span>
                  <span className="font-mono text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                    {fmt(trip.revenue ?? 0)}
                  </span>
                </div>
              </button>
            ))}
            <button
              onClick={() => navigate('/accountant/trips')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-xs font-medium transition hover:opacity-70"
              style={{ borderColor: 'var(--surface-border)', color: 'var(--theme-text-muted)' }}
            >
              Xem tất cả lệnh <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Middle: Match suggestions */}
        <div className="lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              <Sparkles className="h-4 w-4" style={{ color: 'var(--theme-status-warning)' }} />
              Gợi ý ghép phiếu
            </h2>
            {pendingWOs.length > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ background: 'color-mix(in srgb, var(--theme-status-warning) 15%, transparent)', color: 'var(--theme-status-warning)' }}
              >
                {pendingWOs.length} mới
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {pendingWOs.length === 0 ? (
              <div className="rounded-2xl border p-8 text-center" style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}>
                <CheckCircle2 className="mx-auto h-8 w-8 mb-2" style={{ color: 'var(--theme-brand-primary)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Tất cả phiếu đã ghép</p>
              </div>
            ) : (
              topPendingWOs.slice(0, 5).map(wo => (
                <div
                  key={wo.id}
                  className="rounded-2xl border p-4"
                  style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 font-mono text-xs"
                      style={{ background: 'color-mix(in srgb, var(--theme-status-info, #3b82f6) 10%, transparent)', color: 'var(--theme-status-info, #3b82f6)' }}
                    >
                      WO-{wo.id}
                    </span>
                    {wo.workType && (
                      <span className="rounded px-1 font-mono text-[10px]" style={{ background: 'var(--theme-bg-tertiary)' }}>
                        {wo.workType}
                      </span>
                    )}
                    {wo.earning > 0 && (
                      <span className="ml-auto font-mono text-xs font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>
                        {compact(wo.earning)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                    {wo.driverName}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    {wo.route}
                    {wo.containers?.[0]?.containerNumber && (
                      <span> · {wo.containers[0].containerNumber}</span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => navigate(`/accountant/match/${wo.id}`)}
                      className="flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
                      style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                    >
                      Ghép lệnh
                    </button>
                    <button
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-70"
                      style={{ borderColor: 'var(--surface-border)', background: 'transparent' }}
                    >
                      Bỏ qua
                    </button>
                  </div>
                </div>
              ))
            )}
            <button
              onClick={() => navigate('/accountant/work-orders')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-xs font-medium transition hover:opacity-70"
              style={{ borderColor: 'var(--surface-border)', color: 'var(--theme-text-muted)' }}
            >
              Mở đối soát đầy đủ <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Unmatched work orders */}
        <div className="lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
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
            {workOrders.filter(w => w.status !== 'MATCHED' && w.status !== 'COMPLETED').slice(0, 8).map(wo => (
              <button
                key={wo.id}
                onClick={() => navigate(`/accountant/match/${wo.id}`)}
                className="group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:shadow-sm"
                style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-semibold"
                  style={{
                    background: 'color-mix(in srgb, var(--theme-status-info, #3b82f6) 10%, transparent)',
                    color: 'var(--theme-status-info, #3b82f6)',
                  }}
                >
                  {wo.containers?.length ?? 0}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                      WO-{wo.id}
                    </span>
                    <span className="rounded px-1 font-mono text-[10px]" style={{ background: 'var(--theme-bg-tertiary)' }}>
                      {wo.workType}
                    </span>
                  </div>
                  <div className="truncate text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                    {wo.driverName}
                  </div>
                  <div className="truncate text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    {wo.route}
                  </div>
                </div>
                <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {wo.createdAt ? wo.createdAt.slice(5, 10).replace('-', '/') : '—'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

/* ── Mobile fallback: compact stacked layout ── */
function MobileDashboard() {
  const navigate = useNavigate()
  const { year, month, dateFrom, dateTo, sublabel, onPrev, onNext } = useMonthParams()
  const { data: workOrders = [], isLoading: loadingWO } = useWorkOrders({ dateFrom, dateTo })
  const { data: trips = [], isLoading: loadingTrips } = useTripOrders({ dateFrom, dateTo })
  const { data: summary } = useDashboardSummary()

  const pendingWOs = useMemo(() => workOrders.filter(w => w.status === 'PENDING'), [workOrders])
  const confirmedTrips = useMemo(() => trips.filter(t => t.isConfirmed || t.status === 'COMPLETED'), [trips])
  const totalDriverSalary = useMemo(() => workOrders.reduce((s, w) => s + (w.earning ?? 0), 0), [workOrders])
  const revenue = summary?.totalRevenue ?? trips.reduce((s, t) => s + (t.revenue ?? 0), 0)
  const recentTrips = useMemo(() => [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), [trips])

  return (
    <div className="space-y-4 pb-8">
      {/* Period */}
      <div className="flex justify-center">
        <PeriodSwitcher label={`Tháng ${month}/${year}`} sublabel={sublabel} onPrev={onPrev} onNext={onNext} />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3">
        <KPI label="Doanh thu" value={compact(revenue)} tone="primary" />
        <KPI label="Chi phí TX" value={compact(totalDriverSalary)} tone="info" />
        <KPI label="Chờ ghép" value={`${pendingWOs.length}`} tone="warning" />
        <KPI label="Đã chốt" value={`${confirmedTrips.length}`} tone="success" />
      </div>

      {/* Recent trips */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
            Lệnh điều hành gần đây
          </h3>
          <button
            onClick={() => navigate('/accountant/trips')}
            className="text-[11px] font-semibold"
            style={{ color: 'var(--theme-brand-primary)' }}
          >
            Xem tất cả
          </button>
        </div>
        <div className="space-y-2">
          {recentTrips.length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)' }}>
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có lệnh nào</p>
            </div>
          ) : (
            recentTrips.map(trip => (
              <button
                key={trip.id}
                onClick={() => navigate(`/accountant/trip/${trip.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.98]"
                style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)', color: 'var(--theme-brand-primary)' }}
                >
                  <Container className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                    {trip.clientName}
                  </p>
                  <p className="truncate text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
                    {trip.route}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
                    {compact(trip.revenue ?? 0)}
                  </p>
                  <StatusBadge status={trip.status} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Tạo lệnh', path: '/accountant/create-trip', icon: Plus },
          { label: 'Đối soát', path: '/accountant/work-orders', icon: Link2 },
          { label: 'Bảng giá', path: '/accountant/pricing', icon: AlertCircle },
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
