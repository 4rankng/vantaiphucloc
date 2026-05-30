import { useCallback } from 'react'
import { Route } from 'lucide-react'
import { EmptyState } from '@/components/shared/feedback/EmptyState'
import { TableSkeleton } from '@/components/shared/data-display/TableSkeleton/TableSkeleton'
import { RoutePricingEditRow } from './RoutePricingEditRow'
import { RoutePricingRow } from './RoutePricingRow'
import { COL, SALARY_TINT, SALARY_BORDER, LEFT_GROUP_WIDTH, FARE_GROUP_WIDTH, SALARY_GROUP_WIDTH } from './RoutePricingTable.constants'
import type { FocusableField, RoutePricingFormData, RoutePricingTableProps } from './RoutePricingTable.types'

export type { FocusableField, RoutePricingFormData, RoutePricingTableProps }

export function RoutePricingTable({
  data,
  isLoading,
  editingId,
  editingField,
  onStartEdit,
  onSave,
  onCancelEdit,
  onDelete,
  editInitial,
  isSaving,
  clients,
  locations,
}: RoutePricingTableProps) {
  const handleStartEdit = useCallback(
    (rp: Parameters<typeof onStartEdit>[0], field: FocusableField = 'f20Price') => onStartEdit(rp, field),
    [onStartEdit],
  )

  if (isLoading) return <TableSkeleton rows={5} />

  if (!data.length) {
    return (
      <div className="py-10">
        <EmptyState
          icon={<Route className="h-5 w-5" />}
          title="Chưa có cước tuyến nào"
          description="Thêm cước tuyến mới hoặc nhập từ file Excel để bắt đầu"
          compact
        />
      </div>
    )
  }

  const isEditing = editingId !== null
  const workTypeWidth = isEditing ? 170 : COL.workType
  const tableMinWidth = LEFT_GROUP_WIDTH + FARE_GROUP_WIDTH + SALARY_GROUP_WIDTH + workTypeWidth

  return (
    <div className="space-y-1.5">
      <div className="px-4 pt-3.5 text-[11px] font-medium flex items-center gap-1.5" style={{ color: 'var(--theme-text-muted)' }}>
        <span>
          {isEditing
            ? "💡 Nhấn Enter để xác nhận • Nhấn ESC để huỷ"
            : "💡 Cuộn sang phải để xem đầy đủ cột cước & lương • Nhấp vào ô bất kỳ để chỉnh sửa trực tiếp"}
        </span>
      </div>
      <div className="nepo-table-scroll overflow-x-auto">

      <table
        className="nepo-table"
        style={{ minWidth: tableMinWidth, width: tableMinWidth, tableLayout: 'fixed', borderCollapse: 'collapse' }}
      >
        <colgroup>
          <col style={{ width: COL.index }} />
          <col style={{ width: COL.client }} />
          <col style={{ width: COL.pickup }} />
          <col style={{ width: COL.dropoff }} />
          <col style={{ width: COL.price }} />
          <col style={{ width: COL.price }} />
          <col style={{ width: COL.price }} />
          <col style={{ width: COL.price }} />
          <col style={{ width: COL.salary }} />
          <col style={{ width: COL.salary }} />
          <col style={{ width: COL.salary }} />
          <col style={{ width: COL.salary }} />
          <col style={{ width: workTypeWidth }} />
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            <th className="text-left">Chủ hàng</th>
            <th className="text-left">Điểm đi</th>
            <th className="text-left">Điểm đến</th>
            <th className="text-right" title="Cước chủ hàng" style={{ color: 'var(--theme-status-info)' }}>Cước F20</th>
            <th className="text-right" title="Cước chủ hàng" style={{ color: 'var(--theme-status-info)' }}>Cước F40</th>
            <th className="text-right" title="Cước chủ hàng" style={{ color: 'var(--theme-express-color)' }}>Cước E20</th>
            <th className="text-right" title="Cước chủ hàng" style={{ color: 'var(--theme-express-color)' }}>Cước E40</th>
            <th className="text-right" title="Lương sản lượng" style={{ color: 'var(--theme-status-warning)', background: SALARY_TINT, borderLeft: SALARY_BORDER }}>Lương F20</th>
            <th className="text-right" title="Lương sản lượng" style={{ color: 'var(--theme-status-warning)', background: SALARY_TINT }}>Lương F40</th>
            <th className="text-right" title="Lương sản lượng" style={{ color: 'var(--theme-status-warning)', background: SALARY_TINT }}>Lương E20</th>
            <th className="text-right" title="Lương sản lượng" style={{ color: 'var(--theme-status-warning)', background: SALARY_TINT }}>Lương E40</th>
            <th className="text-left" style={{ position: 'sticky', right: 0, background: 'var(--theme-bg-secondary)', zIndex: 2, borderLeft: '1px solid var(--theme-border-light)' }}>Tác nghiệp</th>
          </tr>
        </thead>
        <tbody>
          {data.map((rp, idx) =>
            editingId === rp.id && editInitial ? (
              <RoutePricingEditRow
                key={rp.id}
                initial={editInitial}
                onSave={(formData) => onSave(rp.id, formData)}
                onCancel={onCancelEdit}
                saving={isSaving}
                clients={clients}
                locations={locations}
                initialFocus={editingField ?? 'f20Price'}
              />
            ) : (
              <RoutePricingRow
                key={rp.id}
                rp={rp}
                idx={idx}
                onEdit={(field) => handleStartEdit(rp, field)}
                onDelete={() => onDelete(rp.id)}
              />
            ),
          )}
        </tbody>
      </table>
      </div>
    </div>
  )
}
