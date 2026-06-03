import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TripChartCard } from '@/components/shared/data-display/TripChartCard'
import {
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Activity, ArrowUpRight, Users,
} from 'lucide-react'
import { useDirectorDashboard } from '@/hooks/queries/pnl'
import type { VehiclePnLGroup, VehiclePnLRow } from '@/services/api/pnl.api'
import type { AuditLogEntry } from '@/services/api/audit.api'
import { getAuditLogs } from '@/services/api/audit.api'
import { formatActivityEntry, formatFinancialChange, SUBJECT_PREFIX } from '@/lib/activity-utils'
import { pad } from '@/lib/accounting-utils'
import { useMonthParams } from '@/pages/accountant/use-month-params'
import { useInfiniteScroll } from '@/components/shared/data-display/ListUtils'
import { useIsMobile } from '@/hooks/use-mobile'

const fontMono = "'JetBrains Mono', ui-monospace, monospace"
const fontSans = "'Plus Jakarta Sans', 'Be Vietnam Pro', system-ui, sans-serif"

function KpiCard({
  label, value, unit, context, trend, accentColor = 'var(--theme-brand-primary)', accentTint = 'var(--theme-brand-primary-light)', delay, className = '',
}: {
  label: string
  value: string
  unit?: string
  context?: string
  trend?: { value: string; positive: boolean }
  accentColor?: string
  accentTint?: string
  delay?: number
  className?: string
}) {
  return (
    <div
      className={`bento-card group ${className}`}
      style={{
        animation: `fadeIn 0.5s ease both`,
        animationDelay: delay ? `${delay}ms` : undefined,
      }}
    >
      <div
        className="absolute top-[22px] left-0 h-[18px] w-[3px] rounded-r-[3px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: accentColor }}
      />

      <p className="bento-stat-label">
        {label}
      </p>

      <div className="mt-2 flex items-baseline gap-1.5 leading-none" style={{ fontFamily: fontMono, fontWeight: 700, color: 'var(--theme-text-primary)', letterSpacing: '-0.02em' }}>
        <span className="text-2xl xl:text-3xl">{value}</span>
        {unit && (
          <span className="text-sm font-semibold" style={{ fontFamily: fontSans, color: 'var(--theme-text-muted)', letterSpacing: '0.04em' }}>
            {unit}
          </span>
        )}
      </div>

      <div className="bento-stat-footer">
        <span className="truncate">{context ?? ' '}</span>
        {trend && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{
              fontFamily: fontMono,
              letterSpacing: '-0.01em',
              background: trend.positive ? accentTint : 'var(--theme-status-error-light)',
              color: trend.positive ? accentColor : 'var(--theme-status-error)',
            }}
          >
            {trend.positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  )
}


const ROLE_INITIALS: Record<string, string> = {
  accountant: 'KT',
  director: 'ĐT',
  driver: 'LX',
  superadmin: 'SA',
}

const ROLE_LABELS: Record<string, string> = {
  accountant: 'Kế toán',
  director: 'Giám đốc',
  driver: 'Lái xe',
  superadmin: 'Quản trị',
}

function VehiclePnLTable({ group, emptyHint }: { group: VehiclePnLGroup; emptyHint: string }) {
  const rows = group.rows ?? []

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6">
        <img src="/illustrations/empty-vendors.svg" alt="" className="h-24 w-auto opacity-80" draggable={false} />
        <p className="text-xs text-center" style={{ color: 'var(--theme-text-muted)' }}>{emptyHint}</p>
      </div>
    )
  }

  const sorted: VehiclePnLRow[] = [...rows].sort((a, b) => b.loiNhuan - a.loiNhuan)

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
            <th style={{ textAlign: 'left',  padding: '8px 10px', color: 'var(--theme-text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Biển số</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', color: 'var(--theme-text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Doanh thu</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', color: 'var(--theme-text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Chi phí</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', color: 'var(--theme-text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Lợi nhuận</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const cost = row.cpXe.total + row.cpLuongSanLuong + row.cpLuongCoBan + row.cpVendor
            const positive = row.loiNhuan >= 0
            return (
              <tr key={row.vehicleId} style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
                <td style={{ padding: '8px 10px', color: 'var(--theme-text-primary)', fontSize: 13, fontWeight: 600 }}>
                  {row.plate}
                  {row.isVendor && row.vendorName && (
                    <span className="ml-1.5 inline-block rounded px-1.5 py-0.5" style={{ fontSize: 10, color: 'var(--theme-text-muted)', background: 'var(--theme-border-default)', fontWeight: 500 }}>
                      {row.vendorName}
                    </span>
                  )}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: fontMono, fontSize: 12.5, color: 'var(--theme-text-primary)' }}>{row.revenue.toLocaleString('vi-VN')}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: fontMono, fontSize: 12.5, color: 'var(--theme-text-secondary)' }}>{cost.toLocaleString('vi-VN')}</td>
                <td style={{
                  padding: '8px 10px', textAlign: 'right',
                  fontFamily: fontMono, fontSize: 12.5, fontWeight: 600,
                  color: positive ? 'var(--theme-brand-primary)' : 'var(--theme-status-error)',
                }}>
                  {row.loiNhuan.toLocaleString('vi-VN')}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '1px solid var(--theme-border-default)' }}>
            <td style={{ padding: '10px', color: 'var(--theme-text-primary)', fontWeight: 700, fontSize: 12 }}>Tổng</td>
            <td style={{ padding: '10px', textAlign: 'right', fontFamily: fontMono, fontWeight: 700, fontSize: 12.5, color: 'var(--theme-text-primary)' }}>{group.totalRevenue.toLocaleString('vi-VN')}</td>
            <td style={{ padding: '10px', textAlign: 'right', fontFamily: fontMono, fontWeight: 700, fontSize: 12.5, color: 'var(--theme-text-secondary)' }}>{group.totalCost.toLocaleString('vi-VN')}</td>
            <td style={{
              padding: '10px', textAlign: 'right',
              fontFamily: fontMono, fontWeight: 700, fontSize: 12.5,
              color: group.totalProfit >= 0 ? 'var(--theme-brand-primary)' : 'var(--theme-status-error)',
            }}>
              {group.totalProfit.toLocaleString('vi-VN')}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
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
      className="flex gap-3 rounded-[10px] px-3.5 py-3 transition-colors duration-150 relative"
      style={{ background: 'transparent' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--theme-brand-primary-light)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {!isFirst && (
        <div style={{ position: 'absolute', top: 0, left: 28, width: 1, height: 12, background: 'var(--theme-border-default)' }} />
      )}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold relative"
        style={{
          background: isCreate ? 'var(--theme-status-warning-light)' : 'var(--theme-brand-primary-light)',
          color: isCreate ? 'var(--theme-status-warning)' : 'var(--theme-brand-primary)',
          letterSpacing: '0.02em',
        }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-snug" style={{ color: 'var(--theme-text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{actorLabel}</span>{' '}
          <span className="font-semibold" style={{ color: isCreate ? 'var(--theme-status-warning)' : 'var(--theme-brand-primary)' }}>đã {activityText}</span>
          {log.subjectName && (
            <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {(() => { const pfx = SUBJECT_PREFIX[log.tableName]; return pfx ? ` ${pfx} ` : ' ' })()}{log.subjectName}
            </span>
          )}
        </p>
        <p className="mt-1" style={{ fontFamily: fontMono, fontSize: 10, color: 'var(--theme-text-muted)', letterSpacing: '0.02em' }}>
          {timeStr} · {dateStr}
        </p>
        {changes && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {changes.map((c, ci) => (
              <span key={ci} className="inline-flex items-center gap-1 text-[11px] rounded-md px-2 py-0.5" style={{ background: 'var(--theme-border-default)', border: '1px solid var(--theme-border-default)' }}>
                <span className="font-medium" style={{ color: 'var(--theme-text-muted)' }}>{c.label}:</span>
                <span className="line-through" style={{ color: 'var(--theme-text-muted)' }}>{c.old.toLocaleString('vi-VN')}</span>
                <ArrowUpRight className="h-2.5 w-2.5" style={{ color: 'var(--theme-text-muted)' }} />
                <span className="font-bold" style={{ color: 'var(--theme-brand-primary)' }}>{c.new.toLocaleString('vi-VN')}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function DirectorDashboard() {
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const isMobile = useIsMobile(768)

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

  const ownFleetPnl: VehiclePnLGroup = stats?.ownFleetPnl ?? { rows: [], totalRevenue: 0, totalCost: 0, totalProfit: 0, tripCount: 0 }
  const vendorPnl: VehiclePnLGroup   = stats?.vendorPnl   ?? { rows: [], totalRevenue: 0, totalCost: 0, totalProfit: 0, tripCount: 0 }

  const prevMonth = month === 1 ? 12 : month - 1

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

  const fadeStyle = `
@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
@keyframes pulse2 { 0%,100%{box-shadow:0 0 0 4px var(--theme-brand-primary-light)} 50%{box-shadow:0 0 0 7px rgba(0,90,45,.08)} }
`

  const pct = total > 0 ? Math.round((matched / total) * 100) : 0
  const maxRouteCount = topRoutes.length > 0 ? topRoutes[0].count : 1

  function getInitials(name: string) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <>
      <style>{fadeStyle}</style>
      <div style={{ padding: isMobile ? '16px 12px 32px' : '32px 40px 48px', maxWidth: 1480, margin: '0 auto' }}>

        <div className="flex flex-col md:grid md:grid-cols-3 md:items-center mb-7 gap-4" style={{ animation: 'fadeIn 0.5s ease both' }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 26 : 32, fontWeight: 700, color: 'var(--theme-text-primary)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              Tổng quan điều hành
            </h1>
            <div className="flex items-center gap-2.5 mt-2 text-[13px]" style={{ color: 'var(--theme-text-muted)' }}>
              <span
                className="inline-block h-[7px] w-[7px] rounded-full"
                style={{ background: 'var(--theme-brand-primary)', boxShadow: '0 0 0 4px var(--theme-brand-primary-light)', animation: 'pulse2 2s ease-in-out infinite' }}
              />
              Cập nhật trực tiếp
            </div>
          </div>

          <div className="flex justify-start md:justify-center w-full md:w-auto">
            <div className="flex items-center gap-1 rounded-xl border p-1" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', borderRadius: 12 }}>
              <button onClick={onPrev} className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[#F1F7F3]" aria-label="Tháng trước">
                <ChevronLeft style={{ width: 14, height: 14, stroke: 'var(--theme-text-secondary)' }} />
              </button>
              <div className="px-3.5 text-center">
                <div className="text-[13px] font-bold" style={{ color: 'var(--theme-text-primary)', letterSpacing: '-0.005em' }}>
                  Tháng {pad(month)} · {year}
                </div>
                <div style={{ fontFamily: fontMono, fontSize: 10, color: 'var(--theme-text-muted)', letterSpacing: '0.02em', marginTop: 1 }}>
                  {dateFrom.slice(5)} → {dateTo.slice(5)}
                </div>
              </div>
              <button onClick={onNext} className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[#F1F7F3]" aria-label="Tháng sau">
                <ChevronRight style={{ width: 14, height: 14, stroke: 'var(--theme-text-secondary)' }} />
              </button>
            </div>
          </div>

          <div className="flex justify-start md:justify-end w-full md:w-auto">
            <Link
              to="/director/users"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98] w-full md:w-auto"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)', boxShadow: '0 1px 3px rgba(0,90,45,0.18)' }}
            >
              <Users style={{ width: 14, height: 14 }} strokeWidth={2.2} />
              Quản lý người dùng
            </Link>
          </div>
        </div>

        <div className="bento-grid mt-6">
          <KpiCard
            label="Tổng chuyến"
            value={total.toLocaleString('vi-VN')}
            context={`So với tháng ${pad(prevMonth)}`}
            trend={totalDelta != null ? { value: `${Math.abs(totalDelta)}%`, positive: totalDelta >= 0 } : undefined}
            delay={60}
            className="bento-col-12 sm:bento-col-6 lg:bento-col-3"
          />
          <KpiCard
            label="Doanh thu"
            value={revenue.toLocaleString('vi-VN')}
            unit=" VNĐ"
            context={avgRev > 0 ? `Trung bình ${avgRev.toLocaleString('vi-VN')} / chuyến` : undefined}
            trend={revenueDelta != null ? { value: `${Math.abs(revenueDelta)}%`, positive: revenueDelta >= 0 } : undefined}
            accentColor='var(--theme-status-warning)'
            accentTint='var(--theme-status-warning-light)'
            delay={120}
            className="bento-card-gradient-emerald bento-col-12 sm:bento-col-6 lg:bento-col-3"
          />
          <KpiCard
            label="Chi phí"
            value={totalCost.toLocaleString('vi-VN')}
            unit=" VNĐ"
            context={revenue > 0 ? `Tỷ lệ ${Math.round((totalCost / revenue) * 100)}% doanh thu` : undefined}
            trend={costDelta != null ? { value: `${Math.abs(costDelta)}%`, positive: costDelta <= 0 } : undefined}
            accentColor='var(--theme-status-error)'
            accentTint='var(--theme-status-error-light)'
            delay={180}
            className="bento-card-gradient-rose bento-col-12 sm:bento-col-6 lg:bento-col-3"
          />
          <KpiCard
            label="Lợi nhuận"
            value={profit.toLocaleString('vi-VN')}
            unit=" VNĐ"
            context={revenue > 0 ? `Biên ${Math.round((profit / revenue) * 100)}%` : undefined}
            trend={profitDelta != null ? { value: `${Math.abs(profitDelta)}%`, positive: profitDelta >= 0 } : undefined}
            accentColor={profit >= 0 ? 'var(--theme-brand-primary)' : 'var(--theme-status-error)'}
            accentTint={profit >= 0 ? 'var(--theme-brand-primary-light)' : 'var(--theme-status-error-light)'}
            delay={240}
            className={`${profit >= 0 ? 'bento-card-gradient-blue' : 'bento-card-gradient-rose'} bento-col-12 sm:bento-col-6 lg:bento-col-3`}
          />

          {/* Bar chart */}
          <TripChartCard
            title="Tần suất chuyến đi"
            subtitle={`Tháng ${pad(month)} · ${year}`}
            bars={buckets}
            className="bento-col-12 lg:bento-col-8"
            style={{ minHeight: 330 }}
          />

          {/* Hoạt động gần đây */}
          <div className="bento-card bento-col-12 lg:bento-col-4 lg:bento-row-2 flex flex-col">
            <div className="pb-3" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
              <div className="text-[14px] font-bold" style={{ color: 'var(--theme-text-primary)' }}>Hoạt động gần đây</div>
            </div>
            <div className="flex-grow overflow-y-auto mt-3 px-1 custom-scrollbar" style={{ maxHeight: 520 }}>
              {auditLogs.length === 0 && !auditLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 h-full">
                  <Activity className="w-8 h-8" style={{ color: 'var(--theme-border-default)' }} />
                  <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có hoạt động nào</p>
                </div>
              ) : (
                <div className="space-y-1">
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

          {/* Top routes */}
          <div className="bento-card bento-col-12 lg:bento-col-4">
            <div className="pb-3" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
              <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-primary)' }}>Tuyến đường nổi bật</p>
            </div>
            <div className="flex flex-col gap-3 mt-4">
              {topRoutes.length === 0 && (
                <p className="text-xs py-4 text-center" style={{ color: 'var(--theme-text-muted)' }}>Chưa có dữ liệu</p>
              )}
              {topRoutes.slice(0, 5).map((r, i) => (
                <div key={r.name} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-[10px] font-semibold font-mono" style={{ color: 'var(--theme-text-muted)' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-grow truncate text-[12.5px] font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>{r.name}</span>
                  <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--theme-border-default)' }}>
                    <div className="h-full rounded-full" style={{ width: `${maxRouteCount > 0 ? (r.count / maxRouteCount) * 100 : 0}%`, background: 'var(--theme-brand-primary)' }} />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[11px] font-bold font-mono" style={{ color: 'var(--theme-text-primary)' }}>{r.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top drivers */}
          <div className="bento-card bento-col-12 lg:bento-col-4">
            <div className="pb-3" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
              <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-primary)' }}>Lái xe dẫn đầu</p>
            </div>
            <div className="flex flex-col gap-3 mt-4">
              {topDrivers.length === 0 && (
                <p className="text-xs py-4 text-center" style={{ color: 'var(--theme-text-muted)' }}>Chưa có dữ liệu</p>
              )}
              {topDrivers.slice(0, 4).map((d, i) => (
                <div key={d.name + d.plate} className="flex items-center gap-3" style={{ paddingTop: i > 0 ? 10 : undefined, borderTop: i > 0 ? '1px solid var(--theme-border-light)' : undefined }}>
                  <div className="flex-grow min-w-0">
                    <p className="truncate text-[13px] font-bold leading-tight" style={{ color: 'var(--theme-text-primary)' }}>{d.name}</p>
                    <p className="truncate text-[11px] leading-tight mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{d.plate}</p>
                  </div>
                  <span className="text-[12.5px] font-bold font-mono" style={{ color: 'var(--theme-text-primary)' }}>{d.tripCount} chuyến</span>
                </div>
              ))}
            </div>
          </div>

          {/* Xe nội bộ */}
          <div className="bento-card bento-col-12 lg:bento-col-6">
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
              <div className="text-[14px] font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Xe nội bộ
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    fontFamily: fontMono,
                    background: ownFleetPnl.totalProfit >= 0 ? 'var(--theme-brand-primary-light)' : 'var(--theme-status-error-light)',
                    color:      ownFleetPnl.totalProfit >= 0 ? 'var(--theme-brand-primary)' : 'var(--theme-status-error)',
                  }}
                >
                  Lãi {ownFleetPnl.totalProfit.toLocaleString('vi-VN')}
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
                  {ownFleetPnl.rows.length} xe
                </span>
              </div>
            </div>
            <div className="mt-3">
              <VehiclePnLTable group={ownFleetPnl} emptyHint="Chưa có dữ liệu xe nhà" />
            </div>
          </div>

          {/* Xe ngoài */}
          <div className="bento-card bento-col-12 lg:bento-col-6">
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
              <div className="text-[14px] font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Xe ngoài
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    fontFamily: fontMono,
                    background: vendorPnl.totalProfit >= 0 ? 'var(--theme-brand-primary-light)' : 'var(--theme-status-error-light)',
                    color:      vendorPnl.totalProfit >= 0 ? 'var(--theme-brand-primary)' : 'var(--theme-status-error)',
                  }}
                >
                  Lãi {vendorPnl.totalProfit.toLocaleString('vi-VN')}
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
                  {vendorPnl.rows.length} xe
                </span>
              </div>
            </div>
            <div className="mt-3">
              <VehiclePnLTable group={vendorPnl} emptyHint="Chưa có dữ liệu xe ngoài" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
