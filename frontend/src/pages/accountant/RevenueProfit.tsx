/**
 * Doanh thu & Lãi — accountant P&L dashboard.
 *
 * Revenue = Σ (TripOrder.unit_price × container_count) over MATCHED TOs.
 * Profit  = Revenue − (lương cơ bản + lương sản lượng + phụ cấp + CP xe + CP chung).
 *
 * Pure UI — derivations live in `useRevenueProfit.ts`.
 */

import { useState, useMemo } from 'react'
import {
  TrendingUp,
  Wallet,
  Briefcase,
  DollarSign,
  Car,
  Fuel,
  Wrench,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Truck,
  Calculator,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCurrencyFull } from '@/data/domain'
import { formatDateRange } from '@/lib/format'
import { useRevenueProfit } from './useRevenueProfit'
import type { VehiclePnLRow } from '@/services/api/pnl.api'

// ── KPI Card (polished, Linear-inspired) ─────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  positive,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent: string
  positive?: boolean
}) {
  return (
    <div
      className="rounded-xl p-5 relative overflow-hidden group"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
        boxShadow: 'var(--theme-shadow-card)',
      }}
    >
      {/* Subtle gradient accent bar at top */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: accent }}
      />

      {/* Icon circle */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}12`, color: accent }}
        >
          <Icon className="w-5 h-5" />
        </div>
        {positive !== undefined && (
          <div
            className="flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              background: positive ? 'var(--theme-status-success-light)' : 'var(--theme-status-error-light)',
              color: positive ? 'var(--theme-status-success)' : 'var(--theme-status-error)',
            }}
          >
            {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{positive ? 'Lãi' : 'Lỗ'}</span>
          </div>
        )}
      </div>

      {/* Value */}
      <p
        className="text-2xl font-bold leading-none tabular-nums tracking-tight mb-1"
        style={{ color: 'var(--theme-text-primary)' }}
      >
        {value}
      </p>

      {/* Label + sub */}
      <div className="flex items-center gap-2 mt-2">
        <p
          className="text-xs font-medium"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          {label}
        </p>
        {sub && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Section header ──────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, action }: { icon: React.ElementType; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: 'var(--theme-bg-tertiary)' }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
        </div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
          {title}
        </h2>
      </div>
      {action}
    </div>
  )
}

// ── Per-vehicle table ─────────────────────────────────────────────────────

type PnLSortCol = 'plate' | 'revenue' | 'xangDau' | 'suaChua' | 'cpChung' | 'luong' | 'coBan' | 'profit'
type PnLSortDir = 'asc' | 'desc'

function PnLSortTh({ label, col, sort, onSort, align = 'right' }: {
  label: string; col: PnLSortCol
  sort: { col: PnLSortCol; dir: PnLSortDir }
  onSort: (c: PnLSortCol) => void
  align?: 'left' | 'right'
}) {
  const active = sort.col === col
  const Icon = active ? (sort.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
  return (
    <th
      onClick={() => onSort(col)}
      className={`${align === 'left' ? 'text-left' : 'text-right'} px-4 py-3 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none`}
      style={{ color: active ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)', background: 'var(--theme-bg-secondary)' }}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {align === 'left' && <Icon className="w-3 h-3" style={{ opacity: active ? 1 : 0.4 }} />}
        {label}
        {align === 'right' && <Icon className="w-3 h-3" style={{ opacity: active ? 1 : 0.4 }} />}
      </span>
    </th>
  )
}

function VehiclePnLTable({ rows }: { rows: VehiclePnLRow[] }) {
  const [sort, setSort] = useState<{ col: PnLSortCol; dir: PnLSortDir }>({ col: 'revenue', dir: 'desc' })
  function toggleSort(col: PnLSortCol) {
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' })
  }

  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    const get = (r: VehiclePnLRow): number | string => ({
      plate: r.plate,
      revenue: r.revenue,
      xangDau: r.cpXe.xangDau,
      suaChua: r.cpXe.suaChua,
      cpChung: r.cpChungAllocated,
      luong: r.cpLuongSanLuong,
      coBan: r.cpLuongCoBan,
      profit: r.loiNhuan,
    }[sort.col])
    const av = get(a), bv = get(b)
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
    return sort.dir === 'asc' ? cmp : -cmp
  }), [rows, sort])

  if (rows.length === 0)
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
      >
        <Truck className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} />
        <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          Chưa có dữ liệu xe
        </p>
      </div>
    )

  // Compute totals for footer (always over original rows, not sorted)
  const totals = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      xangDau: acc.xangDau + r.cpXe.xangDau,
      suaChua: acc.suaChua + r.cpXe.suaChua,
      cpChung: acc.cpChung + r.cpChungAllocated,
      luong: acc.luong + r.cpLuongSanLuong,
      coBan: acc.coBan + r.cpLuongCoBan,
      loiNhuan: acc.loiNhuan + r.loiNhuan,
    }),
    { revenue: 0, xangDau: 0, suaChua: 0, cpChung: 0, luong: 0, coBan: 0, loiNhuan: 0 },
  )

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl overflow-x-auto"
        style={{
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
          boxShadow: 'var(--theme-shadow-card)',
        }}
      >
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--theme-border-default)' }}>
              <PnLSortTh label="Biển số" col="plate" sort={sort} onSort={toggleSort} align="left" />
              <PnLSortTh label="Doanh thu" col="revenue" sort={sort} onSort={toggleSort} />
              <PnLSortTh label="CP Xăng dầu" col="xangDau" sort={sort} onSort={toggleSort} />
              <PnLSortTh label="CP Sửa chữa" col="suaChua" sort={sort} onSort={toggleSort} />
              <PnLSortTh label="CP Chung" col="cpChung" sort={sort} onSort={toggleSort} />
              <PnLSortTh label="CP Lương SL" col="luong" sort={sort} onSort={toggleSort} />
              <PnLSortTh label="CP Cơ bản" col="coBan" sort={sort} onSort={toggleSort} />
              <PnLSortTh label="Lợi nhuận" col="profit" sort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const positive = row.loiNhuan >= 0
              return (
                <tr
                  key={row.vehicleId}
                  className="group"
                  style={{
                    borderTop: '1px solid var(--theme-border-light)',
                    transition: 'background 120ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--theme-bg-tertiary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-4 py-3" style={{ color: 'var(--theme-text-primary)' }}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
                      >
                        <Car className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-semibold text-[13px]">{row.plate}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                    {formatCurrencyFull(row.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--theme-status-error)', opacity: 0.85 }}>
                    {formatCurrencyFull(row.cpXe.xangDau)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--theme-status-error)', opacity: 0.85 }}>
                    {formatCurrencyFull(row.cpXe.suaChua)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--theme-status-error)', opacity: 0.85 }}>
                    {formatCurrencyFull(row.cpChungAllocated)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--theme-status-error)', opacity: 0.85 }}>
                    {formatCurrencyFull(row.cpLuongSanLuong)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--theme-status-error)', opacity: 0.85 }}>
                    {formatCurrencyFull(row.cpLuongCoBan)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span
                      className="inline-flex items-center gap-1 font-bold text-[13px]"
                      style={{
                        color: positive ? 'var(--theme-status-success)' : 'var(--theme-status-error)',
                      }}
                    >
                      {positive ? (
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                      )}
                      {formatCurrencyFull(row.loiNhuan)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {/* Totals footer */}
          <tfoot>
            <tr
              style={{
                borderTop: '2px solid var(--theme-border-default)',
                background: 'var(--theme-bg-tertiary)',
              }}
            >
              <td className="px-4 py-3 font-bold text-[12px] uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                Tổng cộng
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                {formatCurrencyFull(totals.revenue)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--theme-status-error)' }}>
                {formatCurrencyFull(totals.xangDau)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--theme-status-error)' }}>
                {formatCurrencyFull(totals.suaChua)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--theme-status-error)' }}>
                {formatCurrencyFull(totals.cpChung)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--theme-status-error)' }}>
                {formatCurrencyFull(totals.luong)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--theme-status-error)' }}>
                {formatCurrencyFull(totals.coBan)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: totals.loiNhuan >= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}>
                {formatCurrencyFull(totals.loiNhuan)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-end">
        <Link
          to="/accountant/vehicle-expenses"
          className="text-xs font-medium hover:underline inline-flex items-center gap-1"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          <Wrench className="w-3 h-3" />
          Quản lý chi phí xe →
        </Link>
      </div>
    </div>
  )
}

// ── Cost breakdown pill ────────────────────────────────────────────────

function CostPill({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  accent: string
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2.5"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${accent}12`, color: accent }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
          {label}
        </p>
        <p className="text-sm font-bold tabular-nums" style={{ color: accent }}>
          {value}
        </p>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────

export function RevenueProfit() {
  const { startDate, endDate, pnl, isLoading, vehiclePnL, isVehiclePnLLoading } = useRevenueProfit()

  // Derived values for the profit formula breakdown
  const totalCosts = pnl
    ? pnl.totalBaseSalary +
      pnl.totalProductivitySalary +
      pnl.totalAllowance +
      pnl.totalVehicleExpenses +
      pnl.totalCpChung
    : 0
  const profitMargin = pnl && pnl.revenue > 0 ? ((pnl.profit / pnl.revenue) * 100).toFixed(1) : null

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            Doanh thu & Lãi
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
            Kỳ {formatDateRange(startDate, endDate, 'short')}
          </p>
        </div>
        {pnl && (
          <div
            className="text-xs px-3 py-1.5 rounded-full font-medium"
            style={{
              background: pnl.profit >= 0 ? 'var(--theme-status-success-light)' : 'var(--theme-status-error-light)',
              color: pnl.profit >= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)',
            }}
          >
            {profitMargin ? `${profitMargin}% biên lợi nhuận` : 'Chưa có doanh thu'}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl animate-pulse"
              style={{ background: 'var(--theme-bg-tertiary)' }}
            />
          ))}
        </div>
      ) : pnl == null ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
        >
          <DollarSign className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)', opacity: 0.3 }} />
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
            Chưa có dữ liệu
          </p>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            Chọn kỳ thời gian để xem báo cáo P&L
          </p>
        </div>
      ) : (
        <>
          {/* ── KPI Cards (2×2 grid on mobile, 4 col on desktop) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Doanh thu"
              value={formatCurrencyFull(pnl.revenue)}
              sub={`${pnl.matchedTripCount} chuyến`}
              icon={TrendingUp}
              accent="var(--theme-brand-primary)"
            />
            <KpiCard
              label="Tổng chi phí"
              value={formatCurrencyFull(totalCosts)}
              icon={Calculator}
              accent="var(--theme-status-warning)"
            />
            <KpiCard
              label="Tổng lương"
              value={formatCurrencyFull(pnl.totalBaseSalary + pnl.totalProductivitySalary + pnl.totalAllowance)}
              sub={`${formatCurrencyFull(pnl.totalBaseSalary)} cơ bản`}
              icon={Users}
              accent="var(--theme-status-info)"
            />
            <KpiCard
              label="Lợi nhuận"
              value={formatCurrencyFull(pnl.profit)}
              icon={DollarSign}
              accent={pnl.profit >= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)'}
              positive={pnl.profit >= 0}
            />
          </div>

          {/* ── Cost breakdown (horizontal pills) ── */}
          <div
            className="rounded-xl p-4"
            style={{
              background: 'var(--theme-bg-secondary)',
              border: '1px solid var(--theme-border-default)',
              boxShadow: 'var(--theme-shadow-card)',
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--theme-text-muted)' }}>
              Chi tiết chi phí
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
              <CostPill
                icon={Wallet}
                label="Lương cơ bản"
                value={formatCurrencyFull(pnl.totalBaseSalary)}
                accent="var(--theme-status-info)"
              />
              <CostPill
                icon={Briefcase}
                label="Lương sản lượng"
                value={formatCurrencyFull(pnl.totalProductivitySalary)}
                accent="var(--theme-status-info)"
              />
              <CostPill
                icon={BarChart3}
                label="Phụ cấp"
                value={formatCurrencyFull(pnl.totalAllowance)}
                accent="var(--theme-status-warning)"
              />
              <CostPill
                icon={Fuel}
                label="CP Xăng dầu + SC"
                value={formatCurrencyFull(pnl.totalVehicleExpenses)}
                accent="var(--theme-status-error)"
              />
              <CostPill
                icon={Car}
                label="CP Chung"
                value={formatCurrencyFull(pnl.totalCpChung)}
                accent="var(--theme-status-error)"
              />
              <CostPill
                icon={DollarSign}
                label="Biên LN (%)"
                value={profitMargin ? `${profitMargin}%` : '—'}
                accent={pnl.profit >= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)'}
              />
            </div>
          </div>

          {/* ── Vehicle P&L breakdown ── */}
          <section className="space-y-3">
            <SectionHeader
              icon={Truck}
              title="Lãi / lỗ theo xe"
              action={
                vehiclePnL && vehiclePnL.rows.length > 0 ? (
                  <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}>
                    {vehiclePnL.rows.length} xe
                  </span>
                ) : undefined
              }
            />
            {isVehiclePnLLoading ? (
              <div className="h-32 rounded-xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
            ) : vehiclePnL && vehiclePnL.rows.length > 0 ? (
              <VehiclePnLTable rows={vehiclePnL.rows} />
            ) : (
              <div
                className="rounded-xl p-8 text-center"
                style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
              >
                <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                  Chưa có dữ liệu xe trong kỳ này.{' '}
                  <Link
                    to="/accountant/vehicle-expenses"
                    className="font-medium hover:underline"
                    style={{ color: 'var(--theme-brand-primary)' }}
                  >
                    Thêm chi phí xe →
                  </Link>
                </p>
              </div>
            )}
          </section>

          {/* ── Partner revenue breakdown ── */}
          <section className="space-y-3">
            <SectionHeader
              icon={Users}
              title="Doanh thu theo khách hàng"
              action={
                pnl.partnerBreakdown.length > 0 ? (
                  <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}>
                    {pnl.partnerBreakdown.length} khách hàng
                  </span>
                ) : undefined
              }
            />
            {pnl.partnerBreakdown.length === 0 ? (
              <div
                className="rounded-xl p-8 text-center"
                style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
              >
                <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                  Chưa có chuyến nào khớp trong kỳ này
                </p>
              </div>
            ) : (
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border-default)',
                  boxShadow: 'var(--theme-shadow-card)',
                }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--theme-border-default)' }}>
                      <th
                        className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        Khách hàng
                      </th>
                      <th
                        className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        Chuyến
                      </th>
                      <th
                        className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        Doanh thu
                      </th>
                      <th
                        className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        Tỷ trọng
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pnl.partnerBreakdown.map((p) => {
                      const pct =
                        pnl.revenue > 0 ? ((p.revenue / pnl.revenue) * 100).toFixed(1) : '0.0'
                      const pctNum = parseFloat(pct)
                      return (
                        <tr
                          key={p.clientId}
                          className="group"
                          style={{ borderTop: '1px solid var(--theme-border-light)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--theme-bg-tertiary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td className="px-4 py-3" style={{ color: 'var(--theme-text-primary)' }}>
                            <span className="font-medium text-[13px]">{p.partnerName}</span>
                          </td>
                          <td
                            className="px-4 py-3 text-right tabular-nums"
                            style={{ color: 'var(--theme-text-secondary)' }}
                          >
                            {p.matchedTripCount}
                          </td>
                          <td
                            className="px-4 py-3 text-right tabular-nums font-medium"
                            style={{ color: 'var(--theme-text-primary)' }}
                          >
                            {formatCurrencyFull(p.revenue)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <div className="flex items-center justify-end gap-2">
                              {/* Mini bar */}
                              <div
                                className="w-16 h-1.5 rounded-full overflow-hidden"
                                style={{ background: 'var(--theme-bg-tertiary)' }}
                              >
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(pctNum, 100)}%`,
                                    background: 'var(--theme-brand-primary)',
                                    transition: 'width 300ms ease',
                                  }}
                                />
                              </div>
                              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
