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
import { SortableTableHeader } from '@/components/shared/data-display/SortableTableHeader'
import type { SortDirection } from '@/components/shared/data-display/SortableTableHeader'
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

// ─── Xe nội bộ sub-table ─────────────────────────────────────────────────────

function NoiBoSubTable({ rows }: { rows: VehiclePnLRow[] }) {
  const [sort, setSort] = useState<{ col: NoiBoSortCol; dir: SortDirection }>({ col: 'revenue', dir: 'desc' })

  function toggleSort(col: NoiBoSortCol) {
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' })
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aCp = (a.cpXe?.total ?? 0) + (a.cpLuongSanLuong ?? 0) + (a.cpLuongCoBan ?? 0)
      const bCp = (b.cpXe?.total ?? 0) + (b.cpLuongSanLuong ?? 0) + (b.cpLuongCoBan ?? 0)
      const aMargin = a.revenue > 0 ? a.loiNhuan / a.revenue : -Infinity
      const bMargin = b.revenue > 0 ? b.loiNhuan / b.revenue : -Infinity
      const map:  Record<NoiBoSortCol, number | string> = { plate: a.plate, revenue: a.revenue, totalCp: aCp, profit: a.loiNhuan, margin: aMargin }
      const mapB: Record<NoiBoSortCol, number | string> = { plate: b.plate, revenue: b.revenue, totalCp: bCp, profit: b.loiNhuan, margin: bMargin }
      const av = map[sort.col], bv = mapB[sort.col]
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort])

  return (
    <div className="overflow-x-auto">
      <table className="w-full [&_td]:align-middle" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--theme-bg-primary)', borderBottom: '1px solid var(--theme-border-light)' }}>
            <SortableTableHeader label="Biển số"   col="plate"   sort={sort} onSort={toggleSort} align="left" />
            <SortableTableHeader label="Doanh thu" col="revenue" sort={sort} onSort={toggleSort} />
            <SortableTableHeader label="Chi phí"   col="totalCp" sort={sort} onSort={toggleSort} />
            <SortableTableHeader label="Lãi"       col="profit"  sort={sort} onSort={toggleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const totalCp   = (row.cpXe?.total ?? 0) + (row.cpLuongSanLuong ?? 0) + (row.cpLuongCoBan ?? 0)
            const isProfit  = row.loiNhuan >= 0
            const marginPct = row.revenue > 0 ? (row.loiNhuan / row.revenue) * 100 : null
            return (
              <tr
                key={row.vehicleId}
                className="transition-colors"
                style={{ borderBottom: i < sorted.length - 1 ? '1px solid var(--theme-border-light)' : 'none' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <td className="px-3 py-2.5"><PlateChip plate={row.plate} /></td>
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
                          background: isProfit ? 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)' : 'color-mix(in srgb, var(--theme-status-error) 12%, transparent)',
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
  )
}

// ─── Xe ngoài sub-table ───────────────────────────────────────────────────────

function NgoaiSubTable({ rows }: { rows: VehiclePnLRow[] }) {
  const [sort, setSort] = useState<{ col: NgoaiSortCol; dir: SortDirection }>({ col: 'revenue', dir: 'desc' })

  function toggleSort(col: NgoaiSortCol) {
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' })
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aMargin = a.revenue > 0 ? a.loiNhuan / a.revenue : -Infinity
      const bMargin = b.revenue > 0 ? b.loiNhuan / b.revenue : -Infinity
      const map:  Record<NgoaiSortCol, number | string> = { plate: a.plate, vendorName: a.vendorName ?? '', revenue: a.revenue, cpVendor: a.cpVendor ?? 0, profit: a.loiNhuan, margin: aMargin }
      const mapB: Record<NgoaiSortCol, number | string> = { plate: b.plate, vendorName: b.vendorName ?? '', revenue: b.revenue, cpVendor: b.cpVendor ?? 0, profit: b.loiNhuan, margin: bMargin }
      const av = map[sort.col], bv = mapB[sort.col]
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort])

  return (
    <div className="overflow-x-auto">
      <table className="w-full [&_td]:align-middle" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--theme-bg-primary)', borderBottom: '1px solid var(--theme-border-light)' }}>
            <SortableTableHeader label="Biển số"   col="plate"      sort={sort} onSort={toggleSort} align="left" />
            <SortableTableHeader label="Nhà xe"    col="vendorName" sort={sort} onSort={toggleSort} align="left" />
            <SortableTableHeader label="Doanh thu" col="revenue"    sort={sort} onSort={toggleSort} />
            <SortableTableHeader label="Chi phí"   col="cpVendor"   sort={sort} onSort={toggleSort} />
            <SortableTableHeader label="Lãi"       col="profit"     sort={sort} onSort={toggleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const isProfit  = row.loiNhuan >= 0
            const marginPct = row.revenue > 0 ? (row.loiNhuan / row.revenue) * 100 : null
            return (
              <tr
                key={row.vehicleId}
                className="transition-colors"
                style={{ borderBottom: i < sorted.length - 1 ? '1px solid var(--theme-border-light)' : 'none' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <td className="px-3 py-2.5"><PlateChip plate={row.plate} /></td>
                <td className="px-3 py-2.5 text-[13px]" style={{ color: 'var(--theme-text-muted)' }}>
                  {row.vendorName ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-right text-[13px] font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>
                  {fmt(row.revenue)}
                </td>
                <td className="px-3 py-2.5 text-right text-[13px] font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--theme-status-error)' }}>
                  {(row.cpVendor ?? 0) > 0 ? fmt(row.cpVendor) : '—'}
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
                          background: isProfit ? 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)' : 'color-mix(in srgb, var(--theme-status-error) 12%, transparent)',
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
  )
}

// ─── Shared vehicle section (used by both desktop and mobile) ─────────────────

function VehicleSection({ vehiclePnl }: { vehiclePnl: { rows: VehiclePnLRow[] } | undefined }) {
  const allRows   = vehiclePnl?.rows ?? []
  const noiBoRows = allRows.filter(r => !r.isVendor)
  const ngoaiRows = allRows.filter(r => r.isVendor)

  const subHeader = (label: string, count: number) => (
    <div
      className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider"
      style={{
        color: 'var(--theme-text-muted)',
        background: 'color-mix(in srgb, var(--theme-bg-tertiary) 60%, transparent)',
        borderBottom: '1px solid var(--theme-border-light)',
      }}
    >
      {label} <span className="font-normal">({count})</span>
    </div>
  )

  if (!allRows.length) {
    return <EmptyState icon={Truck} text="Chưa có dữ liệu xe trong tháng này" />
  }

  return (
    <div className="flex flex-col">
      {/* Xe nội bộ */}
      <div className="min-w-0">
        {subHeader('Xe nội bộ', noiBoRows.length)}
        {noiBoRows.length > 0
          ? <NoiBoSubTable rows={noiBoRows} />
          : <EmptyState icon={Truck} text="Không có xe nội bộ trong tháng này" />
        }
      </div>

      {/* Xe ngoài */}
      <div className="min-w-0" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
        {subHeader('Xe ngoài', ngoaiRows.length)}
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

  const revenue  = pnl?.revenue ?? 0
  const chiPhi   = sumChiPhi(pnl)
  const laiRong  = pnl?.profit ?? 0
  const bienLai  = revenue > 0 ? (laiRong / revenue) * 100 : null

  const revenueDelta = computeDelta(revenue, prevPnl?.revenue ?? 0)
  const chiPhiDelta  = computeDelta(chiPhi, sumChiPhi(prevPnl))
  const laiDelta     = computeDelta(laiRong, prevPnl?.profit ?? 0)

  const dayBars = dailyStats?.buckets ?? []

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <PageHeader
        title="Tổng quan"
        subtitle="Bảng điều khiển kế toán & vận tải"
        lucideIcon={BarChart3}
        actions={<MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />}
      />

      {/* ── KPI trio ── */}
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
            label="Lợi nhuận"
            value={laiRong}
            formattedValue={<AnimatedNumber value={laiRong} format="currency" />}
            icon={Coins}
            color="blue"
            sublabel={bienLai != null ? `Biên lãi ${bienLai.toFixed(1)}%` : `Tháng ${pad(month)}/${year}`}
            trend={laiDelta != null ? { value: `${Math.abs(laiDelta)}%`, positive: laiDelta >= 0 } : undefined}
            className="card-hover-lift"
          />
        </div>
      </RevealList>

      {/* ── Bar chart ── */}
      <Reveal threshold={0.05}>
        <TripChartCard
          subtitle={`Tháng ${pad(month)} · ${year}`}
          bars={dayBars}
          className="card-hover-lift"
        />
      </Reveal>

      {/* ── Vehicle tables ── */}
      <Reveal delay={100} threshold={0.05}>
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
          <VehicleSection vehiclePnl={vehiclePnl} />
        </DashboardCard>
      </Reveal>
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

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Tổng quan"
        subtitle="Bảng điều khiển kế toán & vận tải"
        lucideIcon={BarChart3}
        compact
        actions={<MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />}
      />

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
            label="Lợi nhuận"
            value={laiRong}
            formattedValue={<AnimatedNumber value={laiRong} format="currency" />}
            icon={Coins}
            color="blue"
            sublabel={bienLai != null ? `Biên lãi ${bienLai.toFixed(1)}%` : `Tháng ${pad(month)}/${year}`}
            trend={laiDelta != null ? { value: `${Math.abs(laiDelta)}%`, positive: laiDelta >= 0 } : undefined}
            className="card-hover-lift"
          />
        </div>
      </RevealList>

      {/* Bar chart */}
      <TripChartCard
        subtitle={`Tháng ${pad(month)} · ${year}`}
        bars={dayBars}
      />

      {/* Vehicle P&L tables */}
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
        <VehicleSection vehiclePnl={vehiclePnl} />
      </DashboardCard>
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function AccountantDashboard() {
  const isMobile = useIsMobile(1024)
  return isMobile ? <MobileDashboard /> : <DesktopDashboard />
}
