import { memo } from 'react'
import { Plate } from '@/components/shared/data-display/Plate'
import { formatCurrency } from '@/data/domain'
import type { VehiclePnLRow } from '@/services/api/pnl.api'

export interface PnLMobileCardProps {
  row: VehiclePnLRow
}

const monoStyle: React.CSSProperties = { fontFamily: 'var(--theme-font-mono)' }

export const PnLMobileCard = memo(function PnLMobileCard({ row }: PnLMobileCardProps) {
  const totalCost = row.isVendor
    ? row.cpVendor
    : row.cpXe.total + row.cpLuongSanLuong + row.cpLuongCoBan
  const profitColor = row.loiNhuan >= 0 ? 'var(--accent-2)' : 'var(--danger)'

  return (
    <div
      className="p-4 rounded-xl border space-y-2.5"
      style={{
        background: 'var(--theme-bg-secondary, #ffffff)',
        borderColor: 'var(--theme-border-default, #e4e4e7)',
      }}
    >
      {/* Header: plate + vendor name */}
      <div className="flex items-center justify-between gap-2">
        <Plate>{row.plate}</Plate>
        {row.isVendor && row.vendorName && (
          <span className="text-[11.5px] truncate" style={{ color: 'var(--ink-3)' }}>
            {row.vendorName}
          </span>
        )}
      </div>

      {/* Financials */}
      <div className="space-y-1.5 pt-1.5" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="flex justify-between items-center text-sm">
          <span style={{ color: 'var(--ink-3)' }}>Doanh thu</span>
          <span className="tabular-nums font-semibold" style={{ ...monoStyle, color: 'var(--ink)' }}>
            {formatCurrency(row.revenue)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span style={{ color: 'var(--ink-3)' }}>Chi phí</span>
          <span className="tabular-nums font-semibold" style={{ ...monoStyle, color: 'var(--ink-2)' }}>
            {formatCurrency(totalCost)}
          </span>
        </div>
      </div>

      {/* Profit — highlighted */}
      <div
        className="flex justify-between items-center pt-2"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Lợi nhuận</span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ ...monoStyle, color: profitColor }}
        >
          {formatCurrency(row.loiNhuan)}
        </span>
      </div>
    </div>
  )
})
