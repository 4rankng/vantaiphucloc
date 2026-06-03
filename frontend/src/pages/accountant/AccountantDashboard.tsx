import { useMemo, useState } from 'react'
import {
  useMonthlyPnL,
  useVehiclePnL,
  useTripDailyStats,
} from '@/hooks/use-queries'
import { useIsMobile } from '@/hooks/use-mobile'
import { MonthNavigator } from '@/components/shared/navigation/MonthNavigator'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { KpiHeroCard } from '@/components/shared/data-display/KpiHeroCard'
import { DashboardSectionHeader } from '@/components/shared/data-display/DashboardSectionHeader'
import { RevealList, Reveal } from '@/components/shared/feedback/Reveal'
import { AnimatedNumber } from '@/components/shared'
import { DashboardCard } from '@/components/shared/data-display/DashboardCard'
import { TripChartCard } from '@/components/shared/data-display/TripChartCard'
import { useMonthParams } from './use-month-params'
import { formatCurrencyFull as fmt } from '@/data/domain'
import { pad, daysInMonth, sumChiPhi, computeDelta } from '@/lib/accounting-utils'
import type { VehiclePnLRow } from '@/services/api/pnl.api'
import {
  TrendingUp,
  TrendingDown, BarChart3, Truck, Coins,
} from 'lucide-react'

// ─── Subcomponents ────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)' }}
      >
        <Icon className="h-6 w-6" style={{ color: 'var(--theme-brand-primary)' }} />
      </div>
      <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{text}</p>
    </div>
  )
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type NoiBoSortCol  = 'plate' | 'revenue' | 'totalCp' | 'profit' | 'margin'
type NgoaiSortCol  = 'plate' | 'vendorName' | 'revenue' | 'cpVendor' | 'profit' | 'margin'

function PlateChip({ plate }: { plate: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wider"
      style={{
        background: 'var(--theme-bg-tertiary)',
        borderColor: 'var(--theme-border-default)',
        color: 'var(--theme-text-primary)',
      }}
    >
      {plate}
    </span>
  )
}

// ─── Stack helpers ──────────────────────────────────────────────────────────

function StackMetric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--theme-text-muted)' }}
      >
        {label}
      </span>
      <span
        className="text-[13px] font-bold tabular-nums leading-tight"
        style={{ color: color ?? 'var(--theme-text-primary)' }}
      >
        {value}
      </span>
    </div>
  )
}

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

// ─── Xe nội bộ stacked cards ────────────────────────────────────────────────

function NoiBoSubTable({ rows }: { rows: VehiclePnLRow[] }) {
  const [sort, setSort] = useState<{ col: NoiBoSortCol; dir: 'asc' | 'desc' }>({
    col: 'revenue',
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

  return (
    <div className="space-y-2">
      <div className="flex gap-1 flex-wrap">
        <SortPill label="Biển số" active={sort.col === 'plate'} descending={sort.dir === 'desc'} onClick={() => toggleSort('plate')} />
        <SortPill label="Doanh thu" active={sort.col === 'revenue'} descending={sort.dir === 'desc'} onClick={() => toggleSort('revenue')} />
        <SortPill label="Chi phí" active={sort.col === 'totalCp'} descending={sort.dir === 'desc'} onClick={() => toggleSort('totalCp')} />
        <SortPill label="Lãi" active={sort.col === 'profit'} descending={sort.dir === 'desc'} onClick={() => toggleSort('profit')} />
      </div>

      <div className="space-y-1.5">
        {sorted.map(row => {
          const totalCp = (row.cpXe?.total ?? 0) + (row.cpLuongSanLuong ?? 0) + (row.cpLuongCoBan ?? 0)
          const isProfit = row.loiNhuan >= 0
          const marginPct = row.revenue > 0 ? (row.loiNhuan / row.revenue) * 100 : null
          return (
            <div
              key={row.vehicleId}
              className="rounded-xl p-3 transition-all duration-200"
              style={{
                background: 'var(--theme-bg-primary)',
                border: '1px solid var(--theme-border-light)',
              }}
            >
              <div className="flex justify-between items-center mb-2.5">
                <PlateChip plate={row.plate} />
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[13px] font-bold tabular-nums whitespace-nowrap"
                    style={{ color: isProfit ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}
                  >
                    {isProfit ? '+' : ''}{fmt(row.loiNhuan)}
                  </span>
                  {marginPct != null && (
                    <span
                      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                      style={{
                        background: isProfit
                          ? 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)'
                          : 'color-mix(in srgb, var(--theme-status-error) 12%, transparent)',
                        color: isProfit ? 'var(--theme-status-success)' : 'var(--theme-status-error)',
                      }}
                    >
                      {marginPct.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div
                className="grid grid-cols-3 gap-3 pt-2.5"
                style={{ borderTop: '1px solid var(--theme-border-light)' }}
              >
                <StackMetric label="Doanh thu" value={fmt(row.revenue)} />
                <StackMetric label="Chi phí" value={fmt(totalCp)} color="var(--theme-status-error)" />
                <StackMetric
                  label="Biên lãi"
                  value={marginPct != null ? `${marginPct.toFixed(0)}%` : '—'}
                  color={isProfit ? 'var(--theme-status-success)' : 'var(--theme-status-error)'}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Xe ngoài stacked cards ──────────────────────────────────────────────────

function NgoaiSubTable({ rows }: { rows: VehiclePnLRow[] }) {
  const [sort, setSort] = useState<{ col: NgoaiSortCol; dir: 'asc' | 'desc' }>({
    col: 'revenue',
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

  return (
    <div className="space-y-2">
      <div className="flex gap-1 flex-wrap">
        <SortPill label="Biển số" active={sort.col === 'plate'} descending={sort.dir === 'desc'} onClick={() => toggleSort('plate')} />
        <SortPill label="Nhà xe" active={sort.col === 'vendorName'} descending={sort.dir === 'desc'} onClick={() => toggleSort('vendorName')} />
        <SortPill label="Doanh thu" active={sort.col === 'revenue'} descending={sort.dir === 'desc'} onClick={() => toggleSort('revenue')} />
        <SortPill label="Chi phí" active={sort.col === 'cpVendor'} descending={sort.dir === 'desc'} onClick={() => toggleSort('cpVendor')} />
        <SortPill label="Lãi" active={sort.col === 'profit'} descending={sort.dir === 'desc'} onClick={() => toggleSort('profit')} />
      </div>

      <div className="space-y-1.5">
        {sorted.map(row => {
          const isProfit = row.loiNhuan >= 0
          const marginPct = row.revenue > 0 ? (row.loiNhuan / row.revenue) * 100 : null
          return (
            <div
              key={row.vehicleId}
              className="rounded-xl p-3 transition-all duration-200"
              style={{
                background: 'var(--theme-bg-primary)',
                border: '1px solid var(--theme-border-light)',
              }}
            >
              <div className="flex justify-between items-center">
                <PlateChip plate={row.plate} />
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[13px] font-bold tabular-nums whitespace-nowrap"
                    style={{ color: isProfit ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}
                  >
                    {isProfit ? '+' : ''}{fmt(row.loiNhuan)}
                  </span>
                  {marginPct != null && (
                    <span
                      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                      style={{
                        background: isProfit
                          ? 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)'
                          : 'color-mix(in srgb, var(--theme-status-error) 12%, transparent)',
                        color: isProfit ? 'var(--theme-status-success)' : 'var(--theme-status-error)',
                      }}
                    >
                      {marginPct.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              {row.vendorName && (
                <p className="text-[11px] mt-1.5 mb-2" style={{ color: 'var(--theme-text-muted)' }}>
                  {row.vendorName}
                </p>
              )}
              <div
                className="grid grid-cols-3 gap-3 pt-2.5"
                style={{ borderTop: '1px solid var(--theme-border-light)' }}
              >
                <StackMetric label="Doanh thu" value={fmt(row.revenue)} />
                <StackMetric
                  label="Chi phí"
                  value={(row.cpVendor ?? 0) > 0 ? fmt(row.cpVendor) : '—'}
                  color="var(--theme-status-error)"
                />
                <StackMetric
                  label="Biên lãi"
                  value={marginPct != null ? `${marginPct.toFixed(0)}%` : '—'}
                  color={isProfit ? 'var(--theme-status-success)' : 'var(--theme-status-error)'}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}



// ─── Desktop dashboard ────────────────────────────────────────────────────────

function DesktopDashboard() {
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year
  const prevDateFrom = `${prevYear}-${pad(prevMonth)}-01`
  const prevDateTo   = `${prevYear}-${pad(prevMonth)}-${pad(daysInMonth(prevYear, prevMonth))}`

  const { data: pnl }        = useMonthlyPnL(dateFrom, dateTo)
  const { data: prevPnl }    = useMonthlyPnL(prevDateFrom, prevDateTo)
  const { data: vehiclePnl } = useVehiclePnL(dateFrom, dateTo)
  const { data: dailyStats } = useTripDailyStats(dateFrom, dateTo)

  const revenue = pnl?.revenue ?? 0
  const chiPhi   = sumChiPhi(pnl)
  const laiRong  = pnl?.profit ?? 0
  const bienLai  = revenue > 0 ? (laiRong / revenue) * 100 : null

  const revenueDelta = computeDelta(revenue, prevPnl?.revenue ?? 0)
  const chiPhiDelta  = computeDelta(chiPhi, sumChiPhi(prevPnl))
  const laiDelta     = computeDelta(laiRong, prevPnl?.profit ?? 0)

  const dayBars = dailyStats?.buckets ?? []

  const salaryProd = (pnl?.totalProductivitySalary ?? 0) + (pnl?.totalAllowance ?? 0)
  const salaryBase = pnl?.totalBaseSalary ?? 0
  const vehicleExp = pnl?.totalVehicleExpenses ?? 0
  const generalExp = pnl?.totalCpChung ?? 0

  const allRows   = vehiclePnl?.rows ?? []
  const noiBoRows = allRows.filter(r => !r.isVendor)
  const ngoaiRows = allRows.filter(r => r.isVendor)

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <PageHeader
        title="Tổng quan"
        subtitle="Bảng điều khiển kế toán & vận tải"
        lucideIcon={BarChart3}
        actions={<MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />}
      />

      <div className="bento-grid">
        {/* Doanh thu */}
        <div className="bento-card bento-card-gradient-emerald bento-col-12 md:bento-col-4">
          <div className="flex items-center gap-3">
            <div className="bento-badge-icon" style={{ background: 'color-mix(in srgb, var(--theme-status-success) 10%, transparent)', color: 'var(--theme-status-success)' }}>
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="flex-grow min-w-0">
              <span className="bento-stat-label">Doanh thu</span>
              <h3 className="bento-stat-value">
                <AnimatedNumber value={revenue} format="currency" />
              </h3>
            </div>
          </div>
          <div className="bento-stat-footer">
            <span>Tháng {pad(month)}/{year}</span>
            {revenueDelta != null && (
              <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)', color: 'var(--theme-status-success)' }}>
                ↑ {Math.abs(revenueDelta)}%
              </span>
            )}
          </div>
        </div>

        {/* Chi phí */}
        <div className="bento-card bento-card-gradient-rose bento-col-12 md:bento-col-4">
          <div className="flex items-center gap-3">
            <div className="bento-badge-icon" style={{ background: 'color-mix(in srgb, var(--theme-status-error) 10%, transparent)', color: 'var(--theme-status-error)' }}>
              <TrendingDown className="h-5 w-5" />
            </div>
            <div className="flex-grow min-w-0">
              <span className="bento-stat-label">Chi phí</span>
              <h3 className="bento-stat-value">
                <AnimatedNumber value={chiPhi} format="currency" />
              </h3>
            </div>
          </div>
          <div className="bento-stat-footer">
            <span>Lương + Xe + CP Chung</span>
            {chiPhiDelta != null && (
              <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: chiPhiDelta <= 0 ? 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)' : 'color-mix(in srgb, var(--theme-status-error) 12%, transparent)', color: chiPhiDelta <= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}>
                {chiPhiDelta <= 0 ? '↓' : '↑'} {Math.abs(chiPhiDelta)}%
              </span>
            )}
          </div>
        </div>

        {/* Lợi nhuận */}
        <div className="bento-card bento-card-gradient-blue bento-col-12 md:bento-col-4">
          <div className="flex items-center gap-3">
            <div className="bento-badge-icon" style={{ background: 'color-mix(in srgb, var(--theme-status-info) 10%, transparent)', color: 'var(--theme-status-info)' }}>
              <Coins className="h-5 w-5" />
            </div>
            <div className="flex-grow min-w-0">
              <span className="bento-stat-label">Lợi nhuận</span>
              <h3 className="bento-stat-value">
                <AnimatedNumber value={laiRong} format="currency" />
              </h3>
            </div>
          </div>
          <div className="bento-stat-footer">
            <span>{bienLai != null ? `Biên lãi ${bienLai.toFixed(1)}%` : `Tháng ${pad(month)}/${year}`}</span>
            {laiDelta != null && (
              <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: laiDelta >= 0 ? 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)' : 'color-mix(in srgb, var(--theme-status-error) 12%, transparent)', color: laiDelta >= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}>
                {laiDelta >= 0 ? '↑' : '↓'} {Math.abs(laiDelta)}%
              </span>
            )}
          </div>
        </div>

        {/* Chart */}
        <TripChartCard
          title="Chuyến theo ngày"
          subtitle={`Tháng ${pad(month)} · ${year}`}
          bars={dayBars}
          className="bento-col-12 md:bento-col-8"
        />

        {/* Phân bổ Chi phí */}
        <div className="bento-card bento-col-12 md:bento-col-4">
          <div className="mb-4">
            <h3 className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Phân bổ chi phí</h3>
            <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Cấu trúc các nhóm chi phí trong tháng</p>
          </div>
          <div className="flex-grow flex flex-col justify-between gap-3">
            {[
              { label: 'Lương chuyến & Phụ cấp', value: salaryProd },
              { label: 'Lương cơ bản', value: salaryBase },
              { label: 'Chi phí xe vận hành', value: vehicleExp },
              { label: 'Chi phí quản lý chung', value: generalExp },
            ].map(({ label, value }) => {
              const pct = chiPhi > 0 ? (value / chiPhi) * 100 : 0
              return (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span style={{ color: 'var(--theme-text-secondary)' }}>{label}</span>
                    <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--theme-text-primary)' }}>{fmt(value)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--theme-bg-tertiary)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: 'var(--theme-brand-primary)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Xe nội bộ */}
        <div className="bento-card bento-col-12 lg:bento-col-6">
          <div className="pb-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
            <DashboardSectionHeader
              title="Xe nội bộ"
              icon={Truck}
              right={
                noiBoRows.length
                  ? <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{noiBoRows.length} xe</span>
                  : undefined
              }
            />
          </div>
          <div className="mt-3">
            {noiBoRows.length > 0
              ? <NoiBoSubTable rows={noiBoRows} />
              : <EmptyState icon={Truck} text="Không có xe nội bộ trong tháng này" />
            }
          </div>
        </div>

        {/* Xe ngoài */}
        <div className="bento-card bento-col-12 lg:bento-col-6">
          <div className="pb-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
            <DashboardSectionHeader
              title="Xe ngoài"
              icon={Truck}
              right={
                ngoaiRows.length
                  ? <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{ngoaiRows.length} xe</span>
                  : undefined
              }
            />
          </div>
          <div className="mt-3">
            {ngoaiRows.length > 0 ? (
              <NgoaiSubTable rows={ngoaiRows} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-6">
                <img
                  src="/illustrations/empty-vendors.svg"
                  alt=""
                  className="h-24 w-auto opacity-80"
                  draggable={false}
                />
                <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                  Không có xe ngoài trong tháng này
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Mobile dashboard ─────────────────────────────────────────────────────────

function MobileDashboard() {
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()

  const prevMonth    = month === 1 ? 12 : month - 1
  const prevYear     = month === 1 ? year - 1 : year
  const prevDateFrom = `${prevYear}-${pad(prevMonth)}-01`
  const prevDateTo   = `${prevYear}-${pad(prevMonth)}-${pad(daysInMonth(prevYear, prevMonth))}`

  const { data: pnl }        = useMonthlyPnL(dateFrom, dateTo)
  const { data: prevPnl }    = useMonthlyPnL(prevDateFrom, prevDateTo)
  const { data: vehiclePnl } = useVehiclePnL(dateFrom, dateTo)
  const { data: dailyStats } = useTripDailyStats(dateFrom, dateTo)

  const revenue  = pnl?.revenue ?? 0
  const chiPhi   = sumChiPhi(pnl)
  const laiRong  = pnl?.profit ?? 0
  const bienLai  = revenue > 0 ? (laiRong / revenue) * 100 : null

  const revenueDelta = computeDelta(revenue, prevPnl?.revenue ?? 0)
  const chiPhiDelta  = computeDelta(chiPhi, sumChiPhi(prevPnl))
  const laiDelta     = computeDelta(laiRong, prevPnl?.profit ?? 0)

  const dayBars = dailyStats?.buckets ?? []

  const allRows   = vehiclePnl?.rows ?? []
  const noiBoRows = allRows.filter(r => !r.isVendor)
  const ngoaiRows = allRows.filter(r => r.isVendor)

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Tổng quan"
        subtitle="Bảng điều khiển kế toán & vận tải"
        lucideIcon={BarChart3}
        compact
        actions={<MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />}
      />

      <div className="bento-grid">
        {/* Doanh thu */}
        <div className="bento-card bento-card-gradient-emerald bento-col-12">
          <div className="flex items-center gap-3">
            <div className="bento-badge-icon" style={{ background: 'color-mix(in srgb, var(--theme-status-success) 10%, transparent)', color: 'var(--theme-status-success)' }}>
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="flex-grow min-w-0">
              <span className="bento-stat-label">Doanh thu</span>
              <h3 className="bento-stat-value">
                <AnimatedNumber value={revenue} format="currency" />
              </h3>
            </div>
          </div>
          <div className="bento-stat-footer">
            <span>Tháng {pad(month)}/{year}</span>
            {revenueDelta != null && (
              <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)', color: 'var(--theme-status-success)' }}>
                ↑ {Math.abs(revenueDelta)}%
              </span>
            )}
          </div>
        </div>

        {/* Chi phí */}
        <div className="bento-card bento-card-gradient-rose bento-col-12">
          <div className="flex items-center gap-3">
            <div className="bento-badge-icon" style={{ background: 'color-mix(in srgb, var(--theme-status-error) 10%, transparent)', color: 'var(--theme-status-error)' }}>
              <TrendingDown className="h-5 w-5" />
            </div>
            <div className="flex-grow min-w-0">
              <span className="bento-stat-label">Chi phí</span>
              <h3 className="bento-stat-value">
                <AnimatedNumber value={chiPhi} format="currency" />
              </h3>
            </div>
          </div>
          <div className="bento-stat-footer">
            <span>Lương + Xe + CP Chung</span>
            {chiPhiDelta != null && (
              <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: chiPhiDelta <= 0 ? 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)' : 'color-mix(in srgb, var(--theme-status-error) 12%, transparent)', color: chiPhiDelta <= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}>
                {chiPhiDelta <= 0 ? '↓' : '↑'} {Math.abs(chiPhiDelta)}%
              </span>
            )}
          </div>
        </div>

        {/* Lợi nhuận */}
        <div className="bento-card bento-card-gradient-blue bento-col-12">
          <div className="flex items-center gap-3">
            <div className="bento-badge-icon" style={{ background: 'color-mix(in srgb, var(--theme-status-info) 10%, transparent)', color: 'var(--theme-status-info)' }}>
              <Coins className="h-5 w-5" />
            </div>
            <div className="flex-grow min-w-0">
              <span className="bento-stat-label">Lợi nhuận</span>
              <h3 className="bento-stat-value">
                <AnimatedNumber value={laiRong} format="currency" />
              </h3>
            </div>
          </div>
          <div className="bento-stat-footer">
            <span>{bienLai != null ? `Biên lãi ${bienLai.toFixed(1)}%` : `Tháng ${pad(month)}/${year}`}</span>
            {laiDelta != null && (
              <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: laiDelta >= 0 ? 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)' : 'color-mix(in srgb, var(--theme-status-error) 12%, transparent)', color: laiDelta >= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}>
                {laiDelta >= 0 ? '↑' : '↓'} {Math.abs(laiDelta)}%
              </span>
            )}
          </div>
        </div>

        {/* Bar chart */}
        <TripChartCard
          subtitle={`Tháng ${pad(month)} · ${year}`}
          bars={dayBars}
          className="bento-col-12"
        />

        {/* Xe nội bộ */}
        <div className="bento-card bento-col-12">
          <div className="pb-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
            <DashboardSectionHeader
              title="Xe nội bộ"
              icon={Truck}
              right={
                noiBoRows.length
                  ? <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{noiBoRows.length} xe</span>
                  : undefined
              }
            />
          </div>
          <div className="mt-3">
            {noiBoRows.length > 0
              ? <NoiBoSubTable rows={noiBoRows} />
              : <EmptyState icon={Truck} text="Không có xe nội bộ trong tháng này" />
            }
          </div>
        </div>

        {/* Xe ngoài */}
        <div className="bento-card bento-col-12">
          <div className="pb-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
            <DashboardSectionHeader
              title="Xe ngoài"
              icon={Truck}
              right={
                ngoaiRows.length
                  ? <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{ngoaiRows.length} xe</span>
                  : undefined
              }
            />
          </div>
          <div className="mt-3">
            {ngoaiRows.length > 0 ? (
              <NgoaiSubTable rows={ngoaiRows} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-6">
                <img
                  src="/illustrations/empty-vendors.svg"
                  alt=""
                  className="h-24 w-auto opacity-80"
                  draggable={false}
                />
                <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                  Không có xe ngoài trong tháng này
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function AccountantDashboard() {
  const isMobile = useIsMobile(1024)
  return isMobile ? <MobileDashboard /> : <DesktopDashboard />
}
