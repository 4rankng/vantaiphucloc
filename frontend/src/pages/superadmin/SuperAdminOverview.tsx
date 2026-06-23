import { useMemo, useState, useEffect, useRef, useCallback } from 'react'

import {
  Users,
  Building2,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Truck,
  Coins,
  Activity,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
} from 'lucide-react'
import { ChartCard } from '@/components/shared/data-display/ChartCard'
import { BarChartWidget, LineChartWidget } from '@/components/shared/data-display/Charts'
import { OcrViewToggle, type ViewMode } from '@/components/shared/data-display/OcrViewToggle/OcrViewToggle'
import { TripChartCard } from '@/components/shared/data-display/TripChartCard'
import { KpiHeroCard } from '@/components/shared/data-display/KpiHeroCard'
import { DashboardSectionHeader } from '@/components/shared/data-display/DashboardSectionHeader'
import { MonthNavigator } from '@/components/shared/navigation/MonthNavigator'
import { AnimatedNumber } from '@/components/shared'
import { useInfiniteScroll } from '@/components/shared/data-display/ListUtils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet'
import { useProfile, useMonthlyPnL } from '@/hooks/use-queries'
import { useOcrStats } from '@/hooks/queries/ocr-stats'
import { useDirectorDashboard, useDirectorDashboardDrilldown } from '@/hooks/queries/pnl'
import { useMonthParams } from '@/pages/accountant/use-month-params'
import { formatCurrencyFull as fmt } from '@/data/domain'
import { pad, sumChiPhi, computeDelta } from '@/lib/accounting-utils'
import type { DirectorDashboard, DirectorDashboardDrilldown, DirectorDashboardDrilldownClient, VehiclePnLRow } from '@/services/api/pnl.api'
import type { AuditLogEntry } from '@/services/api/audit.api'
import { getAuditLogs } from '@/services/api/audit.api'
import { formatActivityEntry, formatFinancialChange, SUBJECT_PREFIX } from '@/lib/activity-utils'
import { buildDailyTotalLineData, buildMonthlyBarData, grandTotal, hasOcrData, successRate, buildDailyLineData, OCR_COLORS } from './ocrAnalytics.helpers'

// ─── Helpers ────────────────────────────────────────────────────────────────

const fontMono = "'JetBrains Mono', ui-monospace, monospace"

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Chào buổi sáng'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

const fmtFull = (n: number): string => n.toLocaleString('vi-VN')

type KpiMetric = 'trips' | 'revenue' | 'cost' | 'profit'

const METRIC_LABELS: Record<KpiMetric, string> = {
  trips: 'Tổng chuyến',
  revenue: 'Doanh thu',
  cost: 'Chi phí',
  profit: 'Lợi nhuận',
}

function metricValue(client: DirectorDashboardDrilldownClient, metric: KpiMetric) {
  if (metric === 'trips') return client.tripCount
  if (metric === 'revenue') return client.revenue
  if (metric === 'cost') return client.cost
  return client.profit
}

function metricVehicleValue(vehicle: DirectorDashboardDrilldownClient['vehicles'][number], metric: KpiMetric) {
  if (metric === 'trips') return vehicle.tripCount
  if (metric === 'revenue') return vehicle.revenue
  if (metric === 'cost') return vehicle.cost
  return vehicle.profit
}

function metricTotalValue(totals: DirectorDashboardDrilldown['totals'], metric: KpiMetric) {
  if (metric === 'trips') return totals.total
  if (metric === 'revenue') return totals.revenue
  if (metric === 'cost') return totals.cost
  return totals.profit
}

function formatMetricValue(value: number, metric: KpiMetric) {
  return metric === 'trips' ? `${value.toLocaleString('vi-VN')} chuyến` : value.toLocaleString('vi-VN')
}

// ─── Activity Log Items ──────────────────────────────────────────────────────

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
      className="flex gap-3 rounded-[10px] px-3 py-2.5 transition-colors duration-150 relative text-left"
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
        <p className="mt-0.5 font-mono text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>
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

// ─── Cost Donut ──────────────────────────────────────────────────────────────

interface DonutSlice { name: string; pct: number; color: string }

function CostDonut({ slices, total }: { slices: DonutSlice[]; total: string }) {
  let offset = 0
  const segs = slices.map(s => {
    const seg = { color: s.color, dasharray: `${s.pct} ${100 - s.pct}`, dashoffset: -offset }
    offset += s.pct
    return seg
  })
  return (
    <div className="relative flex-shrink-0" style={{ width: 150, height: 150 }}>
      <svg viewBox="0 0 42 42" style={{ width: 150, height: 150, transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--theme-border-light, #eef1ef)" strokeWidth="3" />
        {/* Segments */}
        {segs.map((s, i) => (
          <circle
            key={i}
            cx="21"
            cy="21"
            r="15.9"
            fill="none"
            stroke={s.color}
            strokeWidth="3.6"
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 select-none">
        <span className="text-[10px] font-bold tracking-widest text-theme-muted uppercase mb-1">Tổng chi</span>
        <span className="font-mono font-extrabold text-[16px] tracking-tight leading-none" style={{ color: 'var(--theme-text-primary)' }}>
          {total.replace(/[a-zA-ZđĐ]+$/, '')}
        </span>
        <span className="text-[10px] font-bold text-theme-muted uppercase mt-1">VND</span>
      </div>
    </div>
  )
}

// ─── Sort Helpers & Bar Lists ────────────────────────────────────────────────

type NoiBoSortCol  = 'plate' | 'revenue' | 'totalCp' | 'profit' | 'margin'
type NgoaiSortCol  = 'plate' | 'vendorName' | 'revenue' | 'cpVendor' | 'profit' | 'margin'

function SortPill({
  label,
  active,
  descending,
  onClick,
}: {
  label: string
  active: boolean
  descending: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all cursor-pointer"
      style={{
        background: active
          ? 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)'
          : 'transparent',
        color: active ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)',
        border: active
          ? '1px solid color-mix(in srgb, var(--theme-brand-primary) 20%, transparent)'
          : '1px solid transparent',
      }}
    >
      {label}
      {active && <span className="text-[9px]">{descending ? ' ↓' : ' ↑'}</span>}
    </button>
  )
}

function NoiBoBarList({ rows }: { rows: VehiclePnLRow[] }) {
  const [sort, setSort] = useState<{ col: NoiBoSortCol; dir: 'asc' | 'desc' }>({
    col: 'profit',
    dir: 'desc',
  })

  function toggleSort(col: NoiBoSortCol) {
    setSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { col, dir: 'desc' }
    )
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aCp = (a.cpXe?.total ?? 0) + (a.cpLuongSanLuong ?? 0) + (a.cpLuongCoBan ?? 0)
      const bCp = (b.cpXe?.total ?? 0) + (b.cpLuongSanLuong ?? 0) + (b.cpLuongCoBan ?? 0)
      const aMargin = a.revenue > 0 ? a.loiNhuan / a.revenue : -Infinity
      const bMargin = b.revenue > 0 ? b.loiNhuan / b.revenue : -Infinity
      const map: Record<NoiBoSortCol, number | string> = {
        plate: a.plate, revenue: a.revenue, totalCp: aCp, profit: a.loiNhuan, margin: aMargin,
      }
      const mapB: Record<NoiBoSortCol, number | string> = {
        plate: b.plate, revenue: b.revenue, totalCp: bCp, profit: b.loiNhuan, margin: bMargin,
      }
      const av = map[sort.col], bv = mapB[sort.col]
      const cmp =
        typeof av === 'string'
          ? av.localeCompare(bv as string)
          : (av as number) - (bv as number)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort])

  const maxAbs = useMemo(
    () => Math.max(1, ...sorted.map(r => Math.abs(r.loiNhuan))),
    [sorted]
  )

  return (
    <div>
      <div
        className="grid items-center gap-x-3 px-2 pb-2 mb-1"
        style={{ gridTemplateColumns: '76px 1fr 68px 38px', borderBottom: '1px solid var(--theme-border-light)' }}
      >
        <SortPill label="Biển số" active={sort.col === 'plate'} descending={sort.dir === 'desc'} onClick={() => toggleSort('plate')} />
        <span />
        <SortPill label="Lãi" active={sort.col === 'profit'} descending={sort.dir === 'desc'} onClick={() => toggleSort('profit')} />
        <span className="type-overline text-right" style={{ color: 'var(--theme-text-muted)' }}>Biên</span>
      </div>

      <div>
        {sorted.map(row => {
          const isProfit = row.loiNhuan >= 0
          const marginPct = row.revenue > 0 ? (row.loiNhuan / row.revenue) * 100 : null
          const barWidth = row.loiNhuan !== 0
            ? Math.max(3, (Math.abs(row.loiNhuan) / maxAbs) * 100)
            : 0

          return (
            <div
              key={row.vehicleId}
              className="grid items-center gap-x-3 py-[7px] px-2 rounded-lg transition-colors duration-100"
              style={{ gridTemplateColumns: '76px 1fr 68px 38px' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--theme-bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span
                className="font-mono text-[12px] font-semibold truncate"
                style={{ color: 'var(--theme-text-primary)' }}
              >
                {row.plate}
              </span>
              <div
                className="h-[6px] rounded-full overflow-hidden"
                style={{ background: 'var(--theme-bg-tertiary)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    background: isProfit
                      ? 'linear-gradient(90deg, #005A2D, #00B14F)'
                      : 'linear-gradient(90deg, #DC2626, #EF4444)',
                  }}
                />
              </div>
              <span
                className="font-mono text-[12px] font-bold tabular-nums text-right whitespace-nowrap"
                style={{ color: isProfit ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}
              >
                {row.loiNhuan === 0 ? '0' : `${isProfit ? '+' : ''}${fmtFull(row.loiNhuan)}`}
              </span>
              <span
                className="font-mono text-[11px] tabular-nums text-right"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {marginPct != null ? `${marginPct.toFixed(0)}%` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NgoaiBarList({ rows }: { rows: VehiclePnLRow[] }) {
  const [sort, setSort] = useState<{ col: NgoaiSortCol; dir: 'asc' | 'desc' }>({
    col: 'profit',
    dir: 'desc',
  })

  function toggleSort(col: NgoaiSortCol) {
    setSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { col, dir: 'desc' }
    )
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aMargin = a.revenue > 0 ? a.loiNhuan / a.revenue : -Infinity
      const bMargin = b.revenue > 0 ? b.loiNhuan / b.revenue : -Infinity
      const map: Record<NgoaiSortCol, number | string> = {
        plate: a.plate, vendorName: a.vendorName ?? '', revenue: a.revenue,
        cpVendor: a.cpVendor ?? 0, profit: a.loiNhuan, margin: aMargin,
      }
      const mapB: Record<NgoaiSortCol, number | string> = {
        plate: b.plate, vendorName: b.vendorName ?? '', revenue: b.revenue,
        cpVendor: b.cpVendor ?? 0, profit: b.loiNhuan, margin: bMargin,
      }
      const av = map[sort.col], bv = mapB[sort.col]
      const cmp =
        typeof av === 'string'
          ? av.localeCompare(bv as string)
          : (av as number) - (bv as number)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort])

  const maxAbs = useMemo(
    () => Math.max(1, ...sorted.map(r => Math.abs(r.loiNhuan))),
    [sorted]
  )

  return (
    <div>
      <div
        className="grid items-center gap-x-3 px-2 pb-2 mb-1"
        style={{ gridTemplateColumns: '76px 1fr 68px 38px', borderBottom: '1px solid var(--theme-border-light)' }}
      >
        <SortPill label="Biển số" active={sort.col === 'plate'} descending={sort.dir === 'desc'} onClick={() => toggleSort('plate')} />
        <span />
        <SortPill label="Lãi" active={sort.col === 'profit'} descending={sort.dir === 'desc'} onClick={() => toggleSort('profit')} />
        <span className="type-overline text-right" style={{ color: 'var(--theme-text-muted)' }}>Biên</span>
      </div>

      <div>
        {sorted.map(row => {
          const isProfit = row.loiNhuan >= 0
          const marginPct = row.revenue > 0 ? (row.loiNhuan / row.revenue) * 100 : null
          const barWidth = row.loiNhuan !== 0
            ? Math.max(3, (Math.abs(row.loiNhuan) / maxAbs) * 100)
            : 0

          return (
            <div
              key={row.vehicleId}
              className="grid items-center gap-x-3 py-[7px] px-2 rounded-lg transition-colors duration-100"
              style={{ gridTemplateColumns: '76px 1fr 68px 38px' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--theme-bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="min-w-0">
                <span
                  className="font-mono text-[12px] font-semibold block truncate"
                  style={{ color: 'var(--theme-text-primary)' }}
                >
                  {row.plate}
                </span>
                {row.vendorName && (
                  <span className="block text-[10px] truncate mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                    {row.vendorName}
                  </span>
                )}
              </div>
              <div
                className="h-[6px] rounded-full overflow-hidden"
                style={{ background: 'var(--theme-bg-tertiary)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    background: isProfit
                      ? 'linear-gradient(90deg, #005A2D, #00B14F)'
                      : 'linear-gradient(90deg, #DC2626, #EF4444)',
                  }}
                />
              </div>
              <span
                className="font-mono text-[12px] font-bold tabular-nums text-right whitespace-nowrap"
                style={{ color: isProfit ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}
              >
                {row.loiNhuan === 0 ? '0' : `${isProfit ? '+' : ''}${fmtFull(row.loiNhuan)}`}
              </span>
              <span
                className="font-mono text-[11px] tabular-nums text-right"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {marginPct != null ? `${marginPct.toFixed(0)}%` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Drilldown Sheet ─────────────────────────────────────────────────────────

function DirectorKpiDrilldownSheet({
  open,
  metric,
  data,
  loading,
  onClose,
}: {
  open: boolean
  metric: KpiMetric
  data: DirectorDashboardDrilldown | null | undefined
  loading: boolean
  onClose: () => void
}) {
  const clients = data?.clients ?? []
  const totals = data?.totals
  const metricLabel = METRIC_LABELS[metric]
  const overviewClients = [...clients].sort((a, b) => metricValue(b, metric) - metricValue(a, metric))

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent
        side="bottom"
        className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-none px-4 pb-4 pt-3 sm:mx-auto sm:h-[90dvh] sm:max-w-3xl sm:rounded-t-2xl text-left"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: 'var(--theme-border-default)' }} />
        <SheetHeader className="space-y-1 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-lg leading-tight">{metricLabel} theo chủ hàng</SheetTitle>
              <p className="text-xs leading-snug" style={{ color: 'var(--theme-text-muted)' }}>
                Bao gồm tuyến đã ghép và chưa ghép
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {loading && (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--theme-text-muted)' }}>Đang tải…</p>
          )}
          {!loading && clients.length === 0 && (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có dữ liệu</p>
          )}
          <div className="space-y-4">
            {totals && clients.length > 0 && (
              <section
                className="rounded-xl border p-3"
                style={{ borderColor: 'var(--theme-border-default)', background: 'var(--theme-bg-primary)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold leading-snug" style={{ color: 'var(--theme-text-primary)' }}>
                      Tổng quan {metricLabel.toLowerCase()}
                    </h3>
                    <p className="mt-0.5 text-[11px] leading-tight" style={{ color: 'var(--theme-text-muted)' }}>
                      {totals.total.toLocaleString('vi-VN')} chuyến · {totals.matched.toLocaleString('vi-VN')} đã ghép · {totals.pending.toLocaleString('vi-VN')} chưa ghép
                    </p>
                  </div>
                  <p
                    className="shrink-0 text-right font-mono text-sm font-bold tabular-nums"
                    style={{ color: metric === 'profit' && metricTotalValue(totals, metric) < 0 ? 'var(--theme-status-error)' : 'var(--theme-text-primary)' }}
                  >
                    {formatMetricValue(metricTotalValue(totals, metric), metric)}
                  </p>
                </div>

                <div className="mt-3 space-y-2">
                  {overviewClients.map(client => (
                    <div
                      key={`overview-${client.clientId}`}
                      className="grid items-center gap-3 rounded-lg px-2.5 py-2.5"
                      style={{ gridTemplateColumns: 'minmax(0, 1fr) auto', background: 'var(--theme-bg-secondary)' }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-snug break-words" style={{ color: 'var(--theme-text-primary)' }}>
                          {client.clientName}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-tight" style={{ color: 'var(--theme-text-muted)' }}>
                          {client.tripCount.toLocaleString('vi-VN')} chuyến · {client.matched.toLocaleString('vi-VN')} ghép · {client.pending.toLocaleString('vi-VN')} chưa ghép
                        </p>
                      </div>
                      <p
                        className="font-mono text-xs font-bold tabular-nums text-right"
                        style={{ color: metric === 'profit' && metricValue(client, metric) < 0 ? 'var(--theme-status-error)' : 'var(--theme-text-primary)' }}
                      >
                        {formatMetricValue(metricValue(client, metric), metric)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {clients.length > 0 && (
              <div>
                <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                  Chi tiết theo xe
                </h3>
                <div className="space-y-3">
                  {overviewClients.map(client => (
                    <section
                      key={client.clientId}
                      className="rounded-xl border p-3"
                      style={{ borderColor: 'var(--theme-border-default)', background: 'var(--theme-bg-primary)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold leading-snug" style={{ color: 'var(--theme-text-primary)' }}>{client.clientName}</h3>
                          <p className="mt-0.5 text-[11px] leading-tight" style={{ color: 'var(--theme-text-muted)' }}>
                            {client.matched} đã ghép · {client.pending} chưa ghép
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-sm font-bold tabular-nums" style={{ color: metric === 'profit' && metricValue(client, metric) < 0 ? 'var(--theme-status-error)' : 'var(--theme-text-primary)' }}>
                            {formatMetricValue(metricValue(client, metric), metric)}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{metricLabel}</p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {client.vehicles.map(vehicle => (
                          <div
                            key={`${client.clientId}-${vehicle.vehiclePlate}`}
                            className="grid items-center gap-2 rounded-lg px-2 py-2"
                            style={{ gridTemplateColumns: 'minmax(0, 1fr) auto', background: 'var(--theme-bg-secondary)' }}
                          >
                            <div className="min-w-0">
                              <p className="font-mono text-xs font-semibold leading-tight break-words" style={{ color: 'var(--theme-text-primary)' }}>
                                {vehicle.vehiclePlate}
                              </p>
                              <p className="mt-0.5 text-[10px] leading-tight" style={{ color: 'var(--theme-text-muted)' }}>
                                {vehicle.tripCount} chuyến · {vehicle.matched} ghép · {vehicle.pending} chưa ghép
                              </p>
                            </div>
                            <p className="font-mono text-xs font-bold tabular-nums text-right" style={{ color: metric === 'profit' && metricVehicleValue(vehicle, metric) < 0 ? 'var(--theme-status-error)' : 'var(--theme-text-primary)' }}>
                              {formatMetricValue(metricVehicleValue(vehicle, metric), metric)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Overview Component ──────────────────────────────────────────────────

export function SuperAdminOverview() {
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const { data: profile } = useProfile()

  // OCR Stats
  const [view, setView] = useState<ViewMode>('day')
  const { data: ocrStats, isLoading: ocrLoading } = useOcrStats(view === 'month' ? 365 : 30)

  // Director Dashboard Stats (KPIs, Trip frequency, Top Routes, Top Drivers, Vehicle PNL breakdown)
  const { data: stats, isLoading: statsLoading } = useDirectorDashboard(dateFrom, dateTo)
  const { data: drilldown, isFetching: drilldownLoading } = useDirectorDashboardDrilldown(dateFrom, dateTo)
  const [activeMetric, setActiveMetric] = useState<KpiMetric | null>(null)

  // Accountant Dashboard PnL (for Cost structure donut chart)
  const { data: pnl } = useMonthlyPnL(dateFrom, dateTo)

  const total            = stats?.total            ?? 0
  const matched          = stats?.matched          ?? 0
  const pending          = stats?.pending          ?? 0
  const revenue          = stats?.revenue          ?? 0
  const avgRev           = stats?.avgRevenuePerTrip ?? 0
  const totalCost        = stats?.totalCost        ?? 0
  const profit           = stats?.profit           ?? 0
  const buckets          = stats?.buckets          ?? []
  const topRoutes        = stats?.topRoutes        ?? []
  const topDrivers       = stats?.topDrivers       ?? []
  const totalDelta       = stats?.totalDelta       ?? null
  const revenueDelta     = stats?.revenueDelta     ?? null
  const costDelta        = stats?.costDelta        ?? null
  const profitDelta      = stats?.profitDelta      ?? null
  const ownFleetRows     = stats?.ownFleetPnl?.rows ?? []
  const vendorRows       = stats?.vendorPnl?.rows  ?? []
  const ownFleetProfit   = stats?.ownFleetPnl?.totalProfit ?? 0
  const vendorProfit     = stats?.vendorPnl?.totalProfit   ?? 0
  const bienLai          = revenue > 0 ? (profit / revenue) * 100 : null

  // Cost structure logic
  const salaryProd = (pnl?.totalProductivitySalary ?? 0) + (pnl?.totalAllowance ?? 0)
  const salaryBase = pnl?.totalBaseSalary ?? 0
  const vehicleExp = pnl?.totalVehicleExpenses ?? 0
  const generalExp = pnl?.totalCpChung ?? 0
  const totalExpenses = sumChiPhi(pnl)

  const costSlices = useMemo<DonutSlice[]>(() => {
    const realTotal = salaryProd + salaryBase + vehicleExp + generalExp
    if (realTotal <= 0) return []
    return [
      { name: 'Lương chuyến & Phụ cấp', pct: Math.round((salaryProd / realTotal) * 100), color: '#059669' },
      { name: 'Lương cơ bản', pct: Math.round((salaryBase / realTotal) * 100), color: '#34D399' },
      { name: 'Chi phí xe vận hành', pct: Math.round((vehicleExp / realTotal) * 100), color: '#3B82F6' },
      { name: 'Chi phí quản lý chung', pct: Math.round((generalExp / realTotal) * 100), color: '#F59E0B' },
    ].filter(s => s.pct > 0)
  }, [salaryProd, salaryBase, vehicleExp, generalExp])

  // ── Audit Log Activity Feed ──
  const AUDIT_PAGE_SIZE = 12
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
    getAuditLogs({ page: 1, pageSize: AUDIT_PAGE_SIZE, createdAfter: dateFrom }).then(data => {
      if (cancelledRef.current) return
      setAuditLogs(data.items)
      setAuditTotal(data.total)
    }).catch(() => {}).finally(() => {
      if (!cancelledRef.current) setAuditLoading(false)
    })
    return () => { cancelledRef.current = true }
  }, [dateFrom])

  const hasMoreAudit = auditLogs.length < auditTotal

  const loadMoreAudit = useCallback(() => {
    if (auditLoading || !hasMoreAudit) return
    const nextPage = auditPage + 1
    setAuditLoading(true)
    getAuditLogs({ page: nextPage, pageSize: AUDIT_PAGE_SIZE }).then(data => {
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
  }, [auditPage, auditLoading, hasMoreAudit])

  const sentinelRef = useInfiniteScroll(loadMoreAudit)

  // OCR formatting
  const dailyData = useMemo(() => buildDailyLineData(ocrStats?.daily ?? [], ocrStats?.minimaxEnable, ocrStats?.geminiEnable), [ocrStats])
  const monthlyData = useMemo(() => buildMonthlyBarData(ocrStats?.monthly ?? [], ocrStats?.minimaxEnable, ocrStats?.geminiEnable), [ocrStats])
  const ocrTotal = grandTotal(ocrStats)
  const showOcrEmpty = !ocrLoading && !hasOcrData(ocrStats)
  const ocrTitle = view === 'month'
    ? `Tổng lượt OCR`
    : `Tổng lượt OCR`
  const ocrSubtitle = view === 'month'
    ? 'Số lượt nhận dạng số cont theo tháng'
    : 'Số lượt nhận dạng số cont theo ngày'

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Greeting Header ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="text-left">
          <h1
            className="text-[22px] font-extrabold tracking-tight leading-tight"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {greeting()},{' '}
            <span>{profile?.fullName || 'bạn'}</span>
          </h1>
          <p className="mt-1.5 text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
            Hệ thống ổn định · {total.toLocaleString('vi-VN')} chuyến · {matched.toLocaleString('vi-VN')} đã ghép · {pending.toLocaleString('vi-VN')} chờ xử lý
          </p>
        </div>

        <MonthNavigator
          year={year}
          month={month}
          onPrev={onPrev}
          onNext={onNext}
          periodStart={periodStart}
          periodEnd={periodEnd}
        />
      </header>

      {/* ── KPI cards (Financial & Operations Overview) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiHeroCard
          label={`Tổng chuyến · Tháng ${pad(month)}/${year}`}
          value={total}
          formattedValue={<span>{total.toLocaleString('vi-VN')}</span>}
          icon={Activity}
          color="emerald"
          sublabel={`${pending} chờ ghép · ${matched} đã ghép`}
          trend={totalDelta != null ? { value: `${Math.abs(totalDelta)}%`, positive: totalDelta >= 0 } : undefined}
          onClick={() => setActiveMetric('trips')}
        />
        <KpiHeroCard
          label="Doanh thu"
          value={revenue}
          formattedValue={<AnimatedNumber value={revenue} format="currency" />}
          icon={TrendingUp}
          color="blue"
          sublabel={avgRev > 0 ? `TB ${fmt(avgRev)}/chuyến` : 'Chưa có doanh thu'}
          trend={revenueDelta != null ? { value: `${Math.abs(revenueDelta)}%`, positive: revenueDelta >= 0 } : undefined}
          onClick={() => setActiveMetric('revenue')}
        />
        <KpiHeroCard
          label="Chi phí"
          value={totalCost}
          formattedValue={<AnimatedNumber value={totalCost} format="currency" />}
          icon={TrendingDown}
          color="rose"
          sublabel={revenue > 0 ? `${Math.round((totalCost / revenue) * 100)}% doanh thu` : 'Chưa có dữ liệu'}
          trend={costDelta != null ? { value: `${Math.abs(costDelta)}%`, positive: costDelta <= 0 } : undefined}
          onClick={() => setActiveMetric('cost')}
        />
        <KpiHeroCard
          label="Lợi nhuận"
          value={profit}
          formattedValue={<AnimatedNumber value={profit} format="currency" />}
          icon={Coins}
          color="amber"
          sublabel={bienLai != null ? `Biên lãi ${bienLai.toFixed(1)}%` : 'Chưa có dữ liệu'}
          trend={profitDelta != null ? { value: `${Math.abs(profitDelta)}%`, positive: profitDelta >= 0 } : undefined}
          onClick={() => setActiveMetric('profit')}
        />
      </div>

      <DirectorKpiDrilldownSheet
        open={activeMetric != null}
        metric={activeMetric ?? 'revenue'}
        data={drilldown}
        loading={drilldownLoading}
        onClose={() => setActiveMetric(null)}
      />

      {/* ── Main grid: Trip frequency and Cost structure ── */}
      <div className="bento-grid">
        {/* Frequencies graph */}
        <TripChartCard
          title="Tần suất chuyến đi"
          subtitle={`Tháng ${pad(month)} · ${year}`}
          bars={buckets}
          className="bento-col-12 md:bento-col-8"
        />

        {/* Cost breakdown donut (Accountant widget) */}
        <div className="bento-card bento-col-12 md:bento-col-4 text-left">
          <div className="mb-4">
            <h3 className="type-h3" style={{ color: 'var(--theme-text-primary)' }}>Cơ cấu chi phí</h3>
            <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
              {costSlices.length > 0 ? `Tháng ${pad(month)}/${year} · tổng ${fmt(totalExpenses)}` : 'Chưa có chi phí ghi nhận'}
            </p>
          </div>
          {costSlices.length > 0 ? (
            <div className="flex flex-col items-center gap-4">
              <CostDonut slices={costSlices} total={fmtFull(totalExpenses)} />
              <div className="w-full flex flex-col gap-2.5">
                {costSlices.map((s, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0" style={{ background: s.color }} />
                    <span className="flex-1 truncate" style={{ color: 'var(--theme-text-secondary)' }}>{s.name}</span>
                    <span className="font-mono font-bold text-[11px] tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center py-6">
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có chi phí ghi nhận trong tháng.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Vehicle profit breakdown lists ── */}
      <div className="bento-grid">
        {/* Internal fleet */}
        <div className="bento-card bento-col-12 lg:bento-col-6 text-left">
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
                    {ownFleetProfit >= 0 ? '+' : ''}{fmtFull(ownFleetProfit)}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{ownFleetRows.length} xe</span>
              </div>
            }
          />
          <div className="mb-3 border-b" style={{ borderColor: 'var(--theme-border-light)' }} />
          <div>
            {ownFleetRows.length > 0 ? (
              <NoiBoBarList rows={ownFleetRows} />
            ) : (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                Không có xe nội bộ trong tháng này
              </div>
            )}
          </div>
        </div>

        {/* Vendor vehicles */}
        <div className="bento-card bento-col-12 lg:bento-col-6 text-left">
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
                    {vendorProfit >= 0 ? '+' : ''}{fmtFull(vendorProfit)}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{vendorRows.length} xe</span>
              </div>
            }
          />
          <div className="mb-3 border-b" style={{ borderColor: 'var(--theme-border-light)' }} />
          <div>
            {vendorRows.length > 0 ? (
              <NgoaiBarList rows={vendorRows} />
            ) : (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                Không có xe ngoài trong tháng này
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── System counts, top lists & audit log feed ── */}
      <div className="bento-grid">
        {/* Xếp hạng hoạt động (Top lists) */}
        <div className="bento-card bento-col-12 md:bento-col-6 flex flex-col gap-4 text-left">
          <DashboardSectionHeader
            title="Xếp hạng hoạt động"
            icon={BarChart3}
            className="pb-3 border-b border-theme-border-light"
          />

          <div className="space-y-4 flex-grow">
            {/* Top routes */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--theme-text-muted)' }}>
                Tuyến đường nổi bật
              </h4>
              <div className="flex flex-col gap-2.5">
                {topRoutes.length === 0 && (
                  <p className="text-xs py-2 text-center" style={{ color: 'var(--theme-text-muted)' }}>Chưa có dữ liệu</p>
                )}
                {topRoutes.slice(0, 3).map((r, i) => (
                  <div key={r.name} className="flex items-center gap-2 text-xs">
                    <span className="w-4 shrink-0 flex items-center justify-center h-4 rounded text-[9px] font-bold" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)', color: 'var(--theme-brand-primary)' }}>
                      {i + 1}
                    </span>
                    <span className="flex-grow truncate font-medium" style={{ color: 'var(--theme-text-secondary)' }}>{r.name}</span>
                    <span className="shrink-0 text-right font-bold font-mono tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top drivers */}
            <div className="pt-2 border-t border-theme-border-light">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--theme-text-muted)' }}>
                Lái xe dẫn đầu
              </h4>
              <div className="flex flex-col gap-2">
                {topDrivers.length === 0 && (
                  <p className="text-xs py-2 text-center" style={{ color: 'var(--theme-text-muted)' }}>Chưa có dữ liệu</p>
                )}
                {topDrivers.slice(0, 3).map((d, i) => (
                  <div key={d.name + d.plate} className="flex items-center gap-2.5 text-xs py-0.5">
                    <span className="w-4 shrink-0 flex items-center justify-center h-4 rounded text-[9px] font-bold" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)', color: 'var(--theme-brand-primary)' }}>
                      {i + 1}
                    </span>
                    <div className="flex-grow min-w-0">
                      <p className="truncate font-semibold leading-none" style={{ color: 'var(--theme-text-primary)' }}>{d.name}</p>
                      {d.plate && <p className="truncate text-[10px] leading-tight text-theme-muted mt-0.5">{d.plate}</p>}
                    </div>
                    <span className="shrink-0 font-bold font-mono tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{d.tripCount} chuyến</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log Activity Feed */}
        <div className="bento-card bento-col-12 md:bento-col-6 flex flex-col text-left">
          <div className="pb-3 border-b" style={{ borderColor: 'var(--theme-border-light)' }}>
            <h3 className="type-h3" style={{ color: 'var(--theme-text-primary)' }}>Hoạt động gần đây</h3>
          </div>
          <div className="flex-grow overflow-y-auto mt-2 px-1 custom-scrollbar" style={{ maxHeight: 290 }}>
            {auditLogs.length === 0 && !auditLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 h-full">
                <Activity className="w-7 h-7" style={{ color: 'var(--theme-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có hoạt động nào</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {auditLogs.map((log, i) => <ActivityItem key={log.id} log={log} isFirst={i === 0} />)}
                {hasMoreAudit && (
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
      </div>

      {/* ── OCR Analytics section (detailed with providers breakdown) ── */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <ChartCard
            title={ocrTitle}
            subtitle={ocrSubtitle}
            loading={ocrLoading}
            actions={
              <OcrViewToggle value={view} onChange={setView} />
            }
          >
            {showOcrEmpty ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  Chưa có dữ liệu
                </p>
              </div>
            ) : view === 'month' ? (
              <BarChartWidget
                data={monthlyData}
                height={240}
                options={{
                  plugins: {
                    legend: {
                      display: true,
                      labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 6,
                        boxHeight: 6,
                        padding: 15,
                      }
                    }
                  }
                }}
              />
            ) : (
              <LineChartWidget
                data={dailyData}
                height={240}
                options={{
                  plugins: {
                    legend: {
                      display: true,
                      labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 6,
                        boxHeight: 6,
                        padding: 15,
                      }
                    }
                  },
                  interaction: { mode: 'index', intersect: false },
                }}
              />
            )}
          </ChartCard>
        </div>

        <div className="flex flex-col gap-4">
          <div
            className="rounded-xl p-4 flex flex-col justify-between min-h-[96px] text-left"
            style={{
              background: 'var(--surface, var(--theme-bg-secondary))',
              border: '1px solid var(--line, var(--theme-border-default))',
            }}
          >
            <p className="text-[12px] uppercase font-bold tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Tổng lượt OCR</p>
            {ocrLoading ? (
              <div className="h-7 w-20 bg-theme-bg-tertiary animate-pulse rounded mt-2" />
            ) : (
              <p
                className="mt-2 font-semibold leading-none"
                style={{
                  fontFamily: 'var(--theme-font-display)',
                  fontSize: '1.5rem',
                  letterSpacing: '-0.03em',
                  color: 'var(--theme-text-primary)',
                }}
              >
                {ocrTotal.toLocaleString('vi-VN')}
              </p>
            )}
            <p className="mt-1.5 text-xs" style={{ color: 'var(--theme-text-muted)' }}>Tổng số lượt gọi nhận dạng cont</p>
          </div>

          {(ocrStats?.minimaxEnable ?? true) && (
            <div
              className="rounded-xl p-4 flex flex-col justify-between min-h-[96px] text-left"
              style={{
                background: 'var(--surface, var(--theme-bg-secondary))',
                border: '1px solid var(--line, var(--theme-border-default))',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: OCR_COLORS.minimax }}
                />
                <p className="text-[12px] uppercase font-bold tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Tỷ lệ thành công MiniMax</p>
              </div>
              {ocrLoading ? (
                <div className="h-7 w-20 bg-theme-bg-tertiary animate-pulse rounded mt-2" />
              ) : (
                <p
                  className="mt-2 font-semibold leading-none"
                  style={{
                    fontFamily: 'var(--theme-font-display)',
                    fontSize: '1.5rem',
                    letterSpacing: '-0.03em',
                    color: 'var(--theme-text-primary)',
                  }}
                >
                  {ocrStats?.totals?.minimax ? `${successRate(ocrStats.totals.minimax.total, ocrStats.totals.minimax.success)}%` : '0%'}
                </p>
              )}
              <p className="mt-1.5 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                {ocrStats?.totals?.minimax ? `Thành công ${ocrStats.totals.minimax.success}/${ocrStats.totals.minimax.total}` : 'Chưa có cuộc gọi nào'}
              </p>
            </div>
          )}

          {(ocrStats?.geminiEnable ?? true) && (
            <div
              className="rounded-xl p-4 flex flex-col justify-between min-h-[96px] text-left"
              style={{
                background: 'var(--surface, var(--theme-bg-secondary))',
                border: '1px solid var(--line, var(--theme-border-default))',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: OCR_COLORS.gemini }}
                />
                <p className="text-[12px] uppercase font-bold tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Tỷ lệ thành công Gemini</p>
              </div>
              {ocrLoading ? (
                <div className="h-7 w-20 bg-theme-bg-tertiary animate-pulse rounded mt-2" />
              ) : (
                <p
                  className="mt-2 font-semibold leading-none"
                  style={{
                    fontFamily: 'var(--theme-font-display)',
                    fontSize: '1.5rem',
                    letterSpacing: '-0.03em',
                    color: 'var(--theme-text-primary)',
                  }}
                >
                  {ocrStats?.totals?.gemini ? `${successRate(ocrStats.totals.gemini.total, ocrStats.totals.gemini.success)}%` : '0%'}
                </p>
              )}
              <p className="mt-1.5 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                {ocrStats?.totals?.gemini ? `Thành công ${ocrStats.totals.gemini.success}/${ocrStats.totals.gemini.total}` : 'Chưa có cuộc gọi nào'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
