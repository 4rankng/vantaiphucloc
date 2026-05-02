import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useWorkOrders,
  useTripOrders,
  useDashboardSummary,
} from '@/hooks/use-queries'
import { useAuth } from '@/contexts/AuthContext'
import {
  StatCard,
  QuickAction,
  SectionCard,
  StatusBadge,
  EmptyState,
  PeriodSwitcher,
} from '@/components/dashboard'
import { useMonthParams } from './use-month-params'
import { formatCurrencyFull } from '@/data/domain'
import {
  TrendingUp,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  GitMerge,
  FileSpreadsheet,
  Receipt,
  Users,
  FileText,
  Container,
  ArrowRight,
  Truck,
  Building2,
} from 'lucide-react'

const PREVIEW_COUNT = 5

export function AccountantDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { year, month, dateFrom, dateTo, sublabel, onPrev, onNext } = useMonthParams()

  const { data: workOrders = [], isLoading: loadingWO } = useWorkOrders({ dateFrom, dateTo })
  const { data: trips = [], isLoading: loadingTrips } = useTripOrders({ dateFrom, dateTo })
  const { data: summary, isLoading: loadingSummary } = useDashboardSummary()

  const loading = loadingWO || loadingTrips

  // ── KPI derivations
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

  // ── Preview lists
  const recentTrips = useMemo(
    () =>
      [...trips]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, PREVIEW_COUNT),
    [trips],
  )

  const topPendingWOs = useMemo(
    () => pendingWOs.slice(0, PREVIEW_COUNT),
    [pendingWOs],
  )

  const driverSalaryList = useMemo(
    () =>
      [...(summary?.driverSalarySummary ?? [])]
        .sort((a, b) => b.totalSalary - a.totalSalary)
        .slice(0, 5),
    [summary],
  )

  const uniqueDriverCount = useMemo(
    () => new Set(workOrders.filter(w => w.status !== 'PENDING').map(w => w.driverId)).size,
    [workOrders],
  )

  if (loading && loadingSummary) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-24 rounded-2xl animate-pulse"
            style={{ background: 'var(--theme-bg-tertiary)' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      {/* ── Period ── */}
      <div className="flex justify-center sm:justify-end">
        <div className="w-full sm:w-80">
          <PeriodSwitcher
            label={`Tháng ${month} / ${year}`}
            sublabel={sublabel}
            onPrev={onPrev}
            onNext={onNext}
          />
        </div>
      </div>

      {/* ── KPI Stats ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          icon={TrendingUp}
          label="Doanh thu kỳ này"
          value={loadingSummary ? '...' : formatCurrencyFull(revenue)}
          hint="VNĐ — từ lệnh điều hành"
          tone="primary"
        />
        <StatCard
          icon={Wallet}
          label="Lương phải trả"
          value={formatCurrencyFull(totalDriverSalary)}
          hint="VNĐ — tổng lương tài xế"
          tone="info"
        />
        <StatCard
          icon={AlertTriangle}
          label="Chờ đối soát"
          value={`${pendingWOs.length}`}
          hint="phiếu làm việc chưa ghép"
          tone="warning"
          onClick={() => navigate('/accountant/work-orders')}
        />
        <StatCard
          icon={CheckCircle2}
          label="Đã chốt với khách"
          value={`${confirmedTrips.length} / ${trips.length}`}
          hint="lệnh đã xác nhận"
          tone="primary"
          onClick={() => navigate('/accountant/trips')}
        />
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h2
          className="mb-2 text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          Thao tác nhanh
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            icon={ClipboardList}
            title="Tạo lệnh điều hành"
            description="Lệnh mới cho khách hàng"
            onClick={() => navigate('/accountant/create-trip')}
          />
          <QuickAction
            icon={GitMerge}
            title="Đối soát WO → TO"
            description="Ghép phiếu làm việc với lệnh"
            badge={pendingWOs.length > 0 ? `${pendingWOs.length} mới` : undefined}
            onClick={() => navigate('/accountant/work-orders')}
          />
          <QuickAction
            icon={FileSpreadsheet}
            title="Đối soát với khách"
            description="Nhập Excel & xác nhận đã chốt"
            onClick={() => navigate('/accountant/work-orders?tab=client')}
          />
          <QuickAction
            icon={Receipt}
            title="Bảng giá"
            description="Quản lý giá theo số lượng"
            onClick={() => navigate('/accountant/pricing')}
          />
          <QuickAction
            icon={Users}
            title="Khách hàng"
            description="Thêm / sửa thông tin khách"
            onClick={() => navigate('/accountant/partners')}
          />
          <QuickAction
            icon={Wallet}
            title="Tính lương kỳ này"
            description="Chốt lương tài xế"
            onClick={() => navigate('/accountant/salary-setup')}
          />
        </div>
      </div>

      {/* ── Two-column: Recent Trips + Reconcile Suggestions ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Lệnh điều hành gần đây */}
        <SectionCard
          title="Lệnh điều hành gần đây"
          count={trips.length}
          icon={FileText}
          className="lg:col-span-2"
          onAction={() => navigate(`/accountant/trips?month=${month}&year=${year}`)}
        >
          {recentTrips.length === 0 ? (
            <EmptyState icon={FileText} title="Chưa có lệnh nào trong kỳ" />
          ) : (
            <div className="space-y-2">
              {recentTrips.map(trip => (
                <button
                  key={trip.id}
                  onClick={() => navigate(`/accountant/trip/${trip.id}`)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-3 text-left transition-[var(--transition-smooth)]"
                  style={{
                    background: 'color-mix(in srgb, var(--theme-brand-primary-light) 40%, transparent)',
                    touchAction: 'manipulation',
                  }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: 'var(--theme-bg-secondary)',
                      color: 'var(--theme-brand-primary)',
                      border: '1px solid var(--theme-border-default)',
                    }}
                  >
                    <Container className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                        {trip.clientName}
                      </p>
                      <StatusBadge status={trip.status} />
                    </div>
                    <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
                      <span className="font-mono font-semibold" style={{ color: 'var(--theme-text-secondary)', opacity: 0.7 }}>
                        LDP-{trip.id}
                      </span>
                      <span className="mx-1.5">·</span>
                      {trip.route}
                      <span className="mx-1.5">·</span>
                      {trip.containers.length}× {trip.workType ?? ''}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
                      {formatCurrencyFull(trip.revenue ?? 0)}
                      <span className="ml-0.5 text-[10px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>đ</span>
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
                      {trip.createdAt ? trip.createdAt.slice(5, 10).replace('-', '/') : '—'}
                    </p>
                  </div>
                  <ArrowRight
                    className="hidden h-4 w-4 transition-[var(--transition-smooth)] group-hover:translate-x-0.5 sm:block"
                    style={{ color: 'var(--theme-text-muted)' }}
                  />
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Right: Gợi ý đối soát */}
        <SectionCard
          title="Gợi ý đối soát"
          count={pendingWOs.length}
          icon={GitMerge}
          onAction={() => navigate('/accountant/work-orders?tab=match')}
        >
          {topPendingWOs.length === 0 ? (
            <EmptyState icon={GitMerge} title="Không có phiếu chờ khớp" />
          ) : (
            <div className="space-y-2">
              {topPendingWOs.map(wo => (
                <button
                  key={wo.id}
                  onClick={() => navigate(`/accountant/match/${wo.id}`)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-[var(--transition-smooth)]"
                  style={{
                    background: 'color-mix(in srgb, var(--theme-status-warning) 5%, transparent)',
                    touchAction: 'manipulation',
                  }}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: 'var(--theme-bg-secondary)',
                      color: 'var(--theme-status-warning)',
                      border: '1px solid var(--theme-border-default)',
                    }}
                  >
                    <GitMerge className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                      {wo.driverName}
                    </p>
                    <p className="truncate text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
                      {wo.containers?.[0]?.containerNumber ?? '—'}
                      <span className="mx-1.5">·</span>
                      {wo.route}
                    </p>
                  </div>
                  <ArrowRight
                    className="hidden h-4 w-4 shrink-0 transition-[var(--transition-smooth)] group-hover:translate-x-0.5 sm:block"
                    style={{ color: 'var(--theme-text-muted)' }}
                  />
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Bottom row: Salary + Driver Leaderboard ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Lương kỳ này */}
        <SectionCard
          title="Lương kỳ này"
          icon={Wallet}
          actionLabel="Xem chi tiết"
          onAction={() => navigate('/accountant/salary-setup')}
        >
          <div
            className="rounded-xl p-4"
            style={{ background: 'var(--gradient-primary)', color: '#fff' }}
          >
            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ opacity: 0.8 }}>
              Tổng lương dự kiến
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatCurrencyFull(totalDriverSalary)}
              <span className="ml-1 text-xs font-medium" style={{ opacity: 0.8 }}>đ</span>
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <p className="text-base font-bold">{uniqueDriverCount}</p>
                <p className="text-[10px] uppercase tracking-wide" style={{ opacity: 0.8 }}>Tài xế</p>
              </div>
              <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <p className="text-base font-bold">{workOrders.length}</p>
                <p className="text-[10px] uppercase tracking-wide" style={{ opacity: 0.8 }}>Chuyến</p>
              </div>
              <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <p className="text-base font-bold tabular-nums">
                  {uniqueDriverCount > 0 ? formatCurrencyFull(Math.round(totalDriverSalary / uniqueDriverCount / 1000) * 1000) : '0'}
                </p>
                <p className="text-[10px] uppercase tracking-wide" style={{ opacity: 0.8 }}>TB/chuyến</p>
              </div>
            </div>
          </div>
          <div
            className="mt-3 flex items-center justify-between rounded-xl border border-dashed p-3"
            style={{ borderColor: 'var(--theme-border-default)' }}
          >
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              Trạng thái kỳ lương
            </p>
            <StatusBadge status="OPEN" />
          </div>
        </SectionCard>

        {/* Top tài xế */}
        <SectionCard
          title="Top tài xế kỳ này"
          icon={Truck}
          actionLabel="Xem tất cả"
          onAction={() => navigate('/accountant/salary-setup')}
        >
          {driverSalaryList.length === 0 ? (
            <EmptyState icon={Truck} title="Chưa có dữ liệu tài xế" />
          ) : (
            <div className="space-y-2.5">
              {driverSalaryList.map((d, i) => (
                <button
                  key={d.driverId}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-[var(--transition-smooth)]"
                  style={{ touchAction: 'manipulation' }}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold`}
                    style={{
                      background: i === 0 ? 'var(--gradient-primary)' : 'var(--theme-bg-tertiary)',
                      color: i === 0 ? '#fff' : 'var(--theme-text-secondary)',
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                      {d.driverName}
                    </p>
                    <p className="flex items-center gap-1 truncate text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
                      <Building2 className="h-3 w-3" />
                      {d.tractorPlate ?? '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
                      {formatCurrencyFull(d.totalSalary)}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
                      {d.totalJobs} chuyến
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <p className="mt-10 text-center text-xs" style={{ color: 'var(--theme-text-muted)' }}>
        Phúc Lộc Transport · Hệ thống vận tải container
      </p>
    </div>
  )
}
