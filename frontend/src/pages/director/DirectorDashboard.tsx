import { useState, useMemo, useCallback, type ReactNode, useEffect } from 'react'
import { Truck, AlertCircle, CheckCircle2, DollarSign, ChevronLeft, ChevronRight, TrendingUp, ArrowUpRight, Calendar, Activity, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getTripOrderStatusBadge } from '@/data/domain'
import { useTripOrders } from '@/hooks/use-queries'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BrandIcon } from '@/components/atoms/BrandIcon'
import { BarChartWidget } from '@/components/shared/Charts'
import type { AuditLogEntry } from '@/services/api/audit.api'
import { getAuditLogs } from '@/services/api/audit.api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const compact = (n: number) =>
  n >= 1e9
    ? (n / 1e9).toFixed(2) + ' tỷ'
    : n >= 1e6
    ? (n / 1e6).toFixed(1) + ' tr'
    : n.toLocaleString('vi-VN')

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

const MONTH_NAMES = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']

// ─── Component ────────────────────────────────────────────────────────────────

export function DirectorDashboard() {
  const navigate = useNavigate()
  const { data: trips = [], isLoading: loading } = useTripOrders()
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])

  useEffect(() => {
    let cancelled = false
    getAuditLogs({ pageSize: 8 }).then(data => {
      if (!cancelled) setAuditLogs(data.items)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })

  const monthlyTrips = useMemo(() => {
    return trips.filter(t => {
      const d = new Date(t.tripDate)
      return d.getFullYear() === month.year && d.getMonth() + 1 === month.month
    })
  }, [trips, month])

  // KPI stats — all scoped to selected month
  const requestedThisMonth = monthlyTrips.length
  const completedThisMonth = useMemo(() => monthlyTrips.filter(t => t.status === 'MATCHED' || (t.status as string) === 'COMPLETED').length, [monthlyTrips])
  const pendingThisMonth = useMemo(() => monthlyTrips.filter(t => t.status === 'PENDING').length, [monthlyTrips])
  const revenueThisMonth = useMemo(() => monthlyTrips.reduce((s, t) => s + (t.revenue ?? t.unitPrice), 0), [monthlyTrips])

  // Recent trips (last 5)
  const recentTrips = useMemo(() => {
    return [...trips]
      .sort((a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime())
      .slice(0, 5)
  }, [trips])

  // Daily bar chart — one bar per day in the selected month
  const dailyData = useMemo(() => {
    const days = daysInMonth(month.year, month.month)
    const counts = Array(days).fill(0)
    for (const t of monthlyTrips) {
      const day = new Date(t.tripDate).getDate()
      counts[day - 1]++
    }
    return counts
  }, [monthlyTrips, month])

  const barData = useMemo(() => {
    const days = daysInMonth(month.year, month.month)
    return {
      labels: Array.from({ length: days }, (_, i) => String(i + 1)),
      datasets: [
        {
          label: 'Chuyến',
          data: dailyData,
          backgroundColor: 'var(--theme-brand-primary)',
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    }
  }, [dailyData, month])

  const barOptions = useMemo(() => ({
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          callback: (_: unknown, index: number) => (index + 1) % 5 === 1 ? String(index + 1) : '',
          maxRotation: 0,
          font: { size: 11 },
          color: 'var(--theme-text-muted)',
        },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: { stepSize: 1, precision: 0, font: { size: 11 }, color: 'var(--theme-text-muted)' },
      },
    },
  }), [])

  const prevMonth = useCallback(() => {
    setMonth(prev => {
      const m = prev.month === 1 ? 12 : prev.month - 1
      const y = prev.month === 1 ? prev.year - 1 : prev.year
      return { year: y, month: m }
    })
  }, [])

  const nextMonth = useCallback(() => {
    setMonth(prev => {
      const m = prev.month === 12 ? 1 : prev.month + 1
      const y = prev.month === 12 ? prev.year + 1 : prev.year
      return { year: y, month: m }
    })
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-8">

      {/* Header with Month navigator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="typo-h1 tracking-tight" style={{ color: 'var(--theme-text-primary)' }}>
            Tổng quan
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
            Dữ liệu tháng {MONTH_NAMES[month.month - 1]} {month.year}
          </p>
        </div>
        <div 
          className="flex items-center gap-1 rounded-xl px-1 py-1"
          style={{ background: 'var(--theme-bg-tertiary)' }}
        >
          <button
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white active:scale-95"
            style={{ color: 'var(--theme-text-secondary)' }}
            aria-label="Tháng trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
            <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
              {MONTH_NAMES[month.month - 1]}, {month.year}
            </span>
          </div>
          <button
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white active:scale-95"
            style={{ color: 'var(--theme-text-secondary)' }}
            aria-label="Tháng sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI stat cards - Redesigned */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Tổng chuyến"
          value={requestedThisMonth.toLocaleString('vi-VN')}
          icon={<Truck className="h-5 w-5" />}
          trend={requestedThisMonth > 0 ? '+12%' : undefined}
          color="primary"
          loading={loading}
        />
        <StatCard
          label="Đã khớp"
          value={String(completedThisMonth)}
          icon={<CheckCircle2 className="h-5 w-5" />}
          trend={completedThisMonth > 0 ? '+8%' : undefined}
          color="success"
          loading={loading}
        />
        <StatCard
          label="Chờ xử lý"
          value={String(pendingThisMonth)}
          icon={<AlertCircle className="h-5 w-5" />}
          color="warning"
          loading={loading}
        />
        <StatCard
          label="Doanh thu"
          value={compact(revenueThisMonth) + ' ₫'}
          icon={<DollarSign className="h-5 w-5" />}
          trend={revenueThisMonth > 0 ? '+15%' : undefined}
          color="info"
          loading={loading}
        />
      </section>

      {/* Main content: recent trips + weekly chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">

        {/* Recent trip orders table - Redesigned */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
            boxShadow: 'var(--theme-shadow-card)',
          }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Lệnh vận chuyển gần đây
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                {recentTrips.length} lệnh mới nhất
              </p>
            </div>
            <button
              onClick={() => navigate('/director/trips')}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition hover:bg-[var(--theme-brand-primary-light)]"
              style={{ color: 'var(--theme-brand-primary)' }}
            >
              Xem tất cả
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
              ))}
            </div>
          ) : recentTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BrandIcon name="calkey" className="w-24 h-24 mb-3 opacity-90" />
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Chưa có lệnh nào</p>
              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Các lệnh mới sẽ xuất hiện ở đây</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--theme-border-light)' }}>
              {recentTrips.map((t) => {
                const badge = getTripOrderStatusBadge(t.status)
                const date = new Date(t.tripDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                const tripCode = `T${String(t.id).padStart(4, '0')}`
                const route = [t.pickupLocation?.name, t.dropoffLocation?.name].filter(Boolean).join(' → ') || t.route
                const tripWorkType = t.containers[0]?.workType

                return (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/director/trip/${t.id}`)}
                    className="w-full text-left p-4 transition hover:bg-[var(--theme-bg-tertiary)] active:scale-[0.995]"
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--theme-brand-primary-light)' }}
                      >
                        <Truck className="h-4.5 w-4.5" style={{ color: 'var(--theme-brand-primary)' }} />
                      </div>
                      
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold font-mono" style={{ color: 'var(--theme-text-primary)' }}>{tripCode}</span>
                          <StatusBadge variant={badge.variant} label={badge.label} />
                        </div>
                        <p className="text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>
                          {t.partner.name} <span style={{ color: 'var(--theme-text-muted)' }}>•</span> {route}
                        </p>
                      </div>
                      
                      {/* Right side */}
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>{date}</div>
                        {tripWorkType && (
                          <span
                            className="mt-1 inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
                          >
                            {tripWorkType}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Daily trips bar chart - Redesigned */}
        <div
          className="rounded-lg p-5"
          style={{
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
            boxShadow: 'var(--theme-shadow-card)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Biểu đồ chuyến đi
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                {MONTH_NAMES[month.month - 1]}, {month.year}
              </p>
            </div>
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {requestedThisMonth} chuyến
            </div>
          </div>
          <BarChartWidget data={barData} height={240} options={barOptions} />
        </div>
      </div>

      {/* Activity Feed */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
          boxShadow: 'var(--theme-shadow-card)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" style={{ color: 'var(--theme-brand-primary)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              Hoạt động gần đây
            </h2>
          </div>
        </div>
        {auditLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có hoạt động nào</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--theme-border-light)' }}>
            {auditLogs.map(log => {
              const time = new Date(log.createdAt)
              const timeStr = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              const dateStr = time.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
              const actor = log.userId ? 'Kế toán' : 'Hệ thống'
              const activityText = formatActivityEntry(log.action, log.tableName)
              return (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'var(--theme-bg-tertiary)' }}
                  >
                    <User className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--theme-text-primary)' }}>
                      <span className="font-medium">{actor}</span>{' '}
                      <span>đã {activityText}</span>
                      {log.recordId ? <span className="font-mono text-xs" style={{ color: 'var(--theme-text-muted)' }}> #{log.recordId}</span> : null}
                    </p>
                    {log.reason && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--theme-text-muted)' }}>{log.reason}</p>
                    )}
                  </div>
                  <span className="text-[11px] tabular-nums whitespace-nowrap shrink-0" style={{ color: 'var(--theme-text-muted)' }}>
                    {dateStr} · {timeStr}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Lookup tables ──────────────────────────────────────────────────────────────

/** Combined action+table → Vietnamese description to avoid double-word issues. */
const ACTIVITY_LABELS: Record<string, Record<string, string>> = {
  CREATE: {
    work_orders: 'tạo phiếu chuyến',
    trip_orders: 'tạo đơn hàng',
    trip_order_work_orders: 'ghép chuyến',
    reconciliations: 'ghép chuyến',
    clients: 'tạo khách hàng',
    locations: 'tạo địa điểm',
    routes: 'tạo cung đường',
    pricings: 'tạo bảng giá',
    users: 'tạo tài khoản',
  },
  CREATE_RECONCILIATION: {
    _default: 'ghép chuyến',
  },
  UPDATE: {
    work_orders: 'cập nhật phiếu chuyến',
    trip_orders: 'cập nhật đơn hàng',
    clients: 'cập nhật khách hàng',
    locations: 'cập nhật địa điểm',
    routes: 'cập nhật cung đường',
    pricings: 'cập nhật bảng giá',
    users: 'cập nhật tài khoản',
  },
  DELETE: {
    work_orders: 'xoá phiếu chuyến',
    trip_orders: 'xoá đơn hàng',
    clients: 'xoá khách hàng',
    locations: 'xoá địa điểm',
    routes: 'xoá cung đường',
    pricings: 'xoá bảng giá',
    users: 'xoá tài khoản',
  },
  MATCH: {
    trip_order_work_orders: 'ghép chuyến',
    work_orders: 'ghép chuyến',
    trip_orders: 'ghép chuyến',
    reconciliations: 'ghép chuyến',
    _default: 'ghép chuyến',
  },
  AUTO_MATCH: {
    reconciliations: 'tự động ghép chuyến',
    _default: 'tự động ghép chuyến',
  },
  BULK_MATCH: {
    reconciliations: 'ghép chuyến hàng loạt',
    _default: 'ghép chuyến hàng loạt',
  },
  UNMATCH: {
    reconciliations: 'bỏ ghép chuyến',
    _default: 'bỏ ghép chuyến',
  },
  CANCEL: {
    work_orders: 'huỷ phiếu chuyến',
    trip_orders: 'huỷ đơn hàng',
    _default: 'huỷ',
  },
  CONFIRM: {
    _default: 'xác nhận',
  },
}

function formatActivityEntry(action: string, tableName: string): string {
  const tableMap = ACTIVITY_LABELS[action]
  if (tableMap) {
    return tableMap[tableName] ?? tableMap['_default'] ?? `${action.toLowerCase()} ${tableName}`
  }
  // Fallback: lowercase the action + table name (removes raw English)
  return `${action.toLowerCase()} ${tableName.replace(/_/g, ' ')}`
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string
  icon: ReactNode
  trend?: string
  color: 'primary' | 'success' | 'warning' | 'info'
  loading?: boolean
}

const STAT_COLORS = {
  primary: {
    iconBg: 'var(--theme-brand-primary-light)',
    iconColor: 'var(--theme-brand-primary)',
    trendBg: 'var(--theme-brand-primary-light)',
    trendColor: 'var(--theme-brand-primary)',
  },
  success: {
    iconBg: 'var(--theme-status-success-light)',
    iconColor: 'var(--theme-status-success)',
    trendBg: 'var(--theme-status-success-light)',
    trendColor: 'var(--theme-status-success-text)',
  },
  warning: {
    iconBg: 'var(--theme-status-warning-light)',
    iconColor: 'var(--theme-status-warning)',
    trendBg: 'var(--theme-status-warning-light)',
    trendColor: 'var(--theme-status-warning-text)',
  },
  info: {
    iconBg: 'var(--theme-status-info-light)',
    iconColor: 'var(--theme-status-info)',
    trendBg: 'var(--theme-status-info-light)',
    trendColor: 'var(--theme-status-info-text)',
  },
}

function StatCard({ label, value, icon, trend, color, loading }: StatCardProps) {
  const colors = STAT_COLORS[color]

  return (
    <div
      className="rounded-lg p-4 transition-all hover:shadow-md"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
        boxShadow: 'var(--theme-shadow-sm)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: colors.iconBg, color: colors.iconColor }}
        >
          {icon}
        </div>
        {trend && (
          <div
            className="flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-bold"
            style={{ background: colors.trendBg, color: colors.trendColor }}
          >
            <TrendingUp className="h-3 w-3" />
            {trend}
          </div>
        )}
      </div>
      {loading ? (
        <div className="h-7 w-20 rounded-md animate-pulse mb-1" style={{ background: 'var(--theme-bg-tertiary)' }} />
      ) : (
        <p className="text-lg lg:text-2xl font-bold leading-none tracking-tight mb-1 whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>
          {value}
        </p>
      )}
      <p className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
        {label}
      </p>
    </div>
  )
}
