import { useMemo, useState } from 'react'
import {
  useMonthlyPnL,
  useVehiclePnL,
  useDeliveredTrips,
  useTripDailyStats,
} from '@/hooks/use-queries'
import { useIsMobile } from '@/hooks/use-mobile'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { DashboardSectionHeader } from '@/components/shared/DashboardSectionHeader'
import { RevealList, Reveal } from '@/components/shared/Reveal'
import { AnimatedNumber } from '@/components/shared'
import { DashboardCard } from '@/components/shared/DashboardCard'
import { TripBarChart } from '@/components/shared/TripBarChart'
import { SortableTableHeader } from '@/components/shared/SortableTableHeader'
import type { SortDirection } from '@/components/shared/SortableTableHeader'
import { useMonthParams } from './use-month-params'
import { formatCurrencyFull as fmt, type DeliveredTrip } from '@/data/domain'
import type { MonthlyPnL } from '@/services/api/pnl.api'
import {
  CheckCircle2, DollarSign, Clock, TrendingUp,
  TrendingDown, BarChart3, Truck,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

function sumChiPhi(p: MonthlyPnL | null | undefined): number {
  if (!p) return 0
  return (p.totalProductivitySalary ?? 0)
    + (p.totalAllowance ?? 0)
    + (p.totalBaseSalary ?? 0)
    + (p.totalVehicleExpenses ?? 0)
    + (p.totalCpChung ?? 0)
}

function computeDelta(current: number, prev: number): number | null {
  if (!prev || prev === 0) return null
  return Math.round(((current - prev) / Math.abs(prev)) * 100)
}

function formatTripDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  return d && m ? `${d}/${m}` : dateStr
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
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

// ─── Unmatched delivered trip row ─────────────────────────────────────────────

function UnmatchedTripRow({
  trip,
  isFirst,
}: {
  trip: DeliveredTrip
  isFirst: boolean
}) {
  const container = trip.containers?.[0]
  const route = [trip.pickupLocation?.name, trip.dropoffLocation?.name].filter(Boolean).join(' → ')

  return (
    <div
      className="flex w-full items-center gap-3 px-5 py-3"
      style={{ borderTop: isFirst ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {container?.containerNumber && (
            <span
              className="text-xs font-mono font-semibold shrink-0"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              {container.containerNumber}
            </span>
          )}
          {container?.contType && (
            <span
              className="text-[10px] font-bold px-1 py-0.5 rounded shrink-0"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
            >
              {container.contType}
            </span>
          )}
        </div>
        <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--theme-text-secondary)' }}>
          {route || '—'}
        </div>
      </div>
      <div className="text-xs tabular-nums shrink-0" style={{ color: 'var(--theme-text-muted)' }}>
        {formatTripDate(trip.tripDate)}
      </div>
    </div>
  )
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type VehicleSortCol = 'plate' | 'revenue' | 'totalCp' | 'profit' | 'margin'

// ─── Desktop dashboard ────────────────────────────────────────────────────────

function DesktopDashboard() {
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()

  // Previous month dates for delta computation
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year
  const prevDateFrom = `${prevYear}-${pad(prevMonth)}-01`
  const prevDateTo   = `${prevYear}-${pad(prevMonth)}-${pad(daysInMonth(prevYear, prevMonth))}`

  const { data: pnl }        = useMonthlyPnL(dateFrom, dateTo)
  const { data: prevPnl }    = useMonthlyPnL(prevDateFrom, prevDateTo)
  const { data: vehiclePnl } = useVehiclePnL(dateFrom, dateTo)
  const { data: dailyStats } = useTripDailyStats(dateFrom, dateTo)
   const { data: _unmatchedTrips } = useDeliveredTrips({ dateFrom, dateTo, status: 'PENDING' })
  const unmatchedTrips = _unmatchedTrips?.items ?? []

  // KPI values
  const revenue  = pnl?.revenue ?? 0
  const chiPhi   = sumChiPhi(pnl)
  const laiRong  = pnl?.profit ?? 0
  const bienLai  = revenue > 0 ? (laiRong / revenue) * 100 : null

  // Month-over-month deltas (all from real backend data)
  const revenueDelta = computeDelta(revenue, prevPnl?.revenue ?? 0)
  const chiPhiDelta  = computeDelta(chiPhi, sumChiPhi(prevPnl))
  const laiDelta     = computeDelta(laiRong, prevPnl?.profit ?? 0)

  // Trips (from lightweight aggregation)
  const matchedCount = dailyStats?.matched ?? 0
  const pendingCount = dailyStats?.pending ?? 0
  const totalCount   = dailyStats?.total ?? 0
  const matchRate    = dailyStats?.matchRate ?? null
  const dayBars      = dailyStats?.buckets ?? []

  // Vehicle table sort
  const [vehicleSort, setVehicleSort] = useState<{ col: VehicleSortCol; dir: SortDirection }>({ col: 'revenue', dir: 'desc' })
  function toggleVehicleSort(col: VehicleSortCol) {
    setVehicleSort(prev => prev.col === col
      ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
      : { col, dir: 'desc' })
  }
  const sortedVehicleRows = useMemo(() => {
    const rows = vehiclePnl?.rows ?? []
    return [...rows].sort((a, b) => {
      const aCp = (a.cpXe?.total ?? 0) + (a.cpLuongSanLuong ?? 0) + (a.cpLuongCoBan ?? 0)
      const bCp = (b.cpXe?.total ?? 0) + (b.cpLuongSanLuong ?? 0) + (b.cpLuongCoBan ?? 0)
      const aMargin = a.revenue > 0 ? a.loiNhuan / a.revenue : -Infinity
      const bMargin = b.revenue > 0 ? b.loiNhuan / b.revenue : -Infinity
      const map: Record<VehicleSortCol, number | string> = {
        plate: a.plate, revenue: a.revenue, totalCp: aCp, profit: a.loiNhuan, margin: aMargin,
      }
      const mapB: Record<VehicleSortCol, number | string> = {
        plate: b.plate, revenue: b.revenue, totalCp: bCp, profit: b.loiNhuan, margin: bMargin,
      }
      const av = map[vehicleSort.col]
      const bv = mapB[vehicleSort.col]
      const cmp = typeof av === 'string' ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number)
      return vehicleSort.dir === 'asc' ? cmp : -cmp
    })
  }, [vehiclePnl?.rows, vehicleSort])

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between relative overflow-hidden">
        <div>
          <h1 className="typo-display" style={{ color: 'var(--theme-text-primary)' }}>Tổng quan</h1>
          <p className="typo-body-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>
            Bảng điều khiển kế toán & vận tải
          </p>
        </div>
        <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
      </div>

      {/* ── KPI trio: Doanh thu · Chi phí · Lãi ── */}
      <RevealList stagger={70} threshold={0.08}>
        <div className="grid grid-cols-3 gap-3">
          <KpiHeroCard
            label="Doanh thu"
            value={revenue}
            formattedValue={<AnimatedNumber value={revenue} format="currency" />}
            icon={TrendingUp}
            color="emerald"
            sublabel={`Tháng ${pad(month)}/${year}`}
            trend={revenueDelta != null ? { value: `${Math.abs(revenueDelta)}%`, positive: revenueDelta >= 0 } : undefined}
            className="card-hover-lift"
          />
          <KpiHeroCard
            label="Chi phí"
            value={chiPhi}
            formattedValue={<AnimatedNumber value={chiPhi} format="currency" />}
            icon={TrendingDown}
            color="rose"
            sublabel="Lương + Xe + CP Chung"
            trend={chiPhiDelta != null ? { value: `${Math.abs(chiPhiDelta)}%`, positive: chiPhiDelta <= 0 } : undefined}
            className="card-hover-lift"
          />
          <KpiHeroCard
            label="Lãi ròng"
            value={laiRong}
            formattedValue={<AnimatedNumber value={laiRong} format="currency" />}
            icon={DollarSign}
            color="blue"
            sublabel={bienLai != null ? `Biên lãi ${bienLai.toFixed(1)}%` : `Tháng ${pad(month)}/${year}`}
            trend={laiDelta != null ? { value: `${Math.abs(laiDelta)}%`, positive: laiDelta >= 0 } : undefined}
            className="card-hover-lift"
          />
        </div>
      </RevealList>

      {/* ── Masonry 2-col: vehicle table left, chart + pending right ── */}
      <div className="grid grid-cols-[1fr_340px] gap-4 items-start">

        {/* LEFT: Vehicle table */}
        <Reveal threshold={0.05}>
          <DashboardCard className="card-hover-lift">
          <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
            <DashboardSectionHeader
              title="Doanh thu & Chi phí theo xe"
              icon={Truck}
              right={
                vehiclePnl?.rows?.length
                  ? <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{vehiclePnl.rows.length} xe</span>
                  : undefined
              }
            />
          </div>

          {!vehiclePnl || !vehiclePnl.rows?.length ? (
            <EmptyState icon={Truck} text="Chưa có dữ liệu xe trong tháng này" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full [&_td]:align-middle" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--theme-bg-primary)', borderBottom: '1px solid var(--theme-border-light)' }}>
                    <SortableTableHeader label="Biển số" col="plate" sort={vehicleSort} onSort={toggleVehicleSort} align="left" />
                    <SortableTableHeader label="Doanh thu" col="revenue" sort={vehicleSort} onSort={toggleVehicleSort} />
                    <SortableTableHeader label="Chi phí" col="totalCp" sort={vehicleSort} onSort={toggleVehicleSort} />
                    <SortableTableHeader label="Lãi" col="profit" sort={vehicleSort} onSort={toggleVehicleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedVehicleRows.map((row, i) => {
                    const totalCp = (row.cpXe?.total ?? 0) + (row.cpLuongSanLuong ?? 0) + (row.cpLuongCoBan ?? 0)
                    const isProfit = row.loiNhuan >= 0
                    const marginPct = row.revenue > 0 ? (row.loiNhuan / row.revenue) * 100 : null

                    return (
                      <tr
                        key={row.vehicleId}
                        className="transition-colors"
                        style={{ borderBottom: i < sortedVehicleRows.length - 1 ? '1px solid var(--theme-border-light)' : 'none' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wider"
                            style={{
                              background: 'var(--theme-bg-tertiary)',
                              borderColor: 'var(--theme-border-default)',
                              color: 'var(--theme-text-primary)',
                            }}
                          >
                            {row.plate}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-[13px] font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>
                          {fmt(row.revenue)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[13px] font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--theme-status-error)' }}>
                          {fmt(totalCp)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[13px] font-bold tabular-nums whitespace-nowrap" style={{ color: isProfit ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}>
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
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>
        </Reveal>

        {/* RIGHT: Bar chart + Pending revenue stacked */}
        <div className="flex flex-col gap-4">

          {/* Bar chart */}
          <Reveal direction="right" delay={100} threshold={0.05}>
            <DashboardCard className="card-hover-lift">
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
              <DashboardSectionHeader
                title="Chuyến theo ngày"
                icon={BarChart3}
                right={
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                      <span className="inline-block h-2 w-2 rounded-sm" style={{ background: 'var(--theme-status-success)' }} />
                      Ghép
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                      <span className="inline-block h-2 w-2 rounded-sm" style={{ background: 'var(--theme-status-warning)' }} />
                      Chờ
                    </span>
                  </div>
                }
              />
            </div>

            <div className="px-3 pt-3 pb-2">
              <TripBarChart bars={dayBars} />
            </div>

            <div className="grid grid-cols-4" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
              {[
                { label: 'Ghép', value: String(matchedCount), color: 'var(--theme-status-success)' },
                { label: 'Chờ', value: String(pendingCount), color: 'var(--theme-status-warning)' },
                { label: 'Tổng', value: String(totalCount), color: 'var(--theme-text-primary)' },
                { label: 'Tỷ lệ', value: matchRate != null ? `${matchRate}%` : '—', color: 'var(--theme-text-primary)' },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className="py-2.5 text-center"
                  style={{ borderLeft: i > 0 ? '1px solid var(--theme-border-light)' : 'none' }}
                >
                  <div className="text-[13px] font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </DashboardCard>
          </Reveal>

          {/* Chuyến chưa ghép */}
          <Reveal direction="right" delay={200} threshold={0.05}>
            <DashboardCard className="card-hover-lift">
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
              <DashboardSectionHeader
                title="Chưa ghép"
                icon={Clock}
                right={
                  unmatchedTrips.length > 0 ? (
                    <span
                      className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                      style={{ background: 'var(--theme-status-warning)', color: '#fff' }}
                    >
                      {unmatchedTrips.length}
                    </span>
                  ) : undefined
                }
              />
            </div>

            <div>
              {unmatchedTrips.length === 0 ? (
                <EmptyState icon={CheckCircle2} text="Không có chuyến chưa ghép" />
              ) : (
                unmatchedTrips.map((trip, i) => (
                  <UnmatchedTripRow
                    key={trip.id}
                    trip={trip}
                    isFirst={i === 0}
                  />
                ))
              )}
            </div>
          </DashboardCard>
          </Reveal>

        </div>
      </div>
    </div>
  )
}

// ─── Mobile dashboard ─────────────────────────────────────────────────────────

function MobileDashboard() {
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()

  const prevMonth    = month === 1 ? 12 : month - 1
  const prevYear     = month === 1 ? year - 1 : year
  const prevDateFrom = `${prevYear}-${pad(prevMonth)}-01`
  const prevDateTo   = `${prevYear}-${pad(prevMonth)}-${pad(daysInMonth(prevYear, prevMonth))}`

  const { data: pnl }        = useMonthlyPnL(dateFrom, dateTo)
  const { data: prevPnl }    = useMonthlyPnL(prevDateFrom, prevDateTo)
  const { data: vehiclePnl } = useVehiclePnL(dateFrom, dateTo)
  const { data: dailyStats } = useTripDailyStats(dateFrom, dateTo)
  const { data: _unmatchedTrips } = useDeliveredTrips({ dateFrom, dateTo, status: 'PENDING' })
  const unmatchedTrips = _unmatchedTrips?.items ?? []

  const revenue  = pnl?.revenue ?? 0
  const chiPhi   = sumChiPhi(pnl)
  const laiRong  = pnl?.profit ?? 0
  const bienLai  = revenue > 0 ? (laiRong / revenue) * 100 : null

  const revenueDelta = computeDelta(revenue, prevPnl?.revenue ?? 0)
  const chiPhiDelta  = computeDelta(chiPhi, sumChiPhi(prevPnl))
  const laiDelta     = computeDelta(laiRong, prevPnl?.profit ?? 0)

  const matchedCount = dailyStats?.matched ?? 0
  const pendingCount = dailyStats?.pending ?? 0
  const totalCount   = dailyStats?.total ?? 0
  const matchRate    = dailyStats?.matchRate ?? null
  const dayBars      = dailyStats?.buckets ?? []

  // Vehicle table sort (same as desktop)
  const [vehicleSort, setVehicleSort] = useState<{ col: VehicleSortCol; dir: SortDirection }>({ col: 'revenue', dir: 'desc' })
  function toggleVehicleSort(col: VehicleSortCol) {
    setVehicleSort(prev => prev.col === col
      ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
      : { col, dir: 'desc' })
  }
  const sortedVehicleRows = useMemo(() => {
    const rows = vehiclePnl?.rows ?? []
    return [...rows].sort((a, b) => {
      const aCp = (a.cpXe?.total ?? 0) + (a.cpLuongSanLuong ?? 0) + (a.cpLuongCoBan ?? 0)
      const bCp = (b.cpXe?.total ?? 0) + (b.cpLuongSanLuong ?? 0) + (b.cpLuongCoBan ?? 0)
      const aMargin = a.revenue > 0 ? a.loiNhuan / a.revenue : -Infinity
      const bMargin = b.revenue > 0 ? b.loiNhuan / b.revenue : -Infinity
      const map: Record<VehicleSortCol, number | string> = {
        plate: a.plate, revenue: a.revenue, totalCp: aCp, profit: a.loiNhuan, margin: aMargin,
      }
      const mapB: Record<VehicleSortCol, number | string> = {
        plate: b.plate, revenue: b.revenue, totalCp: bCp, profit: b.loiNhuan, margin: bMargin,
      }
      const av = map[vehicleSort.col]
      const bv = mapB[vehicleSort.col]
      const cmp = typeof av === 'string' ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number)
      return vehicleSort.dir === 'asc' ? cmp : -cmp
    })
  }, [vehiclePnl?.rows, vehicleSort])

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="typo-h1" style={{ color: 'var(--theme-text-primary)' }}>Tổng quan</h1>
        <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
      </div>

      <RevealList stagger={70} threshold={0.08}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiHeroCard
            label="Doanh thu"
            value={revenue}
            formattedValue={<AnimatedNumber value={revenue} format="currency" />}
            icon={TrendingUp}
            color="emerald"
            sublabel={`Tháng ${pad(month)}/${year}`}
            trend={revenueDelta != null ? { value: `${Math.abs(revenueDelta)}%`, positive: revenueDelta >= 0 } : undefined}
            className="card-hover-lift"
          />
          <KpiHeroCard
            label="Chi phí"
            value={chiPhi}
            formattedValue={<AnimatedNumber value={chiPhi} format="currency" />}
            icon={TrendingDown}
            color="rose"
            sublabel="Lương + Xe + CP Chung"
            trend={chiPhiDelta != null ? { value: `${Math.abs(chiPhiDelta)}%`, positive: chiPhiDelta <= 0 } : undefined}
            className="card-hover-lift"
          />
          <KpiHeroCard
            label="Lãi ròng"
            value={laiRong}
            formattedValue={<AnimatedNumber value={laiRong} format="currency" />}
            icon={DollarSign}
            color="blue"
            sublabel={bienLai != null ? `Biên lãi ${bienLai.toFixed(1)}%` : `Tháng ${pad(month)}/${year}`}
            trend={laiDelta != null ? { value: `${Math.abs(laiDelta)}%`, positive: laiDelta >= 0 } : undefined}
            className="card-hover-lift"
          />
        </div>
      </RevealList>

      {/* Vehicle P&L table (same as desktop, full-width + horizontal scroll on narrow) */}
      <DashboardCard>
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
          <DashboardSectionHeader
            title="Doanh thu & Chi phí theo xe"
            icon={Truck}
            right={
              vehiclePnl?.rows?.length
                ? <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{vehiclePnl.rows.length} xe</span>
                : undefined
            }
          />
        </div>
        {!vehiclePnl || !vehiclePnl.rows?.length ? (
          <EmptyState icon={Truck} text="Chưa có dữ liệu xe trong tháng này" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full [&_td]:align-middle" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--theme-bg-primary)', borderBottom: '1px solid var(--theme-border-light)' }}>
                  <SortableTableHeader label="Biển số" col="plate" sort={vehicleSort} onSort={toggleVehicleSort} align="left" />
                  <SortableTableHeader label="Doanh thu" col="revenue" sort={vehicleSort} onSort={toggleVehicleSort} />
                  <SortableTableHeader label="Chi phí" col="totalCp" sort={vehicleSort} onSort={toggleVehicleSort} />
                  <SortableTableHeader label="Lãi" col="profit" sort={vehicleSort} onSort={toggleVehicleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedVehicleRows.map((row, i) => {
                  const totalCp = (row.cpXe?.total ?? 0) + (row.cpLuongSanLuong ?? 0) + (row.cpLuongCoBan ?? 0)
                  const isProfit = row.loiNhuan >= 0
                  const marginPct = row.revenue > 0 ? (row.loiNhuan / row.revenue) * 100 : null
                  return (
                    <tr
                      key={row.vehicleId}
                      className="transition-colors"
                      style={{ borderBottom: i < sortedVehicleRows.length - 1 ? '1px solid var(--theme-border-light)' : 'none' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wider"
                          style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}>
                          {row.plate}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[13px] font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>
                        {fmt(row.revenue)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[13px] font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--theme-status-error)' }}>
                        {fmt(totalCp)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[13px] font-bold tabular-nums whitespace-nowrap" style={{ color: isProfit ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}>
                            {isProfit ? '+' : ''}{fmt(row.loiNhuan)}
                          </span>
                          {marginPct != null && (
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                              style={{
                                background: isProfit ? 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)' : 'color-mix(in srgb, var(--theme-status-error) 12%, transparent)',
                                color: isProfit ? 'var(--theme-status-success)' : 'var(--theme-status-error)',
                              }}>
                              {marginPct.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>

      {/* Bar chart */}
      <DashboardCard>
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
          <DashboardSectionHeader
            title="Chuyến theo ngày"
            icon={BarChart3}
            right={
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: 'var(--theme-status-success)' }} />
                  Ghép
                </span>
                <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: 'var(--theme-status-warning)' }} />
                  Chờ
                </span>
              </div>
            }
          />
        </div>

        <div className="px-3 pt-3 pb-2">
          <TripBarChart bars={dayBars} />
        </div>

        <div className="grid grid-cols-4" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
          {[
            { label: 'Ghép', value: String(matchedCount), color: 'var(--theme-status-success)' },
            { label: 'Chờ', value: String(pendingCount), color: 'var(--theme-status-warning)' },
            { label: 'Tổng', value: String(totalCount), color: 'var(--theme-text-primary)' },
            { label: 'Tỷ lệ', value: matchRate != null ? `${matchRate}%` : '—', color: 'var(--theme-text-primary)' },
          ].map((s, i) => (
            <div
              key={s.label}
              className="py-2.5 text-center"
              style={{ borderLeft: i > 0 ? '1px solid var(--theme-border-light)' : 'none' }}
            >
              <div className="text-[13px] font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard>
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
          <DashboardSectionHeader
            title="Chưa ghép"
            icon={Clock}
            right={
              unmatchedTrips.length > 0 ? (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                  style={{ background: 'var(--theme-status-warning)', color: '#fff' }}
                >
                  {unmatchedTrips.length}
                </span>
              ) : undefined
            }
          />
        </div>

        <div>
          {unmatchedTrips.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="Không có chuyến chưa ghép" />
          ) : (
            unmatchedTrips.map((trip, i) => (
              <UnmatchedTripRow
                key={trip.id}
                trip={trip}
                isFirst={i === 0}
              />
            ))
          )}
        </div>
      </DashboardCard>
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function AccountantDashboard() {
  const isMobile = useIsMobile(1024)
  return isMobile ? <MobileDashboard /> : <DesktopDashboard />
}
