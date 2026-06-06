import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { TripChartCard } from '@/components/shared/data-display/TripChartCard'
import { KpiHeroCard } from '@/components/shared/data-display/KpiHeroCard'
import { DashboardSectionHeader } from '@/components/shared/data-display/DashboardSectionHeader'
import {
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Activity, Users, Truck, Coins, BarChart3,
} from 'lucide-react'
import { useDirectorDashboard } from '@/hooks/queries/pnl'
import type { VehiclePnLRow } from '@/services/api/pnl.api'
import type { AuditLogEntry } from '@/services/api/audit.api'
import { getAuditLogs } from '@/services/api/audit.api'
import { formatActivityEntry, formatFinancialChange, SUBJECT_PREFIX } from '@/lib/activity-utils'
import { pad } from '@/lib/accounting-utils'
import { useMonthParams } from '@/pages/accountant/use-month-params'
import { useInfiniteScroll } from '@/components/shared/data-display/ListUtils'
import { useIsMobile } from '@/hooks/use-mobile'
import { useProfile } from '@/hooks/use-queries'

// ─── Helpers ────────────────────────────────────────────────────────────────

const fontMono = "'JetBrains Mono', ui-monospace, monospace"

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Chào buổi sáng'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

const fmtCompact = (n: number): string => {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)} tỷ`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)} tr`
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return n.toLocaleString('vi-VN')
}

// ─── Activity feed ──────────────────────────────────────────────────────────

const ROLE_INITIALS: Record<string, string> = {
  accountant: 'KT', director: 'ĐT', driver: 'LX', superadmin: 'SA',
}
const ROLE_LABELS: Record<string, string> = {
  accountant: 'Kế toán', director: 'Giám đốc', driver: 'Lái xe', superadmin: 'Quản trị',
}

function ActivityItem({ log, isFirst }: { log: AuditLogEntry; isFirst: boolean }) {
  const time = new Date(log.createdAt)
  const timeStr = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = time.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })

  const roleLabel = ROLE_LABELS[log.userRole ?? ''] ?? ''
  const rawName = log.userName || ''
  const actorLabel = log.userId
    ? [roleLabel, rawName].filter(Boolean).join(' ') || 'Người dùng'
    : 'Hệ thống'

  const activityText = formatActivityEntry(log.action, log.tableName)
  const changes = formatFinancialChange(log)
  const initials = ROLE_INITIALS[log.userRole ?? ''] ?? rawName.slice(0, 2).toUpperCase()
  const isCreate = log.action?.toLowerCase().includes('create')

  return (
    <div
      className="flex gap-3 rounded-[10px] px-3 py-2.5 transition-colors duration-150 relative"
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--theme-bg-tertiary)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {!isFirst && (
        <div style={{ position: 'absolute', top: 0, left: 28, width: 1, height: 12, background: 'var(--theme-border-light)' }} />
      )}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
        style={{
          background: isCreate ? 'color-mix(in srgb, var(--theme-status-warning) 10%, transparent)' : 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)',
          color: isCreate ? 'var(--theme-status-warning)' : 'var(--theme-brand-primary)',
        }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] leading-snug" style={{ color: 'var(--theme-text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{actorLabel}</span>{' '}
          <span style={{ color: isCreate ? 'var(--theme-status-warning)' : 'var(--theme-brand-primary)' }}>đã {activityText}</span>
          {log.subjectName && (
            <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {(() => { const pfx = SUBJECT_PREFIX[log.tableName]; return pfx ? ` ${pfx} ` : ' ' })()}{log.subjectName}
            </span>
          )}
        </p>
        <p className="mt-0.5" style={{ fontFamily: fontMono, fontSize: 10, color: 'var(--theme-text-muted)' }}>
          {timeStr} · {dateStr}
        </p>
        {changes && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {changes.map((c, ci) => (
              <span key={ci} className="inline-flex items-center gap-1 text-[11px] rounded-md px-2 py-0.5" style={{ background: 'var(--theme-bg-tertiary)' }}>
                <span style={{ color: 'var(--theme-text-muted)' }}>{c.label}:</span>
                <span className="line-through" style={{ color: 'var(--theme-text-muted)' }}>{c.old.toLocaleString('vi-VN')}</span>
                <span style={{ color: 'var(--theme-text-muted)' }}>→</span>
                <span className="font-bold" style={{ color: 'var(--theme-brand-primary)' }}>{c.new.toLocaleString('vi-VN')}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Vehicle bar list ────────────────────────────────────────────────────────

function VehicleBarList({ rows }: { rows: VehiclePnLRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6">
        <p className="text-xs text-center" style={{ color: 'var(--theme-text-muted)' }}>Chưa có dữ liệu</p>
      </div>
    )
  }

  const maxAbs = Math.max(1, ...rows.map(r => Math.abs(r.loiNhuan)))

  return (
    <div>
      <div
        className="grid items-center gap-x-3 px-2 pb-2 mb-1"
        style={{ gridTemplateColumns: '76px 1fr 68px 38px', borderBottom: '1px solid var(--theme-border-light)' }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Biển số</span>
        <span />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--theme-text-muted)' }}>Lãi</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--theme-text-muted)' }}>Biên</span>
      </div>
      <div>
        {rows.map(row => {
          const isProfit = row.loiNhuan >= 0
          const marginPct = row.revenue > 0 ? (row.loiNhuan / row.revenue) * 100 : null
          const barWidth = row.loiNhuan !== 0 ? Math.max(3, (Math.abs(row.loiNhuan) / maxAbs) * 100) : 0

          return (
            <div
              key={row.vehicleId}
              className="grid items-center gap-x-3 py-[7px] px-2 rounded-lg transition-colors duration-100"
              style={{ gridTemplateColumns: '76px 1fr 68px 38px' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--theme-bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="min-w-0">
                <span className="font-mono text-[12px] font-semibold block truncate" style={{ color: 'var(--theme-text-primary)' }}>{row.plate}</span>
                {row.isVendor && row.vendorName && (
                  <span className="block text-[10px] truncate mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{row.vendorName}</span>
                )}
              </div>
              <div className="h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--theme-bg-tertiary)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    background: isProfit ? 'linear-gradient(90deg, #005A2D, #00B14F)' : 'linear-gradient(90deg, #DC2626, #EF4444)',
                  }}
                />
              </div>
              <span className="font-mono text-[12px] font-bold tabular-nums text-right whitespace-nowrap" style={{ color: isProfit ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}>
                {row.loiNhuan === 0 ? '0' : `${isProfit ? '+' : ''}${fmtCompact(row.loiNhuan)}`}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-right" style={{ color: 'var(--theme-text-muted)' }}>
                {marginPct != null ? `${marginPct.toFixed(0)}%` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export function DirectorDashboard() {
  const { user } = useAuth()
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const isMobile = useIsMobile(768)
  const { data: profile } = useProfile()

  const { data: stats } = useDirectorDashboard(dateFrom, dateTo)

  const total       = stats?.total       ?? 0
  const matched     = stats?.matched     ?? 0
  const pending     = stats?.pending     ?? 0
  const revenue     = stats?.revenue     ?? 0
  const avgRev      = stats?.avgRevenuePerTrip ?? 0
  const totalCost   = stats?.totalCost   ?? 0
  const profit      = stats?.profit      ?? 0
  const buckets     = stats?.buckets     ?? []
  const topRoutes   = stats?.topRoutes   ?? []
  const topDrivers  = stats?.topDrivers  ?? []
  const totalDelta     = stats?.totalDelta     ?? null
  const revenueDelta   = stats?.revenueDelta   ?? null
  const costDelta      = stats?.costDelta      ?? null
  const profitDelta    = stats?.profitDelta    ?? null
  const ownFleetRows   = stats?.ownFleetPnl?.rows ?? []
  const vendorRows     = stats?.vendorPnl?.rows ?? []
  const ownFleetProfit = stats?.ownFleetPnl?.totalProfit ?? 0
  const vendorProfit   = stats?.vendorPnl?.totalProfit ?? 0

  // ── Audit log ──
  const PAGE_SIZE = 15
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditLoading, setAuditLoading] = useState(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    setAuditLogs([])
    setAuditPage(1)
    setAuditTotal(0)
    setAuditLoading(true)
    getAuditLogs({ page: 1, pageSize: PAGE_SIZE, createdAfter: dateFrom }).then(data => {
      if (cancelledRef.current) return
      setAuditLogs(data.items)
      setAuditTotal(data.total)
    }).catch(() => {}).finally(() => {
      if (!cancelledRef.current) setAuditLoading(false)
    })
    return () => { cancelledRef.current = true }
  }, [dateFrom])

  const hasMore = auditLogs.length < auditTotal

  const loadMore = useCallback(() => {
    if (auditLoading || !hasMore) return
    const nextPage = auditPage + 1
    setAuditLoading(true)
    getAuditLogs({ page: nextPage, pageSize: PAGE_SIZE }).then(data => {
      if (cancelledRef.current) return
      setAuditLogs(prev => {
        const merged = [...prev, ...data.items]
        const deduped: AuditLogEntry[] = []
        for (const entry of merged) {
          const last = deduped[deduped.length - 1]
          const prevTxt = last ? formatActivityEntry(last.action, last.tableName) : ''
          const curTxt = formatActivityEntry(entry.action, entry.tableName)
          const prevMs = last ? new Date(last.createdAt).getTime() : 0
          const curMs = new Date(entry.createdAt).getTime()
          if (last && prevTxt === curTxt && Math.abs(curMs - prevMs) < 2000) continue
          deduped.push(entry)
        }
        return deduped
      })
      setAuditPage(nextPage)
      setAuditTotal(data.total)
    }).catch(() => {}).finally(() => {
      if (!cancelledRef.current) setAuditLoading(false)
    })
  }, [auditPage, auditLoading, hasMore])

  const sentinelRef = useInfiniteScroll(loadMore)

  const maxRouteCount = topRoutes.length > 0 ? topRoutes[0].count : 1

  return (
    <div style={{ padding: isMobile ? '16px 12px 32px' : '32px 40px 48px', maxWidth: 1480, margin: '0 auto' }}>

      {/* ── Greeting header ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
        <div>
          <h1
            className="text-[22px] font-extrabold tracking-tight leading-tight"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {greeting()},{' '}
            <span>{profile?.fullName || 'bạn'}</span>
          </h1>
          <p className="mt-1.5 text-[13px]" style={{ color: 'var(--theme-text-secondary)' }}>
            {total} chuyến · {matched} đã ghép · {pending} chờ xử lý
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Month navigator */}
          <div className="flex items-center gap-1 rounded-xl border p-1" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
            <button onClick={onPrev} className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[#F1F7F3]" aria-label="Tháng trước">
              <ChevronLeft style={{ width: 14, height: 14, stroke: 'var(--theme-text-secondary)' }} />
            </button>
            <div className="px-3.5 text-center">
              <div className="text-[13px] font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Tháng {pad(month)} · {year}
              </div>
              <div style={{ fontFamily: fontMono, fontSize: 10, color: 'var(--theme-text-muted)', marginTop: 1 }}>
                {dateFrom.slice(5)} → {dateTo.slice(5)}
              </div>
            </div>
            <button onClick={onNext} className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[#F1F7F3]" aria-label="Tháng sau">
              <ChevronRight style={{ width: 14, height: 14, stroke: 'var(--theme-text-secondary)' }} />
            </button>
          </div>

          {/* CTA */}
          <Link
            to={user?.role === 'superadmin' ? '/superadmin' : '/director/users'}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)', boxShadow: '0 1px 3px rgba(0,90,45,0.18)' }}
          >
            <Users style={{ width: 14, height: 14 }} strokeWidth={2.2} />
            Quản lý người dùng
          </Link>
        </div>
      </header>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <KpiHeroCard
          label={`Tổng chuyến · ${pad(month)}/${year}`}
          formattedValue={<span>{total.toLocaleString('vi-VN')}</span>}
          icon={Activity}
          color="emerald"
          sublabel={`${pending} chờ ghép · ${matched} đã ghép`}
          trend={totalDelta != null ? { value: `${Math.abs(totalDelta)}%`, positive: totalDelta >= 0 } : undefined}
        />
        <KpiHeroCard
          label="Doanh thu"
          formattedValue={<span>{fmtCompact(revenue)}</span>}
          icon={TrendingUp}
          color="blue"
          sublabel={avgRev > 0 ? `TB ${fmtCompact(avgRev)}/chuyến` : 'Chưa có doanh thu'}
          trend={revenueDelta != null ? { value: `${Math.abs(revenueDelta)}%`, positive: revenueDelta >= 0 } : undefined}
        />
        <KpiHeroCard
          label="Chi phí"
          formattedValue={<span>{fmtCompact(totalCost)}</span>}
          icon={TrendingDown}
          color="rose"
          sublabel={revenue > 0 ? `${Math.round((totalCost / revenue) * 100)}% doanh thu` : 'Chưa có dữ liệu'}
          trend={costDelta != null ? { value: `${Math.abs(costDelta)}%`, positive: costDelta <= 0 } : undefined}
        />
        <KpiHeroCard
          label="Lợi nhuận"
          formattedValue={<span>{fmtCompact(profit)}</span>}
          icon={Coins}
          color="amber"
          sublabel={revenue > 0 ? `Biên ${Math.round((profit / revenue) * 100)}%` : 'Chưa có dữ liệu'}
          trend={profitDelta != null ? { value: `${Math.abs(profitDelta)}%`, positive: profitDelta >= 0 } : undefined}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="bento-grid">
        {/* Left column wrapping Chart and Top lists to prevent grid height mismatch empty space */}
        <div className="bento-col-12 lg:bento-col-8 flex flex-col gap-5 md:gap-6">
          {/* Chart */}
          <TripChartCard
            title="Tần suất chuyến đi"
            subtitle={`Tháng ${pad(month)} · ${year}`}
            bars={buckets}
          />

          {/* Top lists row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {/* Top routes */}
            <div className="bento-card">
              <DashboardSectionHeader
                title="Tuyến đường nổi bật"
                icon={BarChart3}
                className="pb-3"
              />
              <div className="mb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }} />
              <div className="flex flex-col gap-2.5">
                {topRoutes.length === 0 && (
                  <p className="text-xs py-4 text-center" style={{ color: 'var(--theme-text-muted)' }}>Chưa có dữ liệu</p>
                )}
                {topRoutes.slice(0, 5).map((r, i) => (
                  <div key={r.name} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 flex items-center justify-center h-5 rounded-md text-[10px] font-bold" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)', color: 'var(--theme-brand-primary)' }}>
                      {i + 1}
                    </span>
                    <span className="flex-grow truncate text-[12.5px] font-medium" style={{ color: 'var(--theme-text-secondary)' }}>{r.name}</span>
                    <div className="w-20 h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--theme-bg-tertiary)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(r.count / maxRouteCount) * 100}%`, background: 'linear-gradient(90deg, #005A2D, #00B14F)' }} />
                    </div>
                    <span className="w-6 shrink-0 text-right text-[11px] font-bold font-mono tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top drivers */}
            <div className="bento-card">
              <DashboardSectionHeader
                title="Lái xe dẫn đầu"
                icon={Users}
                className="pb-3"
              />
              <div className="mb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }} />
              <div className="flex flex-col gap-1">
                {topDrivers.length === 0 && (
                  <p className="text-xs py-4 text-center" style={{ color: 'var(--theme-text-muted)' }}>Chưa có dữ liệu</p>
                )}
                {topDrivers.slice(0, 5).map((d, i) => (
                  <div
                    key={d.name + d.plate}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--theme-bg-tertiary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span className="w-5 shrink-0 flex items-center justify-center h-5 rounded-md text-[10px] font-bold" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)', color: 'var(--theme-brand-primary)' }}>
                      {i + 1}
                    </span>
                    <div className="flex-grow min-w-0">
                      <p className="truncate text-[12.5px] font-semibold leading-tight" style={{ color: 'var(--theme-text-primary)' }}>{d.name}</p>
                      {d.plate && (
                        <p className="truncate text-[10px] leading-tight mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{d.plate}</p>
                      )}
                    </div>
                    <span className="text-[12px] font-bold font-mono tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{d.tripCount} chuyến</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hoạt động gần đây */}
        <div className="bento-card bento-col-12 lg:bento-col-4 flex flex-col">
          <div className="pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
            <div className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Hoạt động gần đây</div>
          </div>
          <div className="flex-grow overflow-y-auto mt-2 px-1 custom-scrollbar" style={{ maxHeight: 520 }}>
            {auditLogs.length === 0 && !auditLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 h-full">
                <Activity className="w-7 h-7" style={{ color: 'var(--theme-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có hoạt động nào</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {auditLogs.map((log, i) => <ActivityItem key={log.id} log={log} isFirst={i === 0} />)}
                {hasMore && (
                  <div ref={sentinelRef} className="flex items-center justify-center py-3">
                    {auditLoading && (
                      <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Đang tải…</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Xe nội bộ */}
        <div className="bento-card bento-col-12 lg:bento-col-6">
          <DashboardSectionHeader
            title="Xe nội bộ"
            icon={Truck}
            className="pb-3"
            right={
              <div className="flex items-center gap-2">
                {ownFleetRows.length > 0 && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold font-mono"
                    style={{
                      background: ownFleetProfit >= 0
                        ? 'color-mix(in srgb, var(--theme-status-success) 10%, transparent)'
                        : 'color-mix(in srgb, var(--theme-status-error) 10%, transparent)',
                      color: ownFleetProfit >= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)',
                    }}
                  >
                    {ownFleetProfit >= 0 ? '+' : ''}{fmtCompact(ownFleetProfit)}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{ownFleetRows.length} xe</span>
              </div>
            }
          />
          <div className="mb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }} />
          <VehicleBarList rows={ownFleetRows} />
        </div>

        {/* Xe ngoài */}
        <div className="bento-card bento-col-12 lg:bento-col-6">
          <DashboardSectionHeader
            title="Xe ngoài"
            icon={Truck}
            className="pb-3"
            right={
              <div className="flex items-center gap-2">
                {vendorRows.length > 0 && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold font-mono"
                    style={{
                      background: vendorProfit >= 0
                        ? 'color-mix(in srgb, var(--theme-status-success) 10%, transparent)'
                        : 'color-mix(in srgb, var(--theme-status-error) 10%, transparent)',
                      color: vendorProfit >= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)',
                    }}
                  >
                    {vendorProfit >= 0 ? '+' : ''}{fmtCompact(vendorProfit)}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{vendorRows.length} xe</span>
              </div>
            }
          />
          <div className="mb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }} />
          <VehicleBarList rows={vendorRows} />
        </div>
      </div>
    </div>
  )
}
