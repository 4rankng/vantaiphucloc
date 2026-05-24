import { useEffect, useState } from 'react'
import { TripChartCard } from '@/components/shared/TripChartCard'
import {
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Activity, ArrowUpRight,
} from 'lucide-react'
import { useDirectorDashboard } from '@/hooks/queries/pnl'
import type { VehiclePnLGroup, VehiclePnLRow } from '@/services/api/pnl.api'
import type { AuditLogEntry } from '@/services/api/audit.api'
import { getAuditLogs } from '@/services/api/audit.api'
import { formatActivityEntry, formatFinancialChange, SUBJECT_PREFIX } from '@/lib/activity-utils'
import { pad } from '@/lib/accounting-utils'
import { useMonthParams } from '@/pages/accountant/use-month-params'

// ─── Demo design tokens (scoped to this page) ─────────────────────────────────

const T = {
  bg:          '#F6F7F5',
  surface:     '#FFFFFF',
  ink:         '#0F1A14',
  ink2:        '#2A332D',
  muted:       '#6B7771',
  muted2:      '#9AA39E',
  line:        '#E6EAE6',
  lineSoft:    '#EEF1ED',
  brand:       '#005A2D',
  brandDeep:   '#003D1F',
  brandTint:   '#E5EFE9',
  brandSoft:   '#F1F7F3',
  accent:      '#B8893A',
  accentTint:  '#F5EEDF',
  rose:        '#B23A48',
  roseTint:    '#FBE9EB',
} as const

const fontMono = "'JetBrains Mono', ui-monospace, monospace"
const fontSans = "'Plus Jakarta Sans', 'Be Vietnam Pro', system-ui, sans-serif"

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, unit, context, trend, accentColor = T.brand, accentTint = T.brandTint, delay,
}: {
  label: string
  value: string
  unit?: string
  context?: string
  trend?: { value: string; positive: boolean }
  accentColor?: string
  accentTint?: string
  delay?: number
}) {
  return (
    <div
      className="group relative transition-all duration-200 hover:-translate-y-px dir-kpi-card"
      style={{
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 18,
        padding: '22px 24px 20px',
        boxShadow: '0 1px 0 rgba(15,26,20,0.02), 0 1px 2px rgba(15,26,20,0.03)',
        animation: `fadeIn 0.5s ease both`,
        animationDelay: delay ? `${delay}ms` : undefined,
        containerType: 'inline-size',
      }}
    >
      {/* Hover accent bar */}
      <div
        className="absolute top-[22px] left-0 h-[18px] w-[3px] rounded-r-[3px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: accentColor }}
      />

      <p className="text-[11px] font-semibold uppercase" style={{ color: T.muted, letterSpacing: '0.1em' }}>
        {label}
      </p>

      <div className="mt-3.5 flex items-baseline gap-2.5 leading-none dir-kpi-value" style={{ fontFamily: fontMono, fontWeight: 500, color: T.ink, letterSpacing: '-0.02em' }}>
        <span>{value}</span>
        {unit && (
          <span className="dir-kpi-unit" style={{ fontFamily: fontSans, fontWeight: 600, color: T.muted, letterSpacing: '0.04em' }}>
            {unit}
          </span>
        )}
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-dashed pt-3.5" style={{ borderColor: T.lineSoft }}>
        <span className="text-xs" style={{ color: T.muted }}>{context ?? ' '}</span>
        {trend && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{
              fontFamily: fontMono,
              letterSpacing: '-0.01em',
              background: trend.positive ? accentTint : T.roseTint,
              color: trend.positive ? accentColor : T.rose,
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
      <p className="text-xs py-6 text-center" style={{ color: T.muted }}>{emptyHint}</p>
    )
  }

  // Sort rows by lợi nhuận desc so the highest contributors are most visible.
  const sorted: VehiclePnLRow[] = [...rows].sort((a, b) => b.loiNhuan - a.loiNhuan)

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.line}` }}>
            <th style={{ textAlign: 'left',  padding: '8px 10px', color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Biển số</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Doanh thu</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Chi phí</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Lợi nhuận</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const cost = row.cpXe.total + row.cpLuongSanLuong + row.cpLuongCoBan + row.cpVendor
            const positive = row.loiNhuan >= 0
            return (
              <tr key={row.vehicleId} style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                <td style={{ padding: '8px 10px', color: T.ink, fontSize: 13, fontWeight: 600 }}>
                  {row.plate}
                  {row.isVendor && row.vendorName && (
                    <span className="ml-1.5 inline-block rounded px-1.5 py-0.5" style={{ fontSize: 10, color: T.muted, background: T.lineSoft, fontWeight: 500 }}>
                      {row.vendorName}
                    </span>
                  )}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: fontMono, fontSize: 12.5, color: T.ink }}>{row.revenue.toLocaleString('vi-VN')}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: fontMono, fontSize: 12.5, color: T.ink2 }}>{cost.toLocaleString('vi-VN')}</td>
                <td style={{
                  padding: '8px 10px', textAlign: 'right',
                  fontFamily: fontMono, fontSize: 12.5, fontWeight: 600,
                  color: positive ? T.brand : T.rose,
                }}>
                  {row.loiNhuan.toLocaleString('vi-VN')}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: `1px solid ${T.line}` }}>
            <td style={{ padding: '10px', color: T.ink, fontWeight: 700, fontSize: 12 }}>Tổng</td>
            <td style={{ padding: '10px', textAlign: 'right', fontFamily: fontMono, fontWeight: 700, fontSize: 12.5, color: T.ink }}>{group.totalRevenue.toLocaleString('vi-VN')}</td>
            <td style={{ padding: '10px', textAlign: 'right', fontFamily: fontMono, fontWeight: 700, fontSize: 12.5, color: T.ink2 }}>{group.totalCost.toLocaleString('vi-VN')}</td>
            <td style={{
              padding: '10px', textAlign: 'right',
              fontFamily: fontMono, fontWeight: 700, fontSize: 12.5,
              color: group.totalProfit >= 0 ? T.brand : T.rose,
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
      onMouseEnter={e => (e.currentTarget.style.background = T.brandSoft)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {!isFirst && (
        <div style={{ position: 'absolute', top: 0, left: 28, width: 1, height: 12, background: T.line }} />
      )}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold relative"
        style={{
          background: isCreate ? T.accentTint : T.brandTint,
          color: isCreate ? '#7B5A1F' : T.brandDeep,
          letterSpacing: '0.02em',
        }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-snug" style={{ color: T.ink2 }}>
          <span className="font-semibold" style={{ color: T.ink }}>{actorLabel}</span>{' '}
          <span className="font-semibold" style={{ color: isCreate ? '#8C6420' : T.brand }}>đã {activityText}</span>
          {log.subjectName && (
            <span className="font-semibold" style={{ color: T.ink }}>
              {(() => { const pfx = SUBJECT_PREFIX[log.tableName]; return pfx ? ` ${pfx} ` : ' ' })()}{log.subjectName}
            </span>
          )}
        </p>
        <p className="mt-1" style={{ fontFamily: fontMono, fontSize: 10, color: T.muted2, letterSpacing: '0.02em' }}>
          {timeStr} · {dateStr}
        </p>
        {changes && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {changes.map((c, ci) => (
              <span key={ci} className="inline-flex items-center gap-1 text-[11px] rounded-md px-2 py-0.5" style={{ background: T.lineSoft, border: `1px solid ${T.line}` }}>
                <span className="font-medium" style={{ color: T.muted }}>{c.label}:</span>
                <span className="line-through" style={{ color: T.muted }}>{c.old.toLocaleString('vi-VN')}</span>
                <ArrowUpRight className="h-2.5 w-2.5" style={{ color: T.muted }} />
                <span className="font-bold" style={{ color: T.brand }}>{c.new.toLocaleString('vi-VN')}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DirectorDashboard() {
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()

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

  // Activity feed
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  useEffect(() => {
    let cancelled = false
    getAuditLogs({ pageSize: 15 }).then(data => {
      if (!cancelled) {
        const deduped: typeof data.items = []
        for (const entry of data.items) {
          const prev = deduped[deduped.length - 1]
          const prevTxt = prev ? formatActivityEntry(prev.action, prev.tableName) : ''
          const curTxt = formatActivityEntry(entry.action, entry.tableName)
          const prevMs = prev ? new Date(prev.createdAt).getTime() : 0
          const curMs = new Date(entry.createdAt).getTime()
          if (prev && prevTxt === curTxt && Math.abs(curMs - prevMs) < 2000) continue
          deduped.push(entry)
        }
        setAuditLogs(deduped.slice(0, 10))
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Fade-in keyframes (inject once)
  const fadeStyle = `
@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
@keyframes pulse2 { 0%,100%{box-shadow:0 0 0 4px ${T.brandTint}} 50%{box-shadow:0 0 0 7px rgba(0,90,45,.08)} }
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
      <div style={{ padding: '32px 40px 48px', maxWidth: 1480, margin: '0 auto' }}>

        {/* Page header */}
        <div className="flex items-end justify-between mb-7" style={{ animation: 'fadeIn 0.5s ease both' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: T.ink, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              Tổng quan điều hành
            </h1>
            <div className="flex items-center gap-2.5 mt-2 text-[13px]" style={{ color: T.muted }}>
              <span
                className="inline-block h-[7px] w-[7px] rounded-full"
                style={{ background: T.brand, boxShadow: `0 0 0 4px ${T.brandTint}`, animation: 'pulse2 2s ease-in-out infinite' }}
              />
              Cập nhật trực tiếp
            </div>
          </div>

          {/* Month picker */}
          <div className="flex items-center gap-1 rounded-xl border p-1" style={{ background: T.surface, borderColor: T.line, borderRadius: 12 }}>
            <button onClick={onPrev} className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[#F1F7F3]" aria-label="Tháng trước">
              <ChevronLeft style={{ width: 14, height: 14, stroke: T.ink2 }} />
            </button>
            <div className="px-3.5 text-center">
              <div className="text-[13px] font-bold" style={{ color: T.ink, letterSpacing: '-0.005em' }}>
                Tháng {pad(month)} · {year}
              </div>
              <div style={{ fontFamily: fontMono, fontSize: 10, color: T.muted, letterSpacing: '0.02em', marginTop: 1 }}>
                {dateFrom.slice(5)} → {dateTo.slice(5)}
              </div>
            </div>
            <button onClick={onNext} className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[#F1F7F3]" aria-label="Tháng sau">
              <ChevronRight style={{ width: 14, height: 14, stroke: T.ink2 }} />
            </button>
          </div>
        </div>

        {/* KPIs */}
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Tổng chuyến"
            value={total.toLocaleString('vi-VN')}
            context={`So với tháng ${pad(prevMonth)}`}
            trend={totalDelta != null ? { value: `${Math.abs(totalDelta)}%`, positive: totalDelta >= 0 } : undefined}
            delay={60}
          />
          <KpiCard
            label="Doanh thu"
            value={revenue.toLocaleString('vi-VN')}
            unit="VNĐ"
            context={avgRev > 0 ? `Trung bình ${avgRev.toLocaleString('vi-VN')} / chuyến` : undefined}
            trend={revenueDelta != null ? { value: `${Math.abs(revenueDelta)}%`, positive: revenueDelta >= 0 } : undefined}
            accentColor={T.accent}
            accentTint={T.accentTint}
            delay={120}
          />
          <KpiCard
            label="Chi phí"
            value={totalCost.toLocaleString('vi-VN')}
            unit="VNĐ"
            context={revenue > 0 ? `Tỷ lệ ${Math.round((totalCost / revenue) * 100)}% doanh thu` : undefined}
            trend={costDelta != null ? { value: `${Math.abs(costDelta)}%`, positive: costDelta <= 0 } : undefined}
            accentColor={T.rose}
            accentTint={T.roseTint}
            delay={180}
          />
          <KpiCard
            label="Lợi nhuận"
            value={profit.toLocaleString('vi-VN')}
            unit="VNĐ"
            context={revenue > 0 ? `Biên ${Math.round((profit / revenue) * 100)}%` : undefined}
            trend={profitDelta != null ? { value: `${Math.abs(profitDelta)}%`, positive: profitDelta >= 0 } : undefined}
            accentColor={profit >= 0 ? T.brand : T.rose}
            accentTint={profit >= 0 ? T.brandTint : T.roseTint}
            delay={240}
          />
        </section>

        {/* Chart */}
        <section className="mb-4" style={{ animation: 'fadeIn 0.5s ease both', animationDelay: '120ms' }}>
          <TripChartCard
            subtitle={`Tháng ${pad(month)} · ${year}`}
            bars={buckets}
          />
        </section>

        {/* Bottom insights */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animation: 'fadeIn 0.5s ease both', animationDelay: '240ms' }}>



          {/* Top routes */}
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, padding: '22px 24px', boxShadow: '0 1px 0 rgba(15,26,20,0.02), 0 1px 2px rgba(15,26,20,0.03)' }}>
            <p className="text-[11px] font-semibold uppercase" style={{ color: T.muted, letterSpacing: '0.1em' }}>Tuyến đường nổi bật</p>
            <div className="flex flex-col gap-3 mt-2.5">
              {topRoutes.length === 0 && (
                <p className="text-xs py-4 text-center" style={{ color: T.muted }}>Chưa có dữ liệu</p>
              )}
              {topRoutes.map((r, i) => (
                <div key={r.name} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-[10px] font-semibold" style={{ fontFamily: fontMono, color: T.muted2 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1 truncate text-[12.5px] font-semibold" style={{ color: T.ink2 }}>{r.name}</span>
                  <div className="flex-[1.3] h-[5px] rounded-full overflow-hidden" style={{ background: T.lineSoft }}>
                    <div className="h-full rounded-full" style={{ width: `${maxRouteCount > 0 ? (r.count / maxRouteCount) * 100 : 0}%`, background: `linear-gradient(90deg, ${T.brandDeep}, ${T.brand})` }} />
                  </div>
                  <span className="w-7 shrink-0 text-right text-[11px] font-semibold" style={{ fontFamily: fontMono, color: T.ink }}>{r.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top drivers */}
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, padding: '22px 24px', boxShadow: '0 1px 0 rgba(15,26,20,0.02), 0 1px 2px rgba(15,26,20,0.03)' }}>
            <p className="text-[11px] font-semibold uppercase" style={{ color: T.muted, letterSpacing: '0.1em' }}>Lái xe dẫn đầu</p>
            <div className="flex flex-col gap-2.5 mt-2.5">
              {topDrivers.length === 0 && (
                <p className="text-xs py-4 text-center" style={{ color: T.muted }}>Chưa có dữ liệu</p>
              )}
              {topDrivers.map((d, i) => (
                <div key={d.name + d.plate} className="flex items-center gap-3" style={{ paddingTop: i > 0 ? 14 : undefined, borderTop: i > 0 ? `1px solid ${T.lineSoft}` : undefined }}>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-tight" style={{ color: T.ink }}>{d.name}</p>
                    <p className="truncate text-[11px] leading-tight mt-0.5" style={{ color: T.muted }}>{d.plate}</p>
                  </div>
                  <span className="text-[13px] font-semibold" style={{ fontFamily: fontMono, color: T.ink, letterSpacing: '-0.01em' }}>{d.tripCount}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PnL per vehicle — split between own fleet and from-vendor */}
        <section className="mt-4" style={{ animation: 'fadeIn 0.5s ease both', animationDelay: '300ms' }}>
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 1px 0 rgba(15,26,20,0.02), 0 1px 2px rgba(15,26,20,0.03)', overflow: 'hidden' }}>

            {/* Shared header */}
            <div className="flex items-center justify-between px-6 pt-[22px] pb-4" style={{ borderBottom: `1px solid ${T.line}` }}>
              <div className="text-[15px] font-bold" style={{ color: T.ink, letterSpacing: '-0.01em' }}>
                Doanh thu &amp; Chi phí theo xe
              </div>
              <span className="text-xs" style={{ color: T.muted }}>
                {(ownFleetPnl.rows.length + vendorPnl.rows.length)} xe
              </span>
            </div>

            {/* Two sub-sections side by side at xl */}
            <div className="grid grid-cols-1 lg:grid-cols-2">

              {/* Own fleet */}
              <div className="min-w-0" style={{ borderRight: `1px solid ${T.line}` }}>
                {/* Sub-header */}
                <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: `1px solid ${T.lineSoft}`, background: `color-mix(in srgb, ${T.brandSoft} 60%, transparent)` }}>
                  <p className="text-[11px] font-semibold uppercase" style={{ color: T.muted, letterSpacing: '0.1em' }}>
                    Xe nội bộ <span style={{ fontWeight: 400 }}>({ownFleetPnl.rows.length})</span>
                  </p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      fontFamily: fontMono,
                      letterSpacing: '-0.01em',
                      background: ownFleetPnl.totalProfit >= 0 ? T.brandTint : T.roseTint,
                      color:      ownFleetPnl.totalProfit >= 0 ? T.brand    : T.rose,
                    }}
                  >
                    LN {ownFleetPnl.totalProfit.toLocaleString('vi-VN')}
                  </span>
                </div>
                <VehiclePnLTable group={ownFleetPnl} emptyHint="Chưa có dữ liệu xe nhà" />
              </div>

              {/* Vendor */}
              <div className="min-w-0">
                {/* Sub-header */}
                <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: `1px solid ${T.lineSoft}`, background: `color-mix(in srgb, ${T.brandSoft} 60%, transparent)` }}>
                  <p className="text-[11px] font-semibold uppercase" style={{ color: T.muted, letterSpacing: '0.1em' }}>
                    Xe ngoài <span style={{ fontWeight: 400 }}>({vendorPnl.rows.length})</span>
                  </p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      fontFamily: fontMono,
                      letterSpacing: '-0.01em',
                      background: vendorPnl.totalProfit >= 0 ? T.brandTint : T.roseTint,
                      color:      vendorPnl.totalProfit >= 0 ? T.brand    : T.rose,
                    }}
                  >
                    LN {vendorPnl.totalProfit.toLocaleString('vi-VN')}
                  </span>
                </div>
                <VehiclePnLTable group={vendorPnl} emptyHint="Chưa có dữ liệu xe ngoài" />
              </div>

            </div>
          </div>
        </section>

        {/* Activity */}
        <section className="mt-4 mb-4">
          <div
            style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 1px 0 rgba(15,26,20,0.02), 0 1px 2px rgba(15,26,20,0.03)', animation: 'fadeIn 0.5s ease both', animationDelay: '180ms' }}
          >
            <div className="px-6 pt-[22px] pb-4">
              <div className="text-[15px] font-bold" style={{ color: T.ink, letterSpacing: '-0.01em' }}>Hoạt động gần đây</div>
            </div>
            <div className="overflow-y-auto px-3 pb-3.5 custom-scrollbar" style={{ maxHeight: 380 }}>
              {auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Activity className="w-8 h-8" style={{ color: T.line }} />
                  <p className="text-sm" style={{ color: T.muted }}>Chưa có hoạt động nào</p>
                </div>
              ) : (
                auditLogs.map((log, i) => <ActivityItem key={log.id} log={log} isFirst={i === 0} />)
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
