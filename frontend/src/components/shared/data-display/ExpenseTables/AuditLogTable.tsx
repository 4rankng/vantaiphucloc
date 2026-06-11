import { memo } from 'react'
import { Loader2 } from 'lucide-react'
import { Pill } from '@/components/shared/data-display/Pill'
import { Plate } from '@/components/shared/data-display/Plate'
import { ExpenseAuditCard } from '@/components/shared/cards/VehicleExpenseMobileCard'
import { formatCurrency } from '@/data/domain'
import { EXPENSE_CATEGORY_LABELS } from '@/services/api/vehicleExpenses.api'
import { formatDate } from '@/lib/format'
import { CATEGORY_VARIANT } from './types'
import type { AuditEntry } from './types'
import { toLocalISODate } from './types'

interface AuditLogTableProps {
  entries: AuditEntry[]
  isFetchingNextPage: boolean
  hasNextPage: boolean
  sentinelRef: React.RefObject<HTMLDivElement>
  isMobile: boolean
}

export const AuditLogTable = memo(function AuditLogTable({
  entries,
  isFetchingNextPage,
  hasNextPage,
  sentinelRef,
  isMobile,
}: AuditLogTableProps) {
  if (entries.length === 0) return null

  const sentinel = (
    <>
      <div ref={sentinelRef} style={{ height: 1 }} />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--ink-4)' }} />
        </div>
      )}
      {!hasNextPage && entries.length > 0 && (
        <div className="py-3 text-center" style={{ fontSize: 12, color: 'var(--ink-4)' }}>
          Đã hiển thị tất cả {entries.length} mục
        </div>
      )}
    </>
  )

  if (isMobile) {
    return (
      <>
        <div className="flex flex-col gap-3 p-4">
          {entries.map(({ expense: e, edited }) => (
            <ExpenseAuditCard key={e.id} expense={e} edited={edited} />
          ))}
        </div>
        {sentinel}
      </>
    )
  }

  return (
    <>
      <div className="nepo-table-scroll overflow-x-auto">
        <table className="nepo-table w-full" style={{ minWidth: 520, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="text-left" style={{ width: 90, whiteSpace: 'nowrap' }}>Ngày CP</th>
              <th className="text-left" style={{ width: 90 }}>Biển số</th>
              <th className="text-left" style={{ width: 1, whiteSpace: 'nowrap' }}>Loại</th>
              <th className="text-right" style={{ width: 110, whiteSpace: 'nowrap' }}>Số tiền</th>
              <th className="text-left" style={{ width: 90, whiteSpace: 'nowrap' }}>Ngày tạo</th>
              <th className="text-left" style={{ whiteSpace: 'nowrap' }}>Mô tả</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(({ expense: e, edited }) => (
              <tr key={e.id}>
                <td>
                  <span className="tabular-nums" style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--theme-font-mono)' }}>
                    {formatDate(e.expenseDate, 'full')}
                  </span>
                </td>
                <td><Plate>{e.vehiclePlate ?? '—'}</Plate></td>
                <td>
                  <Pill variant={CATEGORY_VARIANT[e.category]} dot={false}>
                    {EXPENSE_CATEGORY_LABELS[e.category]}
                  </Pill>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="tabular-nums font-bold" style={{ fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--theme-font-mono)' }}>
                    {formatCurrency(e.amount)}
                  </span>
                </td>
                <td>
                  <span className="tabular-nums" style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--theme-font-mono)' }}>
                    {formatDate(toLocalISODate(edited ? e.updatedAt : e.createdAt), 'full')}
                  </span>
                </td>
                <td>
                  <span
                    className="truncate block"
                    style={{ fontSize: 12, color: 'var(--ink-2)', maxWidth: 200 }}
                    title={e.description ?? ''}
                  >
                    {e.description || <span style={{ color: 'var(--ink-4)' }}>—</span>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sentinel}
    </>
  )
})
