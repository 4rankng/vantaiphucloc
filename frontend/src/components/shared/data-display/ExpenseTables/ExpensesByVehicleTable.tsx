import { memo } from 'react'
import { Plate } from '@/components/shared/data-display/Plate'
import { ExpenseByVehicleCard } from '@/components/shared/cards/VehicleExpenseMobileCard'
import type { VehicleSummary } from '@/components/shared/cards/VehicleExpenseMobileCard'
import { formatCurrency } from '@/data/domain'
import { EXPENSE_CATEGORY_LABELS } from '@/services/api/vehicleExpenses.api'
import { EXPENSE_CATEGORIES } from './types'

interface ExpensesByVehicleTableProps {
  rows: VehicleSummary[]
  totalAll: number
  isMobile: boolean
}

export const ExpensesByVehicleTable = memo(function ExpensesByVehicleTable({ rows, totalAll, isMobile }: ExpensesByVehicleTableProps) {
  if (rows.length === 0) return null

  if (isMobile) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {rows.map(r => <ExpenseByVehicleCard key={r.vehicleId} summary={r} />)}
        <div
          className="p-4 rounded-xl border space-y-1.5"
          style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}
        >
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--ink-2)' }}>Tổng cộng</div>
          {EXPENSE_CATEGORIES.map(c => {
            const sum = rows.reduce((s, r) => s + r.byCategory[c], 0)
            return (
              <div key={c} className="flex justify-between text-sm">
                <span style={{ color: 'var(--ink-3)' }}>{EXPENSE_CATEGORY_LABELS[c]}</span>
                <span
                  className="tabular-nums"
                  style={{
                    fontFamily: 'var(--theme-font-mono)',
                    color: sum > 0 ? 'var(--ink)' : 'var(--ink-4)',
                  }}
                >
                  {sum > 0 ? formatCurrency(sum) : '—'}
                </span>
              </div>
            )
          })}
          <div
            className="flex justify-between font-bold pt-2 mt-1"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <span>Tổng</span>
            <span
              className="tabular-nums"
              style={{
                fontFamily: 'var(--theme-font-mono)',
                color: 'var(--theme-brand-primary-dark, var(--accent))',
              }}
            >
              {formatCurrency(totalAll)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="nepo-table-scroll overflow-x-auto">
      <table className="nepo-table w-full" style={{ minWidth: 480, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th className="text-left" style={{ width: 100 }}>Biển số</th>
            <th className="text-right" style={{ width: 36 }}>SL</th>
            {EXPENSE_CATEGORIES.map(c => (
              <th key={c} className="text-right" style={{ whiteSpace: 'nowrap' }}>
                {EXPENSE_CATEGORY_LABELS[c]}
              </th>
            ))}
            <th className="text-right" style={{ width: 110, whiteSpace: 'nowrap' }}>Tổng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.vehicleId}>
              <td><Plate>{r.vehiclePlate}</Plate></td>
              <td style={{ textAlign: 'right' }}>
                <span className="tabular-nums" style={{ color: 'var(--ink-2)', fontSize: 12.5 }}>{r.count}</span>
              </td>
              {EXPENSE_CATEGORIES.map(c => (
                <td key={c} style={{ textAlign: 'right' }}>
                  <span
                    className="tabular-nums"
                    style={{
                      color: r.byCategory[c] > 0 ? 'var(--ink)' : 'var(--ink-4)',
                      fontFamily: 'var(--theme-font-mono)',
                      fontSize: 12.5,
                    }}
                  >
                    {r.byCategory[c] > 0 ? formatCurrency(r.byCategory[c]) : '—'}
                  </span>
                </td>
              ))}
              <td style={{ textAlign: 'right' }}>
                <span className="tabular-nums font-bold" style={{ color: 'var(--ink)', fontSize: 12.5 }}>
                  {formatCurrency(r.total)}
                </span>
              </td>
            </tr>
          ))}
          <tr style={{ background: 'var(--surface-2, var(--surface))', borderTop: '2px solid var(--line-2)' }}>
            <td style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 12.5 }}>Tổng cộng</td>
            <td style={{ textAlign: 'right' }}>
              <span className="tabular-nums" style={{ color: 'var(--ink-2)', fontSize: 12.5 }}>
                {rows.reduce((s, r) => s + r.count, 0)}
              </span>
            </td>
            {EXPENSE_CATEGORIES.map(c => {
              const sum = rows.reduce((s, r) => s + r.byCategory[c], 0)
              return (
                <td key={c} style={{ textAlign: 'right' }}>
                  <span className="tabular-nums font-bold" style={{ color: sum > 0 ? 'var(--ink)' : 'var(--ink-4)', fontFamily: 'var(--theme-font-mono)', fontSize: 12.5 }}>
                    {sum > 0 ? formatCurrency(sum) : '—'}
                  </span>
                </td>
              )
            })}
            <td style={{ textAlign: 'right' }}>
              <span className="tabular-nums font-bold" style={{ color: 'var(--theme-brand-primary-dark)', fontSize: 13, fontFamily: 'var(--theme-font-mono)' }}>
                {formatCurrency(totalAll)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
})
