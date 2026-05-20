import { useState } from 'react'
import { TrendingUp, DollarSign, Coins, Percent } from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { Panel } from '@/components/shared/Panel'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Plate } from '@/components/shared/Plate'
import { Toolbar, ToolbarSpacer } from '@/components/shared/Toolbar'
import { EmptyState } from '@/components/shared/EmptyState'
import { useVehiclePnL, useVehicles } from '@/hooks/use-queries'
import { useMonthParams } from './use-month-params'
import { formatCurrency, compactCurrency } from '@/data/domain'
import type { VehiclePnLRow, VehiclePnLResponse } from '@/services/api/pnl.api'

export function PnLPage() {
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
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

  const num = (color: string = 'var(--ink-2)') =>
    ({ color, fontFamily: 'var(--theme-font-mono)' } as React.CSSProperties)

  const columns: Column<VehiclePnLRow>[] = [
    {
      key: 'plate',
      header: 'Biển số',
      sticky: true,
      width: 120,
      render: (r) => <Plate>{r.plate}</Plate>,
    },
    {
      key: 'revenue',
      header: 'Doanh thu',
      align: 'right',
      render: (r) => <span className="tabular-nums font-semibold" style={num('var(--ink)')}>{compactCurrency(r.revenue)}</span>,
    },
    {
      key: 'cpXangDau',
      header: 'CP Xăng dầu',
      align: 'right',
      hideBelow: 'lg',
      render: (r) => <span className="tabular-nums" style={num()}>{compactCurrency(r.cpXe.xangDau)}</span>,
    },
    {
      key: 'cpSuaChua',
      header: 'CP Sửa chữa',
      align: 'right',
      hideBelow: 'lg',
      render: (r) => <span className="tabular-nums" style={num()}>{compactCurrency(r.cpXe.suaChua)}</span>,
    },
    {
      key: 'cpTienLuat',
      header: 'CP Tiền luật',
      align: 'right',
      hideBelow: 'lg',
      render: (r) => <span className="tabular-nums" style={num()}>{compactCurrency(r.cpXe.tienLuat)}</span>,
    },
    {
      key: 'cpKhac',
      header: 'CP Khác',
      align: 'right',
      hideBelow: 'lg',
      render: (r) => <span className="tabular-nums" style={num()}>{compactCurrency(r.cpXe.khac)}</span>,
    },
    {
      key: 'cpXeTotal',
      header: 'CP Xe',
      align: 'right',
      render: (r) => <span className="tabular-nums font-semibold" style={num('var(--ink)')}>{compactCurrency(r.cpXe.total)}</span>,
    },
    {
      key: 'luongSL',
      header: 'Lương SL',
      align: 'right',
      hideBelow: 'md',
      render: (r) => <span className="tabular-nums" style={num()}>{compactCurrency(r.cpLuongSanLuong)}</span>,
    },
    {
      key: 'luongCB',
      header: 'Lương CB',
      align: 'right',
      hideBelow: 'md',
      render: (r) => <span className="tabular-nums" style={num()}>{compactCurrency(r.cpLuongCoBan)}</span>,
    },
    {
      key: 'profit',
      header: 'Lợi nhuận',
      align: 'right',
      render: (r) => (
        <span
          className="tabular-nums font-bold"
          style={{
            color: r.loiNhuan >= 0 ? 'var(--success)' : 'var(--danger)',
            fontFamily: 'var(--theme-font-mono)',
          }}
        >
          {compactCurrency(r.loiNhuan)}
        </span>
      ),
    },
  ]

  const footer = rows.length > 0 ? (
    <tr>
      <td className="nepo-td-sticky">
        <span className="font-bold" style={{ color: 'var(--ink)' }}>Tổng</span>
      </td>
      <td className="text-right tabular-nums" style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--ink)' }}>
        {compactCurrency(totalRevenue)}
      </td>
      <td className="text-right tabular-nums hidden lg:table-cell" style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--ink-2)' }}>
        {compactCurrency(totalCpXangDau)}
      </td>
      <td className="text-right tabular-nums hidden lg:table-cell" style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--ink-2)' }}>
        {compactCurrency(totalCpSuaChua)}
      </td>
      <td className="text-right tabular-nums hidden lg:table-cell" style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--ink-2)' }}>
        {compactCurrency(totalCpTienLuat)}
      </td>
      <td className="text-right tabular-nums hidden lg:table-cell" style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--ink-2)' }}>
        {compactCurrency(totalCpKhac)}
      </td>
      <td className="text-right tabular-nums" style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--ink)' }}>
        {compactCurrency(totalCpXe)}
      </td>
      <td className="text-right tabular-nums hidden md:table-cell" style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--ink-2)' }}>
        {compactCurrency(totalCpLuongSL)}
      </td>
      <td className="text-right tabular-nums hidden md:table-cell" style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--ink-2)' }}>
        {compactCurrency(totalCpLuongCB)}
      </td>
      <td className="text-right tabular-nums font-bold" style={{ color: totalProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--theme-font-mono)' }}>
        {compactCurrency(totalProfit)}
      </td>
    </tr>
  ) : null

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-start justify-between gap-5 flex-wrap">
        <div className="min-w-0">
          <h1 className="typo-display">Báo cáo tài chính</h1>
          <p className="typo-body-sm mt-1.5">
            Doanh thu và lợi nhuận từng xe theo kỳ — đối chiếu chi phí xe, lương và biên lợi nhuận
          </p>
        </div>
        <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
      </header>

      <div className="grid grid-cols-3 gap-3">
        <KpiHeroCard
          label="Doanh thu"
          formattedValue={compactCurrency(totalRevenue)}
          value={totalRevenue}
          icon={DollarSign}
          color="amber"
          sublabel="Kỳ hiện tại"
        />
        <KpiHeroCard
          label="Lợi nhuận"
          formattedValue={compactCurrency(totalProfit)}
          value={totalProfit}
          icon={TrendingUp}
          color={totalProfit >= 0 ? 'emerald' : 'rose'}
          sublabel={`Biên: ${marginPct.toFixed(1)}%`}
        />
        <KpiHeroCard
          label="Tổng chi phí"
          formattedValue={compactCurrency(totalCost)}
          value={totalCost}
          icon={Coins}
          color="blue"
          sublabel={`Xe + Lương`}
        />
      </div>

      <Panel title="P&L theo xe" subtitle={`${rows.length} xe · ${dateFrom} → ${dateTo}`} flush>
        <Toolbar bordered>
          <select
            value={vehicleFilter}
            onChange={e => setVehicleFilter(e.target.value ? Number(e.target.value) : '')}
            className="nepo-select"
            style={{ minHeight: 32, padding: '6px 32px 6px 11px', fontSize: 12.5, width: 'auto' }}
          >
            <option value="">Tất cả xe</option>
            {vehicles?.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
          </select>
          <ToolbarSpacer />
          <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
            Cuộn ngang để xem toàn bộ cột trên màn hình nhỏ
          </span>
        </Toolbar>

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.vehicleId}
          isLoading={isLoading}
          minWidth={1100}
          footer={footer}
          empty={
            <div className="py-10">
              <EmptyState
                icon={<TrendingUp className="h-5 w-5" />}
                title="Không có dữ liệu P&L cho tháng này"
                compact
              />
            </div>
          }
        />
      </Panel>
    </div>
  )
}
