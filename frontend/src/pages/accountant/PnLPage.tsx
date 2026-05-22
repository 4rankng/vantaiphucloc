import { useState } from 'react'
import { TrendingUp, DollarSign, Coins } from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { Plate } from '@/components/shared/Plate'
import { TableSkeleton } from '@/components/shared/TableSkeleton/TableSkeleton'
import { useVehiclePnL, useVehicles } from '@/hooks/use-queries'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import { useMonthParams } from './use-month-params'
import { formatCurrency, compactCurrency } from '@/data/domain'
import type { VehiclePnLRow, VehiclePnLResponse } from '@/services/api/pnl.api'
import { AnimatedNumber } from '@/components/shared'

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

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-start justify-between gap-5 flex-wrap">
        <div className="min-w-0">
          <h1 className="typo-display">Báo cáo tài chính</h1>
          <p className="typo-body-sm mt-1.5">
            Doanh thu và lợi nhuận từng xe theo kỳ — đối chiếu chi phí xe, lương và biên lợi nhuận
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
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
          <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
        </div>
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

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : (
          <div className="nepo-table-scroll overflow-x-auto">
            <table className="nepo-table w-full" style={{ minWidth: 1000, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="text-left nepo-th-sticky">Biển số</th>
                  <th className="text-right">Doanh thu</th>
                  <th className="text-right hidden lg:table-cell">CP Xăng dầu</th>
                  <th className="text-right hidden lg:table-cell">CP Sửa chữa</th>
                  <th className="text-right hidden lg:table-cell">CP Tiền luật</th>
                  <th className="text-right hidden lg:table-cell">CP Khác</th>
                  <th className="text-right">CP Xe</th>
                  <th className="text-right hidden md:table-cell">Lương SL</th>
                  <th className="text-right hidden md:table-cell">Lương CB</th>
                  <th className="text-right">Lợi nhuận</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12" style={{ color: 'var(--ink-3)' }}>
                      Không có dữ liệu P&L cho tháng này
                    </td>
                  </tr>
                ) : rows.map((r) => (
                  <tr key={r.vehicleId}>
                    <td className="nepo-td-sticky"><Plate>{r.plate}</Plate></td>
                    <td className="text-right tabular-nums font-semibold" style={num('var(--ink)')}>{compactCurrency(r.revenue)}</td>
                    <td className="text-right tabular-nums hidden lg:table-cell" style={num()}>{compactCurrency(r.cpXe.xangDau)}</td>
                    <td className="text-right tabular-nums hidden lg:table-cell" style={num()}>{compactCurrency(r.cpXe.suaChua)}</td>
                    <td className="text-right tabular-nums hidden lg:table-cell" style={num()}>{compactCurrency(r.cpXe.tienLuat)}</td>
                    <td className="text-right tabular-nums hidden lg:table-cell" style={num()}>{compactCurrency(r.cpXe.khac)}</td>
                    <td className="text-right tabular-nums font-semibold" style={num('var(--ink)')}>{compactCurrency(r.cpXe.total)}</td>
                    <td className="text-right tabular-nums hidden md:table-cell" style={num()}>{compactCurrency(r.cpLuongSanLuong)}</td>
                    <td className="text-right tabular-nums hidden md:table-cell" style={num()}>{compactCurrency(r.cpLuongCoBan)}</td>
                    <td className="text-right tabular-nums font-bold" style={{ color: r.loiNhuan >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--theme-font-mono)' }}>{compactCurrency(r.loiNhuan)}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="nepo-tfoot">
                  <tr>
                    <td className="nepo-td-sticky font-bold" style={{ color: 'var(--ink)' }}>Tổng</td>
                    <td className="text-right tabular-nums" style={num('var(--ink)')}>{compactCurrency(totalRevenue)}</td>
                    <td className="text-right tabular-nums hidden lg:table-cell" style={num()}>{compactCurrency(totalCpXangDau)}</td>
                    <td className="text-right tabular-nums hidden lg:table-cell" style={num()}>{compactCurrency(totalCpSuaChua)}</td>
                    <td className="text-right tabular-nums hidden lg:table-cell" style={num()}>{compactCurrency(totalCpTienLuat)}</td>
                    <td className="text-right tabular-nums hidden lg:table-cell" style={num()}>{compactCurrency(totalCpKhac)}</td>
                    <td className="text-right tabular-nums" style={num('var(--ink)')}>{compactCurrency(totalCpXe)}</td>
                    <td className="text-right tabular-nums hidden md:table-cell" style={num()}>{compactCurrency(totalCpLuongSL)}</td>
                    <td className="text-right tabular-nums hidden md:table-cell" style={num()}>{compactCurrency(totalCpLuongCB)}</td>
                    <td className="text-right tabular-nums font-bold" style={{ color: totalProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--theme-font-mono)' }}>{compactCurrency(totalProfit)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
