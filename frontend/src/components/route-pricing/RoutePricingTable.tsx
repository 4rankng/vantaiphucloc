import { useCallback, useRef, useEffect, useMemo } from 'react'
import { Route, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/Collapsible'
import { EmptyState } from '@/components/shared/feedback/EmptyState'
import { TableSkeleton } from '@/components/shared/data-display/TableSkeleton/TableSkeleton'
import { RoutePricingEditRow } from './RoutePricingEditRow'
import { RoutePricingRow } from './RoutePricingRow'
import { RoutePricingMobileGroup } from './RoutePricingMobileGroup'
import { COL, SALARY_TINT, SALARY_BORDER, GROUPED_LEFT_GROUP_WIDTH, FARE_GROUP_WIDTH, SALARY_GROUP_WIDTH, RIGHT_GROUP_WIDTH } from './RoutePricingTable.constants'
import type { FocusableField, RoutePricingFormData, RoutePricingTableProps, ClientGroup } from './RoutePricingTable.types'

export type { FocusableField, RoutePricingFormData, RoutePricingTableProps }
export type { ClientGroup }

// ─── Avatar helper ─────────────────────────────────────────────────────────

function clientInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0][0].toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

function clientAvatarColor(id: number): string {
  const hues = [210, 160, 30, 340, 270, 190, 45, 300, 120, 15]
  const hue = hues[id % hues.length]
  return `hsl(${hue}, 55%, 88%)`
}

// ─── Group header ──────────────────────────────────────────────────────────

function ClientGroupHeader({ group, isExpanded }: { group: ClientGroup; isExpanded: boolean }) {
  const label = group.clientCode ? `${group.clientCode} – ${group.clientName}` : group.clientName

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 select-none cursor-pointer rounded-md transition-colors"
      style={{ background: isExpanded ? 'var(--theme-bg-tertiary)' : 'transparent' }}
    >
      <ChevronRight
        className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
        style={{
          color: 'var(--theme-text-muted)',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
        }}
      />
      <span
        className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold shrink-0"
        style={{ background: clientAvatarColor(group.clientId), color: 'var(--theme-text-primary)' }}
      >
        {clientInitials(group.clientName)}
      </span>
      <span className="text-sm font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>
        {label}
      </span>
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--theme-text-primary) 7%, transparent)',
          color: 'var(--theme-text-muted)',
        }}
      >
        {group.routeCount} tuyến
      </span>
    </div>
  )
}

// ─── Inner table per group ─────────────────────────────────────────────────

function GroupTable({
  group,
  editingId,
  editingField,
  editInitial,
  isSaving,
  onStartEdit,
  onSave,
  onCancelEdit,
  onDelete,
  clients,
  locations,
  rowOffset,
}: {
  group: ClientGroup
  editingId: number | null
  editingField?: FocusableField
  editInitial?: RoutePricingFormData
  isSaving?: boolean
  onStartEdit: (rp: Parameters<typeof onStartEdit>[0], field?: FocusableField) => void
  onSave: (id: number, data: RoutePricingFormData) => void
  onCancelEdit: () => void
  onDelete: (id: number) => void
  clients: Array<{ id: number; name: string; code?: string | null }>
  locations: Array<{ id: number; name: string }>
  rowOffset: number
}) {
  const tableMinWidth = GROUPED_LEFT_GROUP_WIDTH + FARE_GROUP_WIDTH + SALARY_GROUP_WIDTH + RIGHT_GROUP_WIDTH

  return (
    <div className="overflow-x-auto">
      <table
        className="nepo-table"
        style={{ minWidth: tableMinWidth, width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}
      >
        <colgroup>
          <col style={{ width: COL.index }} />
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
          <col style={{ width: COL.workType }} />
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
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
          {group.routes.map((rp, idx) =>
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
                hideClient
              />
            ) : (
              <RoutePricingRow
                key={rp.id}
                rp={rp}
                idx={rowOffset + idx}
                onEdit={(field) => onStartEdit(rp, field)}
                onDelete={() => onDelete(rp.id)}
                hideClient
              />
            )
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main table component ──────────────────────────────────────────────────

export function RoutePricingTable({
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
  groups,
  expandedClients,
  onToggleClient,
  onExpandAll,
  onCollapseAll,
  isMobile = false,
  onEditOpenDialog,
}: RoutePricingTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleStartEdit = useCallback(
    (rp: Parameters<typeof onStartEdit>[0], field: FocusableField = 'f20Price') => onStartEdit(rp, field),
    [onStartEdit],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'SELECT' ||
          active.tagName === 'TEXTAREA' ||
          active.hasAttribute('contenteditable'))
      ) {
        return
      }

      const hasOpenDialog = document.querySelector('[role="dialog"], [role="alertdialog"], .radix-overlay')
      if (hasOpenDialog) {
        return
      }

      if (e.key === 'ArrowLeft') {
        if (scrollContainerRef.current) {
          e.preventDefault()
          scrollContainerRef.current.scrollBy({ left: -120, behavior: 'smooth' })
        }
      } else if (e.key === 'ArrowRight') {
        if (scrollContainerRef.current) {
          e.preventDefault()
          scrollContainerRef.current.scrollBy({ left: 120, behavior: 'smooth' })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Compute row offsets so # column shows global numbering
  const offsets = useMemo(() => {
    const map = new Map<number, number>()
    let offset = 0
    for (const g of groups) {
      map.set(g.clientId, offset)
      offset += g.routes.length
    }
    return map
  }, [groups])

  if (isLoading) return <TableSkeleton rows={5} />

  if (!groups.length) {
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

  const allExpanded = groups.every(g => expandedClients.has(g.clientId))
  const totalRoutes = groups.reduce((sum, g) => sum + g.routeCount, 0)

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>
            💡 Nhấp vào thẻ để chỉnh sửa • {groups.length} chủ hàng, {totalRoutes} tuyến
          </span>
          <button
            onClick={allExpanded ? onCollapseAll : onExpandAll}
            className="inline-flex items-center gap-1 text-[11px] font-medium transition-colors whitespace-nowrap"
            style={{ color: 'var(--theme-text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--theme-text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--theme-text-muted)' }}
          >
            <ChevronsUpDown className="h-3 w-3" />
            {allExpanded ? 'Đóng tất cả' : 'Mở tất cả'}
          </button>
        </div>

        <div className="space-y-3">
          {groups.map(group => (
            <RoutePricingMobileGroup
              key={group.clientId}
              group={group}
              isExpanded={expandedClients.has(group.clientId)}
              onToggle={() => onToggleClient(group.clientId)}
              rowOffset={offsets.get(group.clientId) ?? 0}
              onDelete={onDelete}
              onEditOpenDialog={onEditOpenDialog ?? (() => {})}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="px-4 pt-3.5 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium flex items-center gap-1.5" style={{ color: 'var(--theme-text-muted)' }}>
          {editingId !== null
            ? "💡 Nhấn Enter để xác nhận • Nhấn ESC để huỷ"
            : `💡 Nhấp vào ô bất kỳ để chỉnh sửa • ${groups.length} chủ hàng, ${totalRoutes} tuyến đường`}
        </span>
        <button
          onClick={allExpanded ? onCollapseAll : onExpandAll}
          className="inline-flex items-center gap-1 text-[11px] font-medium transition-colors whitespace-nowrap"
          style={{ color: 'var(--theme-text-muted)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--theme-text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--theme-text-muted)' }}
        >
          <ChevronsUpDown className="h-3 w-3" />
          {allExpanded ? 'Đóng tất cả' : 'Mở tất cả'}
        </button>
      </div>

      <div ref={scrollContainerRef} className="overflow-x-auto">
        <div className="space-y-1">
          {groups.map(group => {
            const isExpanded = expandedClients.has(group.clientId)
            return (
              <Collapsible
                key={group.clientId}
                open={isExpanded}
                onOpenChange={() => onToggleClient(group.clientId)}
              >
                <CollapsibleTrigger asChild>
                  <div>
                    <ClientGroupHeader group={group} isExpanded={isExpanded} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-5">
                    <GroupTable
                      group={group}
                      editingId={editingId}
                      editingField={editingField}
                      editInitial={editInitial}
                      isSaving={isSaving}
                      onStartEdit={handleStartEdit}
                      onSave={onSave}
                      onCancelEdit={onCancelEdit}
                      onDelete={onDelete}
                      clients={clients}
                      locations={locations}
                      rowOffset={offsets.get(group.clientId) ?? 0}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </div>
    </div>
  )
}
