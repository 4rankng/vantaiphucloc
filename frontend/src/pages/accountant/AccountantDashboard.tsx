import { useMemo, useState } from 'react'
import {
  useMonthlyPnL,
  useVehiclePnL,
  useTripDailyStats,
  useProfile,
} from '@/hooks/use-queries'
import { useIsMobile } from '@/hooks/use-mobile'
import { MonthNavigator } from '@/components/shared/navigation/MonthNavigator'
import { KpiHeroCard } from '@/components/shared/data-display/KpiHeroCard'
import { DashboardSectionHeader } from '@/components/shared/data-display/DashboardSectionHeader'
import { AnimatedNumber } from '@/components/shared'
import { TripChartCard } from '@/components/shared/data-display/TripChartCard'
import { useMonthParams } from './use-month-params'
import { formatCurrencyFull as fmt } from '@/data/domain'
import { pad, daysInMonth, sumChiPhi, computeDelta } from '@/lib/accounting-utils'
import type { VehiclePnLRow } from '@/services/api/pnl.api'
import {
  TrendingUp,
  TrendingDown, BarChart3, Truck, Coins,
} from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Cost donut ──────────────────────────────────────────────────────────────

interface DonutSlice { name: string; pct: number; color: string }

function CostDonut({ slices, total }: { slices: DonutSlice[]; total: string }) {
  let offset = 0
  const segs = slices.map(s => {
    const seg = { color: s.color, dasharray: `${s.pct} ${100 - s.pct}`, dashoffset: -offset }
    offset += s.pct
    return seg
  })
  return (
    <div className="relative flex-shrink-0" style={{ width: 110, height: 110 }}>
      <svg viewBox="0 0 42 42" style={{ width: 110, height: 110, transform: 'rotate(-90deg)' }}>
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--theme-border-light, #eef1ef)" strokeWidth="7" />
        {segs.map((s, i) => (
          <circle key={i} cx="21" cy="21" r="15.9" fill="none" stroke={s.color}
                  strokeWidth="7" strokeDasharray={s.dasharray} strokeDashoffset={s.dashoffset} />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="tabular-nums leading-none flex items-baseline gap-[1px]" style={{ color: 'var(--theme-text-primary)' }}>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--theme-font-display, inherit)' }}>
            {total.replace(/[a-zA-ZđĐ]+$/, '')}
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--theme-text-muted)' }}>
            {total.match(/[a-zA-ZđĐ]+$/)?.[0] ?? ''}
          </span>
        </span>
      </div>
    </div>
  )
}

// ─── Vehicle bar list (Xe nội bộ) ────────────────────────────────────────────

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
      {/* Column headers + sort pills */}
      <div
        className="grid items-center gap-x-3 px-2 pb-2 mb-1"
        style={{ gridTemplateColumns: '76px 1fr 68px 38px', borderBottom: '1px solid var(--theme-border-light)' }}
      >
        <SortPill label="Biển số" active={sort.col === 'plate'} descending={sort.dir === 'desc'} onClick={() => toggleSort('plate')} />
        <span />
        <SortPill label="Lãi" active={sort.col === 'profit'} descending={sort.dir === 'desc'} onClick={() => toggleSort('profit')} />
        <span className="type-overline text-right" style={{ color: 'var(--theme-text-muted)' }}>Biên</span>
      </div>

      {/* Vehicle rows */}
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
                {row.loiNhuan === 0 ? '0' : `${isProfit ? '+' : ''}${fmtCompact(row.loiNhuan)}`}
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

// ─── Vehicle bar list (Xe ngoài) ──────────────────────────────────────────────

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
      {/* Column headers + sort pills */}
      <div
        className="grid items-center gap-x-3 px-2 pb-2 mb-1"
        style={{ gridTemplateColumns: '76px 1fr 68px 38px', borderBottom: '1px solid var(--theme-border-light)' }}
      >
        <SortPill label="Biển số" active={sort.col === 'plate'} descending={sort.dir === 'desc'} onClick={() => toggleSort('plate')} />
        <span />
        <SortPill label="Lãi" active={sort.col === 'profit'} descending={sort.dir === 'desc'} onClick={() => toggleSort('profit')} />
        <span className="type-overline text-right" style={{ color: 'var(--theme-text-muted)' }}>Biên</span>
      </div>

      {/* Vehicle rows */}
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
                {row.loiNhuan === 0 ? '0' : `${isProfit ? '+' : ''}${fmtCompact(row.loiNhuan)}`}
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

// ─── Desktop dashboard ────────────────────────────────────────────────────────

function DesktopDashboard() {
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const { data: profile } = useProfile()

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

  const costSlices = useMemo<DonutSlice[]>(() => {
    const realTotal = salaryProd + salaryBase + vehicleExp + generalExp
    if (realTotal <= 0) return []
    return [
      { name: 'Lương chuyến & Phụ cấp', pct: Math.round((salaryProd / realTotal) * 100), color: '#005A2D' },
      { name: 'Lương cơ bản', pct: Math.round((salaryBase / realTotal) * 100), color: '#16A34A' },
      { name: 'Chi phí xe vận hành', pct: Math.round((vehicleExp / realTotal) * 100), color: '#2563EB' },
      { name: 'Chi phí quản lý chung', pct: Math.round((generalExp / realTotal) * 100), color: '#C2780B' },
    ].filter(s => s.pct > 0)
  }, [salaryProd, salaryBase, vehicleExp, generalExp])

  const allRows   = vehiclePnl?.rows ?? []
  const noiBoRows = allRows.filter(r => !r.isVendor)
  const ngoaiRows = allRows.filter(r => r.isVendor)

  return (
    <div className="space-y-6">

      {/* ── Greeting header ── */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-[22px] font-extrabold tracking-tight leading-tight"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {greeting()},{' '}
            <span>{profile?.fullName || 'bạn'}</span>
          </h1>
        </div>
        <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />
      </header>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiHeroCard
          label={`Doanh thu · ${pad(month)}/${year}`}
          formattedValue={<AnimatedNumber value={revenue} format="currency" />}
          icon={TrendingUp}
          color="emerald"
          sublabel={`Tháng trước · ${fmtCompact(prevPnl?.revenue ?? 0)}`}
          trend={revenueDelta != null ? { value: `${Math.abs(revenueDelta)}%`, positive: revenueDelta > 0 } : undefined}
        />
        <KpiHeroCard
          label="Tổng chi phí"
          formattedValue={<AnimatedNumber value={chiPhi} format="currency" />}
          icon={TrendingDown}
          color="rose"
          sublabel="Lương + Xe + CP Chung"
          trend={chiPhiDelta != null ? { value: `${Math.abs(chiPhiDelta)}%`, positive: chiPhiDelta <= 0 } : undefined}
        />
        <KpiHeroCard
          label="Lợi nhuận"
          formattedValue={<AnimatedNumber value={laiRong} format="currency" />}
          icon={Coins}
          color="blue"
          sublabel={bienLai != null ? `Biên lãi ${bienLai.toFixed(1)}%` : `Tháng ${pad(month)}/${year}`}
          trend={laiDelta != null ? { value: `${Math.abs(laiDelta)}%`, positive: laiDelta >= 0 } : undefined}
        />
        <KpiHeroCard
          label="Biên lãi"
          formattedValue={<span>{bienLai != null ? `${bienLai.toFixed(1)}%` : '—'}</span>}
          icon={BarChart3}
          color="amber"
          sublabel={revenue > 0 ? `Doanh thu ${fmtCompact(revenue)}` : 'Chưa có dữ liệu'}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="bento-grid">
        {/* Chart */}
        <TripChartCard
          title="Chuyến theo ngày"
          subtitle={`Tháng ${pad(month)} · ${year}`}
          bars={dayBars}
          className="bento-col-12 md:bento-col-8"
        />

        {/* Cost donut */}
        <div className="bento-card bento-col-12 md:bento-col-4">
          <div className="mb-4">
            <h3 className="type-h3" style={{ color: 'var(--theme-text-primary)' }}>Cơ cấu chi phí</h3>
            <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
              {costSlices.length > 0 ? `Tháng ${pad(month)}/${year} · tổng ${fmt(chiPhi)}` : 'Chưa có chi phí ghi nhận'}
            </p>
          </div>
          {costSlices.length > 0 ? (
            <div className="flex flex-col items-center gap-4">
              <CostDonut slices={costSlices} total={fmtCompact(chiPhi)} />
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

        {/* Xe nội bộ */}
        <div className="bento-card bento-col-12 lg:bento-col-6">
          <DashboardSectionHeader
            title="Xe nội bộ"
            icon={Truck}
            className="pb-3"
            right={
              noiBoRows.length
                ? <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{noiBoRows.length} xe</span>
                : undefined
            }
          />
          <div
            className="mb-3"
            style={{ borderBottom: '1px solid var(--theme-border-light)' }}
          />
          <div>
            {noiBoRows.length > 0
              ? <NoiBoBarList rows={noiBoRows} />
              : <EmptyState icon={Truck} text="Không có xe nội bộ trong tháng này" />
            }
          </div>
        </div>

        {/* Xe ngoài */}
        <div className="bento-card bento-col-12 lg:bento-col-6">
          <DashboardSectionHeader
            title="Xe ngoài"
            icon={Truck}
            className="pb-3"
            right={
              ngoaiRows.length
                ? <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{ngoaiRows.length} xe</span>
                : undefined
            }
          />
          <div
            className="mb-3"
            style={{ borderBottom: '1px solid var(--theme-border-light)' }}
          />
          <div className="mt-3">
            {ngoaiRows.length > 0 ? (
              <NgoaiBarList rows={ngoaiRows} />
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
  const { data: profile } = useProfile()

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

  const salaryProd = (pnl?.totalProductivitySalary ?? 0) + (pnl?.totalAllowance ?? 0)
  const salaryBase = pnl?.totalBaseSalary ?? 0
  const vehicleExp = pnl?.totalVehicleExpenses ?? 0
  const generalExp = pnl?.totalCpChung ?? 0

  const costSlices = useMemo<DonutSlice[]>(() => {
    const realTotal = salaryProd + salaryBase + vehicleExp + generalExp
    if (realTotal <= 0) return []
    return [
      { name: 'Lương chuyến & Phụ cấp', pct: Math.round((salaryProd / realTotal) * 100), color: '#005A2D' },
      { name: 'Lương cơ bản', pct: Math.round((salaryBase / realTotal) * 100), color: '#16A34A' },
      { name: 'Chi phí xe vận hành', pct: Math.round((vehicleExp / realTotal) * 100), color: '#2563EB' },
      { name: 'Chi phí quản lý chung', pct: Math.round((generalExp / realTotal) * 100), color: '#C2780B' },
    ].filter(s => s.pct > 0)
  }, [salaryProd, salaryBase, vehicleExp, generalExp])

  const allRows   = vehiclePnl?.rows ?? []
  const noiBoRows = allRows.filter(r => !r.isVendor)
  const ngoaiRows = allRows.filter(r => r.isVendor)

  return (
    <div className="space-y-4 pb-8">
      {/* ── Greeting header ── */}
      <header className="flex flex-col gap-3">
        <h1
          className="type-h1"
          style={{ color: 'var(--theme-text-primary)' }}
        >
          {greeting()},{' '}
          <span>{profile?.fullName || 'bạn'}</span>
        </h1>
        <div className="flex justify-center">
          <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />
        </div>
      </header>

      {/* ── KPI cards (2×2) ── */}
      <div className="grid grid-cols-2 gap-2.5">
        <KpiHeroCard
          label={`Doanh thu · ${pad(month)}/${year}`}
          formattedValue={<AnimatedNumber value={revenue} format="currency" />}
          icon={TrendingUp}
          color="emerald"
          trend={revenueDelta != null ? { value: `${Math.abs(revenueDelta)}%`, positive: revenueDelta > 0 } : undefined}
        />
        <KpiHeroCard
          label="Chi phí"
          formattedValue={<AnimatedNumber value={chiPhi} format="currency" />}
          icon={TrendingDown}
          color="rose"
          trend={chiPhiDelta != null ? { value: `${Math.abs(chiPhiDelta)}%`, positive: chiPhiDelta <= 0 } : undefined}
        />
        <KpiHeroCard
          label="Lợi nhuận"
          formattedValue={<AnimatedNumber value={laiRong} format="currency" />}
          icon={Coins}
          color="blue"
          sublabel={bienLai != null ? `Biên lãi ${bienLai.toFixed(1)}%` : undefined}
          trend={laiDelta != null ? { value: `${Math.abs(laiDelta)}%`, positive: laiDelta >= 0 } : undefined}
        />
        <KpiHeroCard
          label="Biên lãi"
          formattedValue={<span>{bienLai != null ? `${bienLai.toFixed(1)}%` : '—'}</span>}
          icon={BarChart3}
          color="amber"
        />
      </div>

      {/* ── Main grid ── */}
      <div className="bento-grid">
        {/* Bar chart */}
        <TripChartCard
          subtitle={`Tháng ${pad(month)} · ${year}`}
          bars={dayBars}
          className="bento-col-12"
        />

        {/* Cost donut */}
        <div className="bento-card bento-col-12">
          <div className="mb-4">
            <h3 className="type-h3" style={{ color: 'var(--theme-text-primary)' }}>Cơ cấu chi phí</h3>
            <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
              {costSlices.length > 0 ? `Tháng ${pad(month)}/${year} · tổng ${fmt(chiPhi)}` : 'Chưa có chi phí ghi nhận'}
            </p>
          </div>
          {costSlices.length > 0 ? (
            <div className="flex flex-col items-center gap-4">
              <CostDonut slices={costSlices} total={fmtCompact(chiPhi)} />
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

        {/* Xe nội bộ */}
        <div className="bento-card bento-col-12">
          <DashboardSectionHeader
            title="Xe nội bộ"
            icon={Truck}
            className="pb-3"
            right={
              noiBoRows.length
                ? <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{noiBoRows.length} xe</span>
                : undefined
            }
          />
          <div
            className="mb-3"
            style={{ borderBottom: '1px solid var(--theme-border-light)' }}
          />
          <div>
            {noiBoRows.length > 0
              ? <NoiBoBarList rows={noiBoRows} />
              : <EmptyState icon={Truck} text="Không có xe nội bộ trong tháng này" />
            }
          </div>
        </div>

        {/* Xe ngoài */}
        <div className="bento-card bento-col-12">
          <DashboardSectionHeader
            title="Xe ngoài"
            icon={Truck}
            className="pb-3"
            right={
              ngoaiRows.length
                ? <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{ngoaiRows.length} xe</span>
                : undefined
            }
          />
          <div
            className="mb-3"
            style={{ borderBottom: '1px solid var(--theme-border-light)' }}
          />
          <div className="mt-3">
            {ngoaiRows.length > 0 ? (
              <NgoaiBarList rows={ngoaiRows} />
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
