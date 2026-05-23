import { useState, useMemo } from 'react'
import { TrendingUp, DollarSign, Coins, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { NepoTable } from '@/components/shared/NepoTable'
import type { NepoColumn, NepoFooterCell } from '@/components/shared/NepoTable'
import { Plate } from '@/components/shared/Plate'
import { useVehiclePnL } from '@/hooks/use-queries'
import { useMonthParams } from './use-month-params'
import { compactCurrency } from '@/data/domain'
import type { VehiclePnLRow, VehiclePnLResponse } from '@/services/api/pnl.api'
import { AnimatedNumber } from '@/components/shared'

const monoStyle = { fontFamily: 'var(--theme-font-mono)' } as React.CSSProperties

export function PnLPage() {
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const [search, setSearch] = useState('')
  const { data: pnlData, isLoading } = useVehiclePnL(dateFrom, dateTo)

  const allRows: VehiclePnLRow[] = (pnlData as VehiclePnLResponse | undefined)?.rows ?? []
  const totalRevenue = (pnlData as VehiclePnLResponse | undefined)?.totalRevenue ?? 0
  const totalProfit = (pnlData as VehiclePnLResponse | undefined)?.totalProfit ?? 0

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allRows
    return allRows.filter(r => r.plate.toLowerCase().includes(q))
  }, [allRows, search])

  const totalCpXangDau = rows.reduce((s, r) => s + r.cpXe.xangDau, 0)
  const totalCpSuaChua = rows.reduce((s, r) => s + r.cpXe.suaChua, 0)
  const totalCpTienLuat = rows.reduce((s, r) => s + r.cpXe.tienLuat, 0)
  const totalCpKhac = rows.reduce((s, r) => s + r.cpXe.khac, 0)
  const totalCpXe = rows.reduce((s, r) => s + r.cpXe.total, 0)
  const totalLuongLX = rows.reduce((s, r) => s + r.cpLuongSanLuong + r.cpLuongCoBan, 0)
  const totalCost = totalCpXe + totalLuongLX
  const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null

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
      render: (r) => (
        <span className="tabular-nums font-semibold" style={{ color: 'var(--ink)', ...monoStyle }}>
          {compactCurrency(r.revenue)}
        </span>
      ),
    },
    {
      key: 'xangDau',
      header: 'CP Xăng dầu',
      align: 'right',
      width: 120,
      hideBelow: 'lg',
      render: (r) => <span className="tabular-nums" style={monoStyle}>{compactCurrency(r.cpXe.xangDau)}</span>,
    },
    {
      key: 'suaChua',
      header: 'CP Sửa chữa',
      align: 'right',
      width: 120,
      hideBelow: 'lg',
      render: (r) => <span className="tabular-nums" style={monoStyle}>{compactCurrency(r.cpXe.suaChua)}</span>,
    },
    {
      key: 'tienLuat',
      header: 'CP Tiền luật',
      align: 'right',
      width: 120,
      hideBelow: 'lg',
      render: (r) => <span className="tabular-nums" style={monoStyle}>{compactCurrency(r.cpXe.tienLuat)}</span>,
    },
    {
      key: 'khac',
      header: 'CP Khác',
      align: 'right',
      width: 100,
      hideBelow: 'lg',
      render: (r) => <span className="tabular-nums" style={monoStyle}>{compactCurrency(r.cpXe.khac)}</span>,
    },
    {
      key: 'luongLX',
      header: 'Lương LX',
      align: 'right',
      width: 120,
      render: (r) => (
        <span className="tabular-nums font-semibold" style={{ color: 'var(--ink)', ...monoStyle }}>
          {compactCurrency(r.cpLuongSanLuong + r.cpLuongCoBan)}
        </span>
      ),
    },
    {
      key: 'profit',
      header: 'Lợi nhuận',
      align: 'right',
      width: 120,
      headerClass: 'nepo-col-net',
      cellClass: 'nepo-col-net',
      render: (r) => (
        <span
          className="tabular-nums font-bold"
          style={{ color: r.loiNhuan >= 0 ? 'var(--accent-2)' : 'var(--danger)', fontFamily: 'var(--theme-font-mono)' }}
        >
          {compactCurrency(r.loiNhuan)}
        </span>
      ),
    },
  ]

  const footerCells: NepoFooterCell[] = [
    { content: 'Tổng', sticky: true },
    { content: <span className="tabular-nums" style={monoStyle}>{compactCurrency(totalRevenue)}</span>, align: 'right' },
    { content: <span className="tabular-nums" style={monoStyle}>{compactCurrency(totalCpXangDau)}</span>, align: 'right' },
    { content: <span className="tabular-nums" style={monoStyle}>{compactCurrency(totalCpSuaChua)}</span>, align: 'right' },
    { content: <span className="tabular-nums" style={monoStyle}>{compactCurrency(totalCpTienLuat)}</span>, align: 'right' },
    { content: <span className="tabular-nums" style={monoStyle}>{compactCurrency(totalCpKhac)}</span>, align: 'right' },
    { content: <span className="tabular-nums" style={monoStyle}>{compactCurrency(totalLuongLX)}</span>, align: 'right' },
    {
      content: (
        <span
          className="tabular-nums font-bold"
          style={{ color: totalProfit >= 0 ? 'var(--accent-2)' : 'var(--danger)', fontFamily: 'var(--theme-font-mono)' }}
        >
          {compactCurrency(totalProfit)}
        </span>
      ),
      align: 'right',
      className: 'nepo-col-net',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Báo cáo"
        subtitle="Doanh thu và lợi nhuận từng xe theo kỳ — đối chiếu chi phí xe, lương và biên lợi nhuận"
        lucideIcon={TrendingUp}
        actions={<MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />}
      />

      <div className="grid grid-cols-3 gap-3">
        <KpiHeroCard
          label="Doanh thu"
          formattedValue={<><AnimatedNumber value={totalRevenue} format="compact" /> ₫</>}
          value={totalRevenue}
          icon={DollarSign}
          color="amber"
          sublabel="Kỳ hiện tại"
          className="card-hover-lift"
        />
        <KpiHeroCard
          label="Tổng chi phí"
          formattedValue={<><AnimatedNumber value={totalCost} format="compact" /> ₫</>}
          value={totalCost}
          icon={Coins}
          color="blue"
          sublabel={`Xe + Lương`}
          className="card-hover-lift"
        />
        <KpiHeroCard
          label="Lợi nhuận"
          formattedValue={<><AnimatedNumber value={totalProfit} format="compact" /> ₫</>}
          value={totalProfit}
          icon={TrendingUp}
          color={totalProfit >= 0 ? 'emerald' : 'rose'}
          sublabel={marginPct != null ? `Biên: ${marginPct.toFixed(1)}%` : 'Biên: —'}
          className="card-hover-lift"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" style={{ width: 220 }}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm biển số..."
            className="w-full h-9 pl-8 pr-3 rounded-md border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <NepoTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.vehicleId}
        isLoading={isLoading}
        emptyText="Không có dữ liệu P&L cho tháng này"
        minWidth={800}
        footerCells={footerCells}
      />
    </div>
  )
}
