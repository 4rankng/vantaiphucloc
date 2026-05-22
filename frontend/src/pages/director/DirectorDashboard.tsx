import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Truck, AlertCircle, CheckCircle2, DollarSign,
  ChevronLeft, ChevronRight, TrendingUp, ArrowUpRight,
  Calendar, Activity, User,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getBookedTripStatusBadge } from '@/data/domain'
import { useBookedTrips } from '@/hooks/use-queries'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BrandIcon } from '@/components/atoms/BrandIcon'
import { BarChartWidget } from '@/components/shared/Charts'
import { RevealList } from '@/components/shared/Reveal'
import { SectionRouteDecoration } from '@/components/shared/Decoration'
import { AnimatedNumber } from '@/components/shared'
import type { AuditLogEntry } from '@/services/api/audit.api'
import { getAuditLogs } from '@/services/api/audit.api'
import { SparklineChart } from '@/components/shared/SparklineChart'

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

/** Get 2-letter monogram from partner name */
function monogram(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// ─── Tone color map ──────────────────────────────────────────────────────────

const TONE_COLORS = {
  primary: {
    iconBg: 'var(--theme-brand-primary-light)',
    iconColor: 'var(--theme-brand-primary)',
    sparkColor: 'var(--theme-brand-primary)',
  },
  success: {
    iconBg: 'var(--theme-status-success-light)',
    iconColor: 'var(--theme-status-success)',
    sparkColor: '#10B981',
  },
  warning: {
    iconBg: 'var(--theme-status-warning-light)',
    iconColor: 'var(--theme-status-warning)',
    sparkColor: 'var(--theme-text-muted)',
  },
  info: {
    iconBg: 'var(--theme-status-info-light)',
    iconColor: 'var(--theme-status-info)',
    sparkColor: '#2563EB',
  },
} as const

type Tone = keyof typeof TONE_COLORS

// ─── StatCard (local) ────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  trend?: string
  tone: Tone
  sparkData?: number[]
  loading?: boolean
}

function StatCard({ label, value, icon, trend, tone, sparkData, loading }: StatCardProps) {
  const colors = TONE_COLORS[tone]
  const isUp = trend?.startsWith('+')
  // Only show trend when there's a real, non-zero delta
  const showTrend = trend && trend !== '0%' && trend !== '+0%'

  return (
    <div
      className="relative overflow-hidden transition-all hover:shadow-md card-hover-lift"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
        borderRadius: 'var(--theme-radius-lg, 12px)',
        boxShadow: 'var(--theme-shadow-sm)',
        padding: '14px 16px 40px',
      }}
    >
      {/* Row 1: label left · bare colored icon right */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p
          className="text-[11px] font-semibold uppercase tracking-wider leading-tight"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          {label}
        </p>
        <span
          className="shrink-0 flex [&_svg]:h-4 [&_svg]:w-4 mt-px"
          style={{ color: colors.iconColor, opacity: 0.7 }}
        >
          {icon}
        </span>
      </div>

      {/* Row 2: value */}
      {loading ? (
        <div className="h-7 w-20 rounded animate-pulse mb-2" style={{ background: 'var(--theme-bg-tertiary)' }} />
      ) : (
        <p
          className="text-[22px] lg:text-[26px] font-bold leading-none tabular-nums tracking-tight mb-2.5"
          style={{ color: 'var(--theme-text-primary)' }}
        >
          {value}
        </p>
      )}

      {/* Row 3: trend pill */}
      {showTrend && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums"
          style={{
            background: `color-mix(in srgb, ${isUp ? 'var(--theme-status-success)' : 'var(--theme-status-error)'} 14%, transparent)`,
            color: isUp ? 'var(--theme-status-success)' : 'var(--theme-status-error)',
          }}
        >
          {isUp ? (
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5"><polyline points="6 14 12 8 18 14" stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5"><polyline points="6 10 12 16 18 10" stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
          {trend}
        </span>
      )}

      {/* Sparkline pinned to bottom */}
      {sparkData && sparkData.length >= 2 && (
        <div className="absolute right-0 bottom-0 left-0">
          <SparklineChart data={sparkData} color={colors.sparkColor} />
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DirectorDashboard() {
  const navigate = useNavigate()
  const { data: _trips, isLoading: loading } = useBookedTrips()
  const trips = _trips?.items ?? []
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [financialLogs, setFinancialLogs] = useState<AuditLogEntry[]>([])

  useEffect(() => {
    let cancelled = false
    // General activity
    getAuditLogs({ pageSize: 12 }).then(data => {
      if (!cancelled) {
        const deduped: typeof data.items = []
        for (const entry of data.items) {
          const prev = deduped[deduped.length - 1]
          const prevText = prev ? formatActivityEntry(prev.action, prev.tableName) : ''
          const curText = formatActivityEntry(entry.action, entry.tableName)
          const prevTime = prev ? new Date(prev.createdAt).getTime() : 0
          const curTime = new Date(entry.createdAt).getTime()
          if (prev && prevText === curText && Math.abs(curTime - prevTime) < 2000) continue
          deduped.push(entry)
        }
        setAuditLogs(deduped.slice(0, 8))
      }
    }).catch(() => {})

    // Financial fluctuations (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    getAuditLogs({ pageSize: 10, isFinancial: true, createdAfter: yesterday }).then(data => {
      if (!cancelled) {
        setFinancialLogs(data.items)
      }
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

  // KPI stats
  const requestedThisMonth = monthlyTrips.length
  const completedThisMonth = useMemo(() => monthlyTrips.filter(t => t.status === 'MATCHED' || (t.status as string) === 'COMPLETED').length, [monthlyTrips])
  const pendingThisMonth = useMemo(() => monthlyTrips.filter(t => t.status === 'PENDING').length, [monthlyTrips])
  const revenueThisMonth = useMemo(() => monthlyTrips.reduce((s, t) => s + (t.revenue ?? t.unitPrice), 0), [monthlyTrips])

  // Previous month for delta
  const prevMonthTrips = useMemo(() => {
    const pm = month.month === 1 ? 12 : month.month - 1
    const py = month.month === 1 ? month.year - 1 : month.year
    return trips.filter(t => {
      const d = new Date(t.tripDate)
      return d.getFullYear() === py && d.getMonth() + 1 === pm
    })
  }, [trips, month])
  const prevRequested = prevMonthTrips.length
  const prevCompleted = prevMonthTrips.filter(t => t.status === 'MATCHED' || (t.status as string) === 'COMPLETED').length
  const prevPending = prevMonthTrips.filter(t => t.status === 'PENDING').length
  const prevRevenue = prevMonthTrips.reduce((s, t) => s + (t.revenue ?? t.unitPrice), 0)

  const delta = (curr: number, prev: number): string | undefined => {
    if (prev === 0 && curr === 0) return undefined
    if (prev === 0) return curr > 0 ? '+100%' : undefined
    const pct = Math.round(((curr - prev) / prev) * 100)
    if (pct === 0) return undefined
    return pct > 0 ? `+${pct}%` : `${pct}%`
  }

  // Fake sparkline data based on trend direction for visual consistency
  const sparkUp = [6, 7, 8, 7, 9, 10, 9, 11, 12, 11, 13, 14]
  const sparkDown = [14, 13, 12, 11, 12, 10, 11, 9, 8, 9, 7, 6]

  // Recent trips
  const recentTrips = useMemo(() => {
    return [...trips]
      .sort((a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime())
      .slice(0, 5)
  }, [trips])

  // Daily chart
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

  const prevMonthCb = useCallback(() => {
    setMonth(prev => {
      const m = prev.month === 1 ? 12 : prev.month - 1
      const y = prev.month === 1 ? prev.year - 1 : prev.year
      return { year: y, month: m }
    })
  }, [])

  const nextMonthCb = useCallback(() => {
    setMonth(prev => {
      const m = prev.month === 12 ? 1 : prev.month + 1
      const y = prev.month === 12 ? prev.year + 1 : prev.year
      return { year: y, month: m }
    })
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-8">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--theme-text-primary)' }}>
            Tổng quan
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
            Dữ liệu tháng {month.month} {month.year}
          </p>
        </div>
        <div
          className="flex items-center gap-1 rounded-xl px-1 py-1"
          style={{ background: 'var(--theme-bg-tertiary)' }}
        >
          <button
            onClick={prevMonthCb}
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
            onClick={nextMonthCb}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white active:scale-95"
            style={{ color: 'var(--theme-text-secondary)' }}
            aria-label="Tháng sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <RevealList stagger={70} threshold={0.08}>
        <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatCard
            label="Tổng chuyến"
            value={<AnimatedNumber value={requestedThisMonth} format="number" />}
            icon={<Truck className="h-4.5 w-4.5" />}
            trend={delta(requestedThisMonth, prevRequested)}
            tone="primary"
            sparkData={delta(requestedThisMonth, prevRequested)?.startsWith('+') !== false ? sparkUp : sparkDown}
            loading={loading}
          />
          <StatCard
            label="Đã khớp"
            value={<AnimatedNumber value={completedThisMonth} format="number" />}
            icon={<CheckCircle2 className="h-4.5 w-4.5" />}
            trend={delta(completedThisMonth, prevCompleted)}
            tone="success"
            sparkData={sparkUp}
            loading={loading}
          />
          <StatCard
            label="Chờ xử lý"
            value={<AnimatedNumber value={pendingThisMonth} format="number" />}
            icon={<AlertCircle className="h-4.5 w-4.5" />}
            trend={delta(pendingThisMonth, prevPending)}
            tone="warning"
            sparkData={delta(pendingThisMonth, prevPending)?.startsWith('+') ? sparkDown : sparkUp}
            loading={loading}
          />
          <StatCard
            label="Doanh thu"
            value={<><AnimatedNumber value={revenueThisMonth} format="compact" /> ₫</>}
            icon={<DollarSign className="h-4.5 w-4.5" />}
            trend={delta(revenueThisMonth, prevRevenue)}
            tone="info"
            sparkData={sparkUp}
            loading={loading}
          />
        </section>
      </RevealList>

      {/* Main grid: recent trips + chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">

        {/* Recent trip orders */}
        <div
          className="overflow-hidden relative"
          style={{
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
            borderRadius: 'var(--theme-radius-lg, 10px)',
            boxShadow: 'var(--theme-shadow-card)',
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 relative"
            style={{ borderBottom: '1px solid var(--theme-border-light)' }}
          >
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                  Lệnh vận chuyển gần đây
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                  {recentTrips.length} lệnh mới nhất
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/director/trips')}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition hover:bg-[var(--theme-brand-primary-light)]"
              style={{ color: 'var(--theme-brand-primary)' }}
            >
              Xem tất cả
              <ArrowUpRight className="h-3 w-3" />
            </button>
            {/* Subtle route decoration */}
            <SectionRouteDecoration className="absolute top-2 right-24 opacity-40" />
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
            <div>
              {recentTrips.map((t, i) => {
                const badge = getBookedTripStatusBadge(t.status)
                const date = new Date(t.tripDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                const route = [t.pickupLocation?.name, t.dropoffLocation?.name].filter(Boolean).join(' → ')
                const tripContType = t.containers[0]?.contType
                const partnerMonogram = monogram(t.client.name)

                return (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/director/trip/${t.id}`)}
                    className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition"
                    style={{
                      borderTop: i === 0 ? 'none' : '1px solid var(--theme-border-light)',
                      background: 'transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--theme-bg-tertiary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Partner monogram */}
                    <div
                      className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                      style={{
                        background: 'var(--theme-brand-primary-light)',
                        color: 'var(--theme-brand-primary)',
                        width: 38,
                        height: 38,
                        borderRadius: 'var(--theme-radius-md, 8px)',
                      }}
                    >
                      {partnerMonogram}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>
                          {t.client.name}
                        </span>
                        <StatusBadge variant={badge.variant} label={badge.label} />
                      </div>
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--theme-text-secondary)' }}>
                        {route}
                      </p>
                    </div>

                    {/* Right side: date + type tag */}
                    <div className="shrink-0 text-right">
                      <div className="text-xs tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>{date}</div>
                      {tripContType && (
                        <span
                          className="mt-1 inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
                        >
                          {tripContType}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Daily chart */}
        <div
          className="rounded-lg p-5"
          style={{
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
            borderRadius: 'var(--theme-radius-lg, 10px)',
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
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
            >
              <TrendingUp className="h-3 w-3" />
              {requestedThisMonth} chuyến
            </div>
          </div>
          <BarChartWidget data={barData} height={240} options={barOptions} />
        </div>
      </div>

      {/* Financial Fluctuations (24h) */}
      {financialLogs.length > 0 && (
        <div
          className="overflow-hidden mb-6"
          style={{
            background: 'var(--theme-bg-secondary)',
            border: '1px solid color-mix(in srgb, var(--theme-brand-primary) 20%, var(--theme-border-default))',
            borderRadius: 'var(--theme-radius-lg, 10px)',
            boxShadow: 'var(--theme-shadow-card)',
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ 
              borderBottom: '1px solid var(--theme-border-light)',
              background: 'color-mix(in srgb, var(--theme-brand-primary) 4%, transparent)'
            }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--theme-brand-primary)' }} />
              <h3 className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Biến động tài chính (24h)
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'var(--theme-brand-primary)', color: 'white' }}>
              Mới
            </span>
          </div>
          <div>
            {financialLogs.map(log => {
              const time = new Date(log.createdAt)
              const timeStr = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              const activityText = formatActivityEntry(log.action, log.tableName)
              const changes = formatFinancialChange(log)

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 px-5 py-3"
                  style={{ borderTop: '1px solid var(--theme-border-light)' }}
                >
                  <div
                    className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg mt-0.5"
                    style={{ background: 'var(--theme-brand-primary-light)', width: 30, height: 30 }}
                  >
                    <DollarSign className="h-3.5 w-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-snug" style={{ color: 'var(--theme-text-primary)' }}>
                      <span className="font-semibold">Kế toán</span>{' '}
                      <span>đã {activityText}</span>
                      <span className="font-mono text-xs" style={{ color: 'var(--theme-text-muted)' }}> #{log.recordId}</span>
                    </p>
                    {changes && (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {changes.map((c, ci) => (
                          <div key={ci} className="inline-flex items-center gap-1.5 text-[11px] bg-white border rounded-md px-2 py-1">
                            <span className="font-medium text-slate-500">{c.label}:</span>
                            <span className="line-through text-slate-400">{compact(c.old)}</span>
                            <ArrowUpRight className="h-2.5 w-2.5 text-slate-300" />
                            <span className="font-bold text-emerald-600">{compact(c.new)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] tabular-nums whitespace-nowrap shrink-0" style={{ color: 'var(--theme-text-muted)' }}>
                    {timeStr}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Activity feed */}
      <div
        className="overflow-hidden"
        style={{
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
          borderRadius: 'var(--theme-radius-lg, 10px)',
          boxShadow: 'var(--theme-shadow-card)',
        }}
      >
        <div
          className="flex items-center gap-2 px-5 py-4"
          style={{ borderBottom: '1px solid var(--theme-border-light)' }}
        >
          <Activity className="h-4 w-4" style={{ color: 'var(--theme-brand-primary)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            Hoạt động gần đây
          </h3>
        </div>
        {auditLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có hoạt động nào</p>
          </div>
        ) : (
          <div>
            {auditLogs.map(log => {
              const time = new Date(log.createdAt)
              const timeStr = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              const dateStr = time.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
              const actor = log.userId ? 'Kế toán' : 'Hệ thống'
              const activityText = formatActivityEntry(log.action, log.tableName)

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 px-5 py-3"
                  style={{ borderTop: '1px solid var(--theme-border-light)' }}
                >
                  <div
                    className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg mt-0.5"
                    style={{ background: 'var(--theme-bg-tertiary)', width: 30, height: 30 }}
                  >
                    <User className="h-3.5 w-3.5" style={{ color: 'var(--theme-text-muted)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-snug" style={{ color: 'var(--theme-text-primary)' }}>
                      <span className="font-semibold">{actor}</span>{' '}
                      <span>đã {activityText}</span>
                      {log.recordId ? (
                        <span className="font-mono text-xs" style={{ color: 'var(--theme-text-muted)' }}> #{log.recordId}</span>
                      ) : null}
                    </p>
                    {log.reason && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--theme-text-muted)' }}>{log.reason}</p>
                    )}
                  </div>
                  <span
                    className="text-[11px] tabular-nums whitespace-nowrap shrink-0"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    {timeStr} · {dateStr}
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
  return `${action.toLowerCase()} ${tableName.replace(/_/g, ' ')}`
}

function formatFinancialChange(log: AuditLogEntry): { label: string; old: number; new: number }[] | null {
  if (log.action !== 'UPDATE') return null
  try {
    const oldVal = JSON.parse(log.oldValue || '{}')
    const newVal = JSON.parse(log.newValue || '{}')
    const out: { label: string; old: number; new: number }[] = []

    const fieldMap: Record<string, string> = {
      revenue: 'Doanh thu',
      unit_price: 'Đơn giá',
      unitPrice: 'Đơn giá',
      driver_salary: 'Lương LX',
      driverSalary: 'Lương LX',
      allowance: 'Phụ cấp',
    }

    for (const [field, label] of Object.entries(fieldMap)) {
      if (newVal[field] !== undefined && oldVal[field] !== newVal[field]) {
        out.push({
          label,
          old: Number(oldVal[field] || 0),
          new: Number(newVal[field] || 0),
        })
      }
    }
    return out.length > 0 ? out : null
  } catch {
    return null
  }
}
