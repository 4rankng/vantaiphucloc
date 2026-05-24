import { useState, useMemo } from 'react'
import { normalizeVietnamese } from '@/lib/search-utils'
import { TrendingUp, DollarSign, Coins, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { PageHeader } from '@/components/shared/PageHeader'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { SearchBar } from '@/components/shared/SearchBar/SearchBar'
import { NepoTable } from '@/components/shared/NepoTable'
import type { NepoColumn, NepoFooterCell } from '@/components/shared/NepoTable'
import { Plate } from '@/components/shared/Plate'
import { useVehiclePnL } from '@/hooks/use-queries'
import { useMonthParams } from './use-month-params'
import { formatCurrency } from '@/data/domain'
import type { VehiclePnLRow, VehiclePnLResponse } from '@/services/api/pnl.api'
import { exportVehiclePnL } from '@/services/api/pnl.api'
import { AnimatedNumber } from '@/components/shared'

const monoStyle = { fontFamily: 'var(--theme-font-mono)' } as React.CSSProperties

function profitColor(v: number) {
  return v >= 0 ? 'var(--accent-2)' : 'var(--danger)'
}

function MoneyCell({ value, bold }: { value: number; bold?: boolean }) {
  return (
    <span
      className={`tabular-nums${bold ? ' font-bold' : ''}`}
      style={{ color: bold ? profitColor(value) : 'var(--ink)', ...monoStyle }}
    >
      {formatCurrency(value)}
    </span>
  )
}

// ─── Xe nội bộ table ────────────────────────────────────────────────────────

function NoiBoTable({ rows, isLoading }: { rows: VehiclePnLRow[]; isLoading: boolean }) {
  const totalRevenue  = rows.reduce((s, r) => s + r.revenue, 0)
  const totalCost     = rows.reduce((s, r) => s + r.cpXe.total + r.cpLuongSanLuong + r.cpLuongCoBan, 0)
  const totalProfit   = rows.reduce((s, r) => s + r.loiNhuan, 0)

  const columns: NepoColumn<VehiclePnLRow>[] = [
    {
      key: 'plate',
      header: 'Biển số',
      sticky: true,
      render: (r) => <Plate>{r.plate}</Plate>,
    },
    {
      key: 'revenue',
      header: 'Doanh thu',
      align: 'right',
      width: 130,
      render: (r) => <MoneyCell value={r.revenue} />,
    },
    {
      key: 'chiPhi',
      header: 'Chi phí',
      align: 'right',
      width: 130,
      render: (r) => <MoneyCell value={r.cpXe.total + r.cpLuongSanLuong + r.cpLuongCoBan} />,
    },
    {
      key: 'profit',
      header: 'Lợi nhuận',
      align: 'right',
      width: 130,
      headerClass: 'nepo-col-net',
      cellClass: 'nepo-col-net',
      render: (r) => <MoneyCell value={r.loiNhuan} bold />,
    },
  ]

  const footerCells: NepoFooterCell[] = [
    { content: 'Tổng', sticky: true },
    { content: <MoneyCell value={totalRevenue} />, align: 'right' },
    { content: <MoneyCell value={totalCost} />, align: 'right' },
    {
      content: <MoneyCell value={totalProfit} bold />,
      align: 'right',
      className: 'nepo-col-net',
    },
  ]

  return (
    <NepoTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.vehicleId}
      isLoading={isLoading}
      emptyText="Không có xe nội bộ trong kỳ này"
      minWidth={520}
      footerCells={footerCells}
    />
  )
}

// ─── Xe ngoài table ──────────────────────────────────────────────────────────

function NgoaiTable({ rows, isLoading }: { rows: VehiclePnLRow[]; isLoading: boolean }) {
  const totalRevenue  = rows.reduce((s, r) => s + r.revenue, 0)
  const totalCost     = rows.reduce((s, r) => s + r.cpVendor, 0)
  const totalProfit   = rows.reduce((s, r) => s + r.loiNhuan, 0)

  const columns: NepoColumn<VehiclePnLRow>[] = [
    {
      key: 'plate',
      header: 'Biển số',
      sticky: true,
      render: (r) => <Plate>{r.plate}</Plate>,
    },
    {
      key: 'vendorName',
      header: 'Nhà xe',
      width: 160,
      render: (r) => (
        <span className="text-sm text-[var(--ink-2)]">{r.vendorName ?? '—'}</span>
      ),
    },
    {
      key: 'revenue',
      header: 'Doanh thu',
      align: 'right',
      width: 130,
      render: (r) => <MoneyCell value={r.revenue} />,
    },
    {
      key: 'chiPhi',
      header: 'Chi phí',
      align: 'right',
      width: 130,
      render: (r) => <MoneyCell value={r.cpVendor} />,
    },
    {
      key: 'profit',
      header: 'Lợi nhuận',
      align: 'right',
      width: 130,
      headerClass: 'nepo-col-net',
      cellClass: 'nepo-col-net',
      render: (r) => <MoneyCell value={r.loiNhuan} bold />,
    },
  ]

  const footerCells: NepoFooterCell[] = [
    { content: 'Tổng', sticky: true },
    { content: null, align: 'right' },   // Nhà xe — no total
    { content: <MoneyCell value={totalRevenue} />, align: 'right' },
    { content: <MoneyCell value={totalCost} />, align: 'right' },
    {
      content: <MoneyCell value={totalProfit} bold />,
      align: 'right',
      className: 'nepo-col-net',
    },
  ]

  return (
    <NepoTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.vehicleId}
      isLoading={isLoading}
      emptyText="Không có xe ngoài trong kỳ này"
      emptyIcon={
        <img
          src="/illustrations/empty-vendors.svg"
          alt=""
          className="h-28 w-auto"
          draggable={false}
        />
      }
      minWidth={620}
      footerCells={footerCells}
    />
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function PnLPage() {
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const [search, setSearch] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const { data: pnlData, isLoading } = useVehiclePnL(dateFrom, dateTo)

  async function handleExport() {
    setIsExporting(true)
    try {
      await exportVehiclePnL(dateFrom, dateTo)
    } catch (err) {
      console.error('Export failed', err)
    } finally {
      setIsExporting(false)
    }
  }

  const allRows = useMemo<VehiclePnLRow[]>(
    () => (pnlData as VehiclePnLResponse | undefined)?.rows ?? [],
    [pnlData],
  )
  const totalRevenue = (pnlData as VehiclePnLResponse | undefined)?.totalRevenue ?? 0
  const totalProfit  = (pnlData as VehiclePnLResponse | undefined)?.totalProfit ?? 0
  const totalCost    = allRows.reduce(
    (s, r) => s + r.cpXe.total + r.cpLuongSanLuong + r.cpLuongCoBan + r.cpVendor,
    0,
  )
  const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null

  const filteredRows = useMemo(() => {
    const q = normalizeVietnamese(search.trim())
    if (!q) return allRows
    return allRows.filter(
      (r) =>
        normalizeVietnamese(r.plate).includes(q) ||
        normalizeVietnamese(r.vendorName ?? '').includes(q),
    )
  }, [allRows, search])

  const noiBoRows = useMemo(() => filteredRows.filter((r) => !r.isVendor), [filteredRows])
  const ngoaiRows = useMemo(() => filteredRows.filter((r) => r.isVendor), [filteredRows])

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader
        title="Tổng hợp"
        subtitle="Doanh thu và lợi nhuận từng xe theo kỳ — đối chiếu chi phí xe, lương và biên lợi nhuận"
        lucideIcon={TrendingUp}
        actions={<MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />}
      />

      <div className="grid grid-cols-3 gap-3">
        <KpiHeroCard
          label="Doanh thu"
          formattedValue={<><AnimatedNumber value={totalRevenue} format="currency" /> ₫</>}
          value={totalRevenue}
          icon={DollarSign}
          color="amber"
          sublabel="Kỳ hiện tại"
          className="card-hover-lift"
        />
        <KpiHeroCard
          label="Tổng chi phí"
          formattedValue={<><AnimatedNumber value={totalCost} format="currency" /> ₫</>}
          value={totalCost}
          icon={Coins}
          color="blue"
          sublabel="Xe + Lương + Nhà xe"
          className="card-hover-lift"
        />
        <KpiHeroCard
          label="Lợi nhuận"
          formattedValue={<><AnimatedNumber value={totalProfit} format="currency" /> ₫</>}
          value={totalProfit}
          icon={TrendingUp}
          color={totalProfit >= 0 ? 'emerald' : 'rose'}
          sublabel={marginPct != null ? `Biên: ${marginPct.toFixed(1)}%` : 'Biên: —'}
          className="card-hover-lift"
        />
      </div>

      <div className="flex items-center gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Tìm biển số / nhà xe..."
          className="w-[240px]"
        />
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isExporting || isLoading}
        >
          <Download size={14} className={isExporting ? 'animate-bounce' : ''} />
          {isExporting ? 'Đang xuất...' : 'Xuất báo cáo'}
        </Button>
      </div>

      {/* Tables — side-by-side on wide screens, stacked on small */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Xe nội bộ */}
        <section className="space-y-2 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--ink)] tracking-wide uppercase opacity-60">
            Xe nội bộ
          </h2>
          <NoiBoTable rows={noiBoRows} isLoading={isLoading} />
        </section>

        {/* Xe ngoài */}
        {(isLoading || ngoaiRows.length > 0) && (
          <section className="space-y-2 min-w-0">
            <h2 className="text-sm font-semibold text-[var(--ink)] tracking-wide uppercase opacity-60">
              Xe ngoài
            </h2>
            <NgoaiTable rows={ngoaiRows} isLoading={isLoading} />
          </section>
        )}
      </div>
    </div>
  )
}
