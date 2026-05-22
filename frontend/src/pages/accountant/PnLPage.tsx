import { useState } from 'react'
import { TrendingUp, DollarSign, Coins } from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { NepoTable } from '@/components/shared/NepoTable'
import type { NepoColumn, NepoFooterCell } from '@/components/shared/NepoTable'
import { Plate } from '@/components/shared/Plate'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import { useVehiclePnL, useVehicles } from '@/hooks/use-queries'
import { useMonthParams } from './use-month-params'
import { compactCurrency } from '@/data/domain'
import type { VehiclePnLRow, VehiclePnLResponse } from '@/services/api/pnl.api'
import { AnimatedNumber } from '@/components/shared'

const monoStyle = { fontFamily: 'var(--theme-font-mono)' } as React.CSSProperties

export function PnLPage() {
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const [vehicleFilter, setVehicleFilter] = useState<number | ''>('')
  const { data: vehicles } = useVehicles()
  const { data: pnlData, isLoading } = useVehiclePnL(dateFrom, dateTo, vehicleFilter || undefined)

  const rows: VehiclePnLRow[] = (pnlData as VehiclePnLResponse | undefined)?.rows ?? []
  const totalRevenue = (pnlData as VehiclePnLResponse | undefined)?.totalRevenue ?? 0
  const totalProfit = (pnlData as VehiclePnLResponse | undefined)?.totalProfit ?? 0

  const totalCpXangDau = rows.reduce((s, r) => s + r.cpXe.xangDau, 0)
  const totalCpSuaChua = rows.reduce((s, r) => s + r.cpXe.suaChua, 0)
  const totalCpTienLuat = rows.reduce((s, r) => s + r.cpXe.tienLuat, 0)
  const totalCpKhac = rows.reduce((s, r) => s + r.cpXe.khac, 0)
  const totalCpXe = rows.reduce((s, r) => s + r.cpXe.total, 0)
  const totalCpLuongSL = rows.reduce((s, r) => s + r.cpLuongSanLuong, 0)
  const totalCpLuongCB = rows.reduce((s, r) => s + r.cpLuongCoBan, 0)
  const totalCost = totalCpXe + totalCpLuongSL + totalCpLuongCB
  const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

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
      key: 'cpXe',
      header: 'CP Xe',
      align: 'right',
      width: 110,
      render: (r) => (
        <span className="tabular-nums font-semibold" style={{ color: 'var(--ink)', ...monoStyle }}>
          {compactCurrency(r.cpXe.total)}
        </span>
      ),
    },
    {
      key: 'luongSL',
      header: 'Lương SL',
      align: 'right',
      width: 110,
      hideBelow: 'md',
      render: (r) => <span className="tabular-nums" style={monoStyle}>{compactCurrency(r.cpLuongSanLuong)}</span>,
    },
    {
      key: 'luongCB',
      header: 'Lương CB',
      align: 'right',
      width: 110,
      hideBelow: 'md',
      render: (r) => <span className="tabular-nums" style={monoStyle}>{compactCurrency(r.cpLuongCoBan)}</span>,
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
    { content: <span className="tabular-nums" style={monoStyle}>{compactCurrency(totalCpXe)}</span>, align: 'right' },
    { content: <span className="tabular-nums" style={monoStyle}>{compactCurrency(totalCpLuongSL)}</span>, align: 'right' },
    { content: <span className="tabular-nums" style={monoStyle}>{compactCurrency(totalCpLuongCB)}</span>, align: 'right' },
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
      <header className="flex items-start justify-between gap-5 flex-wrap">
        <div className="min-w-0">
          <h1 className="typo-display">Báo cáo</h1>
          <p className="typo-body-sm mt-1.5">
            Doanh thu và lợi nhuận từng xe theo kỳ — đối chiếu chi phí xe, lương và biên lợi nhuận
          </p>
        </div>
        <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />
      </header>

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
          label="Lợi nhuận"
          formattedValue={<><AnimatedNumber value={totalProfit} format="compact" /> ₫</>}
          value={totalProfit}
          icon={TrendingUp}
          color={totalProfit >= 0 ? 'emerald' : 'rose'}
          sublabel={`Biên: ${marginPct.toFixed(1)}%`}
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
      </div>

      <div className="flex items-center gap-3">
        <div style={{ width: 160 }}>
          <InlineSelect
            placeholder="Tất cả xe"
            value={vehicleFilter !== '' ? String(vehicleFilter) : ''}
            options={[
              { value: '', label: 'Tất cả xe' },
              ...(vehicles ?? []).map(v => ({ value: String(v.id), label: v.plate })),
            ]}
            onChange={v => setVehicleFilter(v ? Number(v) : '')}
          />
        </div>
      </div>

      <NepoTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.vehicleId}
        isLoading={isLoading}
        emptyText="Không có dữ liệu P&L cho tháng này"
        minWidth={1000}
        footerCells={footerCells}
      />
    </div>
  )
}
