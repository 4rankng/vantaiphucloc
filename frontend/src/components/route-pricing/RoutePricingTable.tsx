import { memo, useCallback } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { formatCurrency, WORK_TYPE_LABELS } from '@/data/domain'
import type { RoutePricing, WorkType } from '@/data/domain'

interface RoutePricingTableProps {
  data: RoutePricing[]
  isLoading: boolean
  onEdit: (rp: RoutePricing) => void
  onDelete: (id: number) => void
}

function PriceCell({ value }: { value: number | null }) {
  if (value == null) {
    return <span style={{ color: 'var(--ink-4)' }}>—</span>
  }
  return <span>{formatCurrency(value)}</span>
}

export const RoutePricingTable = memo(function RoutePricingTable({
  data,
  isLoading,
  onEdit,
  onDelete,
}: RoutePricingTableProps) {
  const handleEdit = useCallback(
    (rp: RoutePricing) => () => onEdit(rp),
    [onEdit],
  )
  const handleDelete = useCallback(
    (id: number) => () => onDelete(id),
    [onDelete],
  )

  if (isLoading) {
    return (
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-2)' }}>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded animate-pulse" style={{ background: 'var(--surface-3)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="text-center py-12">
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
          Chưa có cước tuyến nào
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg" style={{ background: 'var(--surface-2)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr
            className="text-left text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--ink-3)', borderBottom: '1px solid var(--border)' }}
          >
            <th className="px-4 py-3">STT</th>
            <th className="px-4 py-3">Chủ hàng</th>
            <th className="px-4 py-3">Điểm đi</th>
            <th className="px-4 py-3">Điểm đến</th>
            <th className="px-4 py-3 text-right">F20</th>
            <th className="px-4 py-3 text-right">F40</th>
            <th className="px-4 py-3 text-right">E20</th>
            <th className="px-4 py-3 text-right">E40</th>
            <th className="px-4 py-3">Tác nghiệp</th>
            <th className="px-4 py-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {data.map((rp, idx) => (
            <tr
              key={rp.id}
              className="transition-colors hover:bg-[var(--surface-hover)]"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <td className="px-4 py-3" style={{ color: 'var(--ink-3)' }}>{idx + 1}</td>
              <td className="px-4 py-3 font-medium">{rp.client.name}</td>
              <td className="px-4 py-3">{rp.pickupLocation.name}</td>
              <td className="px-4 py-3">{rp.dropoffLocation.name}</td>
              <td className="px-4 py-3 text-right"><PriceCell value={rp.f20Price} /></td>
              <td className="px-4 py-3 text-right"><PriceCell value={rp.f40Price} /></td>
              <td className="px-4 py-3 text-right"><PriceCell value={rp.e20Price} /></td>
              <td className="px-4 py-3 text-right"><PriceCell value={rp.e40Price} /></td>
              <td className="px-4 py-3">
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  {WORK_TYPE_LABELS[rp.operationType as WorkType] ?? rp.operationType}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={handleEdit(rp)}
                    className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-3)]"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleDelete(rp.id)}
                    className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-3)]"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})
