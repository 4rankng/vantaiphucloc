import { useEffect, useState, useMemo, useCallback, type ReactNode } from 'react'
import { Truck, AlertCircle, CheckCircle2, DollarSign, Users, Handshake, Receipt, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/services/api'
import type { TripOrder } from '@/data/domain'
import { getTripOrderStatusBadge } from '@/data/domain'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ChartCard } from '@/components/shared/ChartCard'
import { BarChartWidget } from '@/components/shared/Charts'

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

// ─── Component ────────────────────────────────────────────────────────────────

export function DirectorDashboard() {
  const navigate = useNavigate()
  const [trips, setTrips] = useState<TripOrder[]>([])
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiClient.getTripOrders()
      .then((res) => {
        if (!cancelled) {
          if (res.success) setTrips(res.data)
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const monthlyTrips = useMemo(() => {
    return trips.filter(t => {
      const d = new Date(t.createdAt)
      return d.getFullYear() === month.year && d.getMonth() + 1 === month.month
    })
  }, [trips, month])

  // KPI stats — all scoped to selected month
  const requestedThisMonth = monthlyTrips.length
  const completedThisMonth = useMemo(() => monthlyTrips.filter(t => t.status === 'COMPLETED').length, [monthlyTrips])
  const pendingThisMonth = useMemo(() => monthlyTrips.filter(t => t.status === 'PENDING').length, [monthlyTrips])
  const revenueThisMonth = useMemo(() => monthlyTrips.reduce((s, t) => s + (t.revenue ?? t.unitPrice), 0), [monthlyTrips])

  // Recent trips (last 5)
  const recentTrips = useMemo(() => {
    return [...trips]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [trips])

  // Daily bar chart — one bar per day in the selected month
  const dailyData = useMemo(() => {
    const days = daysInMonth(month.year, month.month)
    const counts = Array(days).fill(0)
    for (const t of monthlyTrips) {
      const day = new Date(t.createdAt).getDate()
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
          backgroundColor: '#1e293b',
          borderRadius: 4,
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
          // Only show every 5th day label to avoid crowding
          callback: (_: unknown, index: number) => (index + 1) % 5 === 1 ? String(index + 1) : '',
          maxRotation: 0,
        },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: { stepSize: 1, precision: 0 },
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
    <div className="space-y-5 pb-8">

      {/* Month navigator */}
      <div className="flex items-center gap-2">
        <button
          onClick={prevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition active:scale-90"
          style={{ color: 'var(--theme-text-muted)' }}
          aria-label="Tháng trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
          Tháng {month.month}/{month.year}
        </span>
        <button
          onClick={nextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition active:scale-90"
          style={{ color: 'var(--theme-text-muted)' }}
          aria-label="Tháng sau"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* KPI stat cards */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Chuyến yêu cầu"
          value={loading ? '—' : requestedThisMonth.toLocaleString('vi-VN')}
          icon={<Truck className="h-4 w-4" />}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
        />
        <StatTile
          label="Chuyến hoàn thành"
          value={loading ? '—' : String(completedThisMonth)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          valueColor="text-emerald-600"
        />
        <StatTile
          label="Chờ đối soát"
          value={loading ? '—' : String(pendingThisMonth)}
          icon={<AlertCircle className="h-4 w-4" />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          valueColor="text-amber-600"
        />
        <StatTile
          label="Doanh thu"
          value={loading ? '—' : compact(revenueThisMonth) + ' ₫'}
          icon={<DollarSign className="h-4 w-4" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
      </section>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Quản lý nhân sự', desc: 'Tài khoản & tài xế', path: '/director/users', icon: Users },
          { label: 'Khách hàng & đối tác', desc: 'Khách hàng, nhà thầu', path: '/director/partners', icon: Handshake },
          { label: 'Lệnh điều hành', desc: 'Tạo & theo dõi lệnh', path: '/director/trips', icon: Briefcase },
          { label: 'Bảng giá', desc: 'Giá theo tuyến & loại', path: '/director/pricing', icon: Receipt },
        ].map(a => (
          <button
            key={a.label}
            onClick={() => navigate(a.path)}
            className="flex items-start gap-3 rounded-xl border p-3 text-left transition active:scale-[0.98] hover:shadow-sm"
            style={{
              background: 'var(--theme-bg-secondary)',
              borderColor: 'var(--theme-border-default)',
            }}
          >
            <div
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 12%, transparent)', color: 'var(--theme-brand-primary)' }}
            >
              <a.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold leading-tight" style={{ color: 'var(--theme-text-primary)' }}>{a.label}</div>
              <div className="mt-0.5 text-[11px] leading-tight" style={{ color: 'var(--theme-text-muted)' }}>{a.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Main content: recent trips + weekly chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">

        {/* Recent trip orders table */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: 'var(--theme-bg-secondary)',
            borderColor: 'var(--theme-border-default)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--theme-border-default)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Lệnh vận chuyển gần đây
            </h2>
            <button
              onClick={() => navigate('/director/trips')}
              className="text-xs font-medium"
              style={{ color: 'var(--theme-brand-primary)' }}
            >
              Xem tất cả
            </button>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
              ))}
            </div>
          ) : recentTrips.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có lệnh nào</p>
            </div>
          ) : (
            <>
              {/* Table header — desktop */}
              <div
                className="hidden lg:grid grid-cols-[120px_1fr_1fr_60px_110px_100px] gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--theme-text-muted)', borderBottom: '1px solid var(--theme-border-default)' }}
              >
                <span>Mã lệnh</span>
                <span>Khách hàng</span>
                <span>Tuyến đường</span>
                <span>Loại</span>
                <span>Trạng thái</span>
                <span>Ngày tạo</span>
              </div>

              {/* Rows */}
              {recentTrips.map((t, i) => {
                const badge = getTripOrderStatusBadge(t.status)
                const date = new Date(t.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                const tripCode = `T${String(t.id).padStart(4, '0')}`
                const route = [t.pickupLocation, t.dropoffLocation].filter(Boolean).join(' → ') || t.route

                return (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/director/trip/${t.id}`)}
                    className="w-full text-left transition active:scale-[0.99]"
                    style={{ borderBottom: i < recentTrips.length - 1 ? '1px solid var(--theme-border-default)' : 'none' }}
                  >
                    {/* Mobile layout */}
                    <div className="flex items-start justify-between gap-3 px-4 py-3 lg:hidden">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{tripCode}</span>
                          <StatusBadge variant={badge.variant} label={badge.label} />
                        </div>
                        <div className="text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>{t.clientName}</div>
                        <div className="text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>{route}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{date}</div>
                        {t.workType && (
                          <span className="mt-1 inline-block text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}>
                            {t.workType}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div
                      className="hidden lg:grid grid-cols-[120px_1fr_1fr_60px_110px_100px] gap-3 items-center px-4 py-3 hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                    >
                      <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{tripCode}</span>
                      <span className="text-xs truncate" style={{ color: 'var(--theme-text-primary)' }}>{t.clientName}</span>
                      <span className="text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>{route}</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>{t.workType ?? '—'}</span>
                      <StatusBadge variant={badge.variant} label={badge.label} />
                      <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{date}</span>
                    </div>
                  </button>
                )
              })}
            </>
          )}
        </div>

        {/* Weekly trips bar chart */}
        <ChartCard title="Chuyến đi theo ngày" subtitle={`Tháng ${month.month}/${month.year}`}>
          <BarChartWidget data={barData} height={220} options={barOptions} />
        </ChartCard>
      </div>
    </div>
  )
}

// ─── StatTile ─────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string
  value: string
  icon: ReactNode
  iconBg: string
  iconColor: string
  valueColor?: string
}

function StatTile({ label, value, icon, iconBg, iconColor, valueColor }: StatTileProps) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider leading-tight" style={{ color: 'var(--theme-text-muted)' }}>
          {label}
        </p>
        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold leading-tight tracking-tight ${valueColor ?? ''}`} style={valueColor ? undefined : { color: 'var(--theme-text-primary)' }}>
        {value}
      </p>
    </div>
  )
}
