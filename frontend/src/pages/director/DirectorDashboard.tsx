import { useEffect, useState } from 'react'
import {
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Activity, ArrowUpRight,
} from 'lucide-react'
import { useDirectorDashboard } from '@/hooks/queries/pnl'
import type { AuditLogEntry } from '@/services/api/audit.api'
import { getAuditLogs } from '@/services/api/audit.api'
import { compact, formatActivityEntry, formatFinancialChange } from '@/lib/activity-utils'
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
      className="group relative transition-all duration-200 hover:-translate-y-px"
      style={{
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 18,
        padding: '22px 24px 20px',
        boxShadow: '0 1px 0 rgba(15,26,20,0.02), 0 1px 2px rgba(15,26,20,0.03)',
        animation: `fadeIn 0.5s ease both`,
        animationDelay: delay ? `${delay}ms` : undefined,
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

      <div className="mt-3.5 flex items-baseline gap-2.5 leading-none" style={{ fontFamily: fontMono, fontSize: 34, fontWeight: 500, color: T.ink, letterSpacing: '-0.02em' }}>
        <span>{value}</span>
        {unit && (
          <span style={{ fontFamily: fontSans, fontSize: 12, fontWeight: 600, color: T.muted, letterSpacing: '0.04em' }}>
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

function BarChart({ buckets, maxValue }: { buckets: { day: number; matched: number; pending: number }[]; maxValue: number }) {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div style={{ position: 'relative', height: 280 }}>
      {/* Y-axis */}
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 24, width: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {Array.from({ length: 5 }, (_, i) => Math.round(maxValue * (1 - i / 4))).map(v => (
          <span key={v} style={{ fontFamily: fontMono, fontSize: 10, color: T.muted2, letterSpacing: '0.02em' }}>{v}</span>
        ))}
      </div>

      {/* Grid + Bars */}
      <div style={{ position: 'absolute', top: 0, left: 40, right: 0, bottom: 24, borderBottom: `1px solid ${T.lineSoft}` }}>
        {[0, 25, 50, 75].map(pct => (
          <div key={pct} style={{ position: 'absolute', left: 0, right: 0, height: 1, top: `${pct}%`, background: T.lineSoft }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0 2px' }}>
          {buckets.map((b, i) => {
            const mH = maxValue > 0 ? (b.matched / maxValue) * 100 : 0
            const wH = maxValue > 0 ? (b.pending / maxValue) * 100 : 0
            return (
              <div
                key={i}
                className="flex-1 flex flex-col-reverse h-full relative cursor-pointer"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {hovered === i && (
                  <div style={{
                    position: 'absolute', bottom: '100%', left: '50%', transform: 'translate(-50%, -8px)',
                    background: T.ink, color: '#fff', padding: '7px 10px', borderRadius: 8, fontSize: 11,
                    whiteSpace: 'nowrap', fontFamily: fontMono, letterSpacing: '-0.01em', zIndex: 5,
                  }}>
                    {b.date} · Khớp {b.matched} · Chờ {b.pending}
                    <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', border: '4px solid transparent', borderTopColor: T.ink }} />
                  </div>
                )}
                <div style={{ width: '100%', height: `${mH}%`, borderRadius: '4px 4px 0 0', background: T.brand, transition: 'opacity 0.15s', opacity: hovered === i ? 0.78 : 1 }} />
                <div style={{ width: '100%', height: `${wH}%`, background: T.accent, marginTop: 1 }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* X-axis */}
      <div style={{ position: 'absolute', left: 40, right: 0, bottom: 0, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
        {buckets.filter((_, i) => i % 5 === 0 || i === buckets.length - 1).map((b, i) => (
          <span key={i} style={{ fontFamily: fontMono, fontSize: 10, color: T.muted2, letterSpacing: '0.02em' }}>
            {b.date ? b.date.slice(0, 5) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function ActivityItem({ log, isFirst }: { log: AuditLogEntry; isFirst: boolean }) {
  const time = new Date(log.createdAt)
  const timeStr = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = time.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  const actorLabel = log.userId
    ? [log.userRole, log.userName].filter(Boolean).join(' ') || 'Người dùng'
    : 'Hệ thống'
  const activityText = formatActivityEntry(log.action, log.tableName)
  const changes = formatFinancialChange(log)
  const initials = actorLabel.slice(0, 2).toUpperCase()
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
          {log.subjectName && <span className="font-semibold" style={{ color: T.ink }}> {log.subjectName}</span>}
        </p>
        <p className="mt-1" style={{ fontFamily: fontMono, fontSize: 10, color: T.muted2, letterSpacing: '0.02em' }}>
          {timeStr} · {dateStr}
        </p>
        {changes && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {changes.map((c, ci) => (
              <span key={ci} className="inline-flex items-center gap-1 text-[11px] rounded-md px-2 py-0.5" style={{ background: T.lineSoft, border: `1px solid ${T.line}` }}>
                <span className="font-medium" style={{ color: T.muted }}>{c.label}:</span>
                <span className="line-through" style={{ color: T.muted }}>{compact(c.old)}</span>
                <ArrowUpRight className="h-2.5 w-2.5" style={{ color: T.muted }} />
                <span className="font-bold" style={{ color: T.brand }}>{compact(c.new)}</span>
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
  const matchRate   = stats?.matchRate   ?? null
  const revenue     = stats?.revenue     ?? 0
  const avgRev      = stats?.avgRevenuePerTrip ?? 0
  const buckets     = stats?.buckets     ?? []
  const topRoutes   = stats?.topRoutes   ?? []
  const topDrivers  = stats?.topDrivers  ?? []

  const totalDelta     = stats?.totalDelta     ?? null
  const matchedDelta   = stats?.matchedDelta   ?? null
  const pendingDelta   = stats?.pendingDelta   ?? null
  const revenueDelta   = stats?.revenueDelta   ?? null

  const prevMonth = month === 1 ? 12 : month - 1

  const maxBarValue = Math.max(...buckets.map(b => b.matched + b.pending), 1)

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
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Tổng chuyến"
            value={total.toLocaleString('vi-VN')}
            context={`So với tháng ${pad(prevMonth)}`}
            trend={totalDelta != null ? { value: `${Math.abs(totalDelta)}%`, positive: totalDelta >= 0 } : undefined}
            delay={60}
          />
          <KpiCard
            label="Đã khớp"
            value={matched.toLocaleString('vi-VN')}
            unit={`/ ${total.toLocaleString('vi-VN')}`}
            context={matchRate != null ? `Tỷ lệ ghép · ${matchRate}%` : undefined}
            trend={matchedDelta != null ? { value: `${Math.abs(matchedDelta)}%`, positive: matchedDelta >= 0 } : undefined}
            delay={120}
          />
          <KpiCard
            label="Chờ xử lý"
            value={pending.toLocaleString('vi-VN')}
            unit={`/ ${total.toLocaleString('vi-VN')}`}
            context={total > 0 ? `Chiếm ${Math.round((pending / total) * 100)}% tổng chuyến` : undefined}
            trend={pendingDelta != null ? { value: `${Math.abs(pendingDelta)}%`, positive: pendingDelta <= 0 } : undefined}
            delay={180}
          />
          <KpiCard
            label="Doanh thu"
            value={revenue.toLocaleString('vi-VN')}
            unit="VNĐ"
            context={avgRev > 0 ? `Trung bình ${compact(avgRev)} / chuyến` : undefined}
            trend={revenueDelta != null ? { value: `${Math.abs(revenueDelta)}%`, positive: revenueDelta >= 0 } : undefined}
            accentColor={T.accent}
            accentTint={T.accentTint}
            delay={240}
          />
        </section>

        {/* Chart + Activity */}
        <section className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 mb-4">
          {/* Chart */}
          <div
            style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 1px 0 rgba(15,26,20,0.02), 0 1px 2px rgba(15,26,20,0.03)', animation: 'fadeIn 0.5s ease both', animationDelay: '120ms' }}
          >
            <div className="flex items-center justify-between px-6 pt-[22px] pb-4">
              <div>
                <div className="text-[15px] font-bold" style={{ color: T.ink, letterSpacing: '-0.01em' }}>Chuyến theo ngày</div>
                <div className="text-xs mt-0.5" style={{ color: T.muted }}>Tháng {pad(month)} · {year}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-[7px] text-xs font-medium" style={{ color: T.muted2 }}>
                  <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: T.brand }} />
                  Đã khớp
                  <span style={{ fontFamily: fontMono, fontWeight: 600, color: T.ink, fontSize: 11, marginLeft: 2 }}>{matched}</span>
                </span>
                <span className="flex items-center gap-[7px] text-xs font-medium" style={{ color: T.muted2 }}>
                  <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: T.accent }} />
                  Chờ xử lý
                  <span style={{ fontFamily: fontMono, fontWeight: 600, color: T.ink, fontSize: 11, marginLeft: 2 }}>{pending}</span>
                </span>
              </div>
            </div>
            <div className="px-6 pt-2 pb-6">
              <BarChart buckets={buckets} maxValue={Math.ceil(maxBarValue / 15) * 15 || 60} />
            </div>
          </div>

          {/* Activity */}
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

        {/* Bottom insights */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ animation: 'fadeIn 0.5s ease both', animationDelay: '240ms' }}>

          {/* Reconciliation */}
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, padding: '22px 24px', boxShadow: '0 1px 0 rgba(15,26,20,0.02), 0 1px 2px rgba(15,26,20,0.03)' }}>
            <p className="text-[11px] font-semibold uppercase" style={{ color: T.muted, letterSpacing: '0.1em' }}>Tiến độ đối soát</p>
            <div className="flex items-baseline gap-2.5 mt-3">
              <span style={{ fontFamily: fontMono, fontSize: 26, fontWeight: 500, color: T.ink, letterSpacing: '-0.02em' }}>{matched.toLocaleString('vi-VN')}</span>
              <span className="text-xs font-medium" style={{ color: T.muted }}>/ {total.toLocaleString('vi-VN')} chuyến đã khớp</span>
            </div>
            <div className="mt-3.5 h-1.5 rounded-full overflow-hidden" style={{ background: T.lineSoft }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: T.brand }} />
            </div>
            <div className="flex justify-between mt-1.5" style={{ fontFamily: fontMono, fontSize: 10, color: T.muted2, letterSpacing: '0.02em' }}>
              <span>Đã khớp · {pct}%</span>
              <span>Còn lại · {pending.toLocaleString('vi-VN')}</span>
            </div>
          </div>

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
                <div key={d.name} className="flex items-center gap-3" style={{ paddingTop: i > 0 ? 14 : undefined, borderTop: i > 0 ? `1px solid ${T.lineSoft}` : undefined }}>
                  <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: T.brand, color: '#fff', letterSpacing: '0.02em' }}>
                    {getInitials(d.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-tight" style={{ color: T.ink }}>{d.name}</p>
                  </div>
                  <span className="text-[13px] font-semibold" style={{ fontFamily: fontMono, color: T.ink, letterSpacing: '-0.01em' }}>{d.tripCount}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
